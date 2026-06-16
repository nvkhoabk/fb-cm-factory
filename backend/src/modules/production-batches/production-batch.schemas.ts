import { z } from "zod";

export const batchTypeSchema = z.enum([
  "CHARACTER_GROUP",
  "IMAGE_BATCH",
  "VIDEO_BATCH",
  "MUSIC_TRACK",
  "FINAL_VIDEO"
]);

export const batchStatusSchema = z.enum([
  "NEW",
  "PENDING",
  "RUNNING",
  "READY",
  "FAILED",
  "ARCHIVED"
]);

export const batchUsageStatusSchema = z.enum([
  "AVAILABLE",
  "RESERVED",
  "USED",
  "REUSABLE"
]);

export const createProductionBatchSchema = z.object({
  batchType: batchTypeSchema,
  sourceGroupId: z.string().optional(),
  workflowId: z.string().optional(),
  workflowRunId: z.string().optional(),
  status: batchStatusSchema.default("NEW"),
  usageStatus: batchUsageStatusSchema.default("AVAILABLE"),
  attributes: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const updateProductionBatchSchema = z.object({
  status: batchStatusSchema.optional(),
  usageStatus: batchUsageStatusSchema.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const createProductionBatchItemSchema = z.object({
  itemType: z.string().min(1),
  itemId: z.string().min(1),
  role: z.string().optional(),
  sortOrder: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const createBatchUsageSchema = z.object({
  targetBatchId: z.string().min(1),
  usageType: z.string().min(1),
  workflowRunId: z.string().nullable().optional(),
  stageRunId: z.string().nullable().optional()
});

export type BatchType = z.infer<typeof batchTypeSchema>;
export type CreateProductionBatchInput = z.infer<typeof createProductionBatchSchema>;
export type UpdateProductionBatchInput = z.infer<typeof updateProductionBatchSchema>;
export type CreateProductionBatchItemInput = z.infer<typeof createProductionBatchItemSchema>;
export type CreateBatchUsageInput = z.infer<typeof createBatchUsageSchema>;
