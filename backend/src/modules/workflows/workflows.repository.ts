import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type {
  CompleteWorkflowStageRunInput,
  CreateWorkflowInput,
  CreateWorkflowRunInput,
  CreateWorkflowStageInput,
  FailWorkflowStageRunInput,
  UpdateWorkflowInput,
  UpdateWorkflowStageInput,
  CapacityConfigInput,
  MusicPolicyInput,
  PostContentPolicyInput,
  WorkflowPromptMappingInput,
  WorkflowResourceRulesInput,
  WorkflowRunStatus,
  WorkflowScriptMappingInput
} from "./workflows.schemas";

function mapWorkflow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    status: row.status,
    mode: "RESOURCE_DRIVEN",
    capacityConfig: jsonParse(row.capacity_config_json, {}),
    musicPolicy: jsonParse(row.music_policy_json, {}),
    postContentPolicy: jsonParse(row.post_content_policy_json, {}),
    resourceRules: jsonParse(row.resource_rules_json, []),
    scriptMapping: jsonParse(row.script_mapping_json, {}),
    promptMapping: jsonParse(row.prompt_mapping_json, {}),
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

function mapWorkflowRun(row: Record<string, unknown>) {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status,
    input: jsonParse(row.input_json, {}),
    output: jsonParse(row.output_json, {}),
    capacityConfig: jsonParse(row.capacity_config_json, {}),
    currentStageNo: Number(row.current_stage_no ?? 0),
    errorMessage: row.error_message ?? null,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapWorkflowStageRun(row: Record<string, unknown>) {
  return {
    id: row.id,
    workflowRunId: row.workflow_run_id,
    workflowStageId: row.workflow_stage_id,
    stageNo: Number(row.stage_no),
    stageType: row.stage_type,
    status: row.status,
    input: jsonParse(row.input_json, {}),
    output: jsonParse(row.output_json, {}),
    errorMessage: row.error_message ?? null,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
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
        id, name, description, status, music_policy_json, post_content_policy_json,
        resource_rules_json, script_mapping_json, prompt_mapping_json, created_at, updated_at
      ) VALUES (
        @id, @name, @description, @status, @musicPolicyJson, @postContentPolicyJson,
        @resourceRulesJson, @scriptMappingJson, @promptMappingJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      musicPolicyJson: jsonString(input.musicPolicy ?? {}, {}),
      postContentPolicyJson: jsonString(input.postContentPolicy ?? {}, {}),
      resourceRulesJson: jsonString(input.resourceRules ?? [], []),
      scriptMappingJson: jsonString(input.scriptMapping ?? {}, {}),
      promptMappingJson: jsonString(input.promptMapping ?? {}, {}),
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
          music_policy_json = @musicPolicyJson,
          post_content_policy_json = @postContentPolicyJson,
          resource_rules_json = @resourceRulesJson,
          script_mapping_json = @scriptMappingJson,
          prompt_mapping_json = @promptMappingJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      status: input.status ?? current.status,
      musicPolicyJson: jsonString(input.musicPolicy ?? current.musicPolicy ?? {}, {}),
      postContentPolicyJson: jsonString(input.postContentPolicy ?? current.postContentPolicy ?? {}, {}),
      resourceRulesJson: jsonString(input.resourceRules ?? current.resourceRules ?? [], []),
      scriptMappingJson: jsonString(input.scriptMapping ?? current.scriptMapping ?? {}, {}),
      promptMappingJson: jsonString(input.promptMapping ?? current.promptMapping ?? {}, {}),
      updatedAt: now()
    });

    return this.get(id);
  },

  updateCapacity(id: string, capacityConfig: CapacityConfigInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflows
      SET capacity_config_json = @capacityConfigJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      capacityConfigJson: jsonString(capacityConfig, {}),
      updatedAt: now()
    });

    return this.get(id);
  },

  updateMusicPolicy(id: string, musicPolicy: MusicPolicyInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflows
      SET music_policy_json = @musicPolicyJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      musicPolicyJson: jsonString(musicPolicy, {}),
      updatedAt: now()
    });

    return this.get(id);
  },

  updatePostContentPolicy(id: string, postContentPolicy: PostContentPolicyInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflows
      SET post_content_policy_json = @postContentPolicyJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      postContentPolicyJson: jsonString(postContentPolicy, {}),
      updatedAt: now()
    });

    return this.get(id);
  },

  updateResourceRules(id: string, resourceRules: WorkflowResourceRulesInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflows
      SET resource_rules_json = @resourceRulesJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      resourceRulesJson: jsonString(resourceRules, []),
      updatedAt: now()
    });

    return this.get(id);
  },

  updateScriptMapping(id: string, scriptMapping: WorkflowScriptMappingInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflows
      SET script_mapping_json = @scriptMappingJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      scriptMappingJson: jsonString(scriptMapping, {}),
      updatedAt: now()
    });

    return this.get(id);
  },

  updatePromptMapping(id: string, promptMapping: WorkflowPromptMappingInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflows
      SET prompt_mapping_json = @promptMappingJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      promptMappingJson: jsonString(promptMapping, {}),
      updatedAt: now()
    });

    return this.get(id);
  },

  delete(id: string) {
    const transaction = db.transaction(() => {
      const runRows = db.prepare("SELECT id FROM workflow_runs WHERE workflow_id = ?").all(id) as Array<{ id: string }>;
      const stageRows = db.prepare("SELECT id FROM workflow_stages WHERE workflow_id = ?").all(id) as Array<{ id: string }>;
      const runIds = runRows.map((row) => row.id);
      const stageIds = stageRows.map((row) => row.id);

      for (const runId of runIds) {
        db.prepare("UPDATE instance_allocations SET workflow_run_id = NULL WHERE workflow_run_id = ?").run(runId);
        db.prepare("UPDATE production_batches SET workflow_run_id = NULL WHERE workflow_run_id = ?").run(runId);
        db.prepare("UPDATE production_batch_usage SET workflow_run_id = NULL WHERE workflow_run_id = ?").run(runId);
        db.prepare("UPDATE prompt_sets SET workflow_run_id = NULL WHERE workflow_run_id = ?").run(runId);
        db.prepare("UPDATE assets SET created_by_workflow_run_id = NULL WHERE created_by_workflow_run_id = ?").run(runId);
        db.prepare("UPDATE asset_relations SET workflow_run_id = NULL WHERE workflow_run_id = ?").run(runId);
        db.prepare("UPDATE asset_reservations SET workflow_run_id = NULL WHERE workflow_run_id = ?").run(runId);
        db.prepare("UPDATE instances SET current_workflow_run_id = NULL WHERE current_workflow_run_id = ?").run(runId);
        db.prepare("DELETE FROM workflow_stage_runs WHERE workflow_run_id = ?").run(runId);
      }

      for (const stageId of stageIds) {
        db.prepare("UPDATE assets SET created_by_stage_run_id = NULL WHERE created_by_stage_run_id = ?").run(stageId);
        db.prepare("UPDATE asset_relations SET stage_run_id = NULL WHERE stage_run_id = ?").run(stageId);
        db.prepare("UPDATE asset_reservations SET stage_run_id = NULL WHERE stage_run_id = ?").run(stageId);
        db.prepare("DELETE FROM workflow_stage_runs WHERE workflow_stage_id = ?").run(stageId);
      }

      db.prepare("UPDATE production_batches SET workflow_id = NULL WHERE workflow_id = ?").run(id);
      db.prepare("DELETE FROM workflow_runs WHERE workflow_id = ?").run(id);
      db.prepare("DELETE FROM workflow_stages WHERE workflow_id = ?").run(id);
      db.prepare("DELETE FROM workflow_versions WHERE workflow_id = ?").run(id);
      return db.prepare("DELETE FROM workflows WHERE id = ?").run(id).changes > 0;
    });

    return transaction();
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
  },

  listStages(workflowId: string) {
    return db.prepare("SELECT * FROM workflow_stages WHERE workflow_id = ? ORDER BY stage_no ASC")
      .all(workflowId)
      .map((row) => mapStage(row as Record<string, unknown>));
  },

  listRuns() {
    return db.prepare("SELECT * FROM workflow_runs ORDER BY created_at DESC")
      .all()
      .map((row) => mapWorkflowRun(row as Record<string, unknown>));
  },

  getRun(id: string) {
    const row = db.prepare("SELECT * FROM workflow_runs WHERE id = ?").get(id);
    return row ? mapWorkflowRun(row as Record<string, unknown>) : null;
  },

  listStageRuns(workflowRunId: string) {
    return db.prepare("SELECT * FROM workflow_stage_runs WHERE workflow_run_id = ? ORDER BY stage_no ASC")
      .all(workflowRunId)
      .map((row) => mapWorkflowStageRun(row as Record<string, unknown>));
  },

  getRunDetail(id: string) {
    const run = this.getRun(id);
    if (!run) return null;

    return {
      ...run,
      stageRuns: this.listStageRuns(id)
    };
  },

  updateRunCapacity(id: string, capacityConfig: CapacityConfigInput) {
    const current = this.getRun(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflow_runs
      SET capacity_config_json = @capacityConfigJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      capacityConfigJson: jsonString(capacityConfig, {}),
      updatedAt: now()
    });

    return this.getRunDetail(id);
  },

  listCapacityAllocations(workflowRunId: string) {
    return db.prepare(`
      SELECT * FROM instance_allocations
      WHERE workflow_run_id = ?
      ORDER BY allocated_at DESC
    `).all(workflowRunId).map((row) => {
      const record = row as Record<string, unknown>;
      return {
        id: record.id,
        instanceId: record.instance_id,
        hostId: record.host_id ?? null,
        localId: record.local_id ?? null,
        adbId: record.adb_id ?? null,
        workflowRunId: record.workflow_run_id ?? null,
        status: record.status,
        allocatedAt: record.allocated_at,
        releasedAt: record.released_at ?? null,
        metadata: jsonParse(record.metadata_json, {})
      };
    });
  },

  createRun(workflowId: string, input: CreateWorkflowRunInput) {
    const workflow = this.get(workflowId);
    if (!workflow) return null;

    const stages = this.listStages(workflowId);
    const createdAt = now();
    const id = createId("wfr");

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO workflow_runs (
          id, workflow_id, name, status, input_json, output_json,
          current_stage_no, error_message, created_at, updated_at
        ) VALUES (
          @id, @workflowId, @name, 'PENDING', @inputJson, '{}',
          0, NULL, @createdAt, @updatedAt
        )
      `).run({
        id,
        workflowId,
        name: `${workflow.name} Run`,
        inputJson: jsonString(input.input, {}),
        createdAt,
        updatedAt: createdAt
      });

      const insertStageRun = db.prepare(`
        INSERT INTO workflow_stage_runs (
          id, workflow_run_id, workflow_stage_id, stage_no, stage_type,
          status, input_json, output_json, created_at, updated_at
        ) VALUES (
          @id, @workflowRunId, @workflowStageId, @stageNo, @stageType,
          'PENDING', @inputJson, '{}', @createdAt, @updatedAt
        )
      `);

      for (const stage of stages) {
        insertStageRun.run({
          id: createId("wsr"),
          workflowRunId: id,
          workflowStageId: stage.id,
          stageNo: stage.stageNo,
          stageType: stage.stageType,
          inputJson: jsonString(input.input, {}),
          createdAt,
          updatedAt: createdAt
        });
      }
    });

    transaction();
    return this.getRunDetail(id);
  },

  updateRunStatus(
    id: string,
    status: WorkflowRunStatus,
    patch: {
      currentStageNo?: number;
      output?: Record<string, unknown>;
      errorMessage?: string | null;
      startedAt?: string | null;
      finishedAt?: string | null;
    } = {}
  ) {
    const current = this.getRun(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflow_runs
      SET status = @status,
          output_json = @outputJson,
          current_stage_no = @currentStageNo,
          error_message = @errorMessage,
          started_at = @startedAt,
          finished_at = @finishedAt,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      status,
      outputJson: jsonString(patch.output ?? current.output, {}),
      currentStageNo: patch.currentStageNo ?? current.currentStageNo,
      errorMessage: patch.errorMessage ?? current.errorMessage,
      startedAt: patch.startedAt === undefined ? current.startedAt : patch.startedAt,
      finishedAt: patch.finishedAt === undefined ? current.finishedAt : patch.finishedAt,
      updatedAt: now()
    });

    return this.getRunDetail(id);
  },

  getStageRun(id: string) {
    const row = db.prepare("SELECT * FROM workflow_stage_runs WHERE id = ?").get(id);
    return row ? mapWorkflowStageRun(row as Record<string, unknown>) : null;
  },

  getFirstStageRun(workflowRunId: string) {
    const row = db.prepare(`
      SELECT * FROM workflow_stage_runs
      WHERE workflow_run_id = ?
      ORDER BY stage_no ASC
      LIMIT 1
    `).get(workflowRunId);

    return row ? mapWorkflowStageRun(row as Record<string, unknown>) : null;
  },

  getNextStageRun(workflowRunId: string, stageNo: number) {
    const row = db.prepare(`
      SELECT * FROM workflow_stage_runs
      WHERE workflow_run_id = ? AND stage_no > ?
      ORDER BY stage_no ASC
      LIMIT 1
    `).get(workflowRunId, stageNo);

    return row ? mapWorkflowStageRun(row as Record<string, unknown>) : null;
  },

  updateStageRunStatus(
    id: string,
    status: WorkflowRunStatus,
    patch: {
      output?: CompleteWorkflowStageRunInput["output"];
      errorMessage?: FailWorkflowStageRunInput["errorMessage"] | null;
      startedAt?: string | null;
      finishedAt?: string | null;
    } = {}
  ) {
    const current = this.getStageRun(id);
    if (!current) return null;

    db.prepare(`
      UPDATE workflow_stage_runs
      SET status = @status,
          output_json = @outputJson,
          error_message = @errorMessage,
          started_at = @startedAt,
          finished_at = @finishedAt,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      status,
      outputJson: jsonString(patch.output ?? current.output, {}),
      errorMessage: patch.errorMessage ?? current.errorMessage,
      startedAt: patch.startedAt === undefined ? current.startedAt : patch.startedAt,
      finishedAt: patch.finishedAt === undefined ? current.finishedAt : patch.finishedAt,
      updatedAt: now()
    });

    return this.getStageRun(id);
  },

  cancelOpenStageRuns(workflowRunId: string) {
    const timestamp = now();
    db.prepare(`
      UPDATE workflow_stage_runs
      SET status = 'CANCELLED',
          finished_at = COALESCE(finished_at, @timestamp),
          updated_at = @timestamp
      WHERE workflow_run_id = @workflowRunId
        AND status IN ('PENDING', 'RUNNING', 'WAITING')
    `).run({
      workflowRunId,
      timestamp
    });
  }
};
