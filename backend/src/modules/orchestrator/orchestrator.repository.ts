import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type {
  CreateOrchestratorRuleInput,
  OrchestratorJobStatus,
  UpdateOrchestratorRuleInput
} from "./orchestrator.schemas";

function mapJob(row: Record<string, unknown>) {
  return {
    id: row.id,
    ruleId: row.rule_id ?? null,
    sourceBatchId: row.source_batch_id,
    targetStageType: row.target_stage_type,
    status: row.status,
    payload: jsonParse(row.payload_json, {}),
    output: jsonParse(row.output_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBatch(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    batchType: String(row.batch_type),
    workflowId: row.workflow_id ?? null,
    workflowRunId: row.workflow_run_id ?? null,
    status: String(row.status),
    usageStatus: String(row.usage_status),
    attributes: jsonParse<Record<string, unknown>>(row.attributes_json, {}),
    metadata: jsonParse<Record<string, unknown>>(row.metadata_json, {})
  };
}

function mapRule(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    triggerBatchType: String(row.trigger_batch_type),
    triggerStatus: String(row.trigger_status),
    targetStageType: String(row.target_stage_type),
    priority: Number(row.priority ?? 100),
    isActive: Number(row.is_active ?? 1) === 1,
    config: jsonParse<Record<string, unknown>>(row.config_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const orchestratorRepository = {
  countRules() {
    const row = db.prepare("SELECT COUNT(*) AS count FROM orchestrator_rules").get() as { count: number };
    return row.count;
  },

  createRule(input: CreateOrchestratorRuleInput) {
    const createdAt = now();
    const id = createId("orule");

    db.prepare(`
      INSERT INTO orchestrator_rules (
        id, name, trigger_batch_type, trigger_status, target_stage_type,
        priority, is_active, config_json, created_at, updated_at
      ) VALUES (
        @id, @name, @triggerBatchType, @triggerStatus, @targetStageType,
        @priority, @isActive, @configJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      name: input.name,
      triggerBatchType: input.triggerBatchType,
      triggerStatus: input.triggerStatus,
      targetStageType: input.targetStageType,
      priority: input.priority,
      isActive: input.isActive === false ? 0 : 1,
      configJson: jsonString(input.config ?? {}, {}),
      createdAt,
      updatedAt: createdAt
    });

    const row = db.prepare("SELECT * FROM orchestrator_rules WHERE id = ?").get(id);
    return mapRule(row as Record<string, unknown>);
  },

  seedDefaultRulesIfEmpty() {
    const defaults = [
      {
        name: "Default image batch to video generate",
        triggerBatchType: "IMAGE_BATCH",
        triggerStatus: "READY",
        targetStageType: "VIDEO_GENERATE",
        priority: 100,
        isActive: true,
        config: {}
      },
      {
        name: "Default video batch to video compose",
        triggerBatchType: "VIDEO_BATCH",
        triggerStatus: "READY",
        targetStageType: "VIDEO_COMPOSE",
        priority: 200,
        isActive: true,
        config: {
          requiresMusic: true
        }
      },
      {
        name: "Default final video to post content",
        triggerBatchType: "FINAL_VIDEO",
        triggerStatus: "READY",
        targetStageType: "POST_CONTENT",
        priority: 300,
        isActive: true,
        config: {}
      }
    ];

    const createdRules = [];
    for (const rule of defaults) {
      const existing = this.getJobRuleByTriggerAndTarget(rule.triggerBatchType, rule.triggerStatus, rule.targetStageType);
      if (!existing) createdRules.push(this.createRule(rule));
    }

    return createdRules;
  },

  getJobRuleByTriggerAndTarget(triggerBatchType: string, triggerStatus: string, targetStageType: string) {
    const row = db.prepare(`
      SELECT * FROM orchestrator_rules
      WHERE trigger_batch_type = ?
        AND trigger_status = ?
        AND target_stage_type = ?
      LIMIT 1
    `).get(triggerBatchType, triggerStatus, targetStageType);

    return row ? mapRule(row as Record<string, unknown>) : null;
  },

  listActiveRules() {
    return db.prepare(`
      SELECT * FROM orchestrator_rules
      WHERE is_active = 1
      ORDER BY priority ASC, created_at ASC
    `).all().map((row) => mapRule(row as Record<string, unknown>));
  },

  listRules() {
    return db.prepare(`
      SELECT * FROM orchestrator_rules
      ORDER BY priority ASC, created_at ASC
    `).all().map((row) => mapRule(row as Record<string, unknown>));
  },

  getRule(id: string) {
    const row = db.prepare("SELECT * FROM orchestrator_rules WHERE id = ?").get(id);
    return row ? mapRule(row as Record<string, unknown>) : null;
  },

  updateRule(id: string, input: UpdateOrchestratorRuleInput) {
    const current = this.getRule(id);
    if (!current) return null;

    db.prepare(`
      UPDATE orchestrator_rules
      SET name = @name,
          trigger_batch_type = @triggerBatchType,
          trigger_status = @triggerStatus,
          target_stage_type = @targetStageType,
          priority = @priority,
          is_active = @isActive,
          config_json = @configJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: input.name ?? current.name,
      triggerBatchType: input.triggerBatchType ?? current.triggerBatchType,
      triggerStatus: input.triggerStatus ?? current.triggerStatus,
      targetStageType: input.targetStageType ?? current.targetStageType,
      priority: input.priority ?? current.priority,
      isActive: (input.isActive ?? current.isActive) ? 1 : 0,
      configJson: jsonString(input.config ?? current.config, {}),
      updatedAt: now()
    });

    return this.getRule(id);
  },

  setRuleActive(id: string, isActive: boolean) {
    const current = this.getRule(id);
    if (!current) return null;

    db.prepare(`
      UPDATE orchestrator_rules
      SET is_active = @isActive,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      isActive: isActive ? 1 : 0,
      updatedAt: now()
    });

    return this.getRule(id);
  },

  deleteRule(id: string) {
    return db.prepare("DELETE FROM orchestrator_rules WHERE id = ?").run(id).changes > 0;
  },

  listJobs() {
    return db.prepare("SELECT * FROM orchestrator_jobs ORDER BY created_at DESC")
      .all()
      .map((row) => mapJob(row as Record<string, unknown>));
  },

  getJob(id: string) {
    const row = db.prepare("SELECT * FROM orchestrator_jobs WHERE id = ?").get(id);
    return row ? mapJob(row as Record<string, unknown>) : null;
  },

  deleteJob(id: string) {
    const transaction = db.transaction(() => {
      const sessionRows = db.prepare("SELECT id FROM runtime_sessions WHERE job_id = ?").all(id) as Array<{ id: string }>;
      for (const session of sessionRows) {
        const runRows = db.prepare("SELECT id FROM script_runs WHERE runtime_session_id = ?").all(session.id) as Array<{ id: string }>;
        for (const run of runRows) {
          db.prepare("DELETE FROM script_run_steps WHERE script_run_id = ?").run(run.id);
        }
        db.prepare("DELETE FROM script_runs WHERE runtime_session_id = ?").run(session.id);
        db.prepare("DELETE FROM runtime_session_steps WHERE runtime_session_id = ?").run(session.id);
      }
      db.prepare("DELETE FROM runtime_sessions WHERE job_id = ?").run(id);
      db.prepare("DELETE FROM instance_allocations WHERE orchestrator_job_id = ?").run(id);
      return db.prepare("DELETE FROM orchestrator_jobs WHERE id = ?").run(id).changes > 0;
    });
    return transaction();
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

  updateJobResult(id: string, status: OrchestratorJobStatus, patch: {
    payload?: Record<string, unknown>;
    output?: Record<string, unknown>;
  }) {
    const current = this.getJob(id);
    if (!current) return null;

    db.prepare(`
      UPDATE orchestrator_jobs
      SET status = @status,
          payload_json = @payloadJson,
          output_json = @outputJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      status,
      payloadJson: jsonString({ ...current.payload, ...(patch.payload ?? {}) }, {}),
      outputJson: jsonString({ ...current.output, ...(patch.output ?? {}) }, {}),
      updatedAt: now()
    });

    return this.getJob(id);
  },

  listTriggerBatches(batchType: string, status: string) {
    return db.prepare(`
      SELECT * FROM production_batches
      WHERE batch_type = ?
        AND status = ?
        AND usage_status = 'AVAILABLE'
      ORDER BY created_at ASC
    `).all(batchType, status).map((row) => mapBatch(row as Record<string, unknown>));
  },

  listWorkflowLinkedAvailableBatches() {
    return db.prepare(`
      SELECT * FROM production_batches
      WHERE workflow_id IS NOT NULL
        AND workflow_id != ''
        AND usage_status = 'AVAILABLE'
      ORDER BY created_at ASC
    `).all().map((row) => mapBatch(row as Record<string, unknown>));
  },

  getReusableOrAvailableMusic() {
    const row = db.prepare(`
      SELECT * FROM production_batches
      WHERE batch_type = 'MUSIC_TRACK'
        AND status = 'READY'
        AND usage_status = 'REUSABLE'
      ORDER BY RANDOM()
      LIMIT 1
    `).get();

    return row ? mapBatch(row as Record<string, unknown>) : null;
  },

  listReusableMusicTracks() {
    return db.prepare(`
      SELECT * FROM production_batches
      WHERE batch_type = 'MUSIC_TRACK'
        AND status = 'READY'
        AND usage_status = 'REUSABLE'
      ORDER BY created_at DESC
    `).all().map((row) => mapBatch(row as Record<string, unknown>));
  },

  getWorkflowMusicPolicy(workflowId?: string | null) {
    if (!workflowId) return {};
    const row = db.prepare("SELECT music_policy_json FROM workflows WHERE id = ?").get(workflowId) as { music_policy_json?: unknown } | undefined;
    return row ? jsonParse<Record<string, unknown>>(row.music_policy_json, {}) : {};
  },

  getWorkflowResourceRules(workflowId?: string | null) {
    if (!workflowId) return [];
    const row = db.prepare("SELECT resource_rules_json FROM workflows WHERE id = ?").get(workflowId) as { resource_rules_json?: unknown } | undefined;
    return row ? jsonParse<Record<string, unknown>[]>(row.resource_rules_json, []) : [];
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
