import { z } from "zod";

export const createInstancePoolSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1),
  poolType: z.string().min(1),
  status: z.string().default("active"),
  capabilityTags: z.array(z.string()).default([]),
  concurrencyLimit: z.number().int().positive().default(1),
  leaseTimeoutSeconds: z.number().int().positive().default(120),
  cooldownSeconds: z.number().int().nonnegative().default(0),
  selectionPolicy: z.record(z.string(), z.unknown()).default({})
});

export const createInstanceSlotSchema = z.object({
  hostId: z.string().optional(),
  slotType: z.string().min(1),
  localRef: z.string().optional(),
  displayName: z.string().min(1),
  status: z.string().default("available"),
  healthStatus: z.string().default("unknown"),
  capabilityTags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export type CreateInstancePoolInput = z.infer<typeof createInstancePoolSchema>;
export type CreateInstanceSlotInput = z.infer<typeof createInstanceSlotSchema>;

