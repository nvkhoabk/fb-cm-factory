import { z } from "zod";

export const renderPromptSchema = z.object({
  templateId: z.string().min(1),
  groupId: z.string().min(1),
  workflowId: z.string().min(1).optional()
});

export const renderBatchPromptSchema = z.object({
  templateId: z.string().min(1).optional()
});

export const renderPostContentPromptSchema = z.object({
  templateId: z.string().min(1).optional(),
  hashtagsTemplateId: z.string().min(1).optional()
});

export type RenderPromptInput = z.infer<typeof renderPromptSchema>;
export type RenderBatchPromptInput = z.infer<typeof renderBatchPromptSchema>;
export type RenderPostContentPromptInput = z.infer<typeof renderPostContentPromptSchema>;
