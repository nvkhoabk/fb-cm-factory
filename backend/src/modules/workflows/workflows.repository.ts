import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type {
  CreateWorkflowInput,
  CreateWorkflowStageInput,
  UpdateWorkflowInput,
  UpdateWorkflowStageInput
} from "./workflows.schemas";

function mapWorkflow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapStage(row: Record<string, unknown>) {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    stageNo: row.stage_no,
    stageType: row.stage_type,
    name: row.name,
    scriptId: row.script_id ?? null,
    poolType: row.pool_type ?? null,
    promptTemplateId: row.prompt_template_id ?? null,
    config: jsonParse(row.config_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const workflowsRepository = {
  list() {
    return db.prepare("SELECT * FROM workflows ORDER BY created_at DESC")
      .all()
      .map((row) => mapWorkflow(row as Record<string, unknown>));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM workflows WHERE id = ?").get(id);
    return row ? mapWorkflow(row as Record<string, unknown>) : null;
  },

  create(input: CreateWorkflowInput) {
    const createdAt = now();
    const id = createId("wf");

    db.prepare(`
      INSERT INTO workflows (
        id, name, description, status, created_at, updated_at
      ) VALUES (
        @id, @name, @description, @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  update(id: string, input: UpdateWorkflowInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflows
      SET name = @name,
          description = @description,
          status = @status,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      status: input.status ?? current.status,
      updatedAt: now()
    });

    return this.get(id);
  },

  delete(id: string) {
    return db.prepare("DELETE FROM workflows WHERE id = ?").run(id).changes > 0;
  },

  createStage(workflowId: string, input: CreateWorkflowStageInput) {
    const createdAt = now();
    const id = createId("wfs");

    db.prepare(`
      INSERT INTO workflow_stages (
        id, workflow_id, stage_no, stage_type, name, script_id, pool_type,
        prompt_template_id, config_json, created_at, updated_at
      ) VALUES (
        @id, @workflowId, @stageNo, @stageType, @name, @scriptId, @poolType,
        @promptTemplateId, @configJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      workflowId,
      stageNo: input.stageNo,
      stageType: input.stageType,
      name: input.name,
      scriptId: input.scriptId ?? null,
      poolType: input.poolType ?? null,
      promptTemplateId: input.promptTemplateId ?? null,
      configJson: jsonString(input.config, {}),
      createdAt,
      updatedAt: createdAt
    });

    const row = db.prepare("SELECT * FROM workflow_stages WHERE id = ?").get(id);
    return mapStage(row as Record<string, unknown>);
  },

  getStage(id: string) {
    const row = db.prepare("SELECT * FROM workflow_stages WHERE id = ?").get(id);
    return row ? mapStage(row as Record<string, unknown>) : null;
  },

  updateStage(id: string, input: UpdateWorkflowStageInput) {
    const current = this.getStage(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflow_stages
      SET stage_no = @stageNo,
          stage_type = @stageType,
          name = @name,
          script_id = @scriptId,
          pool_type = @poolType,
          prompt_template_id = @promptTemplateId,
          config_json = @configJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      stageNo: input.stageNo ?? current.stageNo,
      stageType: input.stageType ?? current.stageType,
      name: input.name ?? current.name,
      scriptId: input.scriptId ?? current.scriptId,
      poolType: input.poolType ?? current.poolType,
      promptTemplateId: input.promptTemplateId ?? current.promptTemplateId,
      configJson: jsonString(input.config ?? current.config, {}),
      updatedAt: now()
    });

    return this.getStage(id);
  },

  deleteStage(id: string) {
    return db.prepare("DELETE FROM workflow_stages WHERE id = ?").run(id).changes > 0;
  }
};

