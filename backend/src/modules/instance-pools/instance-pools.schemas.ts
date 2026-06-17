import { z } from "zod";

export const poolTypeSchema = z.enum([
  "IMAGE_EDIT",
  "VIDEO_GENERATE",
  "MUSIC_GENERATE",
  "VIDEO_COMPOSE"
]);

export const createInstancePoolSchema = z.object({
  name: z.string().min(1),
  poolType: poolTypeSchema,
  status: z.string().default("active")
});

export const createInstancePoolMemberSchema = z.object({
  instanceId: z.string().min(1),
  priority: z.number().int().default(100),
  status: z.string().default("active"),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const updateInstancePoolMemberSchema = z.object({
  priority: z.number().int().optional(),
  status: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type CreateInstancePoolInput = z.infer<typeof createInstancePoolSchema>;
export type CreateInstancePoolMemberInput = z.infer<typeof createInstancePoolMemberSchema>;
export type UpdateInstancePoolMemberInput = z.infer<typeof updateInstancePoolMemberSchema>;
