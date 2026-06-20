import { AppError } from "../shared/resource";
import { instanceSchedulerService } from "../instance-scheduler/instance-scheduler.service";
import { orchestratorRepository } from "./orchestrator.repository";
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
    instanceSchedulerService.failActiveForJob(id, input.errorCode ?? errorMessage, isInstanceIssueFailure(input));
    return job;
  }
};
