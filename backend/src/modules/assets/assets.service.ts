import { db } from "../../database/db";
import { createId, getRow, jsonParse, jsonString, listRows, now } from "../shared/resource";
import type {
  CreateAssetInput,
  CreateAssetRelationInput,
  CreateAssetReservationInput
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
  list: (query: Record<string, unknown>) =>
    listRows("assets", mapAsset, query, {
      workspaceId: "workspace_id",
      characterId: "character_id",
      groupId: "group_id",
      assetType: "asset_type",
      mediaType: "media_type",
      qualityStatus: "quality_status",
      usageStatus: "usage_status"
    }),

  get: (id: string) => getRow("assets", id, mapAsset),

  create(payload: CreateAssetInput) {
    const createdAt = now();
    const id = createId("asset");

    db.prepare(`
      INSERT INTO assets (
        id, workspace_id, character_id, group_id, group_member_id, asset_type,
        media_type, version_group_id, version_no, is_best_version, name,
        storage_provider, storage_key, file_path, public_url, mime_type,
        file_size, checksum, status, usage_status, usage_policy, quality_status,
        metadata_json, created_by_workflow_run_id, created_by_stage_run_id,
        created_by_task_run_id, created_by_task_attempt_id, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @characterId, @groupId, @groupMemberId, @assetType,
        @mediaType, @versionGroupId, @versionNo, @isBestVersion, @name,
        @storageProvider, @storageKey, @filePath, @publicUrl, @mimeType,
        @fileSize, @checksum, @status, @usageStatus, @usagePolicy, @qualityStatus,
        @metadataJson, @createdByWorkflowRunId, @createdByStageRunId,
        @createdByTaskRunId, @createdByTaskAttemptId, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      characterId: payload.characterId ?? null,
      groupId: payload.groupId ?? null,
      groupMemberId: payload.groupMemberId ?? null,
      assetType: payload.assetType,
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

