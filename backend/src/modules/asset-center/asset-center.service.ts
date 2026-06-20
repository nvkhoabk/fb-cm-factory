import { db } from "../../database/db";
import { jsonParse } from "../shared/resource";

export type AssetCenterItem = {
  id: string;
  itemType: string;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  status?: string | null;
  thumbnailUrl?: string | null;
  previewText?: string | null;
  tags: string[];
  attributes: Record<string, unknown>;
  sourceModule: string;
  sourceId: string;
  updatedAt?: string | null;
  metadata: Record<string, unknown>;
};

type AssetCenterQuery = {
  itemType?: string;
  category?: string;
  status?: string;
  search?: string;
  tag?: string;
  sourceModule?: string;
  updatedDate?: string;
  page?: string | number;
  pageSize?: string | number;
};

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] as string : null;
}

function detectPromptVariables(templateText: string) {
  return [...new Set([
    ...Array.from(templateText.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)).map((match) => `{{${match[1].trim()}}}`),
    ...Array.from(templateText.matchAll(/\{\s*([a-zA-Z0-9_.-]+)\s*\}/g)).map((match) => `{${match[1].trim()}}`)
  ])];
}

function firstLines(value: string, count = 3) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, count).join("\n");
}

function titleFromMetadata(metadata: Record<string, unknown>, fallback: string) {
  for (const key of ["title", "name", "caption"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function assetsAsItems(): AssetCenterItem[] {
  return db.prepare("SELECT * FROM assets ORDER BY updated_at DESC, created_at DESC").all().map((rowValue) => {
    const row = rowValue as Record<string, unknown>;
    const id = String(row.id);
    const assetCategory = text(row, "asset_category") ?? text(row, "asset_type") ?? "CHARACTER_IMAGE";
    const metadata = jsonParse<Record<string, unknown>>(row.metadata_json, {});
    const attributes = jsonParse<Record<string, unknown>>(row.attributes_json, {});
    const tags = jsonParse<string[]>(row.tags_json, []);
    return {
      id: `assets:${id}`,
      itemType: assetCategory,
      title: text(row, "name") ?? id,
      subtitle: text(row, "asset_sub_type") ?? text(row, "media_type"),
      category: assetCategory,
      status: text(row, "status") ?? text(row, "usage_status"),
      thumbnailUrl: text(row, "thumbnail_public_url") ?? text(row, "preview_url") ?? text(row, "public_url"),
      previewText: text(row, "asset_sub_type") ?? text(row, "media_type"),
      tags,
      attributes,
      sourceModule: "assets",
      sourceId: id,
      updatedAt: text(row, "updated_at") ?? text(row, "created_at"),
      metadata: {
        ...metadata,
        assetId: id,
        assetCategory,
        assetSubType: text(row, "asset_sub_type"),
        characterId: text(row, "character_id"),
        groupId: text(row, "group_id"),
        publicUrl: text(row, "public_url"),
        previewUrl: text(row, "preview_url"),
        thumbnailPublicUrl: text(row, "thumbnail_public_url"),
        versionNo: Number(row.version_no ?? 1),
        isBestVersion: row.is_best_version === 1
      }
    };
  });
}

function promptTemplatesAsItems(): AssetCenterItem[] {
  const rows = db.prepare(`
    SELECT
      pt.*,
      COALESCE(active.id, latest.id) AS version_id,
      COALESCE(active.version_no, latest.version_no) AS version_no,
      COALESCE(active.template_text, latest.template_text, '') AS template_text,
      COALESCE(active.status, latest.status) AS version_status,
      COALESCE(active.updated_at, latest.updated_at, pt.updated_at, pt.created_at) AS version_updated_at
    FROM prompt_templates pt
    LEFT JOIN prompt_template_versions active
      ON active.prompt_template_id = pt.id
      AND active.status = 'active'
    LEFT JOIN prompt_template_versions latest
      ON latest.id = (
        SELECT id FROM prompt_template_versions
        WHERE prompt_template_id = pt.id
        ORDER BY version_no DESC
        LIMIT 1
      )
    ORDER BY COALESCE(pt.updated_at, pt.created_at) DESC
  `).all();

  return rows.map((rowValue) => {
    const row = rowValue as Record<string, unknown>;
    const id = String(row.id);
    const category = text(row, "category") ?? text(row, "scope") ?? "general";
    const templateText = text(row, "template_text") ?? "";
    const variables = detectPromptVariables(templateText);
    const itemType = category === "POST_CONTENT" || category === "POST_TEMPLATE" ? "POST_TEMPLATE" : "PROMPT_TEMPLATE";
    return {
      id: `prompt_templates:${id}`,
      itemType,
      title: text(row, "name") ?? id,
      subtitle: `v${Number(row.version_no ?? 0) || "-"} / ${category}`,
      category,
      status: text(row, "status"),
      thumbnailUrl: null,
      previewText: firstLines(templateText),
      tags: variables,
      attributes: { variables, versionNo: Number(row.version_no ?? 0) || null },
      sourceModule: "prompt_templates",
      sourceId: id,
      updatedAt: text(row, "version_updated_at") ?? text(row, "updated_at") ?? text(row, "created_at"),
      metadata: {
        promptTemplateId: id,
        activeOrLatestVersionId: text(row, "version_id"),
        versionNo: Number(row.version_no ?? 0) || null,
        versionStatus: text(row, "version_status"),
        description: text(row, "description"),
        variables,
        templateText
      }
    };
  });
}

function mapProductionBatchItem(row: Record<string, unknown>, itemType: string): AssetCenterItem {
    const id = String(row.id);
    const batchType = text(row, "batch_type") ?? "PRODUCTION_RESOURCE";
    const metadata = jsonParse<Record<string, unknown>>(row.metadata_json, {});
    const attributes = jsonParse<Record<string, unknown>>(row.attributes_json, {});
    const title = titleFromMetadata(metadata, `${batchType} ${id.slice(0, 8)}`);
    const tags = Array.isArray(metadata.tags) ? metadata.tags.map((tag) => String(tag)).filter(Boolean) : [];
    return {
      id: `production_batches:${itemType}:${id}`,
      itemType,
      title,
      subtitle: batchType,
      category: batchType,
      status: text(row, "status"),
      thumbnailUrl: typeof metadata.thumbnailUrl === "string" ? metadata.thumbnailUrl : typeof metadata.previewUrl === "string" ? metadata.previewUrl : null,
      previewText: [metadata.caption, metadata.postText, metadata.promptSummary].filter((value) => typeof value === "string" && value).join("\n") || batchType,
      tags,
      attributes,
      sourceModule: "production_batches",
      sourceId: id,
      updatedAt: text(row, "updated_at") ?? text(row, "created_at"),
      metadata: {
        ...metadata,
        batchId: id,
        batchType,
        sourceGroupId: text(row, "source_group_id"),
        workflowId: text(row, "workflow_id"),
        workflowRunId: text(row, "workflow_run_id"),
        usageStatus: text(row, "usage_status")
      }
    };
}

function productionBatchesAsItems(): AssetCenterItem[] {
  return db.prepare("SELECT * FROM production_batches ORDER BY updated_at DESC, created_at DESC").all().flatMap((rowValue) => {
    const row = rowValue as Record<string, unknown>;
    const batchType = text(row, "batch_type") ?? "PRODUCTION_RESOURCE";
    const items = [mapProductionBatchItem(row, "PRODUCTION_RESOURCE")];
    if (batchType === "MUSIC_TRACK") items.push(mapProductionBatchItem(row, "MUSIC_TRACK"));
    return items;
  });
}

function matchesQuery(item: AssetCenterItem, query: AssetCenterQuery) {
  const search = String(query.search ?? "").trim().toLowerCase();
  const itemType = String(query.itemType ?? "").trim();
  const category = String(query.category ?? "").trim();
  const status = String(query.status ?? "").trim();
  const tag = String(query.tag ?? "").trim();
  const sourceModule = String(query.sourceModule ?? "").trim();
  const updatedDate = String(query.updatedDate ?? "").trim();
  const haystack = `${item.title} ${item.subtitle ?? ""} ${item.category ?? ""} ${item.status ?? ""} ${item.previewText ?? ""} ${JSON.stringify(item.metadata)}`.toLowerCase();
  return (!itemType || item.itemType === itemType)
    && (!category || item.category === category)
    && (!status || item.status === status)
    && (!tag || item.tags.includes(tag))
    && (!sourceModule || item.sourceModule === sourceModule)
    && (!updatedDate || String(item.updatedAt ?? "").slice(0, 10) === updatedDate)
    && (!search || haystack.includes(search));
}

export const assetCenterService = {
  list(query: AssetCenterQuery = {}) {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 80) || 80));
    const allItems = [
      ...assetsAsItems(),
      ...promptTemplatesAsItems(),
      ...productionBatchesAsItems()
    ]
      .filter((item) => matchesQuery(item, query))
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    const start = (page - 1) * pageSize;
    return {
      items: allItems.slice(start, start + pageSize),
      total: allItems.length,
      page,
      pageSize
    };
  }
};
