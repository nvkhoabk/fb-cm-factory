import { AppError } from "../shared/resource";
import { orchestratorRepository } from "../orchestrator/orchestrator.repository";
import { instanceAllocationRepository } from "./instance-allocation.repository";

const stageTypeToPoolType: Record<string, string> = {
  IMAGE_EDIT: "IMAGE_EDIT",
  VIDEO_GENERATE: "VIDEO_GENERATE",
  MUSIC_GENERATE: "MUSIC_GENERATE",
  VIDEO_COMPOSE: "VIDEO_COMPOSE"
};

export const instanceAllocationService = {
  list: () => instanceAllocationRepository.list(),

  listActive: () => instanceAllocationRepository.listActive(),

  allocateForJob(jobId: string) {
    const job = orchestratorRepository.getJob(jobId);
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    if (job.status !== "PENDING") {
      throw new AppError("ORCHESTRATOR_JOB_NOT_ALLOCATABLE", "Only PENDING jobs can be allocated");
    }

    const poolType = stageTypeToPoolType[String(job.targetStageType)];
    if (!poolType) {
      throw new AppError("NO_INSTANCE_AVAILABLE", `No pool mapping for ${String(job.targetStageType)}`);
    }

    const candidate = instanceAllocationRepository.findCandidate(poolType);
    if (!candidate) {
      throw new AppError("NO_INSTANCE_AVAILABLE", `No active instance is available for pool type ${poolType}`, 409);
    }

    const allocation = instanceAllocationRepository.create({
      poolId: candidate.pool_id,
      instanceId: candidate.instance_id,
      orchestratorJobId: String(job.id),
      metadata: {
        targetStageType: job.targetStageType,
        poolType
      }
    });

    if (!allocation) {
      throw new AppError("INSTANCE_ALLOCATION_FAILED", "Could not create instance allocation");
    }

    const updatedJob = orchestratorRepository.updateJobStatus(String(job.id), "ALLOCATED", {
      allocationId: allocation.id,
      poolId: allocation.poolId,
      instanceId: allocation.instanceId
    });

    return {
      allocation,
      job: updatedJob
    };
  },

  releaseAllocation(allocationId: string) {
    const allocation = instanceAllocationRepository.get(allocationId);
    if (!allocation) throw new AppError("INSTANCE_ALLOCATION_NOT_FOUND", "Instance allocation not found", 404);
    if (allocation.status !== "ALLOCATED") return allocation;

    return instanceAllocationRepository.close(allocationId, "RELEASED");
  },

  failAllocation(allocationId: string) {
    const allocation = instanceAllocationRepository.get(allocationId);
    if (!allocation) throw new AppError("INSTANCE_ALLOCATION_NOT_FOUND", "Instance allocation not found", 404);
    if (allocation.status !== "ALLOCATED") return allocation;

    return instanceAllocationRepository.close(allocationId, "FAILED");
  },

  releaseActiveForJob(jobId: string) {
    const allocation = instanceAllocationRepository.getActiveByJob(jobId);
    if (!allocation) return null;
    return instanceAllocationRepository.close(String(allocation.id), "RELEASED");
  },

  failActiveForJob(jobId: string) {
    const allocation = instanceAllocationRepository.getActiveByJob(jobId);
    if (!allocation) return null;
    return instanceAllocationRepository.close(String(allocation.id), "FAILED");
  }
};

