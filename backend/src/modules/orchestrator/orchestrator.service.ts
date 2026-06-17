import { AppError } from "../shared/resource";
import { instanceSchedulerService } from "../instance-scheduler/instance-scheduler.service";
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

  allocateJob(id: string) {
    return instanceSchedulerService.allocateForJob(id);
  },

  startJob(id: string) {
    const current = orchestratorRepository.getJob(id);
    if (!current) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    if (current.status !== "ALLOCATED") {
      throw new AppError("ORCHESTRATOR_JOB_NOT_STARTABLE", "Only ALLOCATED jobs can be started");
    }

    const job = orchestratorRepository.updateJobStatus(id, "RUNNING");
    return job;
  },

  completeJob(id: string, result?: Record<string, unknown>) {
    const current = orchestratorRepository.getJob(id);
    if (!current) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);

    const job = result
      ? orchestratorRepository.updateJobResult(id, "COMPLETED", {
          payload: {
            result
          },
          output: result
        })
      : orchestratorRepository.updateJobStatus(id, "COMPLETED");
    instanceSchedulerService.releaseActiveForJob(id);
    return job;
  },

  failJob(id: string, input: FailOrchestratorJobInput) {
    const current = orchestratorRepository.getJob(id);
    if (!current) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);

    const job = orchestratorRepository.updateJobStatus(id, "FAILED", {
      errorMessage: input.errorMessage ?? "Job failed"
    });
    instanceSchedulerService.failActiveForJob(id);
    return job;
  }
};
