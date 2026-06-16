import { db } from "../../database/db";
import {
  createId,
  getRow,
  jsonParse,
  jsonString,
  listRows,
  now
} from "../shared/resource";
import type {
  CreateWorkflowInput,
  CreateWorkflowRunInput,
  CreateWorkflowVersionInput
} from "./workflows.schemas";

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] : null;
}

export function mapWorkflow(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    name: text(row, "name"),
    slug: text(row, "slug"),
    description: text(row, "description"),
    category: text(row, "category"),
    status: text(row, "status"),
    activeVersionId: text(row, "active_version_id"),
    createdBy: text(row, "created_by"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

export function mapWorkflowVersion(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workflowId: text(row, "workflow_id"),
    versionNo: Number(row.version_no ?? 0),
    status: text(row, "status"),
    definition: jsonParse(row.definition_json, {}),
    inputSchema: jsonParse(row.input_schema_json, {}),
    outputSchema: jsonParse(row.output_schema_json, {}),
    validation: jsonParse(row.validation_json, {}),
    createdBy: text(row, "created_by"),
    createdAt: text(row, "created_at"),
    activatedAt: text(row, "activated_at")
  };
}

export function mapWorkflowRun(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    workflowId: text(row, "workflow_id"),
    workflowVersionId: text(row, "workflow_version_id"),
    name: text(row, "name"),
    status: text(row, "status"),
    priority: Number(row.priority ?? 50),
    input: jsonParse(row.input_json, {}),
    runContext: jsonParse(row.run_context_json, {}),
    targetGroupId: text(row, "target_group_id"),
    createdBy: text(row, "created_by"),
    createdAt: text(row, "created_at"),
    queuedAt: text(row, "queued_at"),
    startedAt: text(row, "started_at"),
    finishedAt: text(row, "finished_at"),
    errorCode: text(row, "error_code"),
    errorMessage: text(row, "error_message")
  };
}

export const workflowsService = {
  list: (query: Record<string, unknown>) =>
    listRows("workflows", mapWorkflow, query, {
      workspaceId: "workspace_id",
      status: "status"
    }),

  get: (id: string) => getRow("workflows", id, mapWorkflow),

  create(payload: CreateWorkflowInput) {
    const createdAt = now();
    const id = createId("wf");

    db.prepare(`
      INSERT INTO workflows (
        id, workspace_id, name, slug, description, category, status,
        created_by, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @name, @slug, @description, @category, @status,
        @createdBy, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      name: payload.name,
      slug: payload.slug ?? null,
      description: payload.description ?? null,
      category: payload.category,
      status: payload.status,
      createdBy: payload.createdBy ?? null,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  listVersions: (workflowId: string) =>
    db.prepare("SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version_no DESC")
      .all(workflowId)
      .map((row) => mapWorkflowVersion(row as Record<string, unknown>)),

  createVersion(workflowId: string, payload: CreateWorkflowVersionInput) {
    const current = db.prepare("SELECT COALESCE(MAX(version_no), 0) + 1 AS nextVersion FROM workflow_versions WHERE workflow_id = ?").get(workflowId) as { nextVersion: number };
    const createdAt = now();
    const id = createId("wfv");

    db.prepare(`
      INSERT INTO workflow_versions (
        id, workflow_id, version_no, status, definition_json, input_schema_json,
        output_schema_json, validation_json, created_by, created_at
      ) VALUES (
        @id, @workflowId, @versionNo, @status, @definitionJson, @inputSchemaJson,
        @outputSchemaJson, @validationJson, @createdBy, @createdAt
      )
    `).run({
      id,
      workflowId,
      versionNo: payload.versionNo ?? current.nextVersion,
      status: payload.status,
      definitionJson: jsonString(payload.definition, {}),
      inputSchemaJson: jsonString(payload.inputSchema, {}),
      outputSchemaJson: jsonString(payload.outputSchema, {}),
      validationJson: jsonString(payload.validation, {}),
      createdBy: payload.createdBy ?? null,
      createdAt
    });

    return getRow("workflow_versions", id, mapWorkflowVersion);
  },

  listRuns: (query: Record<string, unknown>) =>
    listRows("workflow_runs", mapWorkflowRun, query, {
      workflowId: "workflow_id",
      status: "status",
      workspaceId: "workspace_id"
    }),

  createRun(payload: CreateWorkflowRunInput) {
    const createdAt = now();
    const id = createId("wfr");

    db.prepare(`
      INSERT INTO workflow_runs (
        id, workspace_id, workflow_id, workflow_version_id, name, status, priority,
        input_json, run_context_json, target_group_id, created_by, created_at, queued_at
      ) VALUES (
        @id, @workspaceId, @workflowId, @workflowVersionId, @name, 'pending', @priority,
        @inputJson, @runContextJson, @targetGroupId, @createdBy, @createdAt, @queuedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      workflowId: payload.workflowId,
      workflowVersionId: payload.workflowVersionId ?? null,
      name: payload.name,
      priority: payload.priority,
      inputJson: jsonString(payload.input, {}),
      runContextJson: jsonString(payload.runContext, {}),
      targetGroupId: payload.targetGroupId ?? null,
      createdBy: payload.createdBy ?? null,
      createdAt,
      queuedAt: createdAt
    });

    return getRow("workflow_runs", id, mapWorkflowRun);
  }
};

