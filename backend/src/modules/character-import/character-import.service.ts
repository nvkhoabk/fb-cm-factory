import { db } from "../../database/db";
import { assetsService } from "../assets/assets.service";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type { ImportBulkInput, ImportFileInput, ImportPairInput } from "./character-import.schemas";

type ParsedFile = ImportFileInput & {
  role: "young" | "old" | "unknown";
  name: string;
  status?: "alive" | "rip";
  age?: number;
  ext: string;
};

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] : null;
}

function mapCharacter(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    status: text(row, "status"),
    age: Number(row.age ?? 0),
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapHistory(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    mode: text(row, "mode"),
    status: text(row, "status"),
    importedCount: Number(row.imported_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    summary: jsonParse(row.summary_json, {}),
    createdAt: text(row, "created_at")
  };
}

function baseName(fileName: string) {
  return fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
}

function parseFile(input: ImportFileInput): ParsedFile {
  const fileName = baseName(input.fileName).trim();
  const youngMatch = fileName.match(/^(.+)\.([a-z0-9]+)$/i);
  const oldMatch = fileName.match(/^(.+?)\s+([ar])(\d{1,3})\.([a-z0-9]+)$/i);
  if (oldMatch) {
    return {
      ...input,
      fileName,
      role: "old",
      name: oldMatch[1].trim(),
      status: oldMatch[2].toLowerCase() === "a" ? "alive" : "rip",
      age: Number(oldMatch[3]),
      ext: oldMatch[4].toLowerCase()
    };
  }
  if (youngMatch) {
    return {
      ...input,
      fileName,
      role: "young",
      name: youngMatch[1].trim(),
      ext: youngMatch[2].toLowerCase()
    };
  }
  return { ...input, fileName, role: "unknown", name: fileName, ext: "" };
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function characterByName(name: string) {
  const row = db.prepare("SELECT * FROM characters WHERE lower(name) = lower(?) ORDER BY created_at DESC LIMIT 1").get(name);
  return row ? mapCharacter(row as Record<string, unknown>) : null;
}

function existingCharacterAssets(characterId: string | null, name: string) {
  return db.prepare(`
    SELECT * FROM assets
    WHERE asset_category = 'CHARACTER_IMAGE'
      AND (character_id = ? OR lower(name) LIKE lower(?))
    ORDER BY created_at DESC
  `).all(characterId, `%${name}%`);
}

function isOriginalSourceSubtype(value: unknown) {
  return ["YOUNG_ORIGINAL_IMAGE", "YOUNG_IMAGE", "OLD_ORIGINAL_IMAGE", "OLD_IMAGE"].includes(String(value ?? ""));
}

function hasUsableSourceImages(characterId: string) {
  const rows = db.prepare(`
    SELECT asset_sub_type, file_path, public_url
    FROM assets
    WHERE character_id = ?
      AND asset_category = 'CHARACTER_IMAGE'
      AND asset_sub_type IN ('YOUNG_ORIGINAL_IMAGE', 'YOUNG_IMAGE', 'OLD_ORIGINAL_IMAGE', 'OLD_IMAGE')
  `).all(characterId) as Record<string, unknown>[];

  const usable = rows.filter((row) => {
    const publicUrl = text(row, "public_url") ?? "";
    const filePath = text(row, "file_path") ?? "";
    return isOriginalSourceSubtype(row.asset_sub_type) && Boolean(filePath || (publicUrl && !publicUrl.startsWith("blob:")));
  });

  return {
    young: usable.some((row) => ["YOUNG_ORIGINAL_IMAGE", "YOUNG_IMAGE"].includes(String(row.asset_sub_type))),
    old: usable.some((row) => ["OLD_ORIGINAL_IMAGE", "OLD_IMAGE"].includes(String(row.asset_sub_type)))
  };
}

function pairKey(pair: { name: string; young?: ImportFileInput; old?: ImportFileInput }) {
  return `${normalizeName(pair.name)}|${pair.young?.fileName ?? ""}|${pair.old?.fileName ?? ""}`;
}

function buildPairs(files: ImportFileInput[]) {
  const groups = new Map<string, { name: string; young?: ParsedFile; old?: ParsedFile; files: ParsedFile[] }>();
  for (const file of files) {
    const parsed = parseFile(file);
    const key = normalizeName(parsed.name);
    const group = groups.get(key) ?? { name: parsed.name, files: [] };
    group.files.push(parsed);
    if (parsed.role === "young" && !group.young) group.young = parsed;
    if (parsed.role === "old" && !group.old) group.old = parsed;
    groups.set(key, group);
  }
  return [...groups.values()];
}

function previewPairs(files: ImportFileInput[]) {
  const rawPairs = buildPairs(files);
  const counts = new Map<string, number>();
  for (const pair of rawPairs) counts.set(normalizeName(pair.name), (counts.get(normalizeName(pair.name)) ?? 0) + 1);
  const seenPairs = new Set<string>();

  return rawPairs.map((pair) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!pair.young) errors.push("young image missing");
    if (!pair.old) errors.push("old image missing");
    if (pair.young && pair.old && normalizeName(pair.young.name) !== normalizeName(pair.old.name)) {
      errors.push("name mismatch");
    }
    if (counts.get(normalizeName(pair.name)) && Number(counts.get(normalizeName(pair.name))) > 1) warnings.push("duplicate name in upload");
    const key = pairKey(pair);
    if (seenPairs.has(key)) warnings.push("duplicate pair in upload");
    seenPairs.add(key);

    const existingCharacter = characterByName(pair.name);
    if (existingCharacter) warnings.push("existing character");
    const existingAssets = existingCharacterAssets(existingCharacter?.id ?? null, pair.name);
    if (existingAssets.length) warnings.push("existing character image");

    return {
      name: pair.name,
      status: pair.old?.status ?? null,
      age: pair.old?.age ?? null,
      young: pair.young ?? null,
      old: pair.old ?? null,
      valid: errors.length === 0,
      errors,
      warnings,
      existingCharacter,
      existingAssetCount: existingAssets.length
    };
  });
}

function createCharacter(input: { name: string; status: "alive" | "rip"; age: number; metadata: Record<string, unknown> }) {
  const existing = characterByName(input.name);
  if (existing) return existing;
  const id = createId("char");
  const timestamp = now();
  db.prepare(`
    INSERT INTO characters (
      id, name, status, age, metadata_json, created_at, updated_at
    ) VALUES (
      @id, @name, @status, @age, @metadataJson, @createdAt, @updatedAt
    )
  `).run({
    id,
    name: input.name,
    status: input.status,
    age: input.age,
    metadataJson: jsonString(input.metadata, {}),
    createdAt: timestamp,
    updatedAt: timestamp
  });
  const row = db.prepare("SELECT * FROM characters WHERE id = ?").get(id);
  return mapCharacter(row as Record<string, unknown>);
}

function maybeCreateCandidateGroup(name: string, characterId: string | null) {
  const existing = db.prepare("SELECT * FROM character_groups WHERE lower(name) = lower(?) LIMIT 1").get(`${name} Candidate`);
  if (existing) return text(existing as Record<string, unknown>, "id");
  const id = createId("cg");
  const timestamp = now();
  db.prepare(`
    INSERT INTO character_groups (id, name, description, status, created_at, updated_at)
    VALUES (@id, @name, @description, 'candidate', @createdAt, @updatedAt)
  `).run({
    id,
    name: `${name} Candidate`,
    description: "Created by Character Import Center",
    createdAt: timestamp,
    updatedAt: timestamp
  });
  if (characterId) {
    db.prepare(`
      INSERT INTO character_group_members (
        id, group_id, character_id, role, sort_order, status, member_context_json, created_at, updated_at
      ) VALUES (
        @id, @groupId, @characterId, 'candidate', 0, 'active', '{}', @createdAt, @updatedAt
      )
    `).run({
      id: createId("cgm"),
      groupId: id,
      characterId,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }
  return id;
}

async function createCharacterImageAsset(input: {
  characterId: string | null;
  name: string;
  subType: "YOUNG_IMAGE" | "OLD_IMAGE";
  file: ImportFileInput;
  status: "alive" | "rip";
  age: number;
  sourceAssetId?: string;
}) {
  return assetsService.create({
    name: `${input.name} ${input.subType === "YOUNG_IMAGE" ? "Young Original" : "Old Original"}`,
    assetCategory: "CHARACTER_IMAGE",
    assetType: "CHARACTER_IMAGE",
    assetSubType: input.subType === "YOUNG_IMAGE" ? "YOUNG_ORIGINAL_IMAGE" : "OLD_ORIGINAL_IMAGE",
    mediaType: "image",
    versionNo: 1,
    isBestVersion: false,
    characterId: input.characterId ?? undefined,
    publicUrl: input.file.publicUrl ?? input.file.dataUrl,
    previewUrl: input.file.publicUrl ?? input.file.dataUrl,
    filePath: input.file.filePath,
    mimeType: input.file.mimeType,
    fileSize: input.file.size ?? 0,
    storageProvider: "import",
    sourceAssetId: input.sourceAssetId,
    tags: [input.name, input.subType, input.status],
    attributes: {
      status: input.status,
      age: input.age
    },
    metadata: {
      status: input.status,
      age: input.age,
      originalFileName: input.file.fileName
    },
    status: "available",
    usageStatus: "available",
    usagePolicy: "reusable",
    qualityStatus: "draft"
  });
}

function recordHistory(mode: string, status: string, importedCount: number, skippedCount: number, summary: unknown) {
  const id = createId("cimport");
  db.prepare(`
    INSERT INTO character_import_runs (
      id, mode, status, imported_count, skipped_count, summary_json, created_at
    ) VALUES (
      @id, @mode, @status, @importedCount, @skippedCount, @summaryJson, @createdAt
    )
  `).run({
    id,
    mode,
    status,
    importedCount,
    skippedCount,
    summaryJson: jsonString(summary, {}),
    createdAt: now()
  });
  const row = db.prepare("SELECT * FROM character_import_runs WHERE id = ?").get(id);
  return mapHistory(row as Record<string, unknown>);
}

function stripInlineMedia(value: unknown): unknown {
  if (typeof value === "string") {
    if (/^data:(image|video|audio)\//i.test(value) || /base64,/i.test(value)) return "[stored-in-external-storage]";
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => stripInlineMedia(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      key === "dataUrl" ? "[stored-in-external-storage]" : stripInlineMedia(item)
    ]));
  }
  return value;
}

async function importPreviews(previews: ReturnType<typeof previewPairs>, createGroupCandidates: boolean, mode: string) {
  const imported = [];
  const skipped = [];
  for (const preview of previews) {
    if (!preview.valid || !preview.young || !preview.old || !preview.status || !preview.age) {
      skipped.push(preview);
      continue;
    }
    const usableSourceImages = preview.existingCharacter?.id ? hasUsableSourceImages(preview.existingCharacter.id) : null;
    const canRepairExistingCharacter = Boolean(preview.existingCharacter?.id && (!usableSourceImages?.young || !usableSourceImages?.old));
    if ((preview.existingCharacter || preview.existingAssetCount > 0) && !canRepairExistingCharacter) {
      skipped.push({ ...preview, skippedReason: "duplicate warning requires manual review" });
      continue;
    }
    const character = preview.existingCharacter ?? createCharacter({
      name: preview.name,
      status: preview.status,
      age: preview.age,
      metadata: {
        importedBy: "Character Import Center",
        status: preview.status,
        age: preview.age
      }
    });
    const groupId = createGroupCandidates ? maybeCreateCandidateGroup(preview.name, character.id) : null;
    const youngAsset = await createCharacterImageAsset({
      characterId: character.id,
      name: preview.name,
      subType: "YOUNG_IMAGE",
      file: preview.young,
      status: preview.status,
      age: preview.age
    });
    const oldAsset = await createCharacterImageAsset({
      characterId: character.id,
      name: preview.name,
      subType: "OLD_IMAGE",
      file: preview.old,
      status: preview.status,
      age: preview.age,
      sourceAssetId: youngAsset?.id ?? undefined
    });
    imported.push({
      preview,
      character,
      groupId,
      assets: { young: youngAsset, old: oldAsset },
      repairedExistingCharacter: canRepairExistingCharacter
    });
  }
  const history = recordHistory(mode, skipped.length ? "PARTIAL" : "IMPORTED", imported.length, skipped.length, stripInlineMedia({ imported, skipped }));
  return { importedCount: imported.length, skippedCount: skipped.length, imported, skipped, history };
}

export const characterImportService = {
  preview(files: ImportFileInput[]) {
    return {
      pairs: previewPairs(files),
      rules: {
        young: "<Name>.<ext>",
        old: "<Name> aXX.<ext> or <Name> rXX.<ext>"
      }
    };
  },

  importPair(input: ImportPairInput) {
    const pairs = previewPairs([input.young, input.old]);
    if (input.dryRun) return { importedCount: 0, skippedCount: 0, imported: [], skipped: [], preview: pairs };
    return importPreviews(pairs, input.createGroupCandidates, "pair");
  },

  importBulk(input: ImportBulkInput) {
    const pairs = previewPairs(input.files);
    if (input.dryRun) return { importedCount: 0, skippedCount: 0, imported: [], skipped: [], preview: pairs };
    return importPreviews(pairs, input.createGroupCandidates, "bulk");
  },

  history() {
    return db.prepare("SELECT * FROM character_import_runs ORDER BY created_at DESC LIMIT 50")
      .all()
      .map((row) => mapHistory(row as Record<string, unknown>));
  }
};
