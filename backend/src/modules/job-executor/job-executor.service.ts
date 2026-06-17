import { orchestratorRepository } from "../orchestrator/orchestrator.repository";
import { orchestratorService } from "../orchestrator/orchestrator.service";
import { productionBatchRepository } from "../production-batches/production-batch.repository";
import { AppError } from "../shared/resource";
import type { BatchType, BatchUsageStatus } from "../production-batches/production-batch.schemas";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function outputBatchTypeForStage(targetStageType: unknown): BatchType | null {
  if (targetStageType === "VIDEO_GENERATE") {
    return "VIDEO_BATCH";
  }

  if (targetStageType === "VIDEO_COMPOSE") {
    return "FINAL_VIDEO";
  }

  if (targetStageType === "IMAGE_EDIT") {
    return "IMAGE_BATCH";
  }

  if (targetStageType === "MUSIC_GENERATE") {
    return "MUSIC_TRACK";
  }

  return null;
}

function usageTypeForOutput(sourceBatchType: unknown, outputBatchType: BatchType) {
  if (sourceBatchType === "IMAGE_BATCH" && outputBatchType === "VIDEO_BATCH") return "IMAGE_TO_VIDEO";
  if (sourceBatchType === "VIDEO_BATCH" && outputBatchType === "FINAL_VIDEO") return "VIDEO_TO_FINAL";
  return null;
}

export const jobExecutorService = {
  async executeMockJob(jobId: string) {
    const job = orchestratorRepository.getJob(jobId);
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    if (job.status !== "ALLOCATED") {
      throw new AppError("JOB_NOT_EXECUTABLE", "Only ALLOCATED jobs can be mock executed");
    }

    orchestratorService.startJob(jobId);
    await delay(25);

    const output = this.createMockOutputBatch(job);
    return orchestratorService.completeJob(jobId, output);
  },

  mockExecuteVideoGenerate() {
    return {
      producedBatchType: "VIDEO_BATCH",
      mock: true
    };
  },

  mockExecuteVideoCompose() {
    return {
      producedBatchType: "FINAL_VIDEO",
      mock: true
    };
  },

  createMockOutputBatch(job: {
    id: unknown;
    sourceBatchId: unknown;
    targetStageType: unknown;
    payload: Record<string, unknown>;
  }) {
    const outputBatchType = outputBatchTypeForStage(job.targetStageType);
    if (!outputBatchType) {
      return {
        outputBatchId: null,
        outputBatchType: null,
        mock: true
      };
    }

    const sourceBatch = productionBatchRepository.get(String(job.sourceBatchId));
    if (!sourceBatch) {
      throw new AppError("SOURCE_BATCH_NOT_FOUND", "Source production batch not found", 404);
    }

    const usageStatus: BatchUsageStatus = outputBatchType === "MUSIC_TRACK" ? "REUSABLE" : "AVAILABLE";
    const outputBatch = productionBatchRepository.create({
      batchType: outputBatchType,
      sourceGroupId: typeof sourceBatch.sourceGroupId === "string" ? sourceBatch.sourceGroupId : undefined,
      workflowId: typeof sourceBatch.workflowId === "string" ? sourceBatch.workflowId : undefined,
      workflowRunId: typeof sourceBatch.workflowRunId === "string" ? sourceBatch.workflowRunId : undefined,
      status: "READY",
      usageStatus,
      attributes: sourceBatch.attributes as Record<string, unknown>,
      metadata: {
        producedByJobId: job.id,
        sourceBatchId: job.sourceBatchId,
        targetStageType: job.targetStageType,
        mock: true
      }
    });

    if (!outputBatch) {
      throw new AppError("OUTPUT_BATCH_CREATE_FAILED", "Could not create output production batch");
    }

    const usageType = usageTypeForOutput(sourceBatch.batchType, outputBatchType);
    if (usageType) {
      productionBatchRepository.createUsage(String(sourceBatch.id), {
        targetBatchId: String(outputBatch.id),
        usageType,
        workflowRunId: null,
        stageRunId: null
      });
    }

    if (outputBatchType === "FINAL_VIDEO" && typeof job.payload.musicBatchId === "string") {
      productionBatchRepository.createUsage(job.payload.musicBatchId, {
        targetBatchId: String(outputBatch.id),
        usageType: "MUSIC_TO_FINAL",
        workflowRunId: null,
        stageRunId: null
      });
    }

    return {
      outputBatchId: outputBatch.id,
      outputBatchType,
      producedBatchType: outputBatchType,
      mock: true
    };
  }
};
