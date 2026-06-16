import { z } from "zod";

export const createPromptTemplateSchema = z.object({
  name: z.string().min(1),
  category: z.string().default("general"),
  description: z.string().optional(),
  status: z.string().default("active")
});

export const createPromptTemplateVersionSchema = z.object({
  versionNo: z.number().int().positive().optional(),
  templateText: z.string().min(1),
  status: z.string().default("draft")
});

export type CreatePromptTemplateInput = z.infer<typeof createPromptTemplateSchema>;
export type CreatePromptTemplateVersionInput = z.infer<typeof createPromptTemplateVersionSchema>;

