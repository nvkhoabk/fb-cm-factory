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

export type OrchestratorJobStatus = z.infer<typeof orchestratorJobStatusSchema>;
export type FailOrchestratorJobInput = z.infer<typeof failOrchestratorJobSchema>;

