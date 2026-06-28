import { orchestratorRepository } from "../orchestrator/orchestrator.repository";
import { orchestratorService } from "../orchestrator/orchestrator.service";
import { managerBridgeService } from "../manager-bridge/manager-bridge.service";
import { hostAgentService } from "../host-agent-adapter/host-agent.service";
import { productionBatchRepository } from "../production-batches/production-batch.repository";
import { promptRenderService } from "../prompt-builder/prompt-render.service";
import { scriptRuntimeRepository } from "../script-runtime/script-runtime.repository";
import { scriptRuntimeService } from "../script-runtime/script-runtime.service";
import { runtimeSessionsService } from "../runtime-sessions/runtime-sessions.service";
import { instanceSchedulerRepository } from "../instance-scheduler/instance-scheduler.repository";
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

  if (targetStageType === "POST_CONTENT") {
    return "POST_CONTENT";
  }

  return null;
}

function usageTypeForOutput(sourceBatchType: unknown, outputBatchType: BatchType) {
  if (sourceBatchType === "IMAGE_BATCH" && outputBatchType === "VIDEO_BATCH") return "IMAGE_TO_VIDEO";
  if (sourceBatchType === "VIDEO_BATCH" && outputBatchType === "FINAL_VIDEO") return "VIDEO_TO_FINAL";
  if (sourceBatchType === "FINAL_VIDEO" && outputBatchType === "POST_CONTENT") return "FINAL_TO_POST_CONTENT";
  return null;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function metadataPick(source: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys
    .filter((key) => source[key] !== undefined)
    .map((key) => [key, source[key]]));
}

function sourceAssetsSnapshotFromMetadata(metadata: Record<string, unknown>) {
  const direct = metadata.sourceAssetsSnapshot;
  if (direct && typeof direct === "object") return direct as Record<string, unknown>;
  const groupBatch = objectValue(metadata.characterGroupBatch);
  const nested = groupBatch.sourceAssetsSnapshot;
  return nested && typeof nested === "object" ? nested as Record<string, unknown> : {};
}

function imageEditSourceAssetCount(sourceAssetsSnapshot: Record<string, unknown>) {
  const characters = Array.isArray(sourceAssetsSnapshot.characters) ? sourceAssetsSnapshot.characters : [];
  return characters.reduce((total, item) => {
    const character = objectValue(item);
    return total + (character.youngOriginalImage ? 1 : 0) + (character.oldOriginalImage ? 1 : 0);
  }, 0);
}

function findCharacterInGroup(group: Record<string, unknown> | null, characterId?: string) {
  const characters = Array.isArray(group?.characters) ? group.characters : [];
  return characters.map(objectValue).find((character) => String(character.id ?? character.characterId ?? "") === characterId) ?? null;
}

export const jobExecutorService = {
  async executeMockJob(jobId: string) {
    let job = orchestratorRepository.getJob(jobId);
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    if (job.status === "PENDING" && job.targetStageType === "POST_CONTENT") {
      job = orchestratorRepository.updateJobStatus(jobId, "ALLOCATED", {
        allocationMode: "MOCK_NO_INSTANCE"
      });
      if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    }
    if (job.status !== "ALLOCATED") {
      throw new AppError("JOB_NOT_EXECUTABLE", "Only ALLOCATED jobs can be mock executed");
    }

    const runtimeSession = runtimeSessionsService.createForJob(jobId);
    if (!runtimeSession) {
      throw new AppError("RUNTIME_SESSION_CREATE_FAILED", "Could not create runtime session");
    }

    orchestratorService.startJob(jobId);
    runtimeSessionsService.updateRuntimeSession(String(runtimeSession.id), {
      status: "RUNNING",
      currentStepNo: 1
    });
    const runtimeStep = runtimeSessionsService.createRuntimeStep(String(runtimeSession.id), {
      stepNo: 1,
      stepType: String(job.targetStageType),
      status: "RUNNING",
      input: {
        jobId,
        sourceBatchId: job.sourceBatchId,
        targetStageType: job.targetStageType
      },
      output: {}
    });

    await delay(25);

    const output = this.createOutputBatch(job, { mock: true });
    runtimeSessionsService.updateRuntimeStep(String(runtimeStep.id), {
      status: "COMPLETED",
      output
    });
    runtimeSessionsService.saveCheckpoint(String(runtimeSession.id), {
      currentStepNo: 1,
      context: {
        output
      },
      checkpoint: {
        result: output
      }
    });
    runtimeSessionsService.updateRuntimeSession(String(runtimeSession.id), {
      status: "COMPLETED",
      currentStepNo: 1
    });
    return orchestratorService.completeJob(jobId, output);
  },

  /**
   * @deprecated Use Host Agent V2 direct execution.
   */
  async executeV1Job(jobId: string) {
    const job = orchestratorRepository.getJob(jobId);
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    if (job.status !== "ALLOCATED") {
      throw new AppError("JOB_NOT_EXECUTABLE", "Only ALLOCATED jobs can be executed through Manager V1");
    }

    const payload = job.payload as Record<string, unknown>;
    const instanceId = payload.instanceId;
    if (typeof instanceId !== "string" || !instanceId) {
      throw new AppError("JOB_ALLOCATION_NOT_FOUND", "Allocated job payload is missing instanceId");
    }

    let managerTask: { taskId: string };
    if (job.targetStageType === "IMAGE_EDIT") {
      managerTask = await managerBridgeService.createImageEditTaskFromBatch(String(job.sourceBatchId));
    } else if (job.targetStageType === "VIDEO_GENERATE") {
      managerTask = await managerBridgeService.createVideoGenerateTaskFromBatch(String(job.sourceBatchId));
    } else {
      throw new AppError(
        "MANAGER_V1_STAGE_UNSUPPORTED",
        `Manager V1 bridge does not support ${String(job.targetStageType)} jobs`
      );
    }

    orchestratorRepository.updateJobStatus(jobId, "ALLOCATED", {
      managerTaskId: managerTask.taskId
    });

    await managerBridgeService.runManagerTask(managerTask.taskId, instanceId);

    const runnableJob = orchestratorRepository.getJob(jobId);
    if (!runnableJob) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);

    orchestratorService.startJob(jobId);

    const output = this.createOutputBatch(runnableJob, {
      mock: false,
      managerTaskId: managerTask.taskId
    });

    return orchestratorService.completeJob(jobId, output);
  },

  async executeImageEditJob(jobId: string) {
    const job = orchestratorRepository.getJob(jobId);
    if (!job) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    if (job.status !== "ALLOCATED") {
      throw new AppError("JOB_NOT_EXECUTABLE", "Only ALLOCATED jobs can be executed as IMAGE_EDIT");
    }
    if (job.targetStageType !== "IMAGE_EDIT") {
      throw new AppError("JOB_STAGE_TYPE_MISMATCH", "Only IMAGE_EDIT jobs can use execute-image-edit");
    }

    const sourceBatch = productionBatchRepository.get(String(job.sourceBatchId));
    if (!sourceBatch) throw new AppError("SOURCE_BATCH_NOT_FOUND", "Source production batch not found", 404);

    const payload = objectValue(job.payload);
    const allocation = stringValue(payload.allocationId)
      ? instanceSchedulerRepository.getAllocation(String(payload.allocationId))
      : instanceSchedulerRepository.getActiveAllocationByJob(jobId);
    const metadata = objectValue(sourceBatch.metadata);
    const promptTemplates = objectValue(metadata.promptTemplates);
    const host = stringValue(payload.hostId)
      ?? stringValue(metadata.hostId)
      ?? stringValue(hostAgentService.getDefaultHost()?.id);
    if (!host) throw new AppError("HOST_NOT_FOUND", "No active Host Agent host is registered");

    const instanceId = stringValue(payload.instanceId);
    if (!instanceId) throw new AppError("JOB_ALLOCATION_NOT_FOUND", "Allocated job payload is missing instanceId");
    const localId = payload.localId ?? allocation?.localId ?? null;
    const adbId = stringValue(payload.adbId) ?? (typeof allocation?.adbId === "string" ? allocation.adbId : null);

    const script = stringValue(payload.scriptId)
      ?? stringValue(metadata.scriptId)
      ?? stringValue(metadata.imageEditScriptId)
      ?? stringValue(scriptRuntimeRepository.getLatestActiveScript()?.id);
    if (!script) throw new AppError("SCRIPT_REQUIRED", "No script is available for IMAGE_EDIT execution");

    const groupId = stringValue(payload.groupId) ?? stringValue(sourceBatch.sourceGroupId);
    const characterId = stringValue(payload.characterId);
    const sourceAssetId = stringValue(payload.sourceAssetId);
    const sourceImageRole = stringValue(payload.sourceImageRole) ?? "source";
    const orderNo = typeof payload.orderNo === "number" ? payload.orderNo : 1;
    if (!sourceAssetId) throw new AppError("IMAGE_EDIT_SOURCE_ASSET_REQUIRED", "IMAGE_EDIT child job payload must include sourceAssetId", 400);
    const templateId = stringValue(promptTemplates.image)
      ?? stringValue(metadata.imagePromptTemplateId)
      ?? stringValue(metadata.promptTemplateId);
    const renderedPrompt = groupId && templateId
      ? promptRenderService.renderImagePrompt({ templateId, groupId })
      : { prompt: "" };

    const group = groupId ? promptRenderService.getGroupPromptContext(groupId) : null;
    const character = findCharacterInGroup(group as Record<string, unknown> | null, characterId);
    const sourceAssetsSnapshot = sourceAssetsSnapshotFromMetadata(metadata);
    const payloadSourceAsset = objectValue(payload.sourceAsset);
    const sourceAsset = {
      id: sourceAssetId,
      role: sourceImageRole,
      absolutePath: stringValue(payloadSourceAsset.absolutePath) ?? stringValue(payloadSourceAsset.filePath),
      filePath: stringValue(payloadSourceAsset.filePath),
      publicUrl: stringValue(payloadSourceAsset.publicUrl),
      name: stringValue(payloadSourceAsset.name)
    };
    const currentUpload = {
      assetId: sourceAssetId,
      characterId,
      sourceImageRole,
      role: sourceImageRole,
      orderNo
    };
    const context = {
      group,
      character,
      attributes: sourceBatch.attributes,
      sourceAssetsSnapshot,
      sourceAsset,
      currentUpload,
      groupId,
      characterId,
      sourceAssetId,
      sourceImageRole,
      orderNo,
      imageEditInputs: {
        sourceAssetMode: "SINGLE_SOURCE_IMAGE",
        sourceAssetsSnapshot
      },
      asset: {
        currentSourceImage: sourceAsset
      },
      prompt: {
        image: renderedPrompt.prompt
      },
      runtime: {
        instanceId,
        localId,
        hostId: host,
        adbId
      },
      allocation: {
        allocationId: payload.allocationId ?? allocation?.id ?? null,
        poolId: payload.poolId ?? allocation?.poolId ?? null,
        instanceId,
        localId,
        hostId: host,
        adbId
      },
      sourceBatch,
      job
    };

    const runtimeSession = runtimeSessionsService.createRuntimeSession({
      jobId,
      hostId: host,
      instanceId,
      scriptId: script,
      status: "PENDING",
      currentStepNo: 0,
      context,
      checkpoint: {
        jobId,
        allocationId: payload.allocationId ?? null,
        instanceId,
        localId,
        hostId: host,
        adbId,
        currentStepNo: 0,
        context
      }
    });

    if (!runtimeSession) {
      throw new AppError("RUNTIME_SESSION_CREATE_FAILED", "Could not create runtime session");
    }

    orchestratorService.startJob(jobId);
    const scriptRun = scriptRuntimeService.createScriptRun(String(runtimeSession.id), {
      scriptId: script,
      context
    });
    if (!scriptRun) throw new AppError("SCRIPT_RUN_CREATE_FAILED", "Could not create script run");
    const completedRun = await scriptRuntimeService.executeScriptRun(String(scriptRun.id));
    const lastOutput = objectValue(objectValue(completedRun?.context).lastStepOutput);
    const outputBatchId = stringValue(payload.outputBatchId)
      ?? stringValue(objectValue(lastOutput.outputBatch).id)
      ?? null;
    const editedAssetId = stringValue(objectValue(lastOutput.asset).id);

    const result = {
      outputBatchId,
      outputBatchType: "IMAGE_BATCH",
      runtimeSessionId: runtimeSession.id,
      scriptRunId: completedRun?.id ?? null,
      sourceAssetId,
      sourceImageRole,
      characterId,
      orderNo,
      editedAssetId,
      prompt: renderedPrompt.prompt
    };

    return orchestratorService.completeJob(jobId, result);
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

  mockExecutePostContent() {
    return {
      producedBatchType: "POST_CONTENT",
      mock: true
    };
  },

  createOutputBatch(job: {
    id: unknown;
    sourceBatchId: unknown;
    targetStageType: unknown;
    payload: Record<string, unknown>;
  }, options: {
    mock: boolean;
    managerTaskId?: string;
  }) {
    const outputBatchType = outputBatchTypeForStage(job.targetStageType);
    if (!outputBatchType) {
      return {
        outputBatchId: null,
        outputBatchType: null,
        mock: options.mock,
        ...(options.managerTaskId ? { managerTaskId: options.managerTaskId } : {})
      };
    }

    const sourceBatch = productionBatchRepository.get(String(job.sourceBatchId));
    if (!sourceBatch) {
      throw new AppError("SOURCE_BATCH_NOT_FOUND", "Source production batch not found", 404);
    }
    const sourceMetadata = objectValue(sourceBatch.metadata);
    const sourceAttributes = objectValue(sourceBatch.attributes);
    const musicMetadata = outputBatchType === "MUSIC_TRACK"
      ? {
          ...metadataPick(sourceAttributes, ["mood", "tempo", "style", "scene", "emotion", "tags"]),
          ...metadataPick(sourceMetadata, ["mood", "tempo", "style", "scene", "emotion", "tags"])
        }
      : {};

    const usageStatus: BatchUsageStatus = outputBatchType === "MUSIC_TRACK" ? "REUSABLE" : "AVAILABLE";
    const postContent = outputBatchType === "POST_CONTENT"
      ? promptRenderService.generatePostContentForFinalVideo(String(sourceBatch.id), {
          templateId: typeof job.payload.promptTemplateId === "string" ? job.payload.promptTemplateId : undefined,
          hashtagsTemplateId: typeof job.payload.hashtagsTemplateId === "string" ? job.payload.hashtagsTemplateId : undefined,
          mock: options.mock
        })
      : null;
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
        mock: options.mock,
        ...(sourceMetadata.sourceAssetsSnapshot ? { sourceAssetsSnapshot: sourceMetadata.sourceAssetsSnapshot } : {}),
        ...(sourceMetadata.characterGroupBatch ? { characterGroupBatch: sourceMetadata.characterGroupBatch } : {}),
        ...(sourceMetadata.musicPolicy ? { musicPolicy: sourceMetadata.musicPolicy } : {}),
        ...musicMetadata,
        ...(postContent ?? {}),
        ...(options.managerTaskId ? { managerTaskId: options.managerTaskId } : {})
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
      mock: options.mock,
      ...(postContent ? { postContent } : {}),
      ...(options.managerTaskId ? { managerTaskId: options.managerTaskId } : {})
    };
  },

  createMockOutputBatch(job: {
    id: unknown;
    sourceBatchId: unknown;
    targetStageType: unknown;
    payload: Record<string, unknown>;
  }) {
    return this.createOutputBatch(job, { mock: true });
  }
};
