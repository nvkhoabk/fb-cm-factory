import { instanceSchedulerRepository } from "../instance-scheduler/instance-scheduler.repository";
import { orchestratorRepository } from "../orchestrator/orchestrator.repository";
import { AppError } from "../shared/resource";
import { runtimeSessionsRepository } from "./runtime-sessions.repository";
import type {
  CreateRuntimeSessionInput,
  CreateRuntimeStepInput,
  SaveRuntimeCheckpointInput,
  UpdateRuntimeSessionInput,
  UpdateRuntimeStepInput
} from "./runtime-sessions.schemas";

function mergeContext(a: unknown, b: unknown) {
  return {
    ...(a && typeof a === "object" ? a as Record<string, unknown> : {}),
    ...(b && typeof b === "object" ? b as Record<string, unknown> : {})
  };
}

export const runtimeSessionsService = {
  listSessions: () => runtimeSessionsRepository.listSessions(),

  getSession(id: string) {
    const session = runtimeSessionsRepository.getSessionDetail(id);
    if (!session) throw new AppError("RUNTIME_SESSION_NOT_FOUND", "Runtime session not found", 404);
    return session;
  },

  listSteps(id: string) {
    this.getSession(id);
    return runtimeSessionsRepository.listSteps(id);
  },

  createRuntimeSession(input: CreateRuntimeSessionInput) {
    if (input.jobId && !orchestratorRepository.getJob(input.jobId)) {
      throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    }

    return runtimeSessionsRepository.createSession(input);
  },

  createForJob(jobId: string) {
    const job = orchestratorRepository.getJob(jobId);
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);

    const payload = job.payload as Record<string, unknown>;
    const allocation = instanceSchedulerRepository.getActiveAllocationByJob(jobId);
    const context = {
      jobId,
      sourceBatchId: job.sourceBatchId,
      targetStageType: job.targetStageType,
      payload
    };
    const allocationInfo = {
      allocationId: allocation?.id ?? payload.allocationId ?? null,
      poolId: allocation?.poolId ?? payload.poolId ?? null,
      instanceId: allocation?.instanceId ?? payload.instanceId ?? null,
      hostId: payload.hostId ?? null
    };

    return runtimeSessionsRepository.createSession({
      jobId,
      instanceId: typeof allocationInfo.instanceId === "string" ? allocationInfo.instanceId : undefined,
      hostId: typeof allocationInfo.hostId === "string" ? allocationInfo.hostId : undefined,
      scriptId: typeof payload.scriptId === "string" ? payload.scriptId : undefined,
      status: "PENDING",
      currentStepNo: 0,
      context,
      checkpoint: {
        currentStepNo: 0,
        context,
        allocation: allocationInfo
      }
    });
  },

  updateRuntimeSession(id: string, input: UpdateRuntimeSessionInput) {
    const session = runtimeSessionsRepository.updateSession(id, input);
    if (!session) throw new AppError("RUNTIME_SESSION_NOT_FOUND", "Runtime session not found", 404);
    return session;
  },

  saveCheckpoint(id: string, input: SaveRuntimeCheckpointInput) {
    const session = this.getSession(id);
    const checkpoint = {
      ...mergeContext(session.checkpoint, input.checkpoint),
      currentStepNo: input.currentStepNo ?? session.currentStepNo,
      context: mergeContext(session.context, input.context),
      allocation: input.allocation ?? (
        session.checkpoint && typeof session.checkpoint === "object"
          ? (session.checkpoint as Record<string, unknown>).allocation
          : undefined
      )
    };

    return this.updateRuntimeSession(id, {
      currentStepNo: input.currentStepNo ?? session.currentStepNo,
      context: checkpoint.context as Record<string, unknown>,
      checkpoint
    });
  },

  pauseSession(id: string) {
    this.getSession(id);
    return this.updateRuntimeSession(id, { status: "PAUSED" });
  },

  resumeSession(id: string) {
    const session = this.getSession(id);
    const checkpoint = session.checkpoint as Record<string, unknown>;
    const checkpointContext = checkpoint.context && typeof checkpoint.context === "object"
      ? checkpoint.context as Record<string, unknown>
      : session.context as Record<string, unknown>;
    const currentStepNo = typeof checkpoint.currentStepNo === "number"
      ? checkpoint.currentStepNo
      : session.currentStepNo;

    return this.updateRuntimeSession(id, {
      status: "RUNNING",
      currentStepNo,
      context: checkpointContext
    });
  },

  createRuntimeStep(runtimeSessionId: string, input: CreateRuntimeStepInput) {
    this.getSession(runtimeSessionId);
    return runtimeSessionsRepository.createStep(runtimeSessionId, input);
  },

  updateRuntimeStep(id: string, input: UpdateRuntimeStepInput) {
    const step = runtimeSessionsRepository.updateStep(id, input);
    if (!step) throw new AppError("RUNTIME_STEP_NOT_FOUND", "Runtime step not found", 404);
    return step;
  }
};
