import { z } from "zod";

export const runtimeStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "PAUSED",
  "FAILED",
  "FAILED_RECOVERABLE",
  "COMPLETED"
]);

export const createRuntimeSessionSchema = z.object({
  jobId: z.string().min(1).optional(),
  instanceId: z.string().min(1).optional(),
  hostId: z.string().min(1).optional(),
  scriptId: z.string().min(1).optional(),
  status: runtimeStatusSchema.default("PENDING"),
  currentStepNo: z.number().int().nonnegative().default(0),
  context: z.record(z.string(), z.unknown()).default({}),
  checkpoint: z.record(z.string(), z.unknown()).default({})
});

export const updateRuntimeSessionSchema = z.object({
  status: runtimeStatusSchema.optional(),
  scriptId: z.string().min(1).nullable().optional(),
  hostId: z.string().min(1).nullable().optional(),
  instanceId: z.string().min(1).nullable().optional(),
  currentStepNo: z.number().int().nonnegative().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  checkpoint: z.record(z.string(), z.unknown()).optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional()
});

export const saveRuntimeCheckpointSchema = z.object({
  currentStepNo: z.number().int().nonnegative().optional(),
  context: z.record(z.string(), z.unknown()).default({}),
  allocation: z.record(z.string(), z.unknown()).optional(),
  checkpoint: z.record(z.string(), z.unknown()).default({})
});

export const createRuntimeStepSchema = z.object({
  stepNo: z.number().int().nonnegative(),
  stepType: z.string().min(1),
  status: runtimeStatusSchema.default("PENDING"),
  input: z.record(z.string(), z.unknown()).default({}),
  output: z.record(z.string(), z.unknown()).default({})
});

export const updateRuntimeStepSchema = z.object({
  status: runtimeStatusSchema.optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  errorMessage: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  finishedAt: z.string().nullable().optional()
});

export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;
export type CreateRuntimeSessionInput = z.infer<typeof createRuntimeSessionSchema>;
export type UpdateRuntimeSessionInput = z.infer<typeof updateRuntimeSessionSchema>;
export type SaveRuntimeCheckpointInput = z.infer<typeof saveRuntimeCheckpointSchema>;
export type CreateRuntimeStepInput = z.infer<typeof createRuntimeStepSchema>;
export type UpdateRuntimeStepInput = z.infer<typeof updateRuntimeStepSchema>;
