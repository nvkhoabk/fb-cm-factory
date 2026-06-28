import Database from "better-sqlite3";
import { config } from "../src/config";
import { containsBinaryContent, storageService } from "../src/modules/storage/storage.service";

type Row = Record<string, unknown>;

const db = new Database(config.dbPath);
const cleanupAt = new Date().toISOString();

const mediaUrlPattern = /^data:(image|video|audio)\//i;
const base64Pattern = /base64,/i;

type Report = {
  scannedRecords: number;
  cleanedRecords: number;
  removedBytes: number;
  affectedTables: Record<string, number>;
};

const report: Report = {
  scannedRecords: 0,
  cleanedRecords: 0,
  removedBytes: 0,
  affectedTables: {}
};

function markTable(table: string) {
  report.cleanedRecords += 1;
  report.affectedTables[table] = (report.affectedTables[table] ?? 0) + 1;
}

function isBinaryString(value: string) {
  const compact = value.replace(/\s+/g, "");
  const looksLikeLargeBase64 = compact.length > 4096
    && compact.length % 4 === 0
    && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
  return mediaUrlPattern.test(value) || base64Pattern.test(value) || looksLikeLargeBase64;
}

function scrubJson(value: unknown): { value: unknown; changed: boolean; removedBytes: number } {
  if (typeof value === "string") {
    if (!isBinaryString(value)) return { value, changed: false, removedBytes: 0 };
    return { value: undefined, changed: true, removedBytes: Buffer.byteLength(value, "utf8") };
  }

  if (Array.isArray(value)) {
    let changed = false;
    let removedBytes = 0;
    const next = [];
    for (const item of value) {
      const scrubbed = scrubJson(item);
      changed = changed || scrubbed.changed;
      removedBytes += scrubbed.removedBytes;
      if (scrubbed.value !== undefined) next.push(scrubbed.value);
    }
    return { value: next, changed, removedBytes };
  }

  if (value && typeof value === "object") {
    let changed = false;
    let removedBytes = 0;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const scrubbed = scrubJson(item);
      changed = changed || scrubbed.changed;
      removedBytes += scrubbed.removedBytes;
      if (scrubbed.value !== undefined) {
        next[key] = scrubbed.value;
      }
    }
    if (changed) {
      next.mediaRemoved = true;
      next.cleanupAt = cleanupAt;
    }
    return { value: next, changed, removedBytes };
  }

  return { value, changed: false, removedBytes: 0 };
}

function tableExists(table: string) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return Boolean(row);
}

function tableColumns(table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string; type: string; pk: number }>;
}

function primaryKeyColumn(table: string) {
  const pk = tableColumns(table).find((column) => column.pk === 1);
  return pk?.name ?? "id";
}

function allTables() {
  return db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => String((row as Row).name));
}

function jsonColumns(table: string) {
  return tableColumns(table)
    .map((column) => column.name)
    .filter((name) => name.endsWith("_json"));
}

function cleanupJsonColumns() {
  for (const table of allTables()) {
    const columns = jsonColumns(table);
    if (!columns.length) continue;
    const idColumn = primaryKeyColumn(table);
    const rows = db.prepare(`SELECT ${[idColumn, ...columns].map((item) => `"${item}"`).join(", ")} FROM "${table}"`).all() as Row[];
    for (const row of rows) {
      report.scannedRecords += 1;
      const updates: Record<string, string> = {};
      let rowRemovedBytes = 0;
      for (const column of columns) {
        const raw = row[column];
        if (typeof raw !== "string" || !raw) continue;
        if (!containsBinaryContent(raw)) continue;
        try {
          const parsed = JSON.parse(raw);
          const scrubbed = scrubJson(parsed);
          if (scrubbed.changed) {
            updates[column] = JSON.stringify(scrubbed.value ?? {});
            rowRemovedBytes += scrubbed.removedBytes;
          }
        } catch {
          if (isBinaryString(raw)) {
            updates[column] = JSON.stringify({ mediaRemoved: true, cleanupAt });
            rowRemovedBytes += Buffer.byteLength(raw, "utf8");
          }
        }
      }
      if (Object.keys(updates).length) {
        const setSql = Object.keys(updates).map((column) => `"${column}" = @${column}`).join(", ");
        db.prepare(`UPDATE "${table}" SET ${setSql} WHERE "${idColumn}" = @id`).run({ ...updates, id: row[idColumn] });
        report.removedBytes += rowRemovedBytes;
        markTable(table);
      }
    }
  }
}

function cleanupAssetUrlColumns() {
  if (!tableExists("assets")) return;
  const rows = db.prepare(`
    SELECT id, asset_category, name, public_url, preview_url
    FROM assets
    WHERE public_url LIKE 'data:%' OR preview_url LIKE 'data:%'
  `).all() as Row[];

  for (const row of rows) {
    report.scannedRecords += 1;
    const publicUrl = typeof row.public_url === "string" ? row.public_url : "";
    const previewUrl = typeof row.preview_url === "string" ? row.preview_url : "";
    const dataUrl = mediaUrlPattern.test(publicUrl) ? publicUrl : previewUrl;
    if (!mediaUrlPattern.test(dataUrl)) continue;

    const stored = storageService.writeDataUrl({
      dataUrl,
      folder: `assets/${String(row.asset_category ?? "UNKNOWN")}/${String(row.id)}`,
      fileName: String(row.name ?? row.id ?? "asset")
    });

    db.prepare(`
      UPDATE assets
      SET storage_provider = @storageProvider,
          storage_key = @storageKey,
          file_path = @filePath,
          public_url = @publicUrl,
          preview_url = @previewUrl,
          mime_type = COALESCE(mime_type, @mimeType),
          file_size = CASE WHEN COALESCE(file_size, 0) > 0 THEN file_size ELSE @fileSize END,
          checksum = COALESCE(checksum, @checksum),
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: row.id,
      storageProvider: stored.storageProvider,
      storageKey: stored.storageKey,
      filePath: stored.filePath,
      publicUrl: stored.publicUrl,
      previewUrl: stored.previewUrl,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      checksum: stored.checksum,
      updatedAt: cleanupAt
    });

    report.removedBytes += Buffer.byteLength(dataUrl, "utf8");
    markTable("assets");
  }
}

db.transaction(() => {
  cleanupAssetUrlColumns();
  cleanupJsonColumns();
})();

console.log(JSON.stringify(report, null, 2));
