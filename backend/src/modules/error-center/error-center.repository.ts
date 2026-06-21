import { db } from "../../database/db";
import { createId, jsonParse, now } from "../shared/resource";

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] as string : null;
}

export function mapErrorEvent(row: Record<string, unknown>) {
  const asset = row.asset_id ? {
    id: text(row, "asset_id"),
    publicUrl: text(row, "asset_public_url"),
    filePath: text(row, "asset_file_path"),
    thumbnailPublicUrl: text(row, "asset_thumbnail_public_url"),
    thumbnailStatus: text(row, "asset_thumbnail_status"),
    metadata: jsonParse(row.asset_metadata_json, {})
  } : null;
  return {
    id: text(row, "id"),
    runtimeSessionId: text(row, "runtime_session_id"),
    scriptRunId: text(row, "script_run_id"),
    stepNo: row.step_no == null ? null : Number(row.step_no),
    hostId: text(row, "host_id"),
    instanceId: text(row, "instance_id"),
    adbId: text(row, "adb_id"),
    errorCode: text(row, "error_code"),
    errorMessage: text(row, "error_message"),
    screenshotAssetId: text(row, "screenshot_asset_id"),
    screenshotAsset: asset,
    status: text(row, "status") ?? "NEW",
    classification: text(row, "classification") ?? "UNKNOWN",
    resolutionType: text(row, "resolution_type"),
    recoveryScriptId: text(row, "recovery_script_id"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function eventSelect(where = "") {
  return `
    SELECT e.*,
           a.id AS asset_id,
           a.public_url AS asset_public_url,
           a.file_path AS asset_file_path,
           a.thumbnail_public_url AS asset_thumbnail_public_url,
           a.thumbnail_status AS asset_thumbnail_status,
           a.metadata_json AS asset_metadata_json
    FROM error_events e
    LEFT JOIN assets a ON a.id = e.screenshot_asset_id
    ${where}
  `;
}

function mapRecoveryRule(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    screenTemplateId: text(row, "screen_template_id"),
    recoveryScriptId: text(row, "recovery_script_id"),
    enabled: row.enabled === 1 || row.enabled === true,
    priority: Number(row.priority ?? 100),
    notes: text(row, "notes"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

export const errorCenterRepository = {
  listEvents(query: Record<string, unknown> = {}) {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (typeof query.status === "string" && query.status) {
      clauses.push("e.status = ?");
      params.push(query.status);
    }
    if (typeof query.classification === "string" && query.classification) {
      clauses.push("e.classification = ?");
      params.push(query.classification);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return db.prepare(`${eventSelect(where)} ORDER BY e.created_at DESC LIMIT 500`)
      .all(...params)
      .map((row) => mapErrorEvent(row as Record<string, unknown>));
  },

  getEvent(id: string) {
    const row = db.prepare(`${eventSelect("WHERE e.id = ?")} LIMIT 1`).get(id);
    return row ? mapErrorEvent(row as Record<string, unknown>) : null;
  },

  createEvent(input: {
    runtimeSessionId?: string | null;
    scriptRunId?: string | null;
    stepNo?: number | null;
    hostId?: string | null;
    instanceId?: string | null;
    adbId?: string | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    screenshotAssetId?: string | null;
  }) {
    const id = createId("err");
    const timestamp = now();
    db.prepare(`
      INSERT INTO error_events (
        id, runtime_session_id, script_run_id, step_no, host_id, instance_id, adb_id,
        error_code, error_message, screenshot_asset_id, status, classification,
        resolution_type, recovery_script_id, created_at, updated_at
      ) VALUES (
        @id, @runtimeSessionId, @scriptRunId, @stepNo, @hostId, @instanceId, @adbId,
        @errorCode, @errorMessage, @screenshotAssetId, 'NEW', 'UNKNOWN',
        NULL, NULL, @createdAt, @updatedAt
      )
    `).run({ id, ...input, createdAt: timestamp, updatedAt: timestamp });
    return this.getEvent(id);
  },

  updateEvent(id: string, input: {
    status?: string;
    classification?: string;
    resolutionType?: string | null;
    recoveryScriptId?: string | null;
  }) {
    const current = this.getEvent(id);
    if (!current) return null;
    db.prepare(`
      UPDATE error_events
      SET status = @status,
          classification = @classification,
          resolution_type = @resolutionType,
          recovery_script_id = @recoveryScriptId,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      status: input.status ?? current.status,
      classification: input.classification ?? current.classification,
      resolutionType: input.resolutionType === undefined ? current.resolutionType : input.resolutionType,
      recoveryScriptId: input.recoveryScriptId === undefined ? current.recoveryScriptId : input.recoveryScriptId,
      updatedAt: now()
    });
    return this.getEvent(id);
  },

  setScreenshotAsset(id: string, screenshotAssetId: string) {
    db.prepare("UPDATE error_events SET screenshot_asset_id = ?, updated_at = ? WHERE id = ?")
      .run(screenshotAssetId, now(), id);
    return this.getEvent(id);
  },

  kpis() {
    const rows = db.prepare("SELECT status, COUNT(*) AS count FROM error_events GROUP BY status").all() as Array<{ status: string; count: number }>;
    const counts = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
    return {
      newErrors: counts.NEW ?? 0,
      classifiedErrors: (counts.CLASSIFIED ?? 0) + (counts.AUTO_RECOVERABLE ?? 0),
      autoRecoverable: counts.AUTO_RECOVERABLE ?? 0,
      resolved: counts.RESOLVED ?? 0,
      unresolved: (counts.NEW ?? 0) + (counts.REVIEWED ?? 0) + (counts.CLASSIFIED ?? 0) + (counts.AUTO_RECOVERABLE ?? 0)
    };
  },

  listRecoveryRules() {
    return db.prepare("SELECT * FROM recovery_rules ORDER BY enabled DESC, priority ASC, created_at DESC")
      .all()
      .map((row) => mapRecoveryRule(row as Record<string, unknown>));
  },

  findRecoveryRule(screenTemplateId: string) {
    const row = db.prepare(`
      SELECT * FROM recovery_rules
      WHERE screen_template_id = ? AND enabled = 1
      ORDER BY priority ASC, created_at DESC
      LIMIT 1
    `).get(screenTemplateId);
    return row ? mapRecoveryRule(row as Record<string, unknown>) : null;
  },

  createRecoveryRule(input: { screenTemplateId: string; recoveryScriptId: string; enabled: boolean; priority: number; notes?: string | null }) {
    const id = createId("rrule");
    const timestamp = now();
    db.prepare(`
      INSERT INTO recovery_rules (id, screen_template_id, recovery_script_id, enabled, priority, notes, created_at, updated_at)
      VALUES (@id, @screenTemplateId, @recoveryScriptId, @enabled, @priority, @notes, @createdAt, @updatedAt)
    `).run({
      id,
      screenTemplateId: input.screenTemplateId,
      recoveryScriptId: input.recoveryScriptId,
      enabled: input.enabled ? 1 : 0,
      priority: input.priority,
      notes: input.notes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    return this.listRecoveryRules().find((rule) => rule.id === id) ?? null;
  }
};
