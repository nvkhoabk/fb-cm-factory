import { z } from "zod";

export const createPromptTemplateSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1),
  scope: z.string().min(1),
  description: z.string().optional(),
  variableSchema: z.record(z.string(), z.unknown()).default({}),
  status: z.string().default("active")
});

export const createPromptVersionSchema = z.object({
  versionNo: z.number().int().positive().optional(),
  status: z.string().default("draft"),
  content: z.string().min(1),
  negativeContent: z.string().optional(),
  renderingEngine: z.string().default("template-v1"),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const renderPromptPreviewSchema = z.object({
  content: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({})
});

export type CreatePromptTemplateInput = z.infer<typeof createPromptTemplateSchema>;
export type CreatePromptVersionInput = z.infer<typeof createPromptVersionSchema>;

