import { AppError } from "../shared/resource";
import { instanceSchedulerRepository } from "../instance-scheduler/instance-scheduler.repository";
import { workflowsRepository } from "./workflows.repository";
import type {
  CapacityConfigInput,
  CompleteWorkflowStageRunInput,
  CreateWorkflowInput,
  CreateWorkflowRunInput,
  CreateWorkflowStageInput,
  FailWorkflowStageRunInput,
  MusicPolicyInput,
  PostContentPolicyInput,
  UpdateWorkflowInput,
  UpdateWorkflowStageInput,
  WorkflowPromptMappingInput,
  WorkflowResourceRulesInput,
  WorkflowScriptMappingInput
} from "./workflows.schemas";

const capacityStageTypes = [
  "IMAGE_EDIT",
  "VIDEO_GENERATE",
  "MUSIC_GENERATE",
  "VIDEO_COMPOSE",
  "POST_CONTENT"
] as const;

function normalizeCapacityConfig(input: CapacityConfigInput = {}) {
  return Object.fromEntries(
    capacityStageTypes.map((stageType) => [
      stageType,
      Math.max(0, Number(input[stageType] ?? 0))
    ])
  ) as Record<typeof capacityStageTypes[number], number>;
}

function hasConfiguredCapacity(input: unknown) {
  return Boolean(input && typeof input === "object" && Object.values(input).some((value) => Number(value) > 0));
}

export const workflowsService = {
  list: () => workflowsRepository.list(),

  get(id: string) {
    const workflow = workflowsRepository.get(id);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  create: (input: CreateWorkflowInput) => workflowsRepository.create(input),

  getDetail(id: string) {
    const workflow = this.get(id) as Record<string, unknown> & { id: string; name: string };
    const legacyStages = workflowsRepository.listStages(id);
    const runs = workflowsRepository.listRuns().filter((run) => run.workflowId === id);
    const resourceRules = Array.isArray(workflow.resourceRules) ? workflow.resourceRules as Array<Record<string, unknown>> : [];
    const promptMapping = (workflow.promptMapping ?? {}) as Record<string, unknown>;
    const scriptMapping = (workflow.scriptMapping ?? {}) as Record<string, unknown>;
    const capacity = (workflow.capacityConfig ?? {}) as Record<string, unknown>;
    const musicPolicy = (workflow.musicPolicy ?? {}) as Record<string, unknown>;
    const postContentPolicy = (workflow.postContentPolicy ?? {}) as Record<string, unknown>;
    const warnings: string[] = [];

    if (!resourceRules.length && legacyStages.length) warnings.push("workflow has only legacy stages");
    for (const rule of resourceRules as Array<Record<string, unknown>>) {
      const targetJobType = String(rule.targetJobType ?? "");
      if (targetJobType && !promptMapping[targetJobType]) warnings.push(`${targetJobType} rule missing prompt template`);
      if (targetJobType && !scriptMapping[targetJobType]) warnings.push(`${targetJobType} rule missing script`);
      if (targetJobType && !Number(capacity[targetJobType] ?? 0)) warnings.push(`capacity missing for ${targetJobType}`);
      const requires = Array.isArray(rule.requires) ? rule.requires : [];
      if (targetJobType === "VIDEO_COMPOSE" && requires.includes("MUSIC_TRACK") && !Object.keys(musicPolicy).length) {
        warnings.push("VIDEO_COMPOSE requires music but music policy missing");
      }
      if (targetJobType === "POST_CONTENT" && !promptMapping.POST_CONTENT) {
        warnings.push("POST_CONTENT enabled but missing post prompt");
      }
    }

    return {
      workflow,
      resourceRules,
      promptMapping,
      scriptMapping,
      capacity,
      musicPolicy,
      postContentPolicy,
      legacyStages,
      runs,
      warnings: [...new Set(warnings)]
    };
  },

  duplicate(id: string) {
    const workflow = this.get(id) as Record<string, unknown> & { id: string; name: string; description?: string | null };
    const copy = workflowsRepository.create({
      name: `${workflow.name} Copy`,
      description: typeof workflow.description === "string" ? workflow.description : undefined,
      status: "draft",
      musicPolicy: (workflow.musicPolicy ?? {}) as Record<string, unknown>,
      postContentPolicy: (workflow.postContentPolicy ?? {}) as Record<string, unknown>,
      resourceRules: (Array.isArray(workflow.resourceRules) ? workflow.resourceRules as Array<Record<string, unknown>> : [])
        .filter((rule) => typeof rule.trigger === "string" && typeof rule.targetJobType === "string")
        .map((rule) => ({
          ...rule,
          trigger: String(rule.trigger),
          targetJobType: String(rule.targetJobType),
          outputBatchType: typeof rule.outputBatchType === "string" ? rule.outputBatchType : undefined,
          requires: Array.isArray(rule.requires) ? rule.requires.map(String) : undefined,
          scriptCategory: typeof rule.scriptCategory === "string" ? rule.scriptCategory : undefined,
          promptCategory: typeof rule.promptCategory === "string" ? rule.promptCategory : undefined
        })),
      scriptMapping: (workflow.scriptMapping ?? {}) as Record<string, unknown>,
      promptMapping: (workflow.promptMapping ?? {}) as Record<string, unknown>
    });
    if (workflow.capacityConfig && Object.keys(workflow.capacityConfig).length) {
      const copyRecord = copy as { id?: unknown } | null;
      if (!copyRecord || typeof copyRecord.id !== "string") throw new AppError("WORKFLOW_DUPLICATE_FAILED", "Could not duplicate workflow", 500);
      return workflowsRepository.updateCapacity(copyRecord.id, normalizeCapacityConfig(workflow.capacityConfig as CapacityConfigInput));
    }
    return copy;
  },

  update(id: string, input: UpdateWorkflowInput) {
    const workflow = workflowsRepository.update(id, input);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  updateCapacity(id: string, input: CapacityConfigInput) {
    const workflow = workflowsRepository.updateCapacity(id, normalizeCapacityConfig(input));
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  getResourceRules(id: string) {
    return this.get(id).resourceRules ?? [];
  },

  updateResourceRules(id: string, input: WorkflowResourceRulesInput) {
    const workflow = workflowsRepository.updateResourceRules(id, input);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  getScriptMapping(id: string) {
    return this.get(id).scriptMapping ?? {};
  },

  updateScriptMapping(id: string, input: WorkflowScriptMappingInput) {
    const workflow = workflowsRepository.updateScriptMapping(id, input);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  getPromptMapping(id: string) {
    return this.get(id).promptMapping ?? {};
  },

  updatePromptMapping(id: string, input: WorkflowPromptMappingInput) {
    const workflow = workflowsRepository.updatePromptMapping(id, input);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  getMusicPolicy(id: string) {
    return this.get(id).musicPolicy ?? {};
  },

  updateMusicPolicy(id: string, input: MusicPolicyInput) {
    const workflow = workflowsRepository.updateMusicPolicy(id, input);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  getPostContentPolicy(id: string) {
    return this.get(id).postContentPolicy ?? {};
  },

  updatePostContentPolicy(id: string, input: PostContentPolicyInput) {
    const workflow = workflowsRepository.updatePostContentPolicy(id, input);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  delete(id: string) {
    if (!workflowsRepository.delete(id)) {
      throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    }
  },

  createStage(workflowId: string, input: CreateWorkflowStageInput) {
    if (!workflowsRepository.get(workflowId)) {
      throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    }

    return workflowsRepository.createStage(workflowId, input);
  },

  updateStage(id: string, input: UpdateWorkflowStageInput) {
    const stage = workflowsRepository.updateStage(id, input);
    if (!stage) throw new AppError("WORKFLOW_STAGE_NOT_FOUND", "Workflow stage not found", 404);
    return stage;
  },

  deleteStage(id: string) {
    if (!workflowsRepository.deleteStage(id)) {
      throw new AppError("WORKFLOW_STAGE_NOT_FOUND", "Workflow stage not found", 404);
    }
  },

  listRuns: () => workflowsRepository.listRuns(),

  getRun(id: string) {
    const run = workflowsRepository.getRunDetail(id);
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);
    return run;
  },

  updateRunCapacity(id: string, input: CapacityConfigInput) {
    const run = workflowsRepository.updateRunCapacity(id, normalizeCapacityConfig(input));
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);
    return run;
  },

  getRunCapacity(id: string) {
    const run = workflowsRepository.getRunDetail(id);
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);

    const workflow = workflowsRepository.get(String(run.workflowId));
    const capacityConfig = normalizeCapacityConfig(
      hasConfiguredCapacity(run.capacityConfig)
        ? run.capacityConfig as CapacityConfigInput
        : workflow?.capacityConfig as CapacityConfigInput | undefined
    );
    const allocations = workflowsRepository.listCapacityAllocations(id);

    return {
      workflowRunId: id,
      workflowId: run.workflowId,
      capacityConfig,
      allocations
    };
  },

  allocateCapacity(id: string) {
    const run = workflowsRepository.getRunDetail(id);
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);

    const workflow = workflowsRepository.get(String(run.workflowId));
    const capacityConfig = normalizeCapacityConfig(
      hasConfiguredCapacity(run.capacityConfig)
        ? run.capacityConfig as CapacityConfigInput
        : workflow?.capacityConfig as CapacityConfigInput | undefined
    );
    const existingAllocations = workflowsRepository.listCapacityAllocations(id);
    const selectedInstanceIds = new Set<string>();
    const details = [];
    let requestedTotal = 0;
    let allocatedTotal = 0;

    for (const stageType of capacityStageTypes) {
      const requested = capacityConfig[stageType] ?? 0;
      requestedTotal += requested;
      if (requested <= 0) {
        details.push({ stageType, requested, alreadyAllocated: 0, newlyAllocated: 0, missing: 0, allocations: [] });
        continue;
      }

      const activeForStage = existingAllocations.filter((allocation) => {
        const metadata = allocation.metadata && typeof allocation.metadata === "object"
          ? allocation.metadata as Record<string, unknown>
          : {};
        return allocation.status === "ALLOCATED"
          && metadata.allocationType === "WORKFLOW_CAPACITY"
          && metadata.stageType === stageType;
      });
      const remaining = Math.max(0, requested - activeForStage.length);
      const candidates = instanceSchedulerRepository.findDynamicCapacityCandidates(stageType, remaining, [...selectedInstanceIds]);
      const allocations = [];

      for (const candidate of candidates) {
        selectedInstanceIds.add(candidate.instance_id);
        const allocation = instanceSchedulerRepository.createAllocation({
          poolId: candidate.pool_id,
          instanceId: candidate.instance_id,
          hostId: candidate.host_id,
          localId: candidate.local_id,
          adbId: candidate.adb_id,
          workflowRunId: String(run.id),
          metadata: {
            allocationType: "WORKFLOW_CAPACITY",
            allocationMode: "DYNAMIC_CAPABILITY",
            workflowRunId: run.id,
            stageType,
            instanceId: candidate.instance_id,
            hostId: candidate.host_id,
            localId: Number.isInteger(Number(candidate.local_id)) ? Number(candidate.local_id) : candidate.local_id,
            adbId: candidate.adb_id,
            capabilities: candidate.capabilities
          }
        });
        if (!allocation) continue;
        instanceSchedulerRepository.moveInstanceToWorkflow(candidate.instance_id, String(run.id));
        allocations.push(allocation);
      }

      allocatedTotal += activeForStage.length + allocations.length;
      details.push({
        stageType,
        requested,
        alreadyAllocated: activeForStage.length,
        newlyAllocated: allocations.length,
        missing: Math.max(0, requested - activeForStage.length - allocations.length),
        allocations
      });
    }

    return {
      code: allocatedTotal < requestedTotal ? "PARTIAL_CAPACITY_ALLOCATED" : "CAPACITY_ALLOCATED",
      workflowRunId: id,
      workflowId: run.workflowId,
      capacityConfig,
      requestedTotal,
      allocatedTotal,
      details,
      allocations: workflowsRepository.listCapacityAllocations(id)
    };
  },

  createRun(workflowId: string, input: CreateWorkflowRunInput) {
    const run = workflowsRepository.createRun(workflowId, input);
    if (!run) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return run;
  },

  startRun(id: string) {
    const run = workflowsRepository.getRunDetail(id);
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);
    if (run.status === "CANCELLED" || run.status === "FAILED" || run.status === "COMPLETED") {
      throw new AppError("WORKFLOW_RUN_NOT_STARTABLE", "Workflow run is already terminal");
    }

    const firstStage = workflowsRepository.getFirstStageRun(id);
    const timestamp = new Date().toISOString();

    if (firstStage && firstStage.status === "PENDING") {
      workflowsRepository.updateStageRunStatus(firstStage.id as string, "RUNNING", {
        startedAt: timestamp
      });
    }

    return workflowsRepository.updateRunStatus(id, "RUNNING", {
      currentStageNo: firstStage ? Number(firstStage.stageNo) : 0,
      startedAt: run.startedAt as string | null || timestamp,
      finishedAt: null,
      errorMessage: null
    });
  },

  cancelRun(id: string) {
    const run = workflowsRepository.getRunDetail(id);
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);

    workflowsRepository.cancelOpenStageRuns(id);

    return workflowsRepository.updateRunStatus(id, "CANCELLED", {
      finishedAt: new Date().toISOString()
    });
  },

  startStageRun(id: string) {
    const stageRun = workflowsRepository.getStageRun(id);
    if (!stageRun) throw new AppError("WORKFLOW_STAGE_RUN_NOT_FOUND", "Workflow stage run not found", 404);
    if (stageRun.status !== "PENDING" && stageRun.status !== "WAITING") {
      throw new AppError("WORKFLOW_STAGE_RUN_NOT_STARTABLE", "Workflow stage run is not startable");
    }

    const timestamp = new Date().toISOString();
    const updated = workflowsRepository.updateStageRunStatus(id, "RUNNING", {
      startedAt: timestamp,
      errorMessage: null
    });

    workflowsRepository.updateRunStatus(stageRun.workflowRunId as string, "RUNNING", {
      currentStageNo: Number(stageRun.stageNo),
      startedAt: timestamp,
      finishedAt: null,
      errorMessage: null
    });

    return updated;
  },

  completeStageRun(id: string, input: CompleteWorkflowStageRunInput) {
    const stageRun = workflowsRepository.getStageRun(id);
    if (!stageRun) throw new AppError("WORKFLOW_STAGE_RUN_NOT_FOUND", "Workflow stage run not found", 404);
    if (stageRun.status === "FAILED" || stageRun.status === "CANCELLED") {
      throw new AppError("WORKFLOW_STAGE_RUN_TERMINAL", "Workflow stage run is terminal");
    }

    const timestamp = new Date().toISOString();
    const transaction = () => {
      const completed = workflowsRepository.updateStageRunStatus(id, "COMPLETED", {
        output: input.output,
        finishedAt: timestamp,
        errorMessage: null
      });

      const nextStage = workflowsRepository.getNextStageRun(
        stageRun.workflowRunId as string,
        Number(stageRun.stageNo)
      );

      if (nextStage) {
        workflowsRepository.updateStageRunStatus(nextStage.id as string, "RUNNING", {
          startedAt: timestamp,
          errorMessage: null
        });
        workflowsRepository.updateRunStatus(stageRun.workflowRunId as string, "RUNNING", {
          currentStageNo: Number(nextStage.stageNo)
        });
      } else {
        workflowsRepository.updateRunStatus(stageRun.workflowRunId as string, "COMPLETED", {
          currentStageNo: Number(stageRun.stageNo),
          finishedAt: timestamp
        });
      }

      return completed;
    };

    return transaction();
  },

  failStageRun(id: string, input: FailWorkflowStageRunInput) {
    const stageRun = workflowsRepository.getStageRun(id);
    if (!stageRun) throw new AppError("WORKFLOW_STAGE_RUN_NOT_FOUND", "Workflow stage run not found", 404);

    const timestamp = new Date().toISOString();
    const failed = workflowsRepository.updateStageRunStatus(id, "FAILED", {
      errorMessage: input.errorMessage,
      finishedAt: timestamp
    });

    workflowsRepository.updateRunStatus(stageRun.workflowRunId as string, "FAILED", {
      currentStageNo: Number(stageRun.stageNo),
      errorMessage: input.errorMessage,
      finishedAt: timestamp
    });

    return failed;
  }
};
