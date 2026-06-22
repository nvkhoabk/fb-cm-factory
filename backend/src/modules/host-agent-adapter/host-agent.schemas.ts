import { z } from "zod";

export const createHostSchema = z.object({
  hostId: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  status: z.string().default("active")
});

export const instanceCommandSchema = z.object({
  instanceId: z.string().min(1),
  adbId: z.string().min(1, "adbId is required")
});

export const liveScreenshotCommandSchema = instanceCommandSchema.extend({
  localId: z.union([z.string(), z.number()]).optional()
});

export const tapCommandSchema = instanceCommandSchema.extend({
  x: z.number(),
  y: z.number()
});

export const swipeCommandSchema = instanceCommandSchema.extend({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  durationMs: z.number().optional()
});

export const longPressCommandSchema = instanceCommandSchema.extend({
  x: z.number(),
  y: z.number(),
  durationMs: z.number().optional()
});

export const scrollToEndCommandSchema = instanceCommandSchema.extend({
  localId: z.union([z.string(), z.number()]).optional(),
  direction: z.enum(["down", "up"]).optional(),
  iterations: z.number().int().min(1).max(30).optional(),
  durationMs: z.number().int().min(100).max(2000).optional(),
  pauseMs: z.number().int().min(0).max(2000).optional(),
  startX: z.number().optional(),
  startY: z.number().optional(),
  endX: z.number().optional(),
  endY: z.number().optional()
});

export const sendTextCommandSchema = instanceCommandSchema.extend({
  text: z.string()
});

export const sendKeyCommandSchema = instanceCommandSchema.extend({
  key: z.union([z.string(), z.number()])
});

export const downloadLatestCommandSchema = instanceCommandSchema.extend({
  localId: z.union([z.string(), z.number()]).optional(),
  sourceDir: z.string().optional(),
  sourceDirs: z.array(z.string()).optional(),
  extensions: z.array(z.string()).optional(),
  targetFolder: z.string().optional(),
  deleteAfterPull: z.boolean().optional()
});

export const listDownloadCandidatesCommandSchema = instanceCommandSchema.extend({
  localId: z.union([z.string(), z.number()]).optional(),
  sourceDir: z.string().optional(),
  sourceDirs: z.array(z.string()).optional(),
  extensions: z.array(z.string()).optional()
});

export const clearDownloadCommandSchema = instanceCommandSchema.extend({
  localId: z.union([z.string(), z.number()]).optional(),
  sourceDir: z.string().optional(),
  extensions: z.array(z.string()).optional()
});

export const pushUploadFileCommandSchema = instanceCommandSchema.extend({
  runtimeSessionId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
  assetId: z.string().min(1),
  localId: z.union([z.string(), z.number()]).optional()
});

export const openFileCommandSchema = instanceCommandSchema.extend({
  remotePath: z.string().min(1),
  mimeType: z.string().optional()
});

export const cleanupUploadSessionCommandSchema = instanceCommandSchema.extend({
  runtimeSessionId: z.string().min(1).optional()
});

export const cleanupOldTempCommandSchema = instanceCommandSchema.extend({
  olderThanHours: z.number().positive().optional(),
  includeUploads: z.boolean().optional(),
  includeLiveScreenshots: z.boolean().optional(),
  includeDebugScreenshots: z.boolean().optional()
});

export type CreateHostInput = z.infer<typeof createHostSchema>;
export type InstanceCommandInput = z.infer<typeof instanceCommandSchema>;
export type LiveScreenshotCommandInput = z.infer<typeof liveScreenshotCommandSchema>;
export type TapCommandInput = z.infer<typeof tapCommandSchema>;
export type SwipeCommandInput = z.infer<typeof swipeCommandSchema>;
export type LongPressCommandInput = z.infer<typeof longPressCommandSchema>;
export type ScrollToEndCommandInput = z.infer<typeof scrollToEndCommandSchema>;
export type SendTextCommandInput = z.infer<typeof sendTextCommandSchema>;
export type SendKeyCommandInput = z.infer<typeof sendKeyCommandSchema>;
export type DownloadLatestCommandInput = z.infer<typeof downloadLatestCommandSchema>;
export type ListDownloadCandidatesCommandInput = z.infer<typeof listDownloadCandidatesCommandSchema>;
export type ClearDownloadCommandInput = z.infer<typeof clearDownloadCommandSchema>;
export type PushUploadFileCommandInput = z.infer<typeof pushUploadFileCommandSchema>;
export type OpenFileCommandInput = z.infer<typeof openFileCommandSchema>;
export type CleanupUploadSessionCommandInput = z.infer<typeof cleanupUploadSessionCommandSchema>;
export type CleanupOldTempCommandInput = z.infer<typeof cleanupOldTempCommandSchema>;
