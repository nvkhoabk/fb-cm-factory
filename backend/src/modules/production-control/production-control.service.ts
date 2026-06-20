import { db } from "../../database/db";
import { jsonParse } from "../shared/resource";

function rowRecord(value: unknown) {
  return value as Record<string, unknown>;
}

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] as string : null;
}

function mapJob(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    ruleId: text(row, "rule_id"),
    sourceBatchId: text(row, "source_batch_id"),
    targetStageType: text(row, "target_stage_type"),
    status: text(row, "status"),
    payload: jsonParse<Record<string, unknown>>(row.payload_json, {}),
    output: jsonParse<Record<string, unknown>>(row.output_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapBatch(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    batchType: text(row, "batch_type"),
    sourceGroupId: text(row, "source_group_id"),
    workflowId: text(row, "workflow_id"),
    workflowRunId: text(row, "workflow_run_id"),
    status: text(row, "status"),
    usageStatus: text(row, "usage_status"),
    attributes: jsonParse<Record<string, unknown>>(row.attributes_json, {}),
    metadata: jsonParse<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapRuntime(row?: Record<string, unknown>) {
  if (!row) return null;
  return {
    id: text(row, "id"),
    jobId: text(row, "job_id"),
    hostId: text(row, "host_id"),
    instanceId: text(row, "instance_id"),
    scriptId: text(row, "script_id"),
    status: text(row, "status"),
    currentStepNo: Number(row.current_step_no ?? 0),
    checkpoint: jsonParse<Record<string, unknown>>(row.checkpoint_json, {}),
    updatedAt: text(row, "updated_at")
  };
}

function mapWorkflow(row?: Record<string, unknown>) {
  if (!row) return null;
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    status: text(row, "status"),
    capacityConfig: jsonParse<Record<string, unknown>>(row.capacity_config_json, {}),
    musicPolicy: jsonParse<Record<string, unknown>>(row.music_policy_json, {}),
    postContentPolicy: jsonParse<Record<string, unknown>>(row.post_content_policy_json, {}),
    promptMapping: jsonParse<Record<string, unknown>>(row.prompt_mapping_json, {}),
    scriptMapping: jsonParse<Record<string, unknown>>(row.script_mapping_json, {})
  };
}

function mapGroup(row?: Record<string, unknown>) {
  if (!row) return null;
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    status: text(row, "status"),
    memberCount: Number(row.member_count ?? 0),
    attributesSummary: text(row, "attributes_summary")
  };
}

function groupIdFromBatch(batch: ReturnType<typeof mapBatch> | null) {
  const metadata = batch?.metadata ?? {};
  return batch?.sourceGroupId
    ?? (typeof metadata.groupId === "string" ? metadata.groupId : null)
    ?? (typeof metadata.characterGroupBatch === "object" && metadata.characterGroupBatch && typeof (metadata.characterGroupBatch as Record<string, unknown>).groupId === "string" ? (metadata.characterGroupBatch as Record<string, unknown>).groupId as string : null);
}

function recommendations(job: ReturnType<typeof mapJob>, runtime: ReturnType<typeof mapRuntime>, sourceBatch: ReturnType<typeof mapBatch> | null) {
  const items: string[] = [];
  if (!sourceBatch) items.push("Source resource is missing or no longer available.");
  if (runtime?.status === "FAILED_RECOVERABLE") items.push("Runtime is recoverable from checkpoint.");
  if (job.status === "PENDING") items.push("Allocate capacity or verify eligible STANDBY instances.");
  if (job.targetStageType === "VIDEO_COMPOSE") items.push("Verify matching MUSIC_TRACK availability.");
  return items;
}

export const productionControlService = {
  listJobs() {
    const jobs = db.prepare("SELECT * FROM orchestrator_jobs ORDER BY created_at DESC").all().map((row) => mapJob(rowRecord(row)));
    return jobs.map((job) => {
      const sourceBatchRow = job.sourceBatchId ? db.prepare("SELECT * FROM production_batches WHERE id = ?").get(job.sourceBatchId) : null;
      const sourceBatch = sourceBatchRow ? mapBatch(rowRecord(sourceBatchRow)) : null;
      const outputBatches = db.prepare("SELECT * FROM production_batches WHERE metadata_json LIKE ? ORDER BY created_at DESC")
        .all(`%${job.id}%`)
        .map((row) => mapBatch(rowRecord(row)));
      const runtime = mapRuntime(rowRecord(db.prepare("SELECT * FROM runtime_sessions WHERE job_id = ? ORDER BY updated_at DESC LIMIT 1").get(job.id) ?? undefined));
      const workflowId = sourceBatch?.workflowId ?? (typeof job.payload.workflowId === "string" ? job.payload.workflowId : null);
      const workflow = workflowId ? mapWorkflow(rowRecord(db.prepare("SELECT * FROM workflows WHERE id = ?").get(workflowId) ?? undefined)) : null;
      const groupId = groupIdFromBatch(sourceBatch);
      const group = groupId ? mapGroup(rowRecord(db.prepare(`
        SELECT cg.*, COUNT(cgm.id) AS member_count
        FROM character_groups cg
        LEFT JOIN character_group_members cgm ON cgm.group_id = cg.id
        WHERE cg.id = ?
        GROUP BY cg.id
      `).get(groupId) ?? undefined)) : null;
      return {
        job,
        workflow,
        group,
        attributes: sourceBatch?.attributes ?? {},
        promptTemplates: workflow?.promptMapping ?? {},
        sourceResources: { sourceBatch },
        runtime,
        output: { batches: outputBatches },
        recommendations: recommendations(job, runtime, sourceBatch)
      };
    });
  }
};
