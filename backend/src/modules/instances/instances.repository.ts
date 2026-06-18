import { db } from "../../database/db";
import { jsonParse, jsonString, now } from "../shared/resource";

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
    metadata: jsonParse(row.metadata_json, {}),
    lastSeenAt: row.last_seen_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const instancesRepository = {
  list() {
    return db.prepare("SELECT * FROM instances ORDER BY updated_at DESC")
      .all()
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
        metadata_json, last_seen_at, created_at, updated_at
      ) VALUES (
        @id, @hostId, @localId, @name, @adbId, @status, @runtimeStatus,
        @metadataJson, @lastSeenAt, @createdAt, @updatedAt
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
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return this.get(input.id);
  },

  markMissingForHost(hostId: string, activeIds: string[]) {
    const timestamp = now();
    if (activeIds.length === 0) {
      db.prepare(`
        UPDATE instances
        SET status = 'OFFLINE', runtime_status = 'INACTIVE', updated_at = ?
        WHERE host_id = ?
      `).run(timestamp, hostId);
      return;
    }

    const placeholders = activeIds.map(() => "?").join(",");
    db.prepare(`
      UPDATE instances
      SET status = 'OFFLINE', runtime_status = 'INACTIVE', updated_at = ?
      WHERE host_id = ? AND id NOT IN (${placeholders})
    `).run(timestamp, hostId, ...activeIds);
  }
};
