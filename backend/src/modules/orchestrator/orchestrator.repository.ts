import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type { OrchestratorJobStatus } from "./orchestrator.schemas";

function mapJob(row: Record<string, unknown>) {
  return {
    id: row.id,
    ruleId: row.rule_id ?? null,
    sourceBatchId: row.source_batch_id,
    targetStageType: row.target_stage_type,
    status: row.status,
    payload: jsonParse(row.payload_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBatch(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    batchType: String(row.batch_type),
    status: String(row.status),
    usageStatus: String(row.usage_status)
  };
}

export const orchestratorRepository = {
  listJobs() {
    return db.prepare("SELECT * FROM orchestrator_jobs ORDER BY created_at DESC")
      .all()
      .map((row) => mapJob(row as Record<string, unknown>));
  },

  getJob(id: string) {
    const row = db.prepare("SELECT * FROM orchestrator_jobs WHERE id = ?").get(id);
    return row ? mapJob(row as Record<string, unknown>) : null;
  },

  getJobBySourceAndStage(sourceBatchId: string, targetStageType: string) {
    const row = db.prepare(`
      SELECT * FROM orchestrator_jobs
      WHERE source_batch_id = ? AND target_stage_type = ?
    `).get(sourceBatchId, targetStageType);

    return row ? mapJob(row as Record<string, unknown>) : null;
  },

  createJob(input: {
    ruleId?: string | null;
    sourceBatchId: string;
    targetStageType: string;
    payload: Record<string, unknown>;
  }) {
    const createdAt = now();
    const id = createId("oj");

    db.prepare(`
      INSERT INTO orchestrator_jobs (
        id, rule_id, source_batch_id, target_stage_type, status,
        payload_json, created_at, updated_at
      ) VALUES (
        @id, @ruleId, @sourceBatchId, @targetStageType, 'PENDING',
        @payloadJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      ruleId: input.ruleId ?? null,
      sourceBatchId: input.sourceBatchId,
      targetStageType: input.targetStageType,
      payloadJson: jsonString(input.payload, {}),
      createdAt,
      updatedAt: createdAt
    });

    return this.getJob(id);
  },

  updateJobStatus(id: string, status: OrchestratorJobStatus, patch: Record<string, unknown> = {}) {
    const current = this.getJob(id);
    if (!current) return null;

    db.prepare(`
      UPDATE orchestrator_jobs
      SET status = @status,
          payload_json = @payloadJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      status,
      payloadJson: jsonString({ ...current.payload, ...patch }, {}),
      updatedAt: now()
    });

    return this.getJob(id);
  },

  listReadyAvailableBatches(batchType: string) {
    return db.prepare(`
      SELECT * FROM production_batches
      WHERE batch_type = ?
        AND status = 'READY'
        AND usage_status = 'AVAILABLE'
      ORDER BY created_at ASC
    `).all(batchType).map((row) => mapBatch(row as Record<string, unknown>));
  },

  getReusableOrAvailableMusic() {
    const row = db.prepare(`
      SELECT * FROM production_batches
      WHERE batch_type = 'MUSIC_TRACK'
        AND status = 'READY'
        AND usage_status IN ('REUSABLE', 'AVAILABLE')
      ORDER BY
        CASE usage_status WHEN 'REUSABLE' THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT 1
    `).get();

    return row ? mapBatch(row as Record<string, unknown>) : null;
  },

  reserveBatch(id: string) {
    db.prepare(`
      UPDATE production_batches
      SET usage_status = 'RESERVED',
          updated_at = @updatedAt
      WHERE id = @id AND usage_status = 'AVAILABLE'
    `).run({
      id,
      updatedAt: now()
    });
  }
};
