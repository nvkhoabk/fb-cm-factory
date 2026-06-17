import { z } from "zod";

export const orchestratorJobStatusSchema = z.enum([
  "PENDING",
  "ALLOCATED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export const failOrchestratorJobSchema = z.object({
  errorMessage: z.string().min(1).optional()
});

export const createOrchestratorRuleSchema = z.object({
  name: z.string().min(1),
  triggerBatchType: z.string().min(1),
  triggerStatus: z.string().min(1).default("READY"),
  targetStageType: z.string().min(1),
  priority: z.number().int().default(100),
  isActive: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({})
});

export const updateOrchestratorRuleSchema = createOrchestratorRuleSchema.partial();

export type OrchestratorJobStatus = z.infer<typeof orchestratorJobStatusSchema>;
export type FailOrchestratorJobInput = z.infer<typeof failOrchestratorJobSchema>;
export type CreateOrchestratorRuleInput = z.infer<typeof createOrchestratorRuleSchema>;
export type UpdateOrchestratorRuleInput = z.infer<typeof updateOrchestratorRuleSchema>;
