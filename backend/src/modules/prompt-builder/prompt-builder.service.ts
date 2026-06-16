import { db } from "../../database/db";
import { createId, getRow, jsonParse, jsonString, listRows, now } from "../shared/resource";
import type { CreatePromptTemplateInput, CreatePromptVersionInput } from "./prompt-builder.schemas";

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] : null;
}

function mapTemplate(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    name: text(row, "name"),
    scope: text(row, "scope"),
    description: text(row, "description"),
    variableSchema: jsonParse(row.variable_schema_json, {}),
    status: text(row, "status"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapVersion(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    templateId: text(row, "template_id"),
    versionNo: Number(row.version_no ?? 0),
    status: text(row, "status"),
    content: text(row, "content"),
    negativeContent: text(row, "negative_content"),
    renderingEngine: text(row, "rendering_engine"),
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: text(row, "created_at"),
    activatedAt: text(row, "activated_at")
  };
}

function valueByPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, source);
}

export const promptBuilderService = {
  list: (query: Record<string, unknown>) =>
    listRows("prompt_templates", mapTemplate, query, {
      workspaceId: "workspace_id",
      scope: "scope",
      status: "status"
    }),

  get: (id: string) => getRow("prompt_templates", id, mapTemplate),

  create(payload: CreatePromptTemplateInput) {
    const createdAt = now();
    const id = createId("pt");

    db.prepare(`
      INSERT INTO prompt_templates (
        id, workspace_id, name, scope, description, variable_schema_json,
        status, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @name, @scope, @description, @variableSchemaJson,
        @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      name: payload.name,
      scope: payload.scope,
      description: payload.description ?? null,
      variableSchemaJson: jsonString(payload.variableSchema, {}),
      status: payload.status,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  listVersions: (templateId: string) =>
    db.prepare("SELECT * FROM prompt_versions WHERE template_id = ? ORDER BY version_no DESC")
      .all(templateId)
      .map((row) => mapVersion(row as Record<string, unknown>)),

  createVersion(templateId: string, payload: CreatePromptVersionInput) {
    const current = db.prepare("SELECT COALESCE(MAX(version_no), 0) + 1 AS nextVersion FROM prompt_versions WHERE template_id = ?").get(templateId) as { nextVersion: number };
    const createdAt = now();
    const id = createId("pv");

    db.prepare(`
      INSERT INTO prompt_versions (
        id, template_id, version_no, status, content, negative_content,
        rendering_engine, metadata_json, created_at
      ) VALUES (
        @id, @templateId, @versionNo, @status, @content, @negativeContent,
        @renderingEngine, @metadataJson, @createdAt
      )
    `).run({
      id,
      templateId,
      versionNo: payload.versionNo ?? current.nextVersion,
      status: payload.status,
      content: payload.content,
      negativeContent: payload.negativeContent ?? null,
      renderingEngine: payload.renderingEngine,
      metadataJson: jsonString(payload.metadata, {}),
      createdAt
    });

    return getRow("prompt_versions", id, mapVersion);
  },

  renderPreview(content: string, context: Record<string, unknown>) {
    const missingVariables: string[] = [];
    const variables: Record<string, unknown> = {};

    const rendered = content.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
      const value = valueByPath(context, key);
      variables[key] = value;

      if (value === undefined || value === null) {
        missingVariables.push(key);
        return "";
      }

      return String(value);
    });

    return {
      content: rendered,
      variables,
      missingVariables
    };
  }
};

