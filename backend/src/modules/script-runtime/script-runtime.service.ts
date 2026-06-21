import { assetsService } from "../assets/assets.service";
import { hostAgentService } from "../host-agent-adapter/host-agent.service";
import { instancesRepository } from "../instances/instances.repository";
import { instanceSchedulerRepository } from "../instance-scheduler/instance-scheduler.repository";
import { productionBatchRepository } from "../production-batches/production-batch.repository";
import { runtimeRecoveryService } from "../runtime-recovery/runtime-recovery.service";
import { runtimeSessionsService } from "../runtime-sessions/runtime-sessions.service";
import { AppError, now } from "../shared/resource";
import { scriptAssetResolver } from "./script-asset-resolver.service";
import { scriptRuntimeRepository } from "./script-runtime.repository";
import type {
  CreateScriptInput,
  CreateScriptVersionInput,
  RunScriptInput,
  ScriptStepDefinition,
  TestRunScriptInput,
  UpdateScriptInput,
  UpdateScriptVersionInput
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

function objectFrom(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

type ResolvedTestRunHost = {
  requestedHostId: string;
  requestedHostDbId?: string;
  resolvedHostId: string;
  resolvedHostDbId: string;
  instanceId: string;
  instanceHostId?: string | null;
  localId?: string | number;
  hostConflict?: boolean;
};

function runtimeContext(input: TestRunScriptInput, resolvedHost: ResolvedTestRunHost) {
  return mergeContext(input.context, {
    adbId: input.adbId,
    localId: input.localId ?? resolvedHost.localId,
    runtime: {
      instanceId: input.instanceId,
      localId: input.localId ?? resolvedHost.localId,
      hostId: resolvedHost.resolvedHostId,
      hostDbId: resolvedHost.resolvedHostDbId,
      requestedHostId: input.hostId,
      requestedHostDbId: input.hostDbId,
      adbId: input.adbId
    }
  });
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

function firstRecordFrom(value: unknown) {
  if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function deriveAssetContext(context: Record<string, unknown>) {
  const direct = context.asset && typeof context.asset === "object" ? context.asset as Record<string, unknown> : {};
  const snapshot = (context.sourceAssetsSnapshot && typeof context.sourceAssetsSnapshot === "object" ? context.sourceAssetsSnapshot : undefined)
    ?? getPathValue(context, "batch.metadata.sourceAssetsSnapshot")
    ?? getPathValue(context, "productionBatch.metadata.sourceAssetsSnapshot")
    ?? getPathValue(context, "sourceBatch.metadata.sourceAssetsSnapshot");
  const snapshotRecord = snapshot && typeof snapshot === "object" ? snapshot as Record<string, unknown> : {};
  const character = firstRecordFrom(snapshotRecord.characters);
  return mergeContext({
    youngOriginalImage: character?.youngOriginalImage,
    oldOriginalImage: character?.oldOriginalImage
  }, direct);
}

function resolveAdbId(input: Record<string, unknown>, context: Record<string, unknown>) {
  const direct = input.adbId;
  if (typeof direct === "string" && direct) return direct;

  const contextAdbId = context.adbId;
  if (typeof contextAdbId === "string" && contextAdbId) return contextAdbId;

  const runtimeAdbId = getPathValue(context, "runtime.adbId");
  if (typeof runtimeAdbId === "string" && runtimeAdbId) return runtimeAdbId;

  const allocation = context.allocation;
  if (allocation && typeof allocation === "object") {
    const allocationAdbId = (allocation as Record<string, unknown>).adbId;
    if (typeof allocationAdbId === "string" && allocationAdbId) return allocationAdbId;
  }

  const jobPayloadAdbId = getPathValue(context, "job.payload.adbId") ?? getPathValue(context, "payload.adbId");
  if (typeof jobPayloadAdbId === "string" && jobPayloadAdbId) return jobPayloadAdbId;

  const checkpoint = context.checkpoint;
  if (checkpoint && typeof checkpoint === "object") {
    const checkpointAdbId = (checkpoint as Record<string, unknown>).adbId;
    if (typeof checkpointAdbId === "string" && checkpointAdbId) return checkpointAdbId;
  }

  throw new AppError("ADB_ID_REQUIRED", "adbId is required", 400);
}

function resolveLocalId(input: Record<string, unknown>, context: Record<string, unknown>) {
  const direct = input.localId;
  if ((typeof direct === "string" || typeof direct === "number") && String(direct)) return direct;

  const contextLocalId = context.localId ?? getPathValue(context, "runtime.localId");
  if ((typeof contextLocalId === "string" || typeof contextLocalId === "number") && String(contextLocalId)) return contextLocalId;

  const allocationLocalId = getPathValue(context, "allocation.localId");
  if ((typeof allocationLocalId === "string" || typeof allocationLocalId === "number") && String(allocationLocalId)) return allocationLocalId;

  const jobPayloadLocalId = getPathValue(context, "job.payload.localId") ?? getPathValue(context, "payload.localId");
  if ((typeof jobPayloadLocalId === "string" || typeof jobPayloadLocalId === "number") && String(jobPayloadLocalId)) return jobPayloadLocalId;

  return undefined;
}

function normalizeAdbDevices(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const nested = record.result && typeof record.result === "object" ? record.result as Record<string, unknown> : {};
  const devicesRecord = record.devices && typeof record.devices === "object" && !Array.isArray(record.devices)
    ? record.devices as Record<string, unknown>
    : {};
  const dataRecord = record.data && typeof record.data === "object" ? record.data as Record<string, unknown> : {};
  const devices = Array.isArray(record.devices)
    ? record.devices
    : Array.isArray(record.adbDevices)
      ? record.adbDevices
      : Array.isArray(devicesRecord.devices)
        ? devicesRecord.devices
        : Array.isArray(devicesRecord.adbDevices)
          ? devicesRecord.adbDevices
          : Array.isArray(dataRecord.devices)
            ? dataRecord.devices
            : Array.isArray(dataRecord.adbDevices)
              ? dataRecord.adbDevices
      : Array.isArray(nested.devices)
        ? nested.devices
        : Array.isArray(nested.adbDevices)
          ? nested.adbDevices
          : [];
  return devices.map((device) => device && typeof device === "object" ? device as Record<string, unknown> : {});
}

function deviceIdentifier(device: Record<string, unknown>) {
  return String(device.adbId ?? device.id ?? device.serial ?? "").trim();
}

function deviceState(device: Record<string, unknown>) {
  return String(device.state ?? device.status ?? device.adbStatus ?? "").trim().toLowerCase();
}

function hostDebugInfo(resolvedHost: ResolvedTestRunHost, adbId: string, devices: Record<string, unknown>[], validationEndpoint: string) {
  return {
    requestedHostId: resolvedHost.requestedHostId,
    requestedHostDbId: resolvedHost.requestedHostDbId,
    resolvedHostId: resolvedHost.resolvedHostId,
    resolvedHostDbId: resolvedHost.resolvedHostDbId,
    instanceId: resolvedHost.instanceId,
    instanceHostId: resolvedHost.instanceHostId,
    adbId,
    reportedDevices: devices.map((device) => ({
      adbId: deviceIdentifier(device),
      state: deviceState(device),
      raw: device
    })),
    validationEndpoint
  };
}

async function assertAdbDeviceReady(resolvedHost: ResolvedTestRunHost, adbId: string) {
  const response = await hostAgentService.listAdbDevices(resolvedHost.resolvedHostDbId);
  const devices = normalizeAdbDevices(response);
  const host = hostAgentService.getHostRequired(resolvedHost.resolvedHostDbId);
  const validationEndpoint = `${String(host.baseUrl).replace(/\/+$/, "")}/adb/devices`;
  const requestedAdbId = adbId.trim();
  const detail = hostDebugInfo(resolvedHost, requestedAdbId, devices, validationEndpoint);
  const device = devices.find((item) => deviceIdentifier(item) === requestedAdbId);
  if (!device) {
    throw new AppError("ADB_DEVICE_NOT_FOUND", `ADB device ${requestedAdbId} was not reported by the resolved Host Agent`, 409, detail);
  }

  const state = deviceState(device);
  if (!["device", "online"].includes(state)) {
    throw new AppError("ADB_DEVICE_NOT_READY", `ADB device ${requestedAdbId} is ${state || "not ready"}. Refresh/sync the host or restart the emulator before Test Run.`, 409, detail);
  }
}

function resolveTestRunHost(input: TestRunScriptInput): ResolvedTestRunHost {
  const instance = instancesRepository.get(input.instanceId);
  const requestedHost = hostAgentService.getHost(input.hostId) ?? (input.hostDbId ? hostAgentService.getHost(input.hostDbId) : null);
  const hostFromInstance = instance?.hostId ? hostAgentService.getHost(String(instance.hostId)) : null;
  const resolvedHost = hostFromInstance ?? requestedHost;
  if (!resolvedHost) {
    throw new AppError("HOST_NOT_FOUND", "Could not resolve Host Agent host for Test Run", 404, {
      requestedHostId: input.hostId,
      requestedHostDbId: input.hostDbId,
      instanceId: input.instanceId,
      instanceHostId: instance?.hostId ?? null
    });
  }

  const hostConflict = Boolean(instance?.hostId && requestedHost && String(instance.hostId) !== String(requestedHost.hostId) && String(instance.hostId) !== String(requestedHost.id));
  if (hostConflict) {
    console.warn("[script-test-run] frontend hostId conflicts with instance host; using instance host", {
      requestedHostId: input.hostId,
      requestedHostDbId: input.hostDbId,
      requestedResolvedHostId: requestedHost?.hostId,
      instanceId: input.instanceId,
      instanceHostId: instance?.hostId,
      resolvedHostId: resolvedHost.hostId
    });
  }

  return {
    requestedHostId: input.hostId,
    requestedHostDbId: input.hostDbId,
    resolvedHostId: String(resolvedHost.hostId),
    resolvedHostDbId: String(resolvedHost.id),
    instanceId: input.instanceId,
    instanceHostId: instance?.hostId ?? null,
    localId: input.localId ?? instance?.localId,
    hostConflict
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function outputBatchTypeForRole(outputRole: string) {
  if (outputRole === "VIDEO_TRANSITION_RESULT") return "VIDEO_BATCH";
  if (outputRole === "VIDEO_COMPOSE_RESULT") return "FINAL_VIDEO";
  if (outputRole === "IMAGE_EDIT_RESULT") return "IMAGE_BATCH";
  return null;
}

function mediaTypeFromMime(value: unknown) {
  const mimeType = String(value ?? "").toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "unknown";
}

function assetSubtypeForOutput(outputRole: string) {
  if (outputRole === "IMAGE_EDIT_RESULT") return "EDITED_IMAGE";
  if (outputRole === "VIDEO_TRANSITION_RESULT") return "VIDEO_TRANSITION";
  if (outputRole === "VIDEO_COMPOSE_RESULT") return "COMPOSED_VIDEO";
  return "TEST_RUN_RESULT";
}

function productionContextInfo(context: Record<string, unknown>) {
  return {
    jobId: stringValue(getPathValue(context, "job.id")) ?? stringValue(context.jobId),
    workflowId: stringValue(getPathValue(context, "sourceBatch.workflowId")) ?? stringValue(getPathValue(context, "batch.workflowId")),
    workflowRunId: stringValue(getPathValue(context, "sourceBatch.workflowRunId")) ?? stringValue(getPathValue(context, "batch.workflowRunId")),
    sourceBatchId: stringValue(getPathValue(context, "sourceBatch.id")) ?? stringValue(getPathValue(context, "batch.id")) ?? stringValue(context.sourceBatchId),
    sourceGroupId: stringValue(getPathValue(context, "sourceBatch.sourceGroupId")) ?? stringValue(getPathValue(context, "batch.sourceGroupId")),
    runtimeSessionId: stringValue(context.runtimeSessionId)
  };
}

async function captureDownloadedOutput(params: {
  scriptRunId: string;
  session: ReturnType<typeof runtimeSessionsService.getSession>;
  input: Record<string, unknown>;
  context: Record<string, unknown>;
  agentOutput: unknown;
}) {
  const pulled = (params.agentOutput && typeof params.agentOutput === "object" && "result" in params.agentOutput)
    ? (params.agentOutput as Record<string, unknown>).result
    : params.agentOutput;
  const file = pulled && typeof pulled === "object" ? pulled as Record<string, unknown> : {};
  const outputRole = stringValue(params.input.outputRole) ?? "TEST_RUN_RESULT";
  const production = productionContextInfo(params.context);
  const currentUpload = objectFrom(params.context.currentUpload);
  const sourceAssetId = stringValue(currentUpload.assetId) ?? stringValue(params.input.sourceAssetId);
  const characterId = stringValue(currentUpload.characterId) ?? stringValue(params.input.characterId);
  const sourceImageRole = stringValue(currentUpload.sourceImageRole) ?? stringValue(currentUpload.role);
  const hasProductionContext = Boolean(production.jobId || production.sourceBatchId || production.workflowId);
  const createAsset = boolValue(params.input.createAsset, true) && hasProductionContext;
  const createOrUpdateBatch = boolValue(params.input.createOrUpdateBatch, true) && hasProductionContext;
  const outputBatchType = outputBatchTypeForRole(outputRole);
  const capturedMetadata = {
    outputRole,
    sourceAssetId,
    sourceImageRole,
    characterId,
    jobId: production.jobId,
    runtimeSessionId: params.session.id,
    scriptRunId: params.scriptRunId,
    sourceBatchId: production.sourceBatchId,
    workflowId: production.workflowId,
    workflowRunId: production.workflowRunId,
    remotePath: file.remotePath,
    warning: file.warning
  };

  if (!createAsset) {
    return {
      label: "Test Run Result",
      outputRole,
      pulledFile: file,
      productionContext: hasProductionContext,
      asset: null,
      outputBatch: null
    };
  }

  const asset = await assetsService.create({
    characterId: characterId ?? undefined,
    assetCategory: mediaTypeFromMime(file.mimeType) === "video" ? "VIDEO_TEMPLATE" : "CHARACTER_IMAGE",
    assetSubType: assetSubtypeForOutput(outputRole),
    mediaType: mediaTypeFromMime(file.mimeType),
    versionNo: 1,
    isBestVersion: false,
    name: stringValue(file.fileName) ?? `download-output-${Date.now()}`,
    storageProvider: "host-agent",
    storageKey: stringValue(file.hostFilePath) ?? undefined,
    filePath: stringValue(file.hostFilePath) ?? undefined,
    publicUrl: stringValue(file.publicUrl) ?? undefined,
    previewUrl: stringValue(file.publicUrl) ?? undefined,
    mimeType: stringValue(file.mimeType) ?? undefined,
    fileSize: typeof file.fileSize === "number" ? file.fileSize : 0,
    sourceAssetId: sourceAssetId ?? undefined,
    status: "available",
    usageStatus: "available",
    usagePolicy: "reusable",
    qualityStatus: "draft",
    tags: [outputRole, "download-latest"],
    attributes: {
      outputRole,
      sourceImageRole
    },
    metadata: capturedMetadata
  });

  if (sourceAssetId && asset?.id) {
    assetsService.createRelation({
      sourceAssetId,
      targetAssetId: String(asset.id),
      relationType: "GENERATED_OUTPUT",
      workflowRunId: production.workflowRunId ?? undefined,
      taskRunId: params.scriptRunId,
      metadata: capturedMetadata
    });
  }

  let outputBatch = null;
  if (createOrUpdateBatch && outputBatchType && asset?.id) {
    const existing = productionBatchRepository.list().find((batch) => {
      const metadata = objectFrom(batch.metadata);
      return String(batch.batchType) === outputBatchType
        && stringValue(metadata.sourceJobId) === production.jobId
        && stringValue(metadata.outputRole) === outputRole;
    });
    outputBatch = existing
      ? productionBatchRepository.getDetail(String(existing.id))
      : productionBatchRepository.create({
        batchType: outputBatchType,
        sourceGroupId: production.sourceGroupId ?? undefined,
        workflowId: production.workflowId ?? undefined,
        workflowRunId: production.workflowRunId ?? undefined,
        status: "READY",
        usageStatus: "AVAILABLE",
        attributes: {},
        metadata: {
          sourceJobId: production.jobId,
          sourceBatchId: production.sourceBatchId,
          outputRole,
          runtimeSessionId: params.session.id,
          scriptRunId: params.scriptRunId
        }
      });
    if (outputBatch?.id) {
      productionBatchRepository.addItem(String(outputBatch.id), {
        itemType: "ASSET",
        itemId: String(asset.id),
        role: outputRole,
        sortOrder: Number(currentUpload.orderNo ?? 0),
        metadata: capturedMetadata
      });
      outputBatch = productionBatchRepository.setStatus(String(outputBatch.id), "READY", "AVAILABLE");
    }
  }

  const capturedOutput = {
    outputRole,
    pulledFile: file,
    asset,
    outputBatch,
    currentUpload,
    warning: file.warning
  };
  const previous = Array.isArray(params.context.capturedOutputs) ? params.context.capturedOutputs : [];
  return {
    ...capturedOutput,
    capturedOutputs: [...previous, capturedOutput]
  };
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

  getScript(id: string) {
    const script = scriptRuntimeRepository.getScript(id);
    if (!script) throw new AppError("SCRIPT_NOT_FOUND", "Script not found", 404);
    return script;
  },

  updateScript(id: string, input: UpdateScriptInput) {
    const script = scriptRuntimeRepository.updateScript(id, input);
    if (!script) throw new AppError("SCRIPT_NOT_FOUND", "Script not found", 404);
    return script;
  },

  deleteScript(id: string) {
    if (!scriptRuntimeRepository.deleteScript(id)) {
      throw new AppError("SCRIPT_NOT_FOUND", "Script not found", 404);
    }
  },

  createScriptVersion(scriptId: string, input: CreateScriptVersionInput) {
    const script = scriptRuntimeRepository.getScript(scriptId);
    if (!script) throw new AppError("SCRIPT_NOT_FOUND", "Script not found", 404);
    return scriptRuntimeRepository.createScriptVersion(scriptId, input);
  },

  listScriptVersions(scriptId: string) {
    const script = scriptRuntimeRepository.getScript(scriptId);
    if (!script) throw new AppError("SCRIPT_NOT_FOUND", "Script not found", 404);
    return scriptRuntimeRepository.listScriptVersions(scriptId);
  },

  getScriptVersion(id: string) {
    const version = scriptRuntimeRepository.getScriptVersion(id);
    if (!version) throw new AppError("SCRIPT_VERSION_NOT_FOUND", "Script version not found", 404);
    return version;
  },

  updateScriptVersion(id: string, input: UpdateScriptVersionInput) {
    const version = scriptRuntimeRepository.updateScriptVersion(id, input);
    if (!version) throw new AppError("SCRIPT_VERSION_NOT_FOUND", "Script version not found", 404);
    return version;
  },

  activateScriptVersion(id: string) {
    const version = scriptRuntimeRepository.activateScriptVersion(id);
    if (!version) throw new AppError("SCRIPT_VERSION_NOT_FOUND", "Script version not found", 404);
    return version;
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

  async testRunScript(scriptId: string, input: TestRunScriptInput) {
    const script = scriptRuntimeRepository.getScript(scriptId);
    if (!script) throw new AppError("SCRIPT_NOT_FOUND", "Script not found", 404);

    const version = input.scriptVersionId
      ? scriptRuntimeRepository.getScriptVersion(input.scriptVersionId)
      : scriptRuntimeRepository.getLatestScriptVersion(scriptId);

    if (!version || version.scriptId !== scriptId) {
      throw new AppError("SCRIPT_VERSION_NOT_FOUND", "Script version not found", 404);
    }

    const resolvedHost = resolveTestRunHost(input);
    const context = runtimeContext(input, resolvedHost);
    await assertAdbDeviceReady(resolvedHost, input.adbId);
    const session = runtimeSessionsService.createRuntimeSession({
      hostId: resolvedHost.resolvedHostDbId,
      instanceId: input.instanceId,
      scriptId,
      status: "PENDING",
      currentStepNo: 0,
      context,
      checkpoint: {
        currentStepNo: 0,
        context,
        instanceId: input.instanceId,
        hostId: resolvedHost.resolvedHostDbId,
        logicalHostId: resolvedHost.resolvedHostId,
        localId: resolvedHost.localId,
        adbId: input.adbId
      }
    });

    if (!session) throw new AppError("RUNTIME_SESSION_CREATE_FAILED", "Could not create runtime session");

    const run = this.createScriptRun(String(session.id), {
      scriptId,
      scriptVersionId: String(version.id),
      context
    });
    if (!run) throw new AppError("SCRIPT_RUN_CREATE_FAILED", "Could not create script run");

    const completedRun = await this.executeScriptRun(String(run.id));
    return {
      runtimeSessionId: session.id,
      scriptRunId: run.id,
      runtimeSession: runtimeSessionsService.getSession(String(session.id)),
      scriptRun: completedRun
    };
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
        const outputRecord = output && typeof output === "object" ? output as Record<string, unknown> : {};
        context = mergeContext(context, {
          uploadedFiles: Array.isArray(outputRecord.uploadedFiles) ? outputRecord.uploadedFiles : context.uploadedFiles,
          resolverState: outputRecord.resolverState && typeof outputRecord.resolverState === "object" ? outputRecord.resolverState : context.resolverState,
          currentUpload: outputRecord.currentUpload && typeof outputRecord.currentUpload === "object" ? outputRecord.currentUpload : context.currentUpload,
          capturedOutputs: Array.isArray(outputRecord.capturedOutputs) ? outputRecord.capturedOutputs : context.capturedOutputs,
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
    const effectiveContext = mergeContext(context, { asset: deriveAssetContext(context) });
    const input = renderInputTemplates(mergeContext(step.input), effectiveContext) as Record<string, unknown>;

    const stepRow = scriptRuntimeRepository.createScriptRunStep({
      scriptRunId,
      stepNo: Number(step.stepNo),
      stepType: step.stepType,
      status: "RUNNING",
      input
    });

    try {
      const output = await this.dispatchStep(scriptRunId, session, step.stepType, input, mergeContext(effectiveContext, { currentStepNo: step.stepNo }));
      const outputRecord = output && typeof output === "object"
        ? output as Record<string, unknown>
        : { value: output };
      scriptRuntimeRepository.updateScriptRunStep(String(stepRow?.id), {
        status: "COMPLETED",
        output: outputRecord
      });
      return outputRecord;
    } catch (error) {
      scriptRuntimeRepository.updateScriptRunStep(String(stepRow?.id), {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Step failed"
      });
      throw error;
    }
  },

  async dispatchStep(
    scriptRunId: string,
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
      return hostAgentService.takeScreenshot(session.hostId, {
        instanceId: session.instanceId,
        adbId: resolveAdbId(input, _context)
      });
    }

    if (stepType === "tap") {
      return hostAgentService.tap(session.hostId, {
        instanceId: session.instanceId,
        adbId: resolveAdbId(input, _context),
        x: Number(input.x),
        y: Number(input.y)
      });
    }

    if (stepType === "swipe") {
      return hostAgentService.swipe(session.hostId, {
        instanceId: session.instanceId,
        adbId: resolveAdbId(input, _context),
        x1: Number(input.x1),
        y1: Number(input.y1),
        x2: Number(input.x2),
        y2: Number(input.y2),
        durationMs: typeof input.durationMs === "number" ? input.durationMs : undefined
      });
    }

    if (stepType === "long-press") {
      return hostAgentService.longPress(session.hostId, {
        instanceId: session.instanceId,
        localId: resolveLocalId(input, _context),
        adbId: resolveAdbId(input, _context),
        x: Number(input.x),
        y: Number(input.y),
        durationMs: typeof input.durationMs === "number" ? input.durationMs : 1000
      });
    }

    if (stepType === "scroll-to-end") {
      const direction = input.direction === "up" ? "up" : "down";
      return hostAgentService.scrollToEnd(session.hostId, {
        instanceId: session.instanceId,
        localId: resolveLocalId(input, _context),
        adbId: resolveAdbId(input, _context),
        direction,
        iterations: typeof input.iterations === "number" ? input.iterations : undefined,
        durationMs: typeof input.durationMs === "number" ? input.durationMs : undefined,
        pauseMs: typeof input.pauseMs === "number" ? input.pauseMs : undefined,
        startX: typeof input.startX === "number" ? input.startX : undefined,
        startY: typeof input.startY === "number" ? input.startY : undefined,
        endX: typeof input.endX === "number" ? input.endX : undefined,
        endY: typeof input.endY === "number" ? input.endY : undefined
      });
    }

    if (stepType === "send-text") {
      return hostAgentService.sendText(session.hostId, {
        instanceId: session.instanceId,
        adbId: resolveAdbId(input, _context),
        text: String(input.text ?? "")
      });
    }

    if (stepType === "send-text-submit") {
      const adbId = resolveAdbId(input, _context);
      const textResult = await hostAgentService.sendText(session.hostId, {
        instanceId: session.instanceId,
        adbId,
        text: String(input.text ?? "")
      });
      const keyResult = await hostAgentService.sendKey(session.hostId, {
        instanceId: session.instanceId,
        adbId,
        key: typeof input.submitKey === "number" ? input.submitKey : String(input.submitKey ?? "ENTER")
      });
      return {
        text: textResult,
        submit: keyResult
      };
    }

    if (stepType === "send-key") {
      return hostAgentService.sendKey(session.hostId, {
        instanceId: session.instanceId,
        adbId: resolveAdbId(input, _context),
        key: typeof input.key === "number" ? input.key : String(input.key ?? "")
      });
    }

    if (stepType === "check-screen") {
      const screenshot = await hostAgentService.takeScreenshot(session.hostId, {
        instanceId: session.instanceId,
        adbId: resolveAdbId(input, _context)
      });
      return {
        screenshotExists: Boolean(screenshot),
        screenshot
      };
    }

    if (stepType === "download-result" || stepType === "download-latest") {
      const agentOutput = await hostAgentService.downloadLatest(session.hostId, {
        instanceId: session.instanceId,
        localId: resolveLocalId(input, _context),
        adbId: resolveAdbId(input, _context),
        sourceDir: typeof input.sourceDir === "string" ? input.sourceDir : undefined,
        extensions: Array.isArray(input.extensions) ? input.extensions.map(String) : undefined,
        targetFolder: typeof input.targetFolder === "string" ? input.targetFolder : "task-outputs",
        deleteAfterPull: typeof input.deleteAfterPull === "boolean" ? input.deleteAfterPull : undefined
      });
      return captureDownloadedOutput({
        scriptRunId,
        session,
        input,
        context: _context,
        agentOutput
      });
    }

    if (stepType === "clear-download") {
      return hostAgentService.clearDownload(session.hostId, {
        instanceId: session.instanceId,
        localId: resolveLocalId(input, _context),
        adbId: resolveAdbId(input, _context),
        sourceDir: typeof input.sourceDir === "string" ? input.sourceDir : undefined,
        extensions: Array.isArray(input.extensions) ? input.extensions.map(String) : undefined
      });
    }

    if (stepType === "upload-file") {
      const resolved = scriptAssetResolver.resolveUploadAsset(input, _context);
      const adbId = resolveAdbId(input, _context);
      const uploadedFilesThisStep = [];
      for (const asset of resolved.assetsToUpload) {
        const result = await hostAgentService.pushUploadFile(session.hostId, {
          instanceId: session.instanceId,
          localId: resolveLocalId(input, _context),
          adbId,
          runtimeSessionId: String(session.id),
          jobId: typeof session.jobId === "string" ? session.jobId : undefined,
          assetId: asset.assetId
        });
        uploadedFilesThisStep.push({
          ...asset,
          upload: (result as Record<string, unknown>).result ?? result
        });
      }
      const existingUploads = Array.isArray(_context.uploadedFiles) ? _context.uploadedFiles : [];
      const uploadedFiles = [...existingUploads, ...uploadedFilesThisStep];
      _context.uploadedFiles = uploadedFiles;
      _context.resolverState = resolved.resolverState;
      _context.currentUpload = resolved.assetsToUpload[0]
        ? {
          assetId: resolved.assetsToUpload[0].assetId,
          characterId: resolved.assetsToUpload[0].characterId,
          sourceImageRole: resolved.assetsToUpload[0].role,
          role: resolved.assetsToUpload[0].role,
          orderNo: resolved.assetsToUpload[0].orderNo
        }
        : _context.currentUpload;
      return {
        uploadedFile: uploadedFilesThisStep[0] ?? null,
        uploadedAssets: resolved.assetsToUpload,
        uploadedFiles,
        resolverState: resolved.resolverState,
        currentUpload: _context.currentUpload,
        assetSource: input.assetSource ?? (input.assetId ? "MANUAL_ASSET" : "IMAGE_EDIT_NEXT_SOURCE"),
        target: input.target ?? "android-file-picker",
        openPicker: input.openPicker !== false
      };
    }

    if (stepType === "cleanup-factory-temp") {
      return hostAgentService.cleanupFactoryTemp(session.hostId, {
        instanceId: session.instanceId,
        adbId: resolveAdbId(input, _context),
        olderThanHours: typeof input.olderThanHours === "number" ? input.olderThanHours : undefined,
        includeUploads: typeof input.includeUploads === "boolean" ? input.includeUploads : undefined,
        includeLiveScreenshots: typeof input.includeLiveScreenshots === "boolean" ? input.includeLiveScreenshots : undefined,
        includeDebugScreenshots: typeof input.includeDebugScreenshots === "boolean" ? input.includeDebugScreenshots : undefined
      });
    }

    if (stepType === "wait-screen") {
      const timeoutMs = typeof input.timeoutMs === "number" ? input.timeoutMs : 1000;
      await delay(Math.max(0, Math.min(timeoutMs, 5000)));
      const screenshot = await hostAgentService.takeScreenshot(session.hostId, {
        instanceId: session.instanceId,
        adbId: resolveAdbId(input, _context)
      });
      return { waitedMs: timeoutMs, screenshot };
    }

    if (stepType === "if" || stepType === "retry") {
      return { evaluated: true, skippedNestedExecution: true };
    }

    if (stepType === "run-sub-script") {
      const subScriptId = typeof input.scriptId === "string" ? input.scriptId : "";
      if (!subScriptId) throw new AppError("SUB_SCRIPT_REQUIRED", "run-sub-script requires scriptId");
      const subRun = this.createScriptRun(String(session.id), {
        scriptId: subScriptId,
        scriptVersionId: typeof input.scriptVersionId === "string" ? input.scriptVersionId : undefined,
        context: _context
      });
      if (!subRun) throw new AppError("SCRIPT_RUN_CREATE_FAILED", "Could not create sub-script run");
      return this.executeScriptRun(String(subRun.id));
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
