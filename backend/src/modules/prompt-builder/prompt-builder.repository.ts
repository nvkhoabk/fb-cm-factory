import { db } from "../../database/db";
import { createId, now } from "../shared/resource";
import type {
  CreatePromptTemplateInput,
  CreatePromptTemplateVersionInput
} from "./prompt-builder.schemas";

function mapTemplate(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? row.scope ?? "general",
    description: row.description ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapVersion(row: Record<string, unknown>) {
  return {
    id: row.id,
    promptTemplateId: row.prompt_template_id,
    versionNo: row.version_no,
    templateText: row.template_text,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function versionsForTemplate(promptTemplateId: string) {
  return db.prepare(`
    SELECT * FROM prompt_template_versions
    WHERE prompt_template_id = ?
    ORDER BY version_no DESC
  `).all(promptTemplateId).map((versionRow) => mapVersion(versionRow as Record<string, unknown>));
}

function withVersions(template: ReturnType<typeof mapTemplate>) {
  const versions = versionsForTemplate(String(template.id));
  return {
    ...template,
    versions,
    activeVersion: versions.find((version) => version.status === "active") ?? versions[0] ?? null
  };
}

export const promptTemplatesRepository = {
  list() {
    return db.prepare("SELECT * FROM prompt_templates ORDER BY created_at DESC")
      .all()
      .map((row) => withVersions(mapTemplate(row as Record<string, unknown>)));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(id);
    if (!row) return null;
    const template = mapTemplate(row as Record<string, unknown>);
    return withVersions(template);
  },

  getVersion(id: string) {
    const row = db.prepare("SELECT * FROM prompt_template_versions WHERE id = ?").get(id);
    return row ? mapVersion(row as Record<string, unknown>) : null;
  },

  delete(id: string) {
    return db.transaction(() => {
      db.prepare("DELETE FROM prompt_template_versions WHERE prompt_template_id = ?").run(id);
      return db.prepare("DELETE FROM prompt_templates WHERE id = ?").run(id).changes > 0;
    })();
  },

  create(input: CreatePromptTemplateInput) {
    const createdAt = now();
    const id = createId("pt");

    db.prepare(`
      INSERT INTO prompt_templates (
        id, name, category, scope, description, status, created_at, updated_at
      ) VALUES (
        @id, @name, @category, @category, @description, @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      status: input.status,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  nextVersionNo(promptTemplateId: string) {
    const row = db.prepare(`
      SELECT COALESCE(MAX(version_no), 0) + 1 AS nextVersion
      FROM prompt_template_versions
      WHERE prompt_template_id = ?
    `).get(promptTemplateId) as { nextVersion: number };

    return row.nextVersion;
  },

  createVersion(promptTemplateId: string, input: CreatePromptTemplateVersionInput) {
    const createdAt = now();
    const id = createId("ptv");

    db.prepare(`
      INSERT INTO prompt_template_versions (
        id, prompt_template_id, version_no, template_text, status, created_at, updated_at
      ) VALUES (
        @id, @promptTemplateId, @versionNo, @templateText, @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      promptTemplateId,
      versionNo: input.versionNo ?? this.nextVersionNo(promptTemplateId),
      templateText: input.templateText,
      status: input.status,
      createdAt,
      updatedAt: createdAt
    });

    const row = db.prepare("SELECT * FROM prompt_template_versions WHERE id = ?").get(id);
    return mapVersion(row as Record<string, unknown>);
  },

  activateVersion(id: string) {
    const row = db.prepare("SELECT * FROM prompt_template_versions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    const updatedAt = now();
    db.prepare(`
      UPDATE prompt_template_versions
      SET status = 'archived', updated_at = ?
      WHERE prompt_template_id = ? AND id <> ?
    `).run(updatedAt, row.prompt_template_id, id);

    db.prepare(`
      UPDATE prompt_template_versions
      SET status = 'active', updated_at = ?
      WHERE id = ?
    `).run(updatedAt, id);

    const updated = db.prepare("SELECT * FROM prompt_template_versions WHERE id = ?").get(id);
    return mapVersion(updated as Record<string, unknown>);
  }
};
