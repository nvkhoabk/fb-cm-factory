import { z } from "zod";

export const executeMockJobParamsSchema = z.object({
  id: z.string().min(1)
});

export type ExecuteMockJobParams = z.infer<typeof executeMockJobParamsSchema>;

