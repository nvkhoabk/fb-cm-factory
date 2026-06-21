import { z } from "zod";

export const errorClassificationSchema = z.enum([
  "CHATGPT_ERROR",
  "UPLOAD_ERROR",
  "DOWNLOAD_ERROR",
  "ANDROID_PICKER_ERROR",
  "PIXVERSE_ERROR",
  "CAPTCHA",
  "NETWORK",
  "UNKNOWN"
]);

export const errorStatusSchema = z.enum([
  "NEW",
  "REVIEWED",
  "CLASSIFIED",
  "AUTO_RECOVERABLE",
  "RESOLVED",
  "IGNORED"
]);

export const updateErrorEventSchema = z.object({
  status: errorStatusSchema.optional(),
  classification: errorClassificationSchema.optional(),
  resolutionType: z.string().optional().nullable(),
  recoveryScriptId: z.string().optional().nullable()
});

export const createScreenTemplateFromErrorSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().default("SYSTEM"),
  matchType: z.enum(["IMAGE", "OCR_TEXT", "REGION_IMAGE", "MANUAL_FLAG"]).default("IMAGE"),
  threshold: z.number().min(0).max(1).default(0.8)
});

export const attachRecoveryScriptSchema = z.object({
  recoveryScriptId: z.string().min(1),
  screenTemplateId: z.string().optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(100),
  notes: z.string().optional().nullable()
});

export type UpdateErrorEventInput = z.infer<typeof updateErrorEventSchema>;
export type CreateScreenTemplateFromErrorInput = z.infer<typeof createScreenTemplateFromErrorSchema>;
export type AttachRecoveryScriptInput = z.infer<typeof attachRecoveryScriptSchema>;
