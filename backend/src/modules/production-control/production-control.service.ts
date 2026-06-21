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

function mapAsset(row?: Record<string, unknown>) {
  if (!row) return null;
  return {
    id: text(row, "id"),
    characterId: text(row, "character_id"),
    name: text(row, "name"),
    assetCategory: text(row, "asset_category"),
    assetSubType: text(row, "asset_sub_type"),
    mediaType: text(row, "media_type"),
    filePath: text(row, "file_path"),
    publicUrl: text(row, "public_url"),
    previewUrl: text(row, "preview_url"),
    thumbnailPublicUrl: text(row, "thumbnail_public_url"),
    sourceAssetId: text(row, "source_asset_id"),
    metadata: jsonParse<Record<string, unknown>>(row.metadata_json, {})
  };
}

function groupIdFromBatch(batch: ReturnType<typeof mapBatch> | null) {
  const metadata = batch?.metadata ?? {};
  return batch?.sourceGroupId
    ?? (typeof metadata.groupId === "string" ? metadata.groupId : null)
    ?? (typeof metadata.characterGroupBatch === "object" && metadata.characterGroupBatch && typeof (metadata.characterGroupBatch as Record<string, unknown>).groupId === "string" ? (metadata.characterGroupBatch as Record<string, unknown>).groupId as string : null);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function sourceAssetsSnapshot(batch: ReturnType<typeof mapBatch>) {
  const metadata = batch.metadata ?? {};
  const direct = objectValue(metadata.sourceAssetsSnapshot);
  const groupBatch = objectValue(metadata.characterGroupBatch);
  const nested = objectValue(groupBatch.sourceAssetsSnapshot);
  return Object.keys(direct).length ? direct : nested;
}

function sourceImageRecord(value: unknown, role: "young" | "old", character: Record<string, unknown>, orderNo: number) {
  const image = objectValue(value);
  const sourceAssetId = stringValue(image.id) ?? stringValue(image.assetId);
  if (!sourceAssetId) return null;
  const characterInfo = objectValue(character.character);
  const characterId = stringValue(character.characterId) ?? stringValue(characterInfo.id);
  return {
    characterId,
    characterName: stringValue(character.name) ?? stringValue(characterInfo.name),
    sourceAssetId,
    sourceImageRole: role,
    orderNo,
    sourceThumbnailUrl: stringValue(image.thumbnailPublicUrl) ?? stringValue(image.previewUrl) ?? stringValue(image.publicUrl),
    sourcePublicUrl: stringValue(image.publicUrl),
    sourceAsset: image
  };
}

function sourceImagesForBatch(batch: ReturnType<typeof mapBatch>) {
  const snapshot = sourceAssetsSnapshot(batch);
  const characters = Array.isArray(snapshot.characters) ? snapshot.characters.map(objectValue) : [];
  let orderNo = 1;
  return characters.flatMap((character) => {
    const young = sourceImageRecord(character.youngOriginalImage, "young", character, orderNo);
    if (young) orderNo += 1;
    const old = sourceImageRecord(character.oldOriginalImage, "old", character, orderNo);
    if (old) orderNo += 1;
    return [young, old].filter((item): item is NonNullable<typeof item> => Boolean(item));
  });
}

function imageBatchForSource(characterGroupBatchId: string) {
  const rows = db.prepare(`
    SELECT * FROM production_batches
    WHERE batch_type = 'IMAGE_BATCH'
      AND json_extract(metadata_json, '$.sourceBatchId') = ?
    ORDER BY created_at DESC
  `).all(characterGroupBatchId).map((row) => mapBatch(rowRecord(row)));
  return rows.find((batch) => stringValue(objectValue(batch.metadata).outputRole) === "IMAGE_EDIT_RESULT") ?? rows[0] ?? null;
}

function imageEditProgress(imageBatch: ReturnType<typeof mapBatch> | null, expectedCount: number, jobs: ReturnType<typeof mapJob>[]) {
  const metadata = objectValue(imageBatch?.metadata);
  const items = Array.isArray(metadata.items) ? metadata.items.map(objectValue) : [];
  const completedCount = Number(metadata.completedCount ?? items.filter((item) => stringValue(item.editedAssetId)).length);
  const failedCount = Number(metadata.failedCount ?? jobs.filter((job) => job.status === "FAILED").length);
  const runningCount = jobs.filter((job) => ["ALLOCATED", "RUNNING"].includes(String(job.status))).length;
  const pendingCount = jobs.filter((job) => job.status === "PENDING").length;
  const missingCount = Math.max(0, expectedCount - completedCount);
  let status = "NOT_STARTED";
  if (completedCount >= expectedCount && expectedCount > 0) status = "READY";
  else if (failedCount > 0 && completedCount > 0) status = "FAILED_PARTIAL";
  else if (failedCount > 0) status = "FAILED_PARTIAL";
  else if (completedCount > 0) status = "PARTIAL_READY";
  else if (runningCount > 0 || pendingCount > 0) status = "RUNNING";
  return {
    expectedCount,
    completedCount,
    missingCount,
    failedCount,
    runningCount,
    pendingCount,
    status,
    imageBatchStatus: imageBatch?.status ?? null,
    imageBatchUsageStatus: imageBatch?.usageStatus ?? null
  };
}

function runtimeForJob(jobId: string | null) {
  if (!jobId) return null;
  return mapRuntime(rowRecord(db.prepare("SELECT * FROM runtime_sessions WHERE job_id = ? ORDER BY updated_at DESC LIMIT 1").get(jobId) ?? undefined));
}

function assetById(assetId: string | null) {
  if (!assetId) return null;
  return mapAsset(rowRecord(db.prepare("SELECT * FROM assets WHERE id = ?").get(assetId) ?? undefined));
}

function imageBatchItem(imageBatch: ReturnType<typeof mapBatch> | null, sourceAssetId: string | null) {
  if (!sourceAssetId) return {};
  const items = Array.isArray(imageBatch?.metadata?.items) ? imageBatch?.metadata.items.map(objectValue) : [];
  return items.find((item) => stringValue(item.sourceAssetId) === sourceAssetId) ?? {};
}

function groupRunRecommendations(progress: ReturnType<typeof imageEditProgress>, sourceImages: Array<Record<string, unknown>>) {
  const items: string[] = [];
  if (progress.expectedCount) {
    items.push(`${progress.completedCount}/${progress.expectedCount} images completed. ${progress.pendingCount} pending, ${progress.runningCount} running, ${progress.failedCount} failed.`);
  }
  if (progress.missingCount > 0) {
    items.push(`IMAGE_BATCH not ready because ${progress.missingCount} source images are missing outputs.`);
  }
  const failed = sourceImages.find((item) => objectValue(item.job).status === "FAILED");
  if (failed) {
    items.push(`Retry failed ${String(failed.sourceImageRole)} image for ${String(failed.characterName ?? failed.characterId ?? "this character")}.`);
  }
  return items;
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
  },

  listGroupRuns() {
    const rows = db.prepare(`
      SELECT * FROM production_batches
      WHERE batch_type = 'CHARACTER_GROUP'
      ORDER BY created_at DESC
    `).all().map((row) => mapBatch(rowRecord(row)));
    return rows.map((batch) => this.getGroupRun(String(batch.id))).filter(Boolean);
  },

  getGroupRun(batchId: string) {
    const batchRow = db.prepare("SELECT * FROM production_batches WHERE id = ?").get(batchId);
    if (!batchRow) return null;
    const characterGroupBatch = mapBatch(rowRecord(batchRow));
    const groupId = groupIdFromBatch(characterGroupBatch);
    const group = groupId ? mapGroup(rowRecord(db.prepare(`
      SELECT cg.*, COUNT(cgm.id) AS member_count
      FROM character_groups cg
      LEFT JOIN character_group_members cgm ON cgm.group_id = cg.id
      WHERE cg.id = ?
      GROUP BY cg.id
    `).get(groupId) ?? undefined)) : null;
    const workflow = characterGroupBatch.workflowId
      ? mapWorkflow(rowRecord(db.prepare("SELECT * FROM workflows WHERE id = ?").get(characterGroupBatch.workflowId) ?? undefined))
      : null;
    const imageBatch = imageBatchForSource(String(characterGroupBatch.id));
    const jobs = db.prepare(`
      SELECT * FROM orchestrator_jobs
      WHERE source_batch_id = ?
        AND target_stage_type = 'IMAGE_EDIT'
      ORDER BY json_extract(payload_json, '$.orderNo') ASC, created_at ASC
    `).all(characterGroupBatch.id).map((row) => mapJob(rowRecord(row)));
    const imageBatchItems = Array.isArray(imageBatch?.metadata?.items) ? imageBatch?.metadata.items.map(objectValue) : [];
    const sourceImages = sourceImagesForBatch(characterGroupBatch).map((source) => {
      const job = jobs.find((item) => stringValue(item.payload.sourceAssetId) === source.sourceAssetId) ?? null;
      const runtime = runtimeForJob(job?.id ?? null);
      const batchItem = imageBatchItem(imageBatch, source.sourceAssetId);
      const editedAssetId = stringValue(batchItem.editedAssetId)
        ?? stringValue(job?.output.editedAssetId)
        ?? null;
      const outputAsset = assetById(editedAssetId);
      return {
        ...source,
        job,
        runtime,
        outputAsset,
        outputThumbnailUrl: outputAsset?.thumbnailPublicUrl ?? outputAsset?.previewUrl ?? outputAsset?.publicUrl ?? null,
        assignedInstanceId: stringValue(job?.payload.instanceId) ?? runtime?.instanceId ?? null,
        error: stringValue(job?.payload.errorMessage) ?? stringValue(runtime?.checkpoint?.errorMessage) ?? null,
        batchItem
      };
    });
    const progress = imageEditProgress(imageBatch, sourceImages.length || imageBatchItems.length, jobs);
    return {
      characterGroupBatch,
      group,
      workflow,
      imageBatch,
      imageEditProgress: progress,
      sourceImages,
      recommendations: groupRunRecommendations(progress, sourceImages)
    };
  }
};
