import { z } from "zod";

export const executeMockJobParamsSchema = z.object({
  id: z.string().min(1)
});

export type ExecuteMockJobParams = z.infer<typeof executeMockJobParamsSchema>;

/**
 * @deprecated Use Host Agent V2 direct execution.
 */
export const executeV1JobParamsSchema = executeMockJobParamsSchema;

export type ExecuteV1JobParams = z.infer<typeof executeV1JobParamsSchema>;

export const executeImageEditJobParamsSchema = executeMockJobParamsSchema;

export type ExecuteImageEditJobParams = z.infer<typeof executeImageEditJobParamsSchema>;
