import { AppError } from "../shared/resource";
import { instanceSchedulerService } from "../instance-scheduler/instance-scheduler.service";
import { orchestratorRepository } from "./orchestrator.repository";
import type {
  CreateOrchestratorRuleInput,
  FailOrchestratorJobInput,
  UpdateOrchestratorRuleInput
} from "./orchestrator.schemas";

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

  scan() {
    orchestratorRepository.seedDefaultRulesIfEmpty();

    const createdJobs = [];
    const activeRules = orchestratorRepository.listActiveRules();

    for (const rule of activeRules) {
      const sourceBatches = orchestratorRepository.listTriggerBatches(
        rule.triggerBatchType,
        rule.triggerStatus
      );

      for (const sourceBatch of sourceBatches) {
        const existing = orchestratorRepository.getJobBySourceAndStage(
          sourceBatch.id,
          rule.targetStageType
        );
        if (existing) continue;

        const payload: Record<string, unknown> = {
          ruleId: rule.id,
          sourceBatchId: sourceBatch.id,
          sourceBatchType: sourceBatch.batchType
        };

        const requiresMusic =
          rule.targetStageType === "VIDEO_COMPOSE" &&
          rule.config.requiresMusic !== false;

        if (requiresMusic) {
          const musicBatch = orchestratorRepository.getReusableOrAvailableMusic();
          if (!musicBatch) continue;

          payload.musicBatchId = musicBatch.id;
          payload.musicUsageStatus = musicBatch.usageStatus;
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

        createdJobs.push(job);
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

    const job = orchestratorRepository.updateJobStatus(id, "FAILED", {
      errorMessage: input.errorMessage ?? "Job failed"
    });
    instanceSchedulerService.failActiveForJob(id);
    return job;
  }
};
