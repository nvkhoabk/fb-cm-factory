import { z } from "zod";

export const createCharacterSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  status: z.string().default("unknown"),
  gender: z.string().optional(),
  birthYear: z.number().int().optional(),
  age: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const createCharacterGroupSchema = z.object({
  workspaceId: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  groupType: z.string().default("batch"),
  status: z.string().default("active"),
  description: z.string().optional(),
  selectionPolicy: z.record(z.string(), z.unknown()).default({}),
  createdBy: z.string().optional()
});

export const createGroupMemberSchema = z.object({
  characterId: z.string().min(1),
  role: z.string().default("subject"),
  sortOrder: z.number().int().default(0),
  status: z.string().default("active"),
  memberContext: z.record(z.string(), z.unknown()).default({})
});

export const createAttributeDefinitionSchema = z.object({
  workspaceId: z.string().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  valueType: z.enum(["text", "number", "boolean", "json"]),
  scope: z.enum(["group", "member", "role", "workflow_input"]),
  allowedValues: z.array(z.unknown()).default([]),
  defaultValue: z.unknown().optional(),
  isRequired: z.boolean().default(false),
  isQueryable: z.boolean().default(true)
});

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type CreateCharacterGroupInput = z.infer<typeof createCharacterGroupSchema>;
export type CreateGroupMemberInput = z.infer<typeof createGroupMemberSchema>;
export type CreateAttributeDefinitionInput = z.infer<typeof createAttributeDefinitionSchema>;

