import { productionBatchRepository } from "../production-batches/production-batch.repository";
import { AppError } from "../shared/resource";
import { managerBridgeClient } from "./manager-bridge.client";

/**
 * @deprecated Use Host Agent V2 direct execution.
 */
function taskPayloadFromBatch(batchId: string, taskType: string) {
  const batch = productionBatchRepository.getDetail(batchId);
  if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);

  return {
    taskType,
    source: "FB_CM_FACTORY",
    batchId,
    batch
  };
}

/**
 * @deprecated Use Host Agent V2 direct execution.
 */
export const managerBridgeService = {
  async healthCheckManager() {
    try {
      const response = await managerBridgeClient.healthCheckManager();
      return {
        available: true,
        response
      };
    } catch (error) {
      if (error instanceof AppError && error.code === "MANAGER_V1_UNAVAILABLE") {
        return {
          available: false,
          error: {
            code: error.code,
            message: error.message
          }
        };
      }

      throw error;
    }
  },

  async createImageEditTaskFromBatch(batchId: string) {
    return managerBridgeClient.createImageEditTask(taskPayloadFromBatch(batchId, "IMAGE_EDIT"));
  },

  async createVideoGenerateTaskFromBatch(batchId: string) {
    return managerBridgeClient.createVideoGenerateTask(taskPayloadFromBatch(batchId, "VIDEO_GENERATE"));
  },

  async runManagerTask(taskId: string, instanceId: string) {
    return managerBridgeClient.runManagerTask(taskId, instanceId);
  },

  async getManagerTaskStatus(taskId: string) {
    return managerBridgeClient.getManagerTaskStatus(taskId);
  }
};
