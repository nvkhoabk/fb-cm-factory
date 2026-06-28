import { z } from "zod";

export const screenTemplateMatchTypeSchema = z.enum(["IMAGE", "OCR_TEXT", "REGION_IMAGE", "MANUAL_FLAG"]);
export const screenTemplateStatusSchema = z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]);

const screenTemplateBaseSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).default("SYSTEM"),
  matchType: screenTemplateMatchTypeSchema.optional(),
  match_type: screenTemplateMatchTypeSchema.optional(),
  templateType: z.enum(["OCR_TEXT", "IMAGE_MATCH", "REGION_MATCH", "IMAGE", "REGION_IMAGE", "MANUAL_FLAG"]).optional(),
  status: screenTemplateStatusSchema.default("ACTIVE"),
  description: z.string().optional().nullable(),
  templateImageAssetId: z.string().optional().nullable(),
  templateImagePath: z.string().optional().nullable(),
  templateImageUrl: z.string().optional().nullable(),
  templateThumbnailUrl: z.string().optional().nullable(),
  ocrText: z.string().optional().nullable(),
  threshold: z.number().min(0).max(1).default(0.8),
  region: z.record(z.string(), z.unknown()).optional().default({}),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
});

function normalizeScreenTemplateInput(input: z.infer<typeof screenTemplateBaseSchema>) {
  const matchType = input.matchType
    ?? input.match_type
    ?? (input.templateType === "IMAGE_MATCH" ? "IMAGE" : input.templateType === "REGION_MATCH" ? "REGION_IMAGE" : input.templateType)
    ?? "OCR_TEXT";
  return {
    ...input,
    matchType,
    templateType: matchType
  };
}

export const screenTemplateSchema = screenTemplateBaseSchema.transform(normalizeScreenTemplateInput);

export const updateScreenTemplateSchema = screenTemplateBaseSchema.partial().transform((input) => {
  const matchType = input.matchType
    ?? input.match_type
    ?? (input.templateType === "IMAGE_MATCH" ? "IMAGE" : input.templateType === "REGION_MATCH" ? "REGION_IMAGE" : input.templateType);
  return {
    ...input,
    ...(matchType ? { matchType, templateType: matchType } : {})
  };
});

export const testScreenTemplateSchema = z.object({
  hostId: z.string().min(1),
  instanceId: z.string().min(1),
  adbId: z.string().min(1),
  screenshotUrl: z.string().optional(),
  screenshotPath: z.string().optional()
});

export type ScreenTemplateInput = z.infer<typeof screenTemplateSchema>;
export type UpdateScreenTemplateInput = z.infer<typeof updateScreenTemplateSchema>;
export type TestScreenTemplateInput = z.infer<typeof testScreenTemplateSchema>;
