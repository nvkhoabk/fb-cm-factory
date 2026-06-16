import { z } from "zod";

export const stageTypeSchema = z.enum([
  "IMAGE_EDIT",
  "VIDEO_GENERATE",
  "MUSIC_GENERATE",
  "VIDEO_COMPOSE"
]);

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

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type CreateWorkflowStageInput = z.infer<typeof createWorkflowStageSchema>;
export type UpdateWorkflowStageInput = z.infer<typeof updateWorkflowStageSchema>;

