import { hostAgentService } from "../host-agent-adapter/host-agent.service";
import { instanceSchedulerRepository } from "../instance-scheduler/instance-scheduler.repository";
import { runtimeRecoveryService } from "../runtime-recovery/runtime-recovery.service";
import { runtimeSessionsService } from "../runtime-sessions/runtime-sessions.service";
import { AppError, now } from "../shared/resource";
import { scriptRuntimeRepository } from "./script-runtime.repository";
import type {
  CreateScriptInput,
  CreateScriptVersionInput,
  RunScriptInput,
  ScriptStepDefinition
} from "./script-runtime.schemas";

type NormalizedScriptStep = ScriptStepDefinition & {
  stepNo: number;
  stepType: string;
  input: Record<string, unknown>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeContext(...values: unknown[]) {
  return Object.assign(
    {},
    ...values.map((value) => value && typeof value === "object" ? value : {})
  ) as Record<string, unknown>;
}

function getPathValue(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function renderTemplateString(value: string, context: Record<string, unknown>) {
  return value.replace(/\{\{([^}]+)\}\}/g, (_match, expression: string) => {
    const resolved = getPathValue(context, expression.trim());
    return resolved === undefined || resolved === null ? "" : String(resolved);
  });
}

function renderInputTemplates(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === "string") return renderTemplateString(value, context);
  if (Array.isArray(value)) return value.map((item) => renderInputTemplates(item, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, renderInputTemplates(item, context)])
    );
  }
  return value;
}

function orderedSteps(definition: unknown): NormalizedScriptStep[] {
  const steps = definition && typeof definition === "object"
    ? (definition as { steps?: unknown }).steps
    : undefined;

  if (!Array.isArray(steps)) {
    throw new AppError("SCRIPT_DEFINITION_INVALID", "Script version definition must contain steps");
  }

  return steps
    .map((step, index) => {
      const definitionStep = step as ScriptStepDefinition;
      return {
        ...definitionStep,
        stepType: definitionStep.stepType ?? definitionStep.type ?? "unsupported-step",
        input: mergeContext(definitionStep.config, definitionStep.input),
        stepNo: typeof definitionStep.stepNo === "number" ? definitionStep.stepNo : index + 1
      };
    })
    .sort((a, b) => Number(a.stepNo) - Number(b.stepNo));
}

export const scriptRuntimeService = {
  listScripts: () => scriptRuntimeRepository.listScripts(),

  createScript(input: CreateScriptInput) {
    return scriptRuntimeRepository.createScript(input);
  },

  createScriptVersion(scriptId: string, input: CreateScriptVersionInput) {
    const script = scriptRuntimeRepository.getScript(scriptId);
    if (!script) throw new AppError("SCRIPT_NOT_FOUND", "Script not found", 404);
    return scriptRuntimeRepository.createScriptVersion(scriptId, input);
  },

  listScriptRuns: () => scriptRuntimeRepository.listScriptRuns(),

  getScriptRun(id: string) {
    const run = scriptRuntimeRepository.getScriptRunDetail(id);
    if (!run) throw new AppError("SCRIPT_RUN_NOT_FOUND", "Script run not found", 404);
    return run;
  },

  listScriptRunSteps(id: string) {
    this.getScriptRun(id);
    return scriptRuntimeRepository.listScriptRunSteps(id);
  },

  createScriptRun(runtimeSessionId: string, input: RunScriptInput) {
    const session = runtimeSessionsService.getSession(runtimeSessionId);
    const scriptId = input.scriptId ?? (typeof session.scriptId === "string" ? session.scriptId : undefined);

    if (!scriptId) {
      throw new AppError("SCRIPT_REQUIRED", "runtime session must have scriptId or request must include scriptId");
    }

    const script = scriptRuntimeRepository.getScript(scriptId);
    if (!script) throw new AppError("SCRIPT_NOT_FOUND", "Script not found", 404);

    const version = input.scriptVersionId
      ? scriptRuntimeRepository.getScriptVersion(input.scriptVersionId)
      : scriptRuntimeRepository.getLatestScriptVersion(scriptId);

    if (!version || version.scriptId !== scriptId) {
      throw new AppError("SCRIPT_VERSION_NOT_FOUND", "Script version not found", 404);
    }

    runtimeSessionsService.updateRuntimeSession(runtimeSessionId, {
      status: "RUNNING",
      scriptId,
      context: mergeContext(session.context, input.context)
    });

    return scriptRuntimeRepository.createScriptRun({
      runtimeSessionId,
      scriptId,
      scriptVersionId: String(version.id),
      context: mergeContext(session.context, input.context)
    });
  },

  async executeScriptRun(scriptRunId: string) {
    const run = this.getScriptRun(scriptRunId);
    const version = scriptRuntimeRepository.getScriptVersion(String(run.scriptVersionId));
    if (!version) throw new AppError("SCRIPT_VERSION_NOT_FOUND", "Script version not found", 404);

    let context = mergeContext(run.context);
    const steps = orderedSteps(version.definition).filter((step) => Number(step.stepNo) > Number(run.currentStepNo));

    scriptRuntimeRepository.updateScriptRun(scriptRunId, {
      status: "RUNNING",
      context
    });
    runtimeSessionsService.updateRuntimeSession(String(run.runtimeSessionId), {
      status: "RUNNING",
      currentStepNo: Number(run.currentStepNo),
      context
    });

    try {
      for (const step of steps) {
        const output = await this.executeStep(scriptRunId, step, context);
        context = mergeContext(context, {
          lastStepNo: step.stepNo,
          lastStepType: step.stepType,
          lastStepOutput: output
        });
        this.saveCheckpoint(scriptRunId, Number(step.stepNo), context, output);
      }

      runtimeSessionsService.updateRuntimeSession(String(run.runtimeSessionId), {
        status: "COMPLETED",
        currentStepNo: context.lastStepNo as number | undefined,
        context
      });
      return scriptRuntimeRepository.updateScriptRun(scriptRunId, {
        status: "COMPLETED",
        context,
        finishedAt: now()
      });
    } catch (error) {
      const classification = runtimeRecoveryService.classifyRuntimeError(error);
      const latestRun = this.getScriptRun(scriptRunId);
      this.saveCheckpoint(scriptRunId, Number(latestRun.currentStepNo), context, {
        errorCode: classification.code,
        recoverable: classification.recoverable
      });

      if (classification.recoverable) {
        const session = runtimeSessionsService.getSession(String(run.runtimeSessionId));
        const checkpoint = session.checkpoint as Record<string, unknown>;
        const allocationId = typeof checkpoint.allocationId === "string" ? checkpoint.allocationId : null;
        if (allocationId) {
          const allocation = instanceSchedulerRepository.getAllocation(allocationId);
          if (allocation?.status === "ALLOCATED") {
            instanceSchedulerRepository.closeAllocation(allocationId, "FAILED");
          }
        }
        runtimeSessionsService.updateRuntimeSession(String(run.runtimeSessionId), {
          status: "FAILED_RECOVERABLE"
        });
        scriptRuntimeRepository.updateScriptRun(scriptRunId, {
          status: "FAILED_RECOVERABLE",
          context
        });
        throw error;
      }

      runtimeSessionsService.updateRuntimeSession(String(run.runtimeSessionId), {
        status: "FAILED"
      });
      scriptRuntimeRepository.updateScriptRun(scriptRunId, {
        status: "FAILED",
        context,
        finishedAt: now()
      });
      throw error;
    }
  },

  async executeStep(scriptRunId: string, step: NormalizedScriptStep, context: Record<string, unknown>) {
    const run = this.getScriptRun(scriptRunId);
    const session = runtimeSessionsService.getSession(String(run.runtimeSessionId));
    const input = renderInputTemplates(mergeContext(step.input), context) as Record<string, unknown>;

    const stepRow = scriptRuntimeRepository.createScriptRunStep({
      scriptRunId,
      stepNo: Number(step.stepNo),
      stepType: step.stepType,
      status: "RUNNING",
      input
    });

    try {
      const output = await this.dispatchStep(session, step.stepType, input, context);
      scriptRuntimeRepository.updateScriptRunStep(String(stepRow?.id), {
        status: "COMPLETED",
        output
      });
      return output;
    } catch (error) {
      scriptRuntimeRepository.updateScriptRunStep(String(stepRow?.id), {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Step failed"
      });
      throw error;
    }
  },

  async dispatchStep(
    session: ReturnType<typeof runtimeSessionsService.getSession>,
    stepType: string,
    input: Record<string, unknown>,
    _context: Record<string, unknown>
  ) {
    if (typeof session.hostId !== "string" || !session.hostId) {
      throw new AppError("RUNTIME_SESSION_HOST_REQUIRED", "Runtime session must include hostId");
    }

    if (typeof session.instanceId !== "string" || !session.instanceId) {
      throw new AppError("RUNTIME_SESSION_INSTANCE_REQUIRED", "Runtime session must include instanceId");
    }

    if (stepType === "wait") {
      const ms = typeof input.ms === "number" ? input.ms : 100;
      await delay(Math.max(0, Math.min(ms, 5000)));
      return { waitedMs: ms };
    }

    if (stepType === "simulate-error" || stepType === "throw-error") {
      const code = String(input.code ?? "SCREEN_TIMEOUT");
      if (_context.recovered === true) {
        return {
          recovered: true,
          skippedErrorCode: code
        };
      }
      throw new AppError(code, `Simulated runtime error: ${code}`);
    }

    if (stepType === "screenshot") {
      return hostAgentService.takeScreenshot(session.hostId, session.instanceId);
    }

    if (stepType === "tap") {
      return hostAgentService.tap(session.hostId, {
        instanceId: session.instanceId,
        x: Number(input.x),
        y: Number(input.y)
      });
    }

    if (stepType === "swipe") {
      return hostAgentService.swipe(session.hostId, {
        instanceId: session.instanceId,
        x1: Number(input.x1),
        y1: Number(input.y1),
        x2: Number(input.x2),
        y2: Number(input.y2),
        durationMs: typeof input.durationMs === "number" ? input.durationMs : undefined
      });
    }

    if (stepType === "send-text") {
      return hostAgentService.sendText(session.hostId, {
        instanceId: session.instanceId,
        text: String(input.text ?? "")
      });
    }

    if (stepType === "send-key") {
      return hostAgentService.sendKey(session.hostId, {
        instanceId: session.instanceId,
        key: typeof input.key === "number" ? input.key : String(input.key ?? "")
      });
    }

    if (stepType === "check-screen") {
      const screenshot = await hostAgentService.takeScreenshot(session.hostId, session.instanceId);
      return {
        screenshotExists: Boolean(screenshot),
        screenshot
      };
    }

    if (stepType === "download-result") {
      return hostAgentService.downloadLatest(session.hostId, {
        instanceId: session.instanceId,
        sourceDir: typeof input.sourceDir === "string" ? input.sourceDir : undefined,
        extensions: Array.isArray(input.extensions) ? input.extensions.map(String) : undefined,
        targetFolder: typeof input.targetFolder === "string" ? input.targetFolder : undefined
      });
    }

    throw new AppError("UNSUPPORTED_STEP_TYPE", `Unsupported script step type ${stepType}`);
  },

  resumeScriptRun(scriptRunId: string) {
    const run = this.getScriptRun(scriptRunId);
    if (run.status === "COMPLETED") return run;
    const session = runtimeSessionsService.getSession(String(run.runtimeSessionId));
    const checkpoint = session.checkpoint && typeof session.checkpoint === "object"
      ? session.checkpoint as Record<string, unknown>
      : {};
    const checkpointStepNo = typeof checkpoint.currentStepNo === "number" ? checkpoint.currentStepNo : run.currentStepNo;
    const checkpointContext = checkpoint.context && typeof checkpoint.context === "object"
      ? checkpoint.context as Record<string, unknown>
      : run.context as Record<string, unknown>;

    scriptRuntimeRepository.updateScriptRun(scriptRunId, {
      status: "RUNNING",
      currentStepNo: checkpointStepNo,
      context: checkpointContext
    });
    return this.executeScriptRun(scriptRunId);
  },

  saveCheckpoint(scriptRunId: string, currentStepNo: number, context: Record<string, unknown>, output: unknown) {
    const run = this.getScriptRun(scriptRunId);
    const session = runtimeSessionsService.getSession(String(run.runtimeSessionId));
    const existingCheckpoint = session.checkpoint && typeof session.checkpoint === "object"
      ? session.checkpoint as Record<string, unknown>
      : {};
    const allocationId = typeof existingCheckpoint.allocationId === "string"
      ? existingCheckpoint.allocationId
      : typeof existingCheckpoint.allocation === "object" && existingCheckpoint.allocation
        ? String((existingCheckpoint.allocation as Record<string, unknown>).allocationId ?? "")
        : "";
    scriptRuntimeRepository.updateScriptRun(scriptRunId, {
      status: "RUNNING",
      currentStepNo,
      context
    });
    return runtimeSessionsService.saveCheckpoint(String(run.runtimeSessionId), {
      currentStepNo,
      context,
      allocation: typeof existingCheckpoint.allocation === "object"
        ? existingCheckpoint.allocation as Record<string, unknown>
        : undefined,
      checkpoint: {
        scriptRunId,
        currentStepNo,
        context,
        jobId: session.jobId ?? existingCheckpoint.jobId ?? null,
        allocationId: allocationId || null,
        instanceId: session.instanceId ?? existingCheckpoint.instanceId ?? null,
        hostId: session.hostId ?? existingCheckpoint.hostId ?? null,
        updatedAt: now(),
        lastStepOutput: output
      }
    });
  }
};
