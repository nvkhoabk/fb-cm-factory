import { db } from "../../database/db";
import { AppError, createId, jsonParse, jsonString, now } from "../shared/resource";
import type { ScreenTemplateInput, UpdateScreenTemplateInput } from "./screen-template.schemas";

function mapScreenTemplate(row: Record<string, unknown>) {
  const matchType = String(row.match_type ?? row.template_type ?? "OCR_TEXT")
    .replace("IMAGE_MATCH", "IMAGE")
    .replace("REGION_MATCH", "REGION_IMAGE");
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category ?? "SYSTEM"),
    matchType,
    match_type: matchType,
    templateType: matchType,
    status: String(row.status ?? "ACTIVE").toUpperCase(),
    description: row.description ?? null,
    templateImageAssetId: row.template_image_asset_id ?? null,
    templateImagePath: row.template_image_path ?? null,
    templateImageUrl: row.template_image_url ?? row.template_image_path ?? null,
    templateThumbnailUrl: row.template_thumbnail_url ?? row.template_image_url ?? null,
    ocrText: row.ocr_text ?? null,
    threshold: Number(row.threshold ?? 0.8),
    region: jsonParse(row.region_json, {}),
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const screenTemplateService = {
  list() {
    return db.prepare("SELECT * FROM screen_templates ORDER BY category ASC, updated_at DESC")
      .all()
      .map((row) => mapScreenTemplate(row as Record<string, unknown>));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM screen_templates WHERE id = ?").get(id);
    return row ? mapScreenTemplate(row as Record<string, unknown>) : null;
  },

  getRequired(id: string) {
    const template = this.get(id);
    if (!template) throw new AppError("SCREEN_TEMPLATE_NOT_FOUND", "Screen template not found", 404, { templateId: id });
    return template;
  },

  create(input: ScreenTemplateInput) {
    const id = createId("sct");
    const timestamp = now();
    db.prepare(`
      INSERT INTO screen_templates (
        id, name, category, match_type, template_type, status, description,
        template_image_asset_id, template_image_path, template_image_url, template_thumbnail_url,
        ocr_text, region_json, threshold, metadata_json, created_at, updated_at
      ) VALUES (
        @id, @name, @category, @matchType, @templateType, @status, @description,
        @templateImageAssetId, @templateImagePath, @templateImageUrl, @templateThumbnailUrl,
        @ocrText, @regionJson, @threshold, @metadataJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      name: input.name,
      category: input.category,
      matchType: input.matchType,
      templateType: input.templateType,
      status: input.status,
      description: input.description ?? null,
      templateImageAssetId: input.templateImageAssetId ?? null,
      templateImagePath: input.templateImagePath ?? null,
      templateImageUrl: input.templateImageUrl ?? null,
      templateThumbnailUrl: input.templateThumbnailUrl ?? input.templateImageUrl ?? null,
      ocrText: input.ocrText ?? null,
      threshold: input.threshold,
      regionJson: jsonString(input.region ?? {}, {}),
      metadataJson: jsonString(input.metadata ?? {}, {}),
      createdAt: timestamp,
      updatedAt: timestamp
    });
    return this.getRequired(id);
  },

  update(id: string, input: UpdateScreenTemplateInput) {
    const current = this.getRequired(id);
    db.prepare(`
      UPDATE screen_templates
      SET name = @name,
          category = @category,
          match_type = @matchType,
          template_type = @templateType,
          status = @status,
          description = @description,
          template_image_asset_id = @templateImageAssetId,
          template_image_path = @templateImagePath,
          template_image_url = @templateImageUrl,
          template_thumbnail_url = @templateThumbnailUrl,
          ocr_text = @ocrText,
          threshold = @threshold,
          region_json = @regionJson,
          metadata_json = @metadataJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: input.name ?? current.name,
      category: input.category ?? current.category,
      matchType: input.matchType ?? current.matchType,
      templateType: input.templateType ?? current.templateType,
      status: input.status ?? current.status,
      description: input.description === undefined ? current.description : input.description,
      templateImageAssetId: input.templateImageAssetId === undefined ? current.templateImageAssetId : input.templateImageAssetId,
      templateImagePath: input.templateImagePath === undefined ? current.templateImagePath : input.templateImagePath,
      templateImageUrl: input.templateImageUrl === undefined ? current.templateImageUrl : input.templateImageUrl,
      templateThumbnailUrl: input.templateThumbnailUrl === undefined ? current.templateThumbnailUrl : input.templateThumbnailUrl,
      ocrText: input.ocrText === undefined ? current.ocrText : input.ocrText,
      threshold: input.threshold ?? current.threshold,
      regionJson: jsonString(input.region ?? current.region, {}),
      metadataJson: jsonString(input.metadata ?? current.metadata, {}),
      updatedAt: now()
    });
    return this.getRequired(id);
  },

  delete(id: string) {
    return db.prepare("DELETE FROM screen_templates WHERE id = ?").run(id).changes > 0;
  }
};
