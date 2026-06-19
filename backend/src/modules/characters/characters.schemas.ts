import { z } from "zod";

export const updateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.string().optional(),
  age: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
