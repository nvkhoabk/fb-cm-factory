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

export const sendTextCommandSchema = instanceCommandSchema.extend({
  text: z.string()
});

export const sendKeyCommandSchema = instanceCommandSchema.extend({
  key: z.union([z.string(), z.number()])
});

export const downloadLatestCommandSchema = instanceCommandSchema.extend({
  sourceDir: z.string().optional(),
  extensions: z.array(z.string()).optional(),
  targetFolder: z.string().optional()
});

export type CreateHostInput = z.infer<typeof createHostSchema>;
export type InstanceCommandInput = z.infer<typeof instanceCommandSchema>;
export type LiveScreenshotCommandInput = z.infer<typeof liveScreenshotCommandSchema>;
export type TapCommandInput = z.infer<typeof tapCommandSchema>;
export type SwipeCommandInput = z.infer<typeof swipeCommandSchema>;
export type SendTextCommandInput = z.infer<typeof sendTextCommandSchema>;
export type SendKeyCommandInput = z.infer<typeof sendKeyCommandSchema>;
export type DownloadLatestCommandInput = z.infer<typeof downloadLatestCommandSchema>;
