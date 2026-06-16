import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type {
  BatchType,
  CreateBatchUsageInput,
  CreateProductionBatchInput,
  CreateProductionBatchItemInput,
  UpdateProductionBatchInput
} from "./production-batch.schemas";

function mapBatch(row: Record<string, unknown>) {
  return {
    id: row.id,
    batchType: row.batch_type,
    sourceGroupId: row.source_group_id ?? null,
    workflowId: row.workflow_id ?? null,
    workflowRunId: row.workflow_run_id ?? null,
    status: row.status,
    usageStatus: row.usage_status,
    attributes: jsonParse(row.attributes_json, {}),
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBatchItem(row: Record<string, unknown>) {
  return {
    id: row.id,
    batchId: row.batch_id,
    itemType: row.item_type,
    itemId: row.item_id,
    role: row.role ?? null,
    sortOrder: row.sort_order,
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: row.created_at
  };
}

function mapBatchUsage(row: Record<string, unknown>) {
  return {
    id: row.id,
    sourceBatchId: row.source_batch_id,
    targetBatchId: row.target_batch_id,
    usageType: row.usage_type,
    workflowRunId: row.workflow_run_id ?? null,
    stageRunId: row.stage_run_id ?? null,
    createdAt: row.created_at
  };
}

function batchWithItems(batch: ReturnType<typeof mapBatch> | null) {
  if (!batch) return null;

  const items = db.prepare(`
    SELECT * FROM production_batch_items
    WHERE batch_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `).all(batch.id).map((row) => mapBatchItem(row as Record<string, unknown>));

  return {
    ...batch,
    items
  };
}

export const productionBatchRepository = {
  list() {
    return db.prepare("SELECT * FROM production_batches ORDER BY created_at DESC")
      .all()
      .map((row) => mapBatch(row as Record<string, unknown>));
  },

  listReady(batchType: BatchType) {
    return db.prepare(`
      SELECT * FROM production_batches
      WHERE batch_type = ?
        AND status = 'READY'
        AND usage_status IN ('AVAILABLE', 'REUSABLE')
      ORDER BY created_at ASC
    `).all(batchType).map((row) => mapBatch(row as Record<string, unknown>));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM production_batches WHERE id = ?").get(id);
    return row ? mapBatch(row as Record<string, unknown>) : null;
  },

  getDetail(id: string) {
    return batchWithItems(this.get(id));
  },

  create(input: CreateProductionBatchInput) {
    const createdAt = now();
    const id = createId("pb");

    db.prepare(`
      INSERT INTO production_batches (
        id, batch_type, source_group_id, workflow_id, workflow_run_id,
        status, usage_status, attributes_json, metadata_json, created_at, updated_at
      ) VALUES (
        @id, @batchType, @sourceGroupId, @workflowId, @workflowRunId,
        @status, @usageStatus, @attributesJson, @metadataJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      batchType: input.batchType,
      sourceGroupId: input.sourceGroupId ?? null,
      workflowId: input.workflowId ?? null,
      workflowRunId: input.workflowRunId ?? null,
      status: input.status,
      usageStatus: input.usageStatus,
      attributesJson: jsonString(input.attributes, {}),
      metadataJson: jsonString(input.metadata, {}),
      createdAt,
      updatedAt: createdAt
    });

    return this.getDetail(id);
  },

  update(id: string, input: UpdateProductionBatchInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE production_batches
      SET status = @status,
          usage_status = @usageStatus,
          attributes_json = @attributesJson,
          metadata_json = @metadataJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      status: input.status ?? current.status,
      usageStatus: input.usageStatus ?? current.usageStatus,
      attributesJson: jsonString(input.attributes ?? current.attributes, {}),
      metadataJson: jsonString(input.metadata ?? current.metadata, {}),
      updatedAt: now()
    });

    return this.getDetail(id);
  },

  addItem(batchId: string, input: CreateProductionBatchItemInput) {
    const id = createId("pbi");

    db.prepare(`
      INSERT INTO production_batch_items (
        id, batch_id, item_type, item_id, role, sort_order, metadata_json, created_at
      ) VALUES (
        @id, @batchId, @itemType, @itemId, @role, @sortOrder, @metadataJson, @createdAt
      )
    `).run({
      id,
      batchId,
      itemType: input.itemType,
      itemId: input.itemId,
      role: input.role ?? null,
      sortOrder: input.sortOrder,
      metadataJson: jsonString(input.metadata, {}),
      createdAt: now()
    });

    const row = db.prepare("SELECT * FROM production_batch_items WHERE id = ?").get(id);
    return mapBatchItem(row as Record<string, unknown>);
  },

  deleteItem(batchId: string, itemId: string) {
    return db.prepare("DELETE FROM production_batch_items WHERE id = ? AND batch_id = ?")
      .run(itemId, batchId)
      .changes > 0;
  },

  setStatus(id: string, status: string, usageStatus?: string) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE production_batches
      SET status = @status,
          usage_status = @usageStatus,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      status,
      usageStatus: usageStatus ?? current.usageStatus,
      updatedAt: now()
    });

    return this.getDetail(id);
  },

  setUsageStatus(id: string, usageStatus: string) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE production_batches
      SET usage_status = @usageStatus,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      usageStatus,
      updatedAt: now()
    });

    return this.getDetail(id);
  },

  createUsage(sourceBatchId: string, input: CreateBatchUsageInput) {
    const id = createId("pbu");

    db.prepare(`
      INSERT INTO production_batch_usage (
        id, source_batch_id, target_batch_id, usage_type, workflow_run_id, stage_run_id, created_at
      ) VALUES (
        @id, @sourceBatchId, @targetBatchId, @usageType, @workflowRunId, @stageRunId, @createdAt
      )
    `).run({
      id,
      sourceBatchId,
      targetBatchId: input.targetBatchId,
      usageType: input.usageType,
      workflowRunId: input.workflowRunId ?? null,
      stageRunId: input.stageRunId ?? null,
      createdAt: now()
    });

    const row = db.prepare("SELECT * FROM production_batch_usage WHERE id = ?").get(id);
    return mapBatchUsage(row as Record<string, unknown>);
  },

  getUsageByTarget(targetBatchId: string) {
    return db.prepare(`
      SELECT * FROM production_batch_usage
      WHERE target_batch_id = ?
      ORDER BY created_at ASC
    `).all(targetBatchId).map((row) => mapBatchUsage(row as Record<string, unknown>));
  },

  getLineage(batchId: string) {
    const sourceUsages = db.prepare(`
      SELECT
        u.*,
        sb.batch_type AS source_batch_type,
        sb.status AS source_status,
        sb.usage_status AS source_usage_status,
        tb.batch_type AS target_batch_type,
        tb.status AS target_status,
        tb.usage_status AS target_usage_status
      FROM production_batch_usage u
      LEFT JOIN production_batches sb ON sb.id = u.source_batch_id
      LEFT JOIN production_batches tb ON tb.id = u.target_batch_id
      WHERE u.source_batch_id = ?
      ORDER BY u.created_at ASC
    `).all(batchId);

    const targetUsages = db.prepare(`
      SELECT
        u.*,
        sb.batch_type AS source_batch_type,
        sb.status AS source_status,
        sb.usage_status AS source_usage_status,
        tb.batch_type AS target_batch_type,
        tb.status AS target_status,
        tb.usage_status AS target_usage_status
      FROM production_batch_usage u
      LEFT JOIN production_batches sb ON sb.id = u.source_batch_id
      LEFT JOIN production_batches tb ON tb.id = u.target_batch_id
      WHERE u.target_batch_id = ?
      ORDER BY u.created_at ASC
    `).all(batchId);

    function mapLineage(row: Record<string, unknown>) {
      return {
        ...mapBatchUsage(row),
        sourceBatch: {
          id: row.source_batch_id,
          batchType: row.source_batch_type,
          status: row.source_status,
          usageStatus: row.source_usage_status
        },
        targetBatch: {
          id: row.target_batch_id,
          batchType: row.target_batch_type,
          status: row.target_status,
          usageStatus: row.target_usage_status
        }
      };
    }

    return {
      batchId,
      sourceUsages: sourceUsages.map((row) => mapLineage(row as Record<string, unknown>)),
      targetUsages: targetUsages.map((row) => mapLineage(row as Record<string, unknown>))
    };
  }
};
