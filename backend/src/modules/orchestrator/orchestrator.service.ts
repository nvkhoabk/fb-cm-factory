import { AppError } from "../shared/resource";
import { orchestratorRepository } from "./orchestrator.repository";
import type { FailOrchestratorJobInput } from "./orchestrator.schemas";

export const orchestratorService = {
  listJobs: () => orchestratorRepository.listJobs(),

  scan() {
    const createdJobs = [];

    const readyImages = orchestratorRepository.listReadyAvailableBatches("IMAGE_BATCH");
    for (const imageBatch of readyImages) {
      const existing = orchestratorRepository.getJobBySourceAndStage(imageBatch.id, "VIDEO_GENERATE");
      if (existing) continue;

      const job = orchestratorRepository.createJob({
        sourceBatchId: imageBatch.id,
        targetStageType: "VIDEO_GENERATE",
        payload: {
          sourceBatchId: imageBatch.id,
          sourceBatchType: imageBatch.batchType
        }
      });

      orchestratorRepository.reserveBatch(imageBatch.id);
      createdJobs.push(job);
    }

    const readyVideos = orchestratorRepository.listReadyAvailableBatches("VIDEO_BATCH");
    for (const videoBatch of readyVideos) {
      const existing = orchestratorRepository.getJobBySourceAndStage(videoBatch.id, "VIDEO_COMPOSE");
      if (existing) continue;

      const musicBatch = orchestratorRepository.getReusableOrAvailableMusic();
      if (!musicBatch) continue;

      const job = orchestratorRepository.createJob({
        sourceBatchId: videoBatch.id,
        targetStageType: "VIDEO_COMPOSE",
        payload: {
          sourceBatchId: videoBatch.id,
          sourceBatchType: videoBatch.batchType,
          musicBatchId: musicBatch.id,
          musicUsageStatus: musicBatch.usageStatus
        }
      });

      orchestratorRepository.reserveBatch(videoBatch.id);
      if (musicBatch.usageStatus === "AVAILABLE") {
        orchestratorRepository.reserveBatch(musicBatch.id);
      }
      createdJobs.push(job);
    }

    return {
      createdCount: createdJobs.length,
      createdJobs
    };
  },

  startJob(id: string) {
    const job = orchestratorRepository.updateJobStatus(id, "RUNNING");
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    return job;
  },

  completeJob(id: string) {
    const job = orchestratorRepository.updateJobStatus(id, "COMPLETED");
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    return job;
  },

  failJob(id: string, input: FailOrchestratorJobInput) {
    const job = orchestratorRepository.updateJobStatus(id, "FAILED", {
      errorMessage: input.errorMessage ?? "Job failed"
    });
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    return job;
  }
};

