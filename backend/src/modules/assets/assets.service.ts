import { db } from "../../database/db";
import { createId, getRow, jsonParse, jsonString, listRows, now } from "../shared/resource";
import type {
  CreateAssetInput,
  CreateAssetRelationInput,
  CreateAssetReservationInput,
  UpdateAssetInput
} from "./assets.schemas";

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] : null;
}

function bool(value: unknown) {
  return value === 1 || value === true;
}

function mapAsset(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    characterId: text(row, "character_id"),
    groupId: text(row, "group_id"),
    groupMemberId: text(row, "group_member_id"),
    assetType: text(row, "asset_type"),
    assetCategory: text(row, "asset_category") ?? text(row, "asset_type"),
    assetSubType: text(row, "asset_sub_type"),
    mediaType: text(row, "media_type"),
    versionGroupId: text(row, "version_group_id"),
    versionNo: Number(row.version_no ?? 1),
    isBestVersion: bool(row.is_best_version),
    name: text(row, "name"),
    storageProvider: text(row, "storage_provider"),
    storageKey: text(row, "storage_key"),
    filePath: text(row, "file_path"),
    publicUrl: text(row, "public_url"),
    mimeType: text(row, "mime_type"),
    fileSize: Number(row.file_size ?? 0),
    checksum: text(row, "checksum"),
    status: text(row, "status"),
    usageStatus: text(row, "usage_status"),
    usagePolicy: text(row, "usage_policy"),
    qualityStatus: text(row, "quality_status"),
    tags: jsonParse<string[]>(row.tags_json, []),
    attributes: jsonParse<Record<string, unknown>>(row.attributes_json, {}),
    previewUrl: text(row, "preview_url") ?? text(row, "public_url"),
    sourceAssetId: text(row, "source_asset_id"),
    metadata: jsonParse(row.metadata_json, {}),
    createdByWorkflowRunId: text(row, "created_by_workflow_run_id"),
    createdByStageRunId: text(row, "created_by_stage_run_id"),
    createdByTaskRunId: text(row, "created_by_task_run_id"),
    createdByTaskAttemptId: text(row, "created_by_task_attempt_id"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapRelation(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    sourceAssetId: text(row, "source_asset_id"),
    targetAssetId: text(row, "target_asset_id"),
    relationType: text(row, "relation_type"),
    workflowRunId: text(row, "workflow_run_id"),
    stageRunId: text(row, "stage_run_id"),
    taskRunId: text(row, "task_run_id"),
    taskAttemptId: text(row, "task_attempt_id"),
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: text(row, "created_at")
  };
}

function mapReservation(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    assetId: text(row, "asset_id"),
    workflowRunId: text(row, "workflow_run_id"),
    stageRunId: text(row, "stage_run_id"),
    taskRunId: text(row, "task_run_id"),
    reservationRole: text(row, "reservation_role"),
    status: text(row, "status"),
    leasedUntil: text(row, "leased_until"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

export const assetsService = {
  categories: () => [
    { id: "CHARACTER_IMAGE", label: "Character Images", subTypes: ["YOUNG_ORIGINAL_IMAGE", "OLD_ORIGINAL_IMAGE", "EDITED_IMAGE", "FACE_CROP", "BEST_EDITED_VERSION"] },
    { id: "PROMPT_TEMPLATE", label: "Prompt Templates", subTypes: ["Image Prompt", "Video Prompt", "Music Prompt", "Post Content Prompt"] },
    { id: "MUSIC_TRACK", label: "Music Library", subTypes: ["Reusable Track", "Dedicated Track"] },
    { id: "VIDEO_TEMPLATE", label: "Video Templates", subTypes: ["Composition Template", "Intro", "Outro"] },
    { id: "POST_TEMPLATE", label: "Post Templates", subTypes: ["Facebook Post", "CTA", "Hashtags"] }
  ],

  list: (query: Record<string, unknown>) =>
    listRows("assets", mapAsset, query, {
      workspaceId: "workspace_id",
      characterId: "character_id",
      groupId: "group_id",
      assetType: "asset_type",
      assetCategory: "asset_category",
      assetSubType: "asset_sub_type",
      mediaType: "media_type",
      qualityStatus: "quality_status",
      usageStatus: "usage_status"
    }),

  get: (id: string) => getRow("assets", id, mapAsset),

  create(payload: CreateAssetInput) {
    const createdAt = now();
    const id = createId("asset");
    const assetCategory = payload.assetCategory ?? payload.assetType ?? "CHARACTER_IMAGE";
    const assetType = payload.assetType ?? assetCategory;

    db.prepare(`
      INSERT INTO assets (
        id, workspace_id, character_id, group_id, group_member_id, asset_type,
        asset_category, asset_sub_type, media_type, version_group_id, version_no, is_best_version, name,
        storage_provider, storage_key, file_path, public_url, mime_type,
        file_size, checksum, status, usage_status, usage_policy, quality_status,
        tags_json, attributes_json, preview_url, source_asset_id, metadata_json, created_by_workflow_run_id, created_by_stage_run_id,
        created_by_task_run_id, created_by_task_attempt_id, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @characterId, @groupId, @groupMemberId, @assetType,
        @assetCategory, @assetSubType, @mediaType, @versionGroupId, @versionNo, @isBestVersion, @name,
        @storageProvider, @storageKey, @filePath, @publicUrl, @mimeType,
        @fileSize, @checksum, @status, @usageStatus, @usagePolicy, @qualityStatus,
        @tagsJson, @attributesJson, @previewUrl, @sourceAssetId, @metadataJson, @createdByWorkflowRunId, @createdByStageRunId,
        @createdByTaskRunId, @createdByTaskAttemptId, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      characterId: payload.characterId ?? null,
      groupId: assetCategory === "CHARACTER_IMAGE" ? null : payload.groupId ?? null,
      groupMemberId: payload.groupMemberId ?? null,
      assetType,
      assetCategory,
      assetSubType: payload.assetSubType ?? null,
      mediaType: payload.mediaType,
      versionGroupId: payload.versionGroupId ?? id,
      versionNo: payload.versionNo,
      isBestVersion: payload.isBestVersion ? 1 : 0,
      name: payload.name,
      storageProvider: payload.storageProvider,
      storageKey: payload.storageKey ?? null,
      filePath: payload.filePath ?? null,
      publicUrl: payload.publicUrl ?? null,
      mimeType: payload.mimeType ?? null,
      fileSize: payload.fileSize,
      checksum: payload.checksum ?? null,
      status: payload.status,
      usageStatus: payload.usageStatus,
      usagePolicy: payload.usagePolicy,
      qualityStatus: payload.qualityStatus,
      tagsJson: jsonString(payload.tags, []),
      attributesJson: jsonString(payload.attributes, {}),
      previewUrl: payload.previewUrl ?? payload.publicUrl ?? null,
      sourceAssetId: payload.sourceAssetId ?? null,
      metadataJson: jsonString(payload.metadata, {}),
      createdByWorkflowRunId: payload.createdByWorkflowRunId ?? null,
      createdByStageRunId: payload.createdByStageRunId ?? null,
      createdByTaskRunId: payload.createdByTaskRunId ?? null,
      createdByTaskAttemptId: payload.createdByTaskAttemptId ?? null,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  update(id: string, payload: UpdateAssetInput) {
    const current = this.get(id);
    if (!current) return null;
    const updatedAt = now();
    const assetCategory = payload.assetCategory ?? payload.assetType ?? current.assetCategory ?? current.assetType ?? "CHARACTER_IMAGE";
    const assetType = payload.assetType ?? current.assetType ?? assetCategory;

    db.prepare(`
      UPDATE assets
      SET workspace_id = @workspaceId,
          character_id = @characterId,
          group_id = @groupId,
          group_member_id = @groupMemberId,
          asset_type = @assetType,
          asset_category = @assetCategory,
          asset_sub_type = @assetSubType,
          media_type = @mediaType,
          version_group_id = @versionGroupId,
          version_no = @versionNo,
          is_best_version = @isBestVersion,
          name = @name,
          storage_provider = @storageProvider,
          storage_key = @storageKey,
          file_path = @filePath,
          public_url = @publicUrl,
          mime_type = @mimeType,
          file_size = @fileSize,
          checksum = @checksum,
          status = @status,
          usage_status = @usageStatus,
          usage_policy = @usagePolicy,
          quality_status = @qualityStatus,
          tags_json = @tagsJson,
          attributes_json = @attributesJson,
          preview_url = @previewUrl,
          source_asset_id = @sourceAssetId,
          metadata_json = @metadataJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      workspaceId: payload.workspaceId ?? current.workspaceId ?? null,
      characterId: payload.characterId ?? current.characterId ?? null,
      groupId: assetCategory === "CHARACTER_IMAGE" ? null : payload.groupId ?? current.groupId ?? null,
      groupMemberId: payload.groupMemberId ?? current.groupMemberId ?? null,
      assetType,
      assetCategory,
      assetSubType: payload.assetSubType ?? current.assetSubType ?? null,
      mediaType: payload.mediaType ?? current.mediaType ?? "unknown",
      versionGroupId: payload.versionGroupId ?? current.versionGroupId ?? id,
      versionNo: payload.versionNo ?? current.versionNo ?? 1,
      isBestVersion: payload.isBestVersion ?? current.isBestVersion ? 1 : 0,
      name: payload.name ?? current.name,
      storageProvider: payload.storageProvider ?? current.storageProvider ?? "local",
      storageKey: payload.storageKey ?? current.storageKey ?? null,
      filePath: payload.filePath ?? current.filePath ?? null,
      publicUrl: payload.publicUrl ?? current.publicUrl ?? null,
      mimeType: payload.mimeType ?? current.mimeType ?? null,
      fileSize: payload.fileSize ?? current.fileSize ?? 0,
      checksum: payload.checksum ?? current.checksum ?? null,
      status: payload.status ?? current.status ?? "available",
      usageStatus: payload.usageStatus ?? current.usageStatus ?? "available",
      usagePolicy: payload.usagePolicy ?? current.usagePolicy ?? "reusable",
      qualityStatus: payload.qualityStatus ?? current.qualityStatus ?? "draft",
      tagsJson: jsonString(payload.tags ?? current.tags, []),
      attributesJson: jsonString(payload.attributes ?? current.attributes, {}),
      previewUrl: payload.previewUrl ?? current.previewUrl ?? payload.publicUrl ?? current.publicUrl ?? null,
      sourceAssetId: payload.sourceAssetId ?? current.sourceAssetId ?? null,
      metadataJson: jsonString(payload.metadata ?? current.metadata, {}),
      updatedAt
    });

    return this.get(id);
  },

  delete(id: string) {
    return db.prepare("DELETE FROM assets WHERE id = ?").run(id).changes > 0;
  },

  setBest(id: string) {
    const asset = this.get(id);
    if (!asset) return null;
    const versionGroupId = asset.versionGroupId ?? asset.id;
    const updatedAt = now();
    db.transaction(() => {
      db.prepare("UPDATE assets SET is_best_version = 0, updated_at = ? WHERE version_group_id = ?").run(updatedAt, versionGroupId);
      db.prepare("UPDATE assets SET is_best_version = 1, version_group_id = ?, updated_at = ? WHERE id = ?").run(versionGroupId, updatedAt, id);
    })();
    return this.get(id);
  },

  listRelations: (assetId: string) =>
    db.prepare(`
      SELECT * FROM asset_relations
      WHERE source_asset_id = ? OR target_asset_id = ?
      ORDER BY created_at DESC
    `).all(assetId, assetId).map((row) => mapRelation(row as Record<string, unknown>)),

  createRelation(payload: CreateAssetRelationInput) {
    const id = createId("arel");

    db.prepare(`
      INSERT INTO asset_relations (
        id, source_asset_id, target_asset_id, relation_type, workflow_run_id,
        stage_run_id, task_run_id, task_attempt_id, metadata_json, created_at
      ) VALUES (
        @id, @sourceAssetId, @targetAssetId, @relationType, @workflowRunId,
        @stageRunId, @taskRunId, @taskAttemptId, @metadataJson, @createdAt
      )
    `).run({
      id,
      sourceAssetId: payload.sourceAssetId,
      targetAssetId: payload.targetAssetId,
      relationType: payload.relationType,
      workflowRunId: payload.workflowRunId ?? null,
      stageRunId: payload.stageRunId ?? null,
      taskRunId: payload.taskRunId ?? null,
      taskAttemptId: payload.taskAttemptId ?? null,
      metadataJson: jsonString(payload.metadata, {}),
      createdAt: now()
    });

    return getRow("asset_relations", id, mapRelation);
  },

  listReservations: (assetId: string) =>
    db.prepare("SELECT * FROM asset_reservations WHERE asset_id = ? ORDER BY created_at DESC")
      .all(assetId)
      .map((row) => mapReservation(row as Record<string, unknown>)),

  createReservation(assetId: string, payload: CreateAssetReservationInput) {
    const createdAt = now();
    const id = createId("ares");

    db.prepare(`
      INSERT INTO asset_reservations (
        id, asset_id, workflow_run_id, stage_run_id, task_run_id,
        reservation_role, status, leased_until, created_at, updated_at
      ) VALUES (
        @id, @assetId, @workflowRunId, @stageRunId, @taskRunId,
        @reservationRole, @status, @leasedUntil, @createdAt, @updatedAt
      )
    `).run({
      id,
      assetId,
      workflowRunId: payload.workflowRunId ?? null,
      stageRunId: payload.stageRunId ?? null,
      taskRunId: payload.taskRunId ?? null,
      reservationRole: payload.reservationRole ?? null,
      status: payload.status,
      leasedUntil: payload.leasedUntil ?? null,
      createdAt,
      updatedAt: createdAt
    });

    return getRow("asset_reservations", id, mapReservation);
  }
};
