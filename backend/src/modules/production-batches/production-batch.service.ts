import { AppError } from "../shared/resource";
import { orchestratorRepository } from "../orchestrator/orchestrator.repository";
import { orchestratorService } from "../orchestrator/orchestrator.service";
import { characterSourceAssetsService } from "../character-assets/character-source-assets.service";
import { productionBatchRepository } from "./production-batch.repository";
import type {
  BatchType,
  CreateBatchUsageInput,
  CreateProductionBatchInput,
  CreateProductionBatchItemInput,
  UpdateProductionBatchInput
} from "./production-batch.schemas";

function objectValue(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export const productionBatchService = {
  list: () => productionBatchRepository.list(),

  listReady: (batchType: BatchType) => productionBatchRepository.listReady(batchType),

  get(id: string) {
    const batch = productionBatchRepository.getDetail(id);
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    return batch;
  },

  create(input: CreateProductionBatchInput) {
    if (!input.sourceGroupId) return productionBatchRepository.create(input);

    const sourceAssets = characterSourceAssetsService.resolveCharacterGroupSourceAssets(input.sourceGroupId);
    const metadata = objectValue(input.metadata);
    return productionBatchRepository.create({
      ...input,
      metadata: {
        ...metadata,
        groupId: input.sourceGroupId,
        characterIds: sourceAssets.characterIds,
        sourceAssetsSnapshot: sourceAssets,
        characterGroupBatch: {
          groupId: input.sourceGroupId,
          characterIds: sourceAssets.characterIds,
          attributesSnapshot: sourceAssets.attributesSnapshot,
          sourceAssetsSnapshot: sourceAssets
        }
      }
    });
  },

  update(id: string, input: UpdateProductionBatchInput) {
    const batch = productionBatchRepository.update(id, input);
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    return batch;
  },

  addItem(batchId: string, input: CreateProductionBatchItemInput) {
    if (!productionBatchRepository.get(batchId)) {
      throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    }

    return productionBatchRepository.addItem(batchId, input);
  },

  deleteItem(batchId: string, itemId: string) {
    if (!productionBatchRepository.deleteItem(batchId, itemId)) {
      throw new AppError("PRODUCTION_BATCH_ITEM_NOT_FOUND", "Production batch item not found", 404);
    }
  },

  delete(id: string) {
    if (!productionBatchRepository.delete(id)) {
      throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    }
  },

  reserve(id: string) {
    const batch = productionBatchRepository.get(id);
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    if (batch.usageStatus !== "AVAILABLE") {
      throw new AppError("PRODUCTION_BATCH_NOT_AVAILABLE", "Only AVAILABLE batches can be reserved");
    }

    return productionBatchRepository.setUsageStatus(id, "RESERVED");
  },

  markReady(id: string) {
    const batch = productionBatchRepository.setStatus(id, "READY");
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    return batch;
  },

  markUsed(id: string) {
    const batch = productionBatchRepository.get(id);
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);

    if (batch.usageStatus === "REUSABLE") {
      return productionBatchRepository.getDetail(id);
    }

    return productionBatchRepository.setUsageStatus(id, "USED");
  },

  release(id: string) {
    const batch = productionBatchRepository.get(id);
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    if (batch.usageStatus !== "RESERVED") {
      throw new AppError("PRODUCTION_BATCH_NOT_RESERVED", "Only RESERVED batches can be released");
    }

    return productionBatchRepository.setUsageStatus(id, "AVAILABLE");
  },

  createBatchUsage(sourceBatchId: string, input: CreateBatchUsageInput) {
    if (!productionBatchRepository.get(sourceBatchId)) {
      throw new AppError("SOURCE_BATCH_NOT_FOUND", "Source production batch not found", 404);
    }
    if (!productionBatchRepository.get(input.targetBatchId)) {
      throw new AppError("TARGET_BATCH_NOT_FOUND", "Target production batch not found", 404);
    }

    return productionBatchRepository.createUsage(sourceBatchId, input);
  },

  getBatchUsageByTarget(targetBatchId: string) {
    if (!productionBatchRepository.get(targetBatchId)) {
      throw new AppError("TARGET_BATCH_NOT_FOUND", "Target production batch not found", 404);
    }

    return productionBatchRepository.getUsageByTarget(targetBatchId);
  },

  getBatchLineage(batchId: string) {
    if (!productionBatchRepository.get(batchId)) {
      throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    }

    return productionBatchRepository.getLineage(batchId);
  },

  launch(id: string) {
    const batch = productionBatchRepository.get(id);
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    if (!["NEW", "READY"].includes(String(batch.status))) {
      throw new AppError("PRODUCTION_BATCH_NOT_LAUNCHABLE", "Only NEW or READY batches can be launched");
    }

    const readyBatch = batch.status === "READY"
      ? batch
      : productionBatchRepository.setStatus(id, "READY");

    orchestratorService.scan();
    const metadata = readyBatch?.metadata && typeof readyBatch.metadata === "object"
      ? readyBatch.metadata as Record<string, unknown>
      : {};
    if (readyBatch?.batchType === "IMAGE_BATCH" && !orchestratorRepository.getJobBySourceAndStage(String(id), "IMAGE_EDIT")) {
      orchestratorRepository.createJob({
        sourceBatchId: String(id),
        targetStageType: "IMAGE_EDIT",
        payload: {
          sourceBatchId: id,
          sourceBatchType: readyBatch.batchType,
          scriptId: metadata.scriptId ?? metadata.imageEditScriptId ?? null,
          hostId: metadata.hostId ?? null
        }
      });
    }
    const relatedJobs = orchestratorRepository.listJobs()
      .filter((item) => item.sourceBatchId === id);

    return {
      batch: readyBatch,
      createdJobs: relatedJobs,
      jobs: relatedJobs
    };
  }
};
