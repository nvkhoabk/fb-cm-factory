import { instanceSchedulerRepository } from "../instance-scheduler/instance-scheduler.repository";
import { orchestratorRepository } from "../orchestrator/orchestrator.repository";
import { scriptRuntimeRepository } from "../script-runtime/script-runtime.repository";
import { runtimeSessionsService } from "../runtime-sessions/runtime-sessions.service";
import { AppError } from "../shared/resource";
import type { RecoverRuntimeSessionInput } from "./runtime-recovery.schemas";

const recoverableCodes = new Set([
  "HOST_AGENT_UNAVAILABLE",
  "INSTANCE_OFFLINE",
  "INSTANCE_HUNG",
  "CAPTCHA_DETECTED",
  "NETWORK_ERROR",
  "SCREEN_TIMEOUT",
  "CREDIT_ERROR"
]);

const nonRecoverableCodes = new Set([
  "INVALID_SCRIPT",
  "MISSING_ASSET",
  "INVALID_CONTEXT",
  "UNSUPPORTED_STEP_TYPE",
  "SCRIPT_STEP_UNSUPPORTED"
]);

export function classifyRuntimeError(error: unknown) {
  const code = error instanceof AppError
    ? error.code
    : error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code)
      : error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

  if (recoverableCodes.has(code)) {
    return {
      code,
      recoverable: true,
      status: "FAILED_RECOVERABLE" as const
    };
  }

  if (nonRecoverableCodes.has(code)) {
    return {
      code,
      recoverable: false,
      status: "FAILED" as const
    };
  }

  return {
    code,
    recoverable: false,
    status: "FAILED" as const
  };
}

function checkpointRecord(session: ReturnType<typeof runtimeSessionsService.getSession>) {
  return session.checkpoint && typeof session.checkpoint === "object"
    ? session.checkpoint as Record<string, unknown>
    : {};
}

export const runtimeRecoveryService = {
  classifyRuntimeError,

  recoverRuntimeSession(runtimeSessionId: string, input: RecoverRuntimeSessionInput = {}) {
    const session = runtimeSessionsService.getSession(runtimeSessionId);
    if (session.status !== "FAILED_RECOVERABLE") {
      throw new AppError("RUNTIME_SESSION_NOT_RECOVERABLE", "Runtime session is not recoverable", 409);
    }

    const checkpoint = checkpointRecord(session);
    const scriptRunId = String(checkpoint.scriptRunId ?? "");
    if (!scriptRunId) throw new AppError("CHECKPOINT_SCRIPT_RUN_REQUIRED", "Checkpoint is missing scriptRunId");

    const allocationId = typeof checkpoint.allocationId === "string" ? checkpoint.allocationId : undefined;
    const jobId = typeof checkpoint.jobId === "string"
      ? checkpoint.jobId
      : typeof session.jobId === "string"
        ? session.jobId
        : undefined;

    const currentAllocation = allocationId
      ? instanceSchedulerRepository.getAllocation(allocationId)
      : jobId
        ? instanceSchedulerRepository.getActiveAllocationByJob(jobId)
        : null;

    if (!currentAllocation) {
      throw new AppError("ALLOCATION_NOT_FOUND", "Recovery requires an existing allocation checkpoint");
    }

    if (currentAllocation.status === "ALLOCATED") {
      instanceSchedulerRepository.closeAllocation(String(currentAllocation.id), "FAILED");
    }

    const metadata = currentAllocation.metadata as Record<string, unknown>;
    const poolType = typeof metadata.poolType === "string" ? metadata.poolType : undefined;
    const candidate = poolType
      ? instanceSchedulerRepository.findCandidate(poolType, String(currentAllocation.instanceId))
      : {
          pool_id: currentAllocation.poolId as string,
          instance_id: currentAllocation.instanceId as string,
          active_allocation_count: 0
        };

    if (!candidate) {
      throw new AppError("NO_INSTANCE_AVAILABLE", "No replacement instance is available", 409);
    }

    const newAllocation = instanceSchedulerRepository.createAllocation({
      poolId: candidate.pool_id,
      instanceId: candidate.instance_id,
      orchestratorJobId: jobId ?? null,
      metadata: {
        ...metadata,
        recoveredFromAllocationId: currentAllocation.id
      }
    });

    if (!newAllocation) {
      throw new AppError("INSTANCE_ALLOCATION_FAILED", "Could not create recovery allocation");
    }

    if (jobId) {
      orchestratorRepository.updateJobStatus(jobId, "ALLOCATED", {
        allocationId: newAllocation.id,
        poolId: newAllocation.poolId,
        instanceId: newAllocation.instanceId,
        recovered: true
      });
    }

    const recoveryContext = checkpoint.context && typeof checkpoint.context === "object"
      ? { ...(checkpoint.context as Record<string, unknown>), recovered: true }
      : { ...(session.context as Record<string, unknown>), recovered: true };

    runtimeSessionsService.saveCheckpoint(runtimeSessionId, {
      currentStepNo: typeof checkpoint.currentStepNo === "number" ? checkpoint.currentStepNo : session.currentStepNo,
      context: recoveryContext,
      allocation: {
        allocationId: newAllocation.id,
        poolId: newAllocation.poolId,
        instanceId: newAllocation.instanceId
      },
      checkpoint: {
        ...checkpoint,
        allocationId: newAllocation.id,
        instanceId: newAllocation.instanceId,
        hostId: input.hostId ?? checkpoint.hostId ?? session.hostId,
        recoveredFromAllocationId: currentAllocation.id
      }
    });

    runtimeSessionsService.updateRuntimeSession(runtimeSessionId, {
      status: "RUNNING",
      instanceId: String(newAllocation.instanceId),
      hostId: input.hostId ?? (typeof checkpoint.hostId === "string" ? checkpoint.hostId : session.hostId as string | null),
      currentStepNo: typeof checkpoint.currentStepNo === "number" ? checkpoint.currentStepNo : session.currentStepNo,
      context: recoveryContext
    });

    scriptRuntimeRepository.updateScriptRun(scriptRunId, {
      status: "RUNNING",
      context: recoveryContext
    });

    const { scriptRuntimeService } = require("../script-runtime/script-runtime.service") as typeof import("../script-runtime/script-runtime.service");
    return scriptRuntimeService.resumeScriptRun(scriptRunId);
  },

  markUnrecoverable(runtimeSessionId: string) {
    const session = runtimeSessionsService.getSession(runtimeSessionId);
    const checkpoint = checkpointRecord(session);
    const scriptRunId = typeof checkpoint.scriptRunId === "string" ? checkpoint.scriptRunId : null;

    runtimeSessionsService.updateRuntimeSession(runtimeSessionId, { status: "FAILED" });

    if (scriptRunId) {
      scriptRuntimeRepository.updateScriptRun(scriptRunId, {
        status: "FAILED"
      });
    }

    const jobId = typeof checkpoint.jobId === "string"
      ? checkpoint.jobId
      : typeof session.jobId === "string"
        ? session.jobId
        : null;

    if (jobId) {
      orchestratorRepository.updateJobStatus(jobId, "FAILED", {
        errorMessage: "Runtime marked unrecoverable"
      });
    }

    return runtimeSessionsService.getSession(runtimeSessionId);
  }
};
