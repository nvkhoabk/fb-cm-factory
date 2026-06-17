import { orchestratorRepository } from "../orchestrator/orchestrator.repository";
import { AppError } from "../shared/resource";
import { instanceSchedulerRepository } from "./instance-scheduler.repository";

const stageTypeToPoolType: Record<string, string> = {
  VIDEO_GENERATE: "VIDEO_GENERATE",
  VIDEO_COMPOSE: "VIDEO_COMPOSE",
  IMAGE_EDIT: "IMAGE_EDIT",
  MUSIC_GENERATE: "MUSIC_GENERATE"
};

export const instanceSchedulerService = {
  listAllocations: () => instanceSchedulerRepository.listAllocations(),

  getActiveAllocations: () => instanceSchedulerRepository.getActiveAllocations(),

  allocateForJob(jobId: string) {
    const job = orchestratorRepository.getJob(jobId);
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    if (job.status !== "PENDING") {
      throw new AppError("ORCHESTRATOR_JOB_NOT_ALLOCATABLE", "Only PENDING jobs can be allocated");
    }

    const poolType = stageTypeToPoolType[String(job.targetStageType)];
    if (!poolType) {
      throw new AppError("NO_INSTANCE_AVAILABLE", `No pool mapping for ${String(job.targetStageType)}`, 409);
    }

    const candidate = instanceSchedulerRepository.findCandidate(poolType);
    if (!candidate) {
      throw new AppError("NO_INSTANCE_AVAILABLE", `No active instance is available for pool type ${poolType}`, 409);
    }

    const allocation = instanceSchedulerRepository.createAllocation({
      poolId: candidate.pool_id,
      instanceId: candidate.instance_id,
      orchestratorJobId: String(job.id),
      metadata: {
        poolType,
        targetStageType: job.targetStageType
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
    const allocation = instanceSchedulerRepository.getAllocation(allocationId);
    if (!allocation) throw new AppError("INSTANCE_ALLOCATION_NOT_FOUND", "Instance allocation not found", 404);
    if (allocation.status !== "ALLOCATED") return allocation;

    return instanceSchedulerRepository.closeAllocation(allocationId, "RELEASED");
  },

  failAllocation(allocationId: string) {
    const allocation = instanceSchedulerRepository.getAllocation(allocationId);
    if (!allocation) throw new AppError("INSTANCE_ALLOCATION_NOT_FOUND", "Instance allocation not found", 404);
    if (allocation.status !== "ALLOCATED") return allocation;

    return instanceSchedulerRepository.closeAllocation(allocationId, "FAILED");
  },

  releaseActiveForJob(jobId: string) {
    const allocation = instanceSchedulerRepository.getActiveAllocationByJob(jobId);
    if (!allocation) return null;

    return instanceSchedulerRepository.closeAllocation(String(allocation.id), "RELEASED");
  },

  failActiveForJob(jobId: string) {
    const allocation = instanceSchedulerRepository.getActiveAllocationByJob(jobId);
    if (!allocation) return null;

    return instanceSchedulerRepository.closeAllocation(String(allocation.id), "FAILED");
  }
};

