import { orchestratorRepository } from "../orchestrator/orchestrator.repository";
import { AppError } from "../shared/resource";
import { instanceSchedulerRepository } from "./instance-scheduler.repository";

const stageTypeToPoolType: Record<string, string> = {
  VIDEO_GENERATE: "VIDEO_GENERATE",
  VIDEO_COMPOSE: "VIDEO_COMPOSE",
  IMAGE_EDIT: "IMAGE_EDIT",
  MUSIC_GENERATE: "MUSIC_GENERATE"
};

function recordValue(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function normalizedLocalId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && String(numeric) === String(value) ? numeric : value;
}

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

    const payload = recordValue(job.payload);
    const workflowRunId = stringValue(payload.workflowRunId) ?? stringValue(payload.sourceWorkflowRunId);
    const dynamicCandidate = instanceSchedulerRepository.findDynamicCandidate(String(job.targetStageType));
    if (dynamicCandidate) {
      const metadata = instanceSchedulerRepository.dynamicAllocationMetadata({
        ...dynamicCandidate,
        allocationMode: "DYNAMIC_CAPABILITY"
      });
      const allocation = instanceSchedulerRepository.createAllocation({
        poolId: dynamicCandidate.pool_id,
        instanceId: dynamicCandidate.instance_id,
        hostId: dynamicCandidate.host_id,
        localId: dynamicCandidate.local_id,
        adbId: dynamicCandidate.adb_id,
        orchestratorJobId: String(job.id),
        workflowRunId,
        metadata: {
          ...metadata,
          poolType,
          targetStageType: job.targetStageType
        }
      });

      if (!allocation) {
        throw new AppError("INSTANCE_ALLOCATION_FAILED", "Could not create instance allocation");
      }

      instanceSchedulerRepository.moveInstanceToWorkflow(dynamicCandidate.instance_id, workflowRunId);

      const updatedJob = orchestratorRepository.updateJobStatus(String(job.id), "ALLOCATED", {
        allocationId: allocation.id,
        poolId: allocation.poolId,
        instanceId: allocation.instanceId,
        hostId: allocation.hostId,
        localId: normalizedLocalId(allocation.localId),
        adbId: allocation.adbId,
        allocationMode: "DYNAMIC_CAPABILITY"
      });

      return {
        allocation,
        job: updatedJob
      };
    }

    const candidate = instanceSchedulerRepository.findCandidate(poolType);
    if (!candidate) {
      throw new AppError("NO_INSTANCE_AVAILABLE", `No active instance is available for pool type ${poolType}`, 409);
    }

    const allocation = instanceSchedulerRepository.createAllocation({
      poolId: candidate.pool_id,
      instanceId: candidate.instance_id,
      hostId: candidate.host_id,
      localId: candidate.local_id,
      adbId: candidate.adb_id,
      orchestratorJobId: String(job.id),
      metadata: {
        allocationMode: "STATIC_POOL_FALLBACK",
        poolType,
        targetStageType: job.targetStageType,
        instanceId: candidate.instance_id,
        hostId: candidate.host_id,
        localId: normalizedLocalId(candidate.local_id),
        adbId: candidate.adb_id
      }
    });

    if (!allocation) {
      throw new AppError("INSTANCE_ALLOCATION_FAILED", "Could not create instance allocation");
    }

    const updatedJob = orchestratorRepository.updateJobStatus(String(job.id), "ALLOCATED", {
      allocationId: allocation.id,
      poolId: allocation.poolId,
      instanceId: allocation.instanceId,
      hostId: allocation.hostId,
      localId: normalizedLocalId(allocation.localId),
      adbId: allocation.adbId,
      allocationMode: "STATIC_POOL_FALLBACK"
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

    const closed = instanceSchedulerRepository.closeAllocation(allocationId, "RELEASED");
    if (allocation.allocationMode === "DYNAMIC_CAPABILITY") {
      instanceSchedulerRepository.moveInstanceToStandby(String(allocation.instanceId));
    }
    return closed;
  },

  failAllocation(allocationId: string, reason?: string | null, instanceIssue = false) {
    const allocation = instanceSchedulerRepository.getAllocation(allocationId);
    if (!allocation) throw new AppError("INSTANCE_ALLOCATION_NOT_FOUND", "Instance allocation not found", 404);
    if (allocation.status !== "ALLOCATED") return allocation;

    const closed = instanceSchedulerRepository.closeAllocation(allocationId, "FAILED");
    if (allocation.allocationMode === "DYNAMIC_CAPABILITY") {
      if (instanceIssue) {
        instanceSchedulerRepository.moveInstanceToMaintenance(String(allocation.instanceId), reason ?? "Instance issue");
      } else {
        instanceSchedulerRepository.moveInstanceToStandby(String(allocation.instanceId));
      }
    }
    return closed;
  },

  releaseActiveForJob(jobId: string) {
    const allocation = instanceSchedulerRepository.getActiveAllocationByJob(jobId);
    if (!allocation) return null;

    return this.releaseAllocation(String(allocation.id));
  },

  failActiveForJob(jobId: string, reason?: string | null, instanceIssue = false) {
    const allocation = instanceSchedulerRepository.getActiveAllocationByJob(jobId);
    if (!allocation) return null;

    return this.failAllocation(String(allocation.id), reason, instanceIssue);
  }
};
