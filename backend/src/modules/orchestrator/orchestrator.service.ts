import { AppError } from "../shared/resource";
import { instanceSchedulerService } from "../instance-scheduler/instance-scheduler.service";
import { orchestratorRepository } from "./orchestrator.repository";
import { productionBatchRepository } from "../production-batches/production-batch.repository";
import type {
  CreateOrchestratorRuleInput,
  FailOrchestratorJobInput,
  UpdateOrchestratorRuleInput
} from "./orchestrator.schemas";

const instanceIssueCodes = [
  "INSTANCE_",
  "HOST_AGENT_",
  "ADB_",
  "CAPTCHA",
  "SCREEN_TIMEOUT"
];

function isInstanceIssueFailure(input: FailOrchestratorJobInput) {
  if (input.instanceIssue === true || input.isInstanceIssue === true) return true;
  const errorCode = input.errorCode ?? "";
  return instanceIssueCodes.some((prefix) => errorCode.startsWith(prefix));
}

type MusicPolicy = {
  mode: "RANDOM_LIBRARY" | "REQUIRE_MATCHED" | "CREATE_DEDICATED";
  matchAttributes: string[];
};

function recordValue(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeMusicPolicy(value: unknown): MusicPolicy {
  const record = recordValue(value);
  const mode = ["RANDOM_LIBRARY", "REQUIRE_MATCHED", "CREATE_DEDICATED"].includes(String(record.mode))
    ? String(record.mode) as MusicPolicy["mode"]
    : "RANDOM_LIBRARY";
  const matchAttributes = Array.isArray(record.matchAttributes)
    ? record.matchAttributes.map((item) => String(item)).filter(Boolean)
    : [];
  return { mode, matchAttributes };
}

function valueForMatch(source: ReturnType<typeof orchestratorRepository.listTriggerBatches>[number], key: string) {
  const attributes = recordValue(source.attributes);
  const metadata = recordValue(source.metadata);
  const value = attributes[key] ?? metadata[key];
  return value === undefined || value === null ? "" : String(value).trim().toLowerCase();
}

function musicValueForMatch(music: ReturnType<typeof orchestratorRepository.listReusableMusicTracks>[number], key: string) {
  const attributes = recordValue(music.attributes);
  const metadata = recordValue(music.metadata);
  const value = attributes[key] ?? metadata[key];
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  return value === undefined || value === null ? "" : String(value).trim().toLowerCase();
}

function musicMatches(source: ReturnType<typeof orchestratorRepository.listTriggerBatches>[number], music: ReturnType<typeof orchestratorRepository.listReusableMusicTracks>[number], keys: string[]) {
  return keys.every((key) => {
    const expected = valueForMatch(source, key);
    if (!expected) return true;
    const actual = musicValueForMatch(music, key);
    return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
  });
}

function resolveMusicPolicy(sourceBatch: ReturnType<typeof orchestratorRepository.listTriggerBatches>[number]) {
  const metadata = recordValue(sourceBatch.metadata);
  if (metadata.musicPolicy && typeof metadata.musicPolicy === "object") return normalizeMusicPolicy(metadata.musicPolicy);
  return normalizeMusicPolicy(orchestratorRepository.getWorkflowMusicPolicy(
    typeof sourceBatch.workflowId === "string" ? sourceBatch.workflowId : null
  ));
}

function selectMusicForPolicy(sourceBatch: ReturnType<typeof orchestratorRepository.listTriggerBatches>[number], policy: MusicPolicy) {
  if (policy.mode === "RANDOM_LIBRARY") return orchestratorRepository.getReusableOrAvailableMusic();
  const musicTracks = orchestratorRepository.listReusableMusicTracks();
  return musicTracks.find((music) => musicMatches(sourceBatch, music, policy.matchAttributes)) ?? null;
}

type TriggerBatch = ReturnType<typeof orchestratorRepository.listTriggerBatches>[number];
type ActiveRule = ReturnType<typeof orchestratorRepository.listActiveRules>[number];

type ResourceDrivenRule = {
  id?: string | null;
  targetStageType: string;
  config: Record<string, unknown>;
  resourceRule?: Record<string, unknown>;
  ruleSource: "GLOBAL" | "WORKFLOW_RESOURCE";
};

function parseRuleTrigger(trigger: unknown) {
  const [batchType, status] = String(trigger ?? "").split(".");
  if (!batchType || !status) return null;
  return { batchType, status };
}

function normalizeWorkflowResourceRule(resourceRule: Record<string, unknown>): ResourceDrivenRule | null {
  const targetStageType = String(resourceRule.targetJobType ?? "").trim();
  if (!targetStageType) return null;
  const requires = Array.isArray(resourceRule.requires)
    ? resourceRule.requires.map((item) => String(item))
    : [];
  return {
    id: null,
    targetStageType,
    resourceRule,
    ruleSource: "WORKFLOW_RESOURCE",
    config: {
      ...resourceRule,
      requiresMusic: requires.includes("MUSIC_TRACK") ? true : resourceRule.requiresMusic
    }
  };
}

function workflowRulesForBatch(sourceBatch: TriggerBatch) {
  if (typeof sourceBatch.workflowId !== "string" || !sourceBatch.workflowId) return [];
  return orchestratorRepository.getWorkflowResourceRules(sourceBatch.workflowId)
    .filter((rule) => {
      const trigger = parseRuleTrigger(rule.trigger);
      return trigger?.batchType === sourceBatch.batchType && trigger.status === sourceBatch.status;
    })
    .map(normalizeWorkflowResourceRule)
    .filter((rule): rule is ResourceDrivenRule => Boolean(rule));
}

function globalRuleForScan(rule: ActiveRule): ResourceDrivenRule {
  return {
    id: rule.id,
    targetStageType: rule.targetStageType,
    config: rule.config,
    ruleSource: "GLOBAL"
  };
}

function sourceAssetsSnapshot(sourceBatch: TriggerBatch) {
  const metadata = recordValue(sourceBatch.metadata);
  const direct = recordValue(metadata.sourceAssetsSnapshot);
  const groupBatch = recordValue(metadata.characterGroupBatch);
  const nested = recordValue(groupBatch.sourceAssetsSnapshot);
  return Object.keys(direct).length ? direct : nested;
}

function sourceImageFrom(value: unknown, role: "young" | "old", characterId: string | null, orderNo: number, sourceBatch: TriggerBatch) {
  const image = recordValue(value);
  const sourceAssetId = stringValue(image.id) ?? stringValue(image.assetId);
  if (!sourceAssetId) return null;
  return {
    groupId: stringValue(sourceBatch.sourceGroupId) ?? stringValue(recordValue(sourceBatch.metadata).groupId),
    characterId,
    sourceAssetId,
    sourceImageRole: role,
    orderNo,
    promptContext: {},
    sourceBatchId: sourceBatch.id,
    sourceAsset: {
      id: sourceAssetId,
      role,
      filePath: stringValue(image.filePath),
      absolutePath: stringValue(image.absolutePath) ?? stringValue(image.filePath),
      publicUrl: stringValue(image.publicUrl),
      name: stringValue(image.name)
    }
  };
}

function imageEditWorkItems(sourceBatch: TriggerBatch) {
  const snapshot = sourceAssetsSnapshot(sourceBatch);
  const characters = Array.isArray(snapshot.characters) ? snapshot.characters : [];
  let orderNo = 1;
  return characters.flatMap((item) => {
    const character = recordValue(item);
    const characterId = stringValue(character.characterId) ?? stringValue(recordValue(character.character).id);
    const young = sourceImageFrom(character.youngOriginalImage, "young", characterId, orderNo, sourceBatch);
    if (young) orderNo += 1;
    const old = sourceImageFrom(character.oldOriginalImage, "old", characterId, orderNo, sourceBatch);
    if (old) orderNo += 1;
    return [young, old].filter((workItem): workItem is NonNullable<typeof workItem> => Boolean(workItem));
  });
}

function ensureImageEditOutputBatch(sourceBatch: TriggerBatch, workItems: ReturnType<typeof imageEditWorkItems>) {
  const existing = productionBatchRepository.list().find((batch) => {
    const metadata = recordValue(batch.metadata);
    return String(batch.batchType) === "IMAGE_BATCH"
      && stringValue(metadata.sourceBatchId) === sourceBatch.id
      && stringValue(metadata.outputRole) === "IMAGE_EDIT_RESULT";
  });
  const items = workItems.map((item) => ({
    characterId: item.characterId,
    sourceAssetId: item.sourceAssetId,
    sourceImageRole: item.sourceImageRole,
    editedAssetId: null,
    jobId: null,
    orderNo: item.orderNo
  }));
  if (existing) {
    const metadata = recordValue(existing.metadata);
    const existingItems = Array.isArray(metadata.items) ? metadata.items.map(recordValue) : [];
    const mergedItems = items.map((item) => {
      const current = existingItems.find((existingItem) => stringValue(existingItem.sourceAssetId) === item.sourceAssetId);
      return current ? { ...item, ...current } : item;
    });
    return productionBatchRepository.update(String(existing.id), {
      status: String(existing.status) === "READY" ? "READY" : "RUNNING",
      usageStatus: "AVAILABLE",
      attributes: recordValue(existing.attributes),
      metadata: {
        ...metadata,
        sourceBatchId: sourceBatch.id,
        groupId: stringValue(sourceBatch.sourceGroupId),
        outputRole: "IMAGE_EDIT_RESULT",
        expectedCount: items.length,
        completedCount: mergedItems.filter((item) => stringValue(recordValue(item).editedAssetId)).length,
        items: mergedItems
      }
    });
  }
  return productionBatchRepository.create({
    batchType: "IMAGE_BATCH",
    sourceGroupId: stringValue(sourceBatch.sourceGroupId) ?? undefined,
    workflowId: stringValue(sourceBatch.workflowId) ?? undefined,
    workflowRunId: stringValue(sourceBatch.workflowRunId) ?? undefined,
    status: "RUNNING",
    usageStatus: "AVAILABLE",
    attributes: recordValue(sourceBatch.attributes),
    metadata: {
      sourceBatchId: sourceBatch.id,
      groupId: stringValue(sourceBatch.sourceGroupId),
      outputRole: "IMAGE_EDIT_RESULT",
      expectedCount: items.length,
      completedCount: 0,
      items
    }
  });
}

function imageBatchItems(sourceBatch: TriggerBatch) {
  const metadata = recordValue(sourceBatch.metadata);
  return Array.isArray(metadata.items)
    ? metadata.items.map(recordValue)
      .filter((item) => stringValue(item.editedAssetId))
      .sort((a, b) => Number(a.orderNo ?? 0) - Number(b.orderNo ?? 0))
    : [];
}

function videoTransitionWorkItems(sourceBatch: TriggerBatch) {
  const items = imageBatchItems(sourceBatch);
  const byCharacter = new Map<string, Record<string, unknown>[]>();
  for (const item of items) {
    const characterId = stringValue(item.characterId) ?? "unknown";
    byCharacter.set(characterId, [...(byCharacter.get(characterId) ?? []), item]);
  }
  const transitions: Array<Record<string, unknown>> = [];
  let orderNo = 1;
  for (const [characterId, characterItems] of byCharacter.entries()) {
    const oldImage = characterItems.find((item) => stringValue(item.sourceImageRole) === "old");
    const youngImage = characterItems.find((item) => stringValue(item.sourceImageRole) === "young");
    if (oldImage && youngImage) {
      transitions.push({
        transitionKey: `${characterId}:old-to-young`,
        transitionType: "SAME_CHARACTER_OLD_TO_YOUNG",
        fromAssetId: stringValue(oldImage.editedAssetId),
        toAssetId: stringValue(youngImage.editedAssetId),
        fromCharacterId: characterId,
        toCharacterId: characterId,
        orderNo: orderNo++
      });
    }
  }
  const youngItems = items.filter((item) => stringValue(item.sourceImageRole) === "young");
  const oldItems = items.filter((item) => stringValue(item.sourceImageRole) === "old");
  for (let index = 0; index < youngItems.length - 1; index += 1) {
    const from = youngItems[index];
    const to = oldItems[index + 1];
    if (!from || !to) continue;
    const fromCharacterId = stringValue(from.characterId);
    const toCharacterId = stringValue(to.characterId);
    transitions.push({
      transitionKey: `${fromCharacterId}:young-to:${toCharacterId}:old`,
      transitionType: "NEXT_CHARACTER_YOUNG_TO_OLD",
      fromAssetId: stringValue(from.editedAssetId),
      toAssetId: stringValue(to.editedAssetId),
      fromCharacterId,
      toCharacterId,
      orderNo: orderNo++
    });
  }
  return transitions.filter((item) => stringValue(item.fromAssetId) && stringValue(item.toAssetId));
}

function ensureVideoTransitionOutputBatch(sourceBatch: TriggerBatch, workItems: ReturnType<typeof videoTransitionWorkItems>) {
  const existing = productionBatchRepository.list().find((batch) => {
    const metadata = recordValue(batch.metadata);
    return String(batch.batchType) === "VIDEO_BATCH"
      && stringValue(metadata.sourceBatchId) === sourceBatch.id
      && stringValue(metadata.outputRole) === "VIDEO_TRANSITION_RESULT";
  });
  const items = workItems.map((item) => ({
    transitionKey: item.transitionKey,
    transitionType: item.transitionType,
    fromAssetId: item.fromAssetId,
    toAssetId: item.toAssetId,
    fromCharacterId: item.fromCharacterId,
    toCharacterId: item.toCharacterId,
    videoAssetId: null,
    jobId: null,
    orderNo: item.orderNo
  }));
  if (existing) {
    const metadata = recordValue(existing.metadata);
    const existingItems = Array.isArray(metadata.items) ? metadata.items.map(recordValue) : [];
    const mergedItems = items.map((item) => {
      const current = existingItems.find((existingItem) => stringValue(existingItem.transitionKey) === stringValue(item.transitionKey));
      return current ? { ...item, ...current } : item;
    });
    return productionBatchRepository.update(String(existing.id), {
      status: String(existing.status) === "READY" ? "READY" : "RUNNING",
      usageStatus: "AVAILABLE",
      attributes: recordValue(existing.attributes),
      metadata: {
        ...metadata,
        sourceBatchId: sourceBatch.id,
        groupId: stringValue(sourceBatch.sourceGroupId),
        outputRole: "VIDEO_TRANSITION_RESULT",
        expectedCount: items.length,
        completedCount: mergedItems.filter((item) => stringValue(recordValue(item).videoAssetId)).length,
        items: mergedItems
      }
    });
  }
  return productionBatchRepository.create({
    batchType: "VIDEO_BATCH",
    sourceGroupId: stringValue(sourceBatch.sourceGroupId) ?? undefined,
    workflowId: stringValue(sourceBatch.workflowId) ?? undefined,
    workflowRunId: stringValue(sourceBatch.workflowRunId) ?? undefined,
    status: "RUNNING",
    usageStatus: "AVAILABLE",
    attributes: recordValue(sourceBatch.attributes),
    metadata: {
      sourceBatchId: sourceBatch.id,
      groupId: stringValue(sourceBatch.sourceGroupId),
      outputRole: "VIDEO_TRANSITION_RESULT",
      expectedCount: items.length,
      completedCount: 0,
      items
    }
  });
}

function markImageEditItemFailed(job: ReturnType<typeof orchestratorRepository.getJob>) {
  if (!job || job.targetStageType !== "IMAGE_EDIT") return;
  const payload = recordValue(job.payload);
  const sourceAssetId = stringValue(payload.sourceAssetId);
  const outputBatchId = stringValue(payload.outputBatchId);
  if (!sourceAssetId || !outputBatchId) return;
  const batch = productionBatchRepository.get(String(outputBatchId));
  if (!batch) return;
  const metadata = recordValue(batch.metadata);
  const items = Array.isArray(metadata.items) ? metadata.items.map(recordValue) : [];
  const updatedItems = items.map((item) => stringValue(item.sourceAssetId) === sourceAssetId
    ? { ...item, failed: true, failedJobId: job.id }
    : item);
  productionBatchRepository.update(String(outputBatchId), {
    status: "RUNNING",
    usageStatus: "AVAILABLE",
    attributes: recordValue(batch.attributes),
    metadata: {
      ...metadata,
      failedCount: updatedItems.filter((item) => item.failed === true && !stringValue(item.editedAssetId)).length,
      completedCount: updatedItems.filter((item) => stringValue(item.editedAssetId)).length,
      items: updatedItems
    }
  });
}

function clearImageEditItemFailure(job: ReturnType<typeof orchestratorRepository.getJob>) {
  if (!job || job.targetStageType !== "IMAGE_EDIT") return;
  const payload = recordValue(job.payload);
  const sourceAssetId = stringValue(payload.sourceAssetId);
  const outputBatchId = stringValue(payload.outputBatchId);
  if (!sourceAssetId || !outputBatchId) return;
  const batch = productionBatchRepository.get(String(outputBatchId));
  if (!batch) return;
  const metadata = recordValue(batch.metadata);
  const items = Array.isArray(metadata.items) ? metadata.items.map(recordValue) : [];
  const updatedItems = items.map((item) => stringValue(item.sourceAssetId) === sourceAssetId
    ? { ...item, failed: false, failedJobId: null }
    : item);
  productionBatchRepository.update(String(outputBatchId), {
    status: "RUNNING",
    usageStatus: "AVAILABLE",
    attributes: recordValue(batch.attributes),
    metadata: {
      ...metadata,
      failedCount: updatedItems.filter((item) => item.failed === true && !stringValue(item.editedAssetId)).length,
      completedCount: updatedItems.filter((item) => stringValue(item.editedAssetId)).length,
      items: updatedItems
    }
  });
}

export const orchestratorService = {
  listJobs: () => orchestratorRepository.listJobs(),

  listRules() {
    orchestratorRepository.seedDefaultRulesIfEmpty();
    return orchestratorRepository.listRules();
  },

  createRule(input: CreateOrchestratorRuleInput) {
    return orchestratorRepository.createRule(input);
  },

  updateRule(id: string, input: UpdateOrchestratorRuleInput) {
    const rule = orchestratorRepository.updateRule(id, input);
    if (!rule) throw new AppError("ORCHESTRATOR_RULE_NOT_FOUND", "Orchestrator rule not found", 404);
    return rule;
  },

  enableRule(id: string) {
    const rule = orchestratorRepository.setRuleActive(id, true);
    if (!rule) throw new AppError("ORCHESTRATOR_RULE_NOT_FOUND", "Orchestrator rule not found", 404);
    return rule;
  },

  disableRule(id: string) {
    const rule = orchestratorRepository.setRuleActive(id, false);
    if (!rule) throw new AppError("ORCHESTRATOR_RULE_NOT_FOUND", "Orchestrator rule not found", 404);
    return rule;
  },

  deleteRule(id: string) {
    if (!orchestratorRepository.deleteRule(id)) {
      throw new AppError("ORCHESTRATOR_RULE_NOT_FOUND", "Orchestrator rule not found", 404);
    }
  },

  deleteJob(id: string) {
    if (!orchestratorRepository.deleteJob(id)) {
      throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    }
  },

  scan() {
    orchestratorRepository.seedDefaultRulesIfEmpty();

    const createdJobs: Array<NonNullable<ReturnType<typeof orchestratorRepository.createJob>>> = [];
    const activeRules = orchestratorRepository.listActiveRules();
    const workflowHandledBatchIds = new Set<string>();

    const createJobForRule = (rule: ResourceDrivenRule, sourceBatch: TriggerBatch) => {
      if (rule.targetStageType === "IMAGE_EDIT" && sourceBatch.batchType === "CHARACTER_GROUP") {
        const workItems = imageEditWorkItems(sourceBatch);
        if (!workItems.length) return null;
        const outputBatch = ensureImageEditOutputBatch(sourceBatch, workItems);
        const outputBatchId = stringValue(outputBatch?.id);
        let firstJob = null;
        const createdForBatch: Array<NonNullable<ReturnType<typeof orchestratorRepository.getJob>>> = [];
        for (const item of workItems) {
          const existing = orchestratorRepository.getJobBySourceStageAndAsset(
            sourceBatch.id,
            rule.targetStageType,
            item.sourceAssetId
          );
          if (existing) {
            createdForBatch.push(existing);
            if (!firstJob) firstJob = existing;
            continue;
          }
          const job = orchestratorRepository.createJob({
            ruleId: rule.id,
            sourceBatchId: sourceBatch.id,
            targetStageType: rule.targetStageType,
            payload: {
              ruleId: rule.id ?? null,
              ruleSource: rule.ruleSource,
              targetStageType: "IMAGE_EDIT",
              sourceBatchId: sourceBatch.id,
              sourceBatchType: sourceBatch.batchType,
              workflowId: sourceBatch.workflowId ?? undefined,
              workflowRunId: sourceBatch.workflowRunId ?? undefined,
              outputBatchId,
              groupId: item.groupId,
              characterId: item.characterId,
              sourceAssetId: item.sourceAssetId,
              sourceImageRole: item.sourceImageRole,
              sourceAsset: item.sourceAsset,
              orderNo: item.orderNo,
              expectedOutputRole: "IMAGE_EDIT_RESULT",
              ...(rule.resourceRule ? {
                resourceRule: rule.resourceRule,
                scriptCategory: rule.resourceRule.scriptCategory,
                promptCategory: rule.resourceRule.promptCategory
              } : {})
            }
          });
          if (job) {
            createdJobs.push(job);
            createdForBatch.push(job);
            if (!firstJob) firstJob = job;
          }
        }

        if (outputBatchId) {
          const current = productionBatchRepository.get(String(outputBatchId));
          const metadata = recordValue(current?.metadata);
          const metadataItems = Array.isArray(metadata.items) ? metadata.items.map(recordValue) : [];
          const withJobIds = metadataItems.map((metadataItem) => {
            const sourceAssetId = stringValue(metadataItem.sourceAssetId);
            const job = createdForBatch.find((item) => stringValue(recordValue(item.payload).sourceAssetId) === sourceAssetId);
            return job ? { ...metadataItem, jobId: job.id } : metadataItem;
          });
          productionBatchRepository.update(String(outputBatchId), {
            status: "RUNNING",
            usageStatus: "AVAILABLE",
            attributes: recordValue(current?.attributes),
            metadata: {
              ...metadata,
              items: withJobIds,
              expectedCount: workItems.length,
              completedCount: withJobIds.filter((item) => stringValue(recordValue(item).editedAssetId)).length
            }
          });
        }

        orchestratorRepository.reserveBatch(sourceBatch.id);
        return firstJob;
      }

      if (rule.targetStageType === "VIDEO_GENERATE" && sourceBatch.batchType === "IMAGE_BATCH") {
        const workItems = videoTransitionWorkItems(sourceBatch);
        if (!workItems.length) return null;
        const outputBatch = ensureVideoTransitionOutputBatch(sourceBatch, workItems);
        const outputBatchId = stringValue(outputBatch?.id);
        let firstJob = null;
        const createdForBatch: Array<NonNullable<ReturnType<typeof orchestratorRepository.getJob>>> = [];
        for (const item of workItems) {
          const transitionKey = stringValue(item.transitionKey);
          if (!transitionKey) continue;
          const existing = orchestratorRepository.getJobBySourceStageAndTransition(
            sourceBatch.id,
            rule.targetStageType,
            transitionKey
          );
          if (existing) {
            createdForBatch.push(existing);
            if (!firstJob) firstJob = existing;
            continue;
          }
          const job = orchestratorRepository.createJob({
            ruleId: rule.id,
            sourceBatchId: sourceBatch.id,
            targetStageType: rule.targetStageType,
            payload: {
              ruleId: rule.id ?? null,
              ruleSource: rule.ruleSource,
              targetStageType: "VIDEO_GENERATE",
              sourceBatchId: sourceBatch.id,
              sourceBatchType: sourceBatch.batchType,
              workflowId: sourceBatch.workflowId ?? undefined,
              workflowRunId: sourceBatch.workflowRunId ?? undefined,
              outputBatchId,
              transitionKey,
              transitionType: item.transitionType,
              fromAssetId: item.fromAssetId,
              toAssetId: item.toAssetId,
              fromCharacterId: item.fromCharacterId,
              toCharacterId: item.toCharacterId,
              orderNo: item.orderNo,
              expectedOutputRole: "VIDEO_TRANSITION_RESULT",
              ...(rule.resourceRule ? {
                resourceRule: rule.resourceRule,
                scriptCategory: rule.resourceRule.scriptCategory,
                promptCategory: rule.resourceRule.promptCategory
              } : {})
            }
          });
          if (job) {
            createdJobs.push(job);
            createdForBatch.push(job);
            if (!firstJob) firstJob = job;
          }
        }

        if (outputBatchId) {
          const current = productionBatchRepository.get(String(outputBatchId));
          const metadata = recordValue(current?.metadata);
          const metadataItems = Array.isArray(metadata.items) ? metadata.items.map(recordValue) : [];
          const withJobIds = metadataItems.map((metadataItem) => {
            const transitionKey = stringValue(metadataItem.transitionKey);
            const job = createdForBatch.find((item) => stringValue(recordValue(item.payload).transitionKey) === transitionKey);
            return job ? { ...metadataItem, jobId: job.id } : metadataItem;
          });
          productionBatchRepository.update(String(outputBatchId), {
            status: "RUNNING",
            usageStatus: "AVAILABLE",
            attributes: recordValue(current?.attributes),
            metadata: {
              ...metadata,
              items: withJobIds,
              expectedCount: workItems.length,
              completedCount: withJobIds.filter((item) => stringValue(recordValue(item).videoAssetId)).length
            }
          });
        }

        orchestratorRepository.reserveBatch(sourceBatch.id);
        return firstJob;
      }

      const existing = orchestratorRepository.getJobBySourceAndStage(
        sourceBatch.id,
        rule.targetStageType
      );
      if (existing) return null;

      const payload: Record<string, unknown> = {
        ruleId: rule.id ?? null,
        ruleSource: rule.ruleSource,
        sourceBatchId: sourceBatch.id,
        sourceBatchType: sourceBatch.batchType,
        workflowId: sourceBatch.workflowId ?? undefined,
        workflowRunId: sourceBatch.workflowRunId ?? undefined
      };

      if (rule.resourceRule) {
        payload.resourceRule = rule.resourceRule;
        payload.outputBatchType = rule.resourceRule.outputBatchType;
        payload.scriptCategory = rule.resourceRule.scriptCategory;
        payload.promptCategory = rule.resourceRule.promptCategory;
      }

      const requiresMusic = rule.targetStageType === "VIDEO_COMPOSE" && rule.config.requiresMusic !== false;

      if (requiresMusic) {
        const musicPolicy = resolveMusicPolicy(sourceBatch);
        const musicBatch = selectMusicForPolicy(sourceBatch, musicPolicy);
        if (!musicBatch) {
          if (musicPolicy.mode === "CREATE_DEDICATED") {
            const existingMusicJob = orchestratorRepository.getJobBySourceAndStage(sourceBatch.id, "MUSIC_GENERATE");
            if (!existingMusicJob) {
              const musicJob = orchestratorRepository.createJob({
                ruleId: rule.id,
                sourceBatchId: sourceBatch.id,
                targetStageType: "MUSIC_GENERATE",
                payload: {
                  ruleId: rule.id ?? null,
                  ruleSource: rule.ruleSource,
                  sourceBatchId: sourceBatch.id,
                  sourceBatchType: sourceBatch.batchType,
                  workflowId: sourceBatch.workflowId ?? undefined,
                  workflowRunId: sourceBatch.workflowRunId ?? undefined,
                  musicPolicy,
                  requestedForStageType: "VIDEO_COMPOSE"
                }
              });
              if (musicJob) createdJobs.push(musicJob);
            }
          }
          return null;
        }

        payload.musicBatchId = musicBatch.id;
        payload.musicUsageStatus = musicBatch.usageStatus;
        payload.musicPolicy = musicPolicy;
        payload.musicMatchAttributes = musicPolicy.matchAttributes;
      }

      const job = orchestratorRepository.createJob({
        ruleId: rule.id,
        sourceBatchId: sourceBatch.id,
        targetStageType: rule.targetStageType,
        payload
      });

      orchestratorRepository.reserveBatch(sourceBatch.id);

      if (typeof payload.musicBatchId === "string" && payload.musicUsageStatus === "AVAILABLE") {
        orchestratorRepository.reserveBatch(payload.musicBatchId);
      }

      if (job) createdJobs.push(job);
      return job;
    };

    for (const sourceBatch of orchestratorRepository.listWorkflowLinkedAvailableBatches()) {
      const workflowRules = workflowRulesForBatch(sourceBatch);
      if (workflowRules.length === 0) continue;

      for (const workflowRule of workflowRules) {
        createJobForRule(workflowRule, sourceBatch);
      }
      workflowHandledBatchIds.add(sourceBatch.id);
    }

    for (const rule of activeRules) {
      const sourceBatches = orchestratorRepository.listTriggerBatches(
        rule.triggerBatchType,
        rule.triggerStatus
      );

      for (const sourceBatch of sourceBatches) {
        if (workflowHandledBatchIds.has(sourceBatch.id)) continue;

        const workflowRules = workflowRulesForBatch(sourceBatch);
        if (workflowRules.length > 0) {
          for (const workflowRule of workflowRules) {
            createJobForRule(workflowRule, sourceBatch);
          }
          workflowHandledBatchIds.add(sourceBatch.id);
          continue;
        }

        createJobForRule(globalRuleForScan(rule), sourceBatch);
      }
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

    const errorMessage = input.errorMessage ?? input.errorCode ?? "Job failed";
    const job = orchestratorRepository.updateJobStatus(id, "FAILED", {
      errorMessage,
      ...(input.errorCode ? { errorCode: input.errorCode } : {}),
      ...(isInstanceIssueFailure(input) ? { instanceIssue: true } : {})
    });
    markImageEditItemFailed(job);
    instanceSchedulerService.failActiveForJob(id, input.errorCode ?? errorMessage, isInstanceIssueFailure(input));
    return job;
  },

  retryJob(id: string) {
    const current = orchestratorRepository.getJob(id);
    if (!current) throw new AppError("ORCHESTRATOR_JOB_NOT_FOUND", "Orchestrator job not found", 404);
    if (!["FAILED", "FAILED_RECOVERABLE"].includes(String(current.status))) {
      throw new AppError("ORCHESTRATOR_JOB_NOT_RETRYABLE", "Only failed jobs can be retried", 400);
    }
    instanceSchedulerService.releaseActiveForJob(id);
    clearImageEditItemFailure(current);
    return orchestratorRepository.updateJobResult(id, "PENDING", {
      payload: {
        retryOfJobId: id,
        retriedAt: new Date().toISOString(),
        errorMessage: null,
        errorCode: null
      },
      output: {}
    });
  }
};
