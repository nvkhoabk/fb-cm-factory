import { z } from "zod";

export const assetCategorySchema = z.enum([
  "CHARACTER_IMAGE",
  "PROMPT_TEMPLATE",
  "MUSIC_TRACK",
  "VIDEO_TEMPLATE",
  "POST_TEMPLATE",
  "PRODUCTION_RESOURCE"
]);

export const createAssetSchema = z.object({
  workspaceId: z.string().optional(),
  characterId: z.string().optional(),
  groupId: z.string().optional(),
  groupMemberId: z.string().optional(),
  assetType: z.string().min(1).optional(),
  assetCategory: assetCategorySchema.optional(),
  assetSubType: z.string().optional(),
  mediaType: z.string().min(1).default("unknown"),
  versionGroupId: z.string().optional(),
  versionNo: z.number().int().positive().default(1),
  isBestVersion: z.boolean().default(false),
  name: z.string().min(1),
  storageProvider: z.string().default("local"),
  storageKey: z.string().optional(),
  filePath: z.string().optional(),
  publicUrl: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().int().nonnegative().default(0),
  checksum: z.string().optional(),
  status: z.string().default("available"),
  usageStatus: z.string().default("available"),
  usagePolicy: z.string().default("reusable"),
  qualityStatus: z.string().default("draft"),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.string(), z.unknown()).default({}),
  previewUrl: z.string().optional(),
  sourceAssetId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdByWorkflowRunId: z.string().optional(),
  createdByStageRunId: z.string().optional(),
  createdByTaskRunId: z.string().optional(),
  createdByTaskAttemptId: z.string().optional()
});

export const updateAssetSchema = createAssetSchema.partial();

export const createAssetRelationSchema = z.object({
  sourceAssetId: z.string().min(1),
  targetAssetId: z.string().min(1),
  relationType: z.string().min(1),
  workflowRunId: z.string().optional(),
  stageRunId: z.string().optional(),
  taskRunId: z.string().optional(),
  taskAttemptId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const createAssetReservationSchema = z.object({
  workflowRunId: z.string().optional(),
  stageRunId: z.string().optional(),
  taskRunId: z.string().optional(),
  reservationRole: z.string().optional(),
  status: z.string().default("reserved"),
  leasedUntil: z.string().optional()
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type CreateAssetRelationInput = z.infer<typeof createAssetRelationSchema>;
export type CreateAssetReservationInput = z.infer<typeof createAssetReservationSchema>;
