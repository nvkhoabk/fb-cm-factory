import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type {
  CreateScriptInput,
  CreateScriptVersionInput,
  ScriptRunStatus
} from "./script-runtime.schemas";

function mapScript(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapScriptVersion(row: Record<string, unknown>) {
  return {
    id: row.id,
    scriptId: row.script_id,
    versionNo: Number(row.version_no),
    status: row.status,
    definition: jsonParse(row.definition_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapScriptRun(row: Record<string, unknown>) {
  return {
    id: row.id,
    runtimeSessionId: row.runtime_session_id,
    scriptId: row.script_id,
    scriptVersionId: row.script_version_id,
    status: row.status,
    currentStepNo: Number(row.current_step_no ?? 0),
    context: jsonParse(row.context_json, {}),
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null
  };
}

function mapScriptRunStep(row: Record<string, unknown>) {
  return {
    id: row.id,
    scriptRunId: row.script_run_id,
    stepNo: Number(row.step_no),
    stepType: row.step_type,
    status: row.status,
    input: jsonParse(row.input_json, {}),
    output: jsonParse(row.output_json, {}),
    errorMessage: row.error_message ?? null,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null
  };
}

export const scriptRuntimeRepository = {
  listScripts() {
    return db.prepare("SELECT * FROM scripts ORDER BY created_at DESC")
      .all()
      .map((row) => mapScript(row as Record<string, unknown>));
  },

  createScript(input: CreateScriptInput) {
    const id = createId("scr");
    const timestamp = now();

    db.prepare(`
      INSERT INTO scripts (id, name, status, created_at, updated_at)
      VALUES (@id, @name, @status, @createdAt, @updatedAt)
    `).run({
      id,
      name: input.name,
      status: input.status,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return this.getScript(id);
  },

  getScript(id: string) {
    const row = db.prepare("SELECT * FROM scripts WHERE id = ?").get(id);
    return row ? mapScript(row as Record<string, unknown>) : null;
  },

  nextVersionNo(scriptId: string) {
    const row = db.prepare("SELECT COALESCE(MAX(version_no), 0) + 1 AS next FROM script_versions WHERE script_id = ?")
      .get(scriptId) as { next: number };
    return row.next;
  },

  createScriptVersion(scriptId: string, input: CreateScriptVersionInput) {
    const id = createId("scrv");
    const timestamp = now();
    const versionNo = input.versionNo ?? this.nextVersionNo(scriptId);

    db.prepare(`
      INSERT INTO script_versions (
        id, script_id, version_no, status, definition_json, created_at, updated_at
      ) VALUES (
        @id, @scriptId, @versionNo, @status, @definitionJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      scriptId,
      versionNo,
      status: input.status,
      definitionJson: jsonString(input.definition, {}),
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return this.getScriptVersion(id);
  },

  getScriptVersion(id: string) {
    const row = db.prepare("SELECT * FROM script_versions WHERE id = ?").get(id);
    return row ? mapScriptVersion(row as Record<string, unknown>) : null;
  },

  getLatestScriptVersion(scriptId: string) {
    const row = db.prepare(`
      SELECT * FROM script_versions
      WHERE script_id = ?
      ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, version_no DESC
      LIMIT 1
    `).get(scriptId);

    return row ? mapScriptVersion(row as Record<string, unknown>) : null;
  },

  getLatestActiveScript() {
    const row = db.prepare(`
      SELECT * FROM scripts
      WHERE UPPER(status) = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    return row ? mapScript(row as Record<string, unknown>) : null;
  },

  listScriptRuns() {
    return db.prepare("SELECT * FROM script_runs ORDER BY started_at DESC, id DESC")
      .all()
      .map((row) => mapScriptRun(row as Record<string, unknown>));
  },

  getScriptRun(id: string) {
    const row = db.prepare("SELECT * FROM script_runs WHERE id = ?").get(id);
    return row ? mapScriptRun(row as Record<string, unknown>) : null;
  },

  listScriptRunSteps(scriptRunId: string) {
    return db.prepare(`
      SELECT * FROM script_run_steps
      WHERE script_run_id = ?
      ORDER BY step_no ASC
    `).all(scriptRunId).map((row) => mapScriptRunStep(row as Record<string, unknown>));
  },

  getScriptRunDetail(id: string) {
    const run = this.getScriptRun(id);
    if (!run) return null;

    return {
      ...run,
      steps: this.listScriptRunSteps(id)
    };
  },

  createScriptRun(input: {
    runtimeSessionId: string;
    scriptId: string;
    scriptVersionId: string;
    context: Record<string, unknown>;
  }) {
    const id = createId("srun");
    const timestamp = now();

    db.prepare(`
      INSERT INTO script_runs (
        id, runtime_session_id, script_id, script_version_id, status,
        current_step_no, context_json, started_at, finished_at
      ) VALUES (
        @id, @runtimeSessionId, @scriptId, @scriptVersionId, 'PENDING',
        0, @contextJson, @startedAt, NULL
      )
    `).run({
      id,
      runtimeSessionId: input.runtimeSessionId,
      scriptId: input.scriptId,
      scriptVersionId: input.scriptVersionId,
      contextJson: jsonString(input.context, {}),
      startedAt: timestamp
    });

    return this.getScriptRunDetail(id);
  },

  updateScriptRun(id: string, input: {
    status?: ScriptRunStatus;
    currentStepNo?: number;
    context?: Record<string, unknown>;
    finishedAt?: string | null;
  }) {
    const current = this.getScriptRun(id);
    if (!current) return null;

    db.prepare(`
      UPDATE script_runs
      SET status = @status,
          current_step_no = @currentStepNo,
          context_json = @contextJson,
          finished_at = @finishedAt
      WHERE id = @id
    `).run({
      id,
      status: input.status ?? current.status,
      currentStepNo: input.currentStepNo ?? current.currentStepNo,
      contextJson: jsonString(input.context ?? current.context, {}),
      finishedAt: input.finishedAt === undefined ? current.finishedAt : input.finishedAt
    });

    return this.getScriptRunDetail(id);
  },

  createScriptRunStep(input: {
    scriptRunId: string;
    stepNo: number;
    stepType: string;
    status: ScriptRunStatus;
    input: Record<string, unknown>;
  }) {
    const id = createId("srstep");
    const timestamp = now();

    db.prepare(`
      INSERT INTO script_run_steps (
        id, script_run_id, step_no, step_type, status, input_json,
        output_json, error_message, started_at, finished_at
      ) VALUES (
        @id, @scriptRunId, @stepNo, @stepType, @status, @inputJson,
        '{}', NULL, @startedAt, NULL
      )
    `).run({
      id,
      scriptRunId: input.scriptRunId,
      stepNo: input.stepNo,
      stepType: input.stepType,
      status: input.status,
      inputJson: jsonString(input.input, {}),
      startedAt: timestamp
    });

    return this.getScriptRunStep(id);
  },

  getScriptRunStep(id: string) {
    const row = db.prepare("SELECT * FROM script_run_steps WHERE id = ?").get(id);
    return row ? mapScriptRunStep(row as Record<string, unknown>) : null;
  },

  updateScriptRunStep(id: string, input: {
    status: ScriptRunStatus;
    output?: Record<string, unknown>;
    errorMessage?: string | null;
  }) {
    const current = this.getScriptRunStep(id);
    if (!current) return null;
    const timestamp = now();

    db.prepare(`
      UPDATE script_run_steps
      SET status = @status,
          output_json = @outputJson,
          error_message = @errorMessage,
          finished_at = @finishedAt
      WHERE id = @id
    `).run({
      id,
      status: input.status,
      outputJson: jsonString(input.output ?? current.output, {}),
      errorMessage: input.errorMessage ?? current.errorMessage,
      finishedAt: input.status === "COMPLETED" || input.status === "FAILED" ? timestamp : current.finishedAt
    });

    return this.getScriptRunStep(id);
  }
};
