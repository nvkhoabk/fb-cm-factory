import { z } from "zod";

export const stageTypeSchema = z.enum([
  "IMAGE_EDIT",
  "VIDEO_GENERATE",
  "MUSIC_GENERATE",
  "VIDEO_COMPOSE",
  "POST_CONTENT"
]);

export const capacityConfigSchema = z.object({
  IMAGE_EDIT: z.number().int().min(0).optional(),
  VIDEO_GENERATE: z.number().int().min(0).optional(),
  MUSIC_GENERATE: z.number().int().min(0).optional(),
  VIDEO_COMPOSE: z.number().int().min(0).optional(),
  POST_CONTENT: z.number().int().min(0).optional()
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().default("draft")
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

export const createWorkflowStageSchema = z.object({
  stageNo: z.number().int().positive(),
  stageType: stageTypeSchema,
  name: z.string().min(1),
  scriptId: z.string().optional(),
  poolType: stageTypeSchema.optional(),
  promptTemplateId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).default({})
});

export const updateWorkflowStageSchema = createWorkflowStageSchema.partial();

export const workflowRunStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export const createWorkflowRunSchema = z.object({
  input: z.record(z.string(), z.unknown()).default({})
});

export const completeWorkflowStageRunSchema = z.object({
  output: z.record(z.string(), z.unknown()).default({})
});

export const failWorkflowStageRunSchema = z.object({
  errorMessage: z.string().min(1)
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type CreateWorkflowStageInput = z.infer<typeof createWorkflowStageSchema>;
export type UpdateWorkflowStageInput = z.infer<typeof updateWorkflowStageSchema>;
export type WorkflowRunStatus = z.infer<typeof workflowRunStatusSchema>;
export type CreateWorkflowRunInput = z.infer<typeof createWorkflowRunSchema>;
export type CompleteWorkflowStageRunInput = z.infer<typeof completeWorkflowStageRunSchema>;
export type FailWorkflowStageRunInput = z.infer<typeof failWorkflowStageRunSchema>;
export type CapacityConfigInput = z.infer<typeof capacityConfigSchema>;
