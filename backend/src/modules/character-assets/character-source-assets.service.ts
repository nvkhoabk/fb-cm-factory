import { db } from "../../database/db";
import { jsonParse } from "../shared/resource";

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] : null;
}

function mapCharacter(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    status: text(row, "status"),
    age: Number(row.age ?? 0),
    metadata: jsonParse(row.metadata_json, {})
  };
}

function mapGroup(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    description: text(row, "description"),
    status: text(row, "status"),
    metadata: jsonParse(row.metadata_json, {})
  };
}

function groupAttributes(groupId: string) {
  const rows = db.prepare(`
    SELECT
      ga.key AS attribute_key,
      ga.name AS attribute_name,
      gav.value AS selected_value,
      gav.label AS selected_label,
      cgav.custom_value AS custom_value
    FROM character_group_attribute_values cgav
    JOIN group_attributes ga ON ga.id = cgav.attribute_id
    LEFT JOIN group_attribute_values gav ON gav.id = cgav.value_id
    WHERE cgav.group_id = ?
    ORDER BY cgav.created_at ASC
  `).all(groupId) as Array<Record<string, unknown>>;

  return Object.fromEntries(rows.map((row) => [
    String(row.attribute_key ?? row.attribute_name ?? ""),
    row.custom_value ?? row.selected_label ?? row.selected_value ?? ""
  ]).filter(([key]) => key));
}

function mapAsset(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    assetCategory: text(row, "asset_category") ?? text(row, "asset_type"),
    assetSubType: text(row, "asset_sub_type"),
    mediaType: text(row, "media_type"),
    characterId: text(row, "character_id"),
    publicUrl: text(row, "public_url"),
    previewUrl: text(row, "preview_url") ?? text(row, "public_url"),
    filePath: text(row, "file_path"),
    metadata: jsonParse(row.metadata_json, {}),
    attributes: jsonParse(row.attributes_json, {}),
    createdAt: text(row, "created_at")
  };
}

function normalizeSubtype(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function sourceImageForCharacter(characterId: string, role: "young" | "old") {
  const accepted = role === "young"
    ? ["YOUNG_IMAGE", "YOUNG_ORIGINAL_IMAGE"]
    : ["OLD_IMAGE", "OLD_ORIGINAL_IMAGE"];
  const rows = db.prepare(`
    SELECT * FROM assets
    WHERE character_id = ?
      AND COALESCE(asset_category, asset_type) = 'CHARACTER_IMAGE'
    ORDER BY created_at ASC
  `).all(characterId).map((row) => mapAsset(row as Record<string, unknown>));

  return rows.find((asset) => accepted.includes(normalizeSubtype(asset.assetSubType))) ?? null;
}

export const characterSourceAssetsService = {
  resolveCharacterGroupSourceAssets(groupId: string) {
    const groupRow = db.prepare("SELECT * FROM character_groups WHERE id = ?").get(groupId);
    const members = db.prepare(`
      SELECT c.*
      FROM character_group_members cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.group_id = ?
      ORDER BY cgm.sort_order ASC, cgm.created_at ASC
    `).all(groupId).map((row) => mapCharacter(row as Record<string, unknown>));

    return {
      groupId,
      group: groupRow ? mapGroup(groupRow as Record<string, unknown>) : null,
      characterIds: members.map((character) => character.id).filter(Boolean),
      attributesSnapshot: groupAttributes(groupId),
      characters: members.map((character) => ({
        characterId: character.id,
        character,
        youngOriginalImage: character.id ? sourceImageForCharacter(character.id, "young") : null,
        oldOriginalImage: character.id ? sourceImageForCharacter(character.id, "old") : null
      }))
    };
  }
};
