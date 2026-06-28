import { z } from "zod";

export const recoverRuntimeSessionSchema = z.object({
  hostId: z.string().min(1).optional()
});

export type RecoverRuntimeSessionInput = z.infer<typeof recoverRuntimeSessionSchema>;
