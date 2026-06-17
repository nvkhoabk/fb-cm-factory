import { z } from "zod";

export const managerBridgeBatchParamsSchema = z.object({
  batchId: z.string().min(1)
});

export const managerBridgeRunTaskSchema = z.object({
  taskId: z.string().min(1),
  instanceId: z.string().min(1)
});

export const managerBridgeTaskParamsSchema = z.object({
  taskId: z.string().min(1)
});

export type ManagerBridgeBatchParams = z.infer<typeof managerBridgeBatchParamsSchema>;
export type ManagerBridgeRunTaskInput = z.infer<typeof managerBridgeRunTaskSchema>;
export type ManagerBridgeTaskParams = z.infer<typeof managerBridgeTaskParamsSchema>;
