import { z } from "zod";

export const createCharacterGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().default("active")
});

export const updateCharacterGroupSchema = createCharacterGroupSchema.partial();

export const createGroupMemberSchema = z.object({
  characterId: z.string().min(1),
  role: z.string().default("member"),
  sortOrder: z.number().int().default(0)
});

export const assignGroupAttributeSchema = z.object({
  attributeId: z.string().min(1),
  valueId: z.string().optional(),
  customValue: z.string().optional()
}).refine((value) => value.valueId || value.customValue, {
  message: "valueId or customValue is required"
});

export const replaceGroupAttributesSchema = z.object({
  attributes: z.array(z.object({
    key: z.string().min(1),
    name: z.string().optional(),
    value: z.string().optional()
  })).default([])
});

export const reorderGroupMembersSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1)
});

export type CreateCharacterGroupInput = z.infer<typeof createCharacterGroupSchema>;
export type UpdateCharacterGroupInput = z.infer<typeof updateCharacterGroupSchema>;
export type CreateGroupMemberInput = z.infer<typeof createGroupMemberSchema>;
export type AssignGroupAttributeInput = z.infer<typeof assignGroupAttributeSchema>;
export type ReplaceGroupAttributesInput = z.infer<typeof replaceGroupAttributesSchema>;
export type ReorderGroupMembersInput = z.infer<typeof reorderGroupMembersSchema>;
