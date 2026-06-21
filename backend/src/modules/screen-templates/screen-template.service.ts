import { db } from "../../database/db";
import { AppError, createId, jsonParse, jsonString, now } from "../shared/resource";
import type { ScreenTemplateInput, UpdateScreenTemplateInput } from "./screen-template.schemas";

function mapScreenTemplate(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category ?? "Utility"),
    templateType: String(row.template_type ?? "OCR_TEXT"),
    templateImageUrl: row.template_image_url ?? null,
    ocrText: row.ocr_text ?? null,
    threshold: Number(row.threshold ?? 0.8),
    region: jsonParse(row.region_json, {}),
    status: String(row.status ?? "active"),
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
        id, name, category, template_type, template_image_url, ocr_text,
        threshold, region_json, status, created_at, updated_at
      ) VALUES (
        @id, @name, @category, @templateType, @templateImageUrl, @ocrText,
        @threshold, @regionJson, @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      name: input.name,
      category: input.category,
      templateType: input.templateType,
      templateImageUrl: input.templateImageUrl ?? null,
      ocrText: input.ocrText ?? null,
      threshold: input.threshold,
      regionJson: jsonString(input.region ?? {}, {}),
      status: input.status,
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
          template_type = @templateType,
          template_image_url = @templateImageUrl,
          ocr_text = @ocrText,
          threshold = @threshold,
          region_json = @regionJson,
          status = @status,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: input.name ?? current.name,
      category: input.category ?? current.category,
      templateType: input.templateType ?? current.templateType,
      templateImageUrl: input.templateImageUrl === undefined ? current.templateImageUrl : input.templateImageUrl,
      ocrText: input.ocrText === undefined ? current.ocrText : input.ocrText,
      threshold: input.threshold ?? current.threshold,
      regionJson: jsonString(input.region ?? current.region, {}),
      status: input.status ?? current.status,
      updatedAt: now()
    });
    return this.getRequired(id);
  },

  delete(id: string) {
    return db.prepare("DELETE FROM screen_templates WHERE id = ?").run(id).changes > 0;
  }
};
