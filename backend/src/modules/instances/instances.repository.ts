import { db } from "../../database/db";
import { AppError, jsonParse, jsonString, now } from "../shared/resource";

export const instancePoolStates = [
  "AVAILABLE",
  "STANDBY",
  "WORKFLOW",
  "MAINTENANCE",
  "DISABLED",
  "RETIRED"
] as const;

export type InstancePoolState = typeof instancePoolStates[number];

export type InstanceCapabilities = {
  canRun?: string[];
  apps?: string[];
  supportsUpload?: boolean;
  supportsDownload?: boolean;
  notes?: string;
  [key: string]: unknown;
};

export type UpsertInstanceInput = {
  id: string;
  hostId: string;
  localId: string;
  name?: string | null;
  adbId?: string | null;
  status?: string;
  runtimeStatus?: string;
  metadata?: Record<string, unknown>;
  lastSeenAt?: string;
  adbMappingConfidence?: string | null;
  adbMappingSource?: string | null;
  adbMappingUpdatedAt?: string | null;
  manualAdbId?: string | null;
};

function mapInstance(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    hostId: String(row.host_id),
    localId: String(row.local_id),
    name: row.name ?? null,
    adbId: row.adb_id ?? null,
    status: String(row.status ?? "UNKNOWN"),
    runtimeStatus: String(row.runtime_status ?? "IDLE"),
    capabilities: jsonParse<InstanceCapabilities>(row.capabilities_json, {}),
    currentPoolType: String(row.current_pool_type ?? "AVAILABLE"),
    currentWorkflowRunId: row.current_workflow_run_id ?? null,
    maintenanceReason: row.maintenance_reason ?? null,
    lastErrorAt: row.last_error_at ?? null,
    adbMappingConfidence: row.adb_mapping_confidence ?? "unknown",
    adbMappingSource: row.adb_mapping_source ?? "none",
    adbMappingUpdatedAt: row.adb_mapping_updated_at ?? null,
    manualAdbId: row.manual_adb_id ?? null,
    metadata: jsonParse(row.metadata_json, {}),
    lastSeenAt: row.last_seen_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const instancesRepository = {
  list(filters: { hostId?: string; currentPoolType?: string; runtimeStatus?: string; capability?: string } = {}) {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.hostId) {
      clauses.push("host_id = ?");
      params.push(filters.hostId);
    }
    if (filters.currentPoolType) {
      clauses.push("current_pool_type = ?");
      params.push(filters.currentPoolType);
    }
    if (filters.runtimeStatus) {
      clauses.push("runtime_status = ?");
      params.push(filters.runtimeStatus);
    }
    if (filters.capability) {
      clauses.push("capabilities_json LIKE ?");
      params.push(`%"${filters.capability}"%`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return db.prepare(`SELECT * FROM instances ${where} ORDER BY updated_at DESC`)
      .all(...params)
      .map((row) => mapInstance(row as Record<string, unknown>));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM instances WHERE id = ?").get(id);
    return row ? mapInstance(row as Record<string, unknown>) : null;
  },

  listByHost(hostId: string) {
    return db.prepare("SELECT * FROM instances WHERE host_id = ? ORDER BY local_id ASC")
      .all(hostId)
      .map((row) => mapInstance(row as Record<string, unknown>));
  },

  upsert(input: UpsertInstanceInput) {
    const timestamp = now();
    const lastSeenAt = input.lastSeenAt ?? timestamp;

    db.prepare(`
      INSERT INTO instances (
        id, host_id, local_id, name, adb_id, status, runtime_status,
        metadata_json, last_seen_at, current_pool_type,
        adb_mapping_confidence, adb_mapping_source, adb_mapping_updated_at, manual_adb_id,
        created_at, updated_at
      ) VALUES (
        @id, @hostId, @localId, @name, @adbId, @status, @runtimeStatus,
        @metadataJson, @lastSeenAt, 'AVAILABLE',
        @adbMappingConfidence, @adbMappingSource, @adbMappingUpdatedAt, @manualAdbId,
        @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        host_id = excluded.host_id,
        local_id = excluded.local_id,
        name = excluded.name,
        adb_id = excluded.adb_id,
        status = excluded.status,
        runtime_status = excluded.runtime_status,
        metadata_json = excluded.metadata_json,
        last_seen_at = excluded.last_seen_at,
        adb_mapping_confidence = excluded.adb_mapping_confidence,
        adb_mapping_source = excluded.adb_mapping_source,
        adb_mapping_updated_at = excluded.adb_mapping_updated_at,
        manual_adb_id = COALESCE(excluded.manual_adb_id, instances.manual_adb_id),
        updated_at = excluded.updated_at
    `).run({
      id: input.id,
      hostId: input.hostId,
      localId: input.localId,
      name: input.name ?? null,
      adbId: input.adbId ?? null,
      status: input.status ?? "UNKNOWN",
      runtimeStatus: input.runtimeStatus ?? "IDLE",
      metadataJson: jsonString(input.metadata ?? {}, {}),
      lastSeenAt,
      adbMappingConfidence: input.adbMappingConfidence ?? "unknown",
      adbMappingSource: input.adbMappingSource ?? "none",
      adbMappingUpdatedAt: input.adbMappingUpdatedAt ?? timestamp,
      manualAdbId: input.manualAdbId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return this.get(input.id);
  },

  updateCapabilities(id: string, capabilities: InstanceCapabilities) {
    const timestamp = now();
    const changes = db.prepare(`
      UPDATE instances
      SET capabilities_json = ?, updated_at = ?
      WHERE id = ?
    `).run(jsonString(capabilities, {}), timestamp, id).changes;

    if (!changes) throw new AppError("INSTANCE_NOT_FOUND", "Instance not found", 404);
    return this.get(id);
  },

  moveToPoolState(id: string, currentPoolType: InstancePoolState, maintenanceReason?: string | null) {
    const timestamp = now();
    const reason = currentPoolType === "MAINTENANCE" ? maintenanceReason ?? null : null;
    const changes = db.prepare(`
      UPDATE instances
      SET current_pool_type = ?, maintenance_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(currentPoolType, reason, timestamp, id).changes;

    if (!changes) throw new AppError("INSTANCE_NOT_FOUND", "Instance not found", 404);
    return this.get(id);
  },

  setManualAdbMapping(id: string, adbId: string, validated: boolean) {
    const timestamp = now();
    const instance = this.get(id);
    if (!instance) throw new AppError("INSTANCE_NOT_FOUND", "Instance not found", 404);

    db.prepare(`
      UPDATE instances
      SET adb_id = ?,
          manual_adb_id = ?,
          adb_mapping_confidence = 'manual',
          adb_mapping_source = 'manual',
          adb_mapping_updated_at = ?,
          status = ?,
          runtime_status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      adbId,
      adbId,
      timestamp,
      validated ? "ONLINE" : instance.status,
      validated ? "IDLE" : instance.runtimeStatus,
      timestamp,
      id
    );

    return this.get(id);
  },

  clearAdbMapping(id: string) {
    const timestamp = now();
    const changes = db.prepare(`
      UPDATE instances
      SET adb_id = NULL,
          manual_adb_id = NULL,
          adb_mapping_confidence = 'unknown',
          adb_mapping_source = 'none',
          adb_mapping_updated_at = ?,
          status = CASE WHEN status IN ('ONLINE', 'ACTIVE') THEN 'OFFLINE' ELSE status END,
          runtime_status = CASE WHEN runtime_status = 'ONLINE' THEN 'INACTIVE' ELSE runtime_status END,
          updated_at = ?
      WHERE id = ?
    `).run(timestamp, timestamp, id).changes;

    if (!changes) throw new AppError("INSTANCE_NOT_FOUND", "Instance not found", 404);
    return this.get(id);
  },

  markMissingForHost(hostId: string, activeIds: string[]) {
    const timestamp = now();
    if (activeIds.length === 0) {
      db.prepare(`
        UPDATE instances
        SET status = 'OFFLINE',
            runtime_status = 'INACTIVE',
            adb_id = CASE WHEN adb_mapping_confidence = 'manual' THEN adb_id ELSE NULL END,
            adb_mapping_confidence = CASE WHEN adb_mapping_confidence = 'manual' THEN adb_mapping_confidence ELSE 'unknown' END,
            adb_mapping_source = CASE WHEN adb_mapping_confidence = 'manual' THEN adb_mapping_source ELSE 'none' END,
            adb_mapping_updated_at = ?,
            updated_at = ?
        WHERE host_id = ?
      `).run(timestamp, timestamp, hostId);
      return;
    }

    const placeholders = activeIds.map(() => "?").join(",");
    db.prepare(`
      UPDATE instances
      SET status = 'OFFLINE',
          runtime_status = 'INACTIVE',
          adb_id = CASE WHEN adb_mapping_confidence = 'manual' THEN adb_id ELSE NULL END,
          adb_mapping_confidence = CASE WHEN adb_mapping_confidence = 'manual' THEN adb_mapping_confidence ELSE 'unknown' END,
          adb_mapping_source = CASE WHEN adb_mapping_confidence = 'manual' THEN adb_mapping_source ELSE 'none' END,
          adb_mapping_updated_at = ?,
          updated_at = ?
      WHERE host_id = ? AND id NOT IN (${placeholders})
    `).run(timestamp, timestamp, hostId, ...activeIds);
  }
};
