import { z } from "zod";

export const executeMockJobParamsSchema = z.object({
  id: z.string().min(1)
});

export type ExecuteMockJobParams = z.infer<typeof executeMockJobParamsSchema>;

export const executeV1JobParamsSchema = executeMockJobParamsSchema;

export type ExecuteV1JobParams = z.infer<typeof executeV1JobParamsSchema>;

export const executeImageEditJobParamsSchema = executeMockJobParamsSchema;

export type ExecuteImageEditJobParams = z.infer<typeof executeImageEditJobParamsSchema>;
