import { z } from "zod";

export const createGroupAttributeSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  valueType: z.enum(["TEXT", "NUMBER", "BOOLEAN", "SELECT", "MULTI_SELECT"])
});

export const createGroupAttributeValueSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1)
});

export type CreateGroupAttributeInput = z.infer<typeof createGroupAttributeSchema>;
export type CreateGroupAttributeValueInput = z.infer<typeof createGroupAttributeValueSchema>;

