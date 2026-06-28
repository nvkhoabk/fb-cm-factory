import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  managerBridgeBatchParamsSchema,
  managerBridgeRunTaskSchema,
  managerBridgeTaskParamsSchema
} from "./manager-bridge.schemas";
import { managerBridgeService } from "./manager-bridge.service";

/**
 * @deprecated Use Host Agent V2 direct execution.
 */
export const managerBridgeRouter = Router();

managerBridgeRouter.get("/health", async (_req, res) => {
  try {
    res.json({ ok: true, data: await managerBridgeService.healthCheckManager() });
  } catch (error) {
    sendError(res, error);
  }
});

managerBridgeRouter.post("/tasks/image-edit/from-batches/:batchId", async (req, res) => {
  try {
    const params = managerBridgeBatchParamsSchema.parse(req.params);
    res.status(201).json({
      ok: true,
      data: await managerBridgeService.createImageEditTaskFromBatch(params.batchId)
    });
  } catch (error) {
    sendError(res, error);
  }
});

managerBridgeRouter.post("/tasks/video-generate/from-batches/:batchId", async (req, res) => {
  try {
    const params = managerBridgeBatchParamsSchema.parse(req.params);
    res.status(201).json({
      ok: true,
      data: await managerBridgeService.createVideoGenerateTaskFromBatch(params.batchId)
    });
  } catch (error) {
    sendError(res, error);
  }
});

managerBridgeRouter.post("/tasks/run", async (req, res) => {
  try {
    const input = managerBridgeRunTaskSchema.parse(req.body ?? {});
    res.json({
      ok: true,
      data: await managerBridgeService.runManagerTask(input.taskId, input.instanceId)
    });
  } catch (error) {
    sendError(res, error);
  }
});

managerBridgeRouter.get("/tasks/:taskId/status", async (req, res) => {
  try {
    const params = managerBridgeTaskParamsSchema.parse(req.params);
    res.json({
      ok: true,
      data: await managerBridgeService.getManagerTaskStatus(params.taskId)
    });
  } catch (error) {
    sendError(res, error);
  }
});
