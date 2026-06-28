import { db } from "../src/database/db";
import { now } from "../src/modules/shared/resource";

type InstanceRow = {
  id: string;
  host_id: string;
  adb_id: string | null;
  status: string | null;
  adb_mapping_confidence: string | null;
};

const timestamp = now();
const rows = db.prepare(`
  SELECT id, host_id, adb_id, status, adb_mapping_confidence
  FROM instances
`).all() as InstanceRow[];

let cleared = 0;
let duplicatesFound = 0;

function clearInstance(id: string) {
  const changes = db.prepare(`
    UPDATE instances
    SET adb_id = NULL,
        adb_mapping_confidence = 'unknown',
        adb_mapping_source = 'none',
        adb_mapping_updated_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(timestamp, timestamp, id).changes;
  if (changes) cleared += 1;
}

for (const row of rows) {
  const status = String(row.status ?? "").toUpperCase();
  const confidence = String(row.adb_mapping_confidence ?? "unknown").toLowerCase();
  if (row.adb_id && ["OFFLINE", "STOPPED"].includes(status) && ["preserved", "unknown", ""].includes(confidence)) {
    clearInstance(row.id);
  }
}

const activeRows = db.prepare(`
  SELECT id, host_id, adb_id, adb_mapping_confidence
  FROM instances
  WHERE adb_id IS NOT NULL AND adb_id <> ''
`).all() as InstanceRow[];

const byHostAdb = new Map<string, InstanceRow[]>();
for (const row of activeRows) {
  const key = `${row.host_id}::${row.adb_id}`;
  byHostAdb.set(key, [...(byHostAdb.get(key) ?? []), row]);
}

for (const duplicateRows of byHostAdb.values()) {
  if (duplicateRows.length <= 1) continue;
  duplicatesFound += 1;
  const keep = duplicateRows.find((row) => ["manual", "direct"].includes(String(row.adb_mapping_confidence ?? "").toLowerCase()));
  for (const row of duplicateRows) {
    if (keep && row.id === keep.id) continue;
    clearInstance(row.id);
  }
}

const report = {
  scanned: rows.length,
  cleared,
  duplicatesFound
};

console.log(JSON.stringify(report, null, 2));
