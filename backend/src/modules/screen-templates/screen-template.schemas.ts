import { z } from "zod";

export const screenTemplateSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).default("Utility"),
  templateType: z.enum(["OCR_TEXT", "IMAGE_MATCH", "REGION_MATCH"]).default("OCR_TEXT"),
  templateImageUrl: z.string().optional().nullable(),
  ocrText: z.string().optional().nullable(),
  threshold: z.number().min(0).max(1).default(0.8),
  region: z.record(z.string(), z.unknown()).optional().default({}),
  status: z.string().default("active")
});

export const updateScreenTemplateSchema = screenTemplateSchema.partial();

export type ScreenTemplateInput = z.infer<typeof screenTemplateSchema>;
export type UpdateScreenTemplateInput = z.infer<typeof updateScreenTemplateSchema>;
