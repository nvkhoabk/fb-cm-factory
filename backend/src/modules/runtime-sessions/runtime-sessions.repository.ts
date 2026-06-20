import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type {
  CreateRuntimeSessionInput,
  CreateRuntimeStepInput,
  UpdateRuntimeSessionInput,
  UpdateRuntimeStepInput
} from "./runtime-sessions.schemas";

function mapSession(row: Record<string, unknown>) {
  return {
    id: row.id,
    jobId: row.job_id ?? null,
    instanceId: row.instance_id ?? null,
    hostId: row.host_id ?? null,
    scriptId: row.script_id ?? null,
    status: row.status,
    currentStepNo: Number(row.current_step_no ?? 0),
    context: jsonParse(row.context_json, {}),
    checkpoint: jsonParse(row.checkpoint_json, {}),
    startedAt: row.started_at ?? null,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at ?? null
  };
}

function mapStep(row: Record<string, unknown>) {
  return {
    id: row.id,
    runtimeSessionId: row.runtime_session_id,
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

export const runtimeSessionsRepository = {
  listSessions() {
    return db.prepare("SELECT * FROM runtime_sessions ORDER BY updated_at DESC")
      .all()
      .map((row) => mapSession(row as Record<string, unknown>));
  },

  getSession(id: string) {
    const row = db.prepare("SELECT * FROM runtime_sessions WHERE id = ?").get(id);
    return row ? mapSession(row as Record<string, unknown>) : null;
  },

  deleteSession(id: string) {
    const transaction = db.transaction(() => {
      const runIds = db.prepare("SELECT id FROM script_runs WHERE runtime_session_id = ?").all(id) as Array<{ id: string }>;
      for (const run of runIds) {
        db.prepare("DELETE FROM script_run_steps WHERE script_run_id = ?").run(run.id);
      }
      db.prepare("DELETE FROM script_runs WHERE runtime_session_id = ?").run(id);
      db.prepare("DELETE FROM runtime_session_steps WHERE runtime_session_id = ?").run(id);
      return db.prepare("DELETE FROM runtime_sessions WHERE id = ?").run(id).changes > 0;
    });
    return transaction();
  },

  listSteps(runtimeSessionId: string) {
    return db.prepare(`
      SELECT * FROM runtime_session_steps
      WHERE runtime_session_id = ?
      ORDER BY step_no ASC
    `).all(runtimeSessionId).map((row) => mapStep(row as Record<string, unknown>));
  },

  getSessionDetail(id: string) {
    const session = this.getSession(id);
    if (!session) return null;

    return {
      ...session,
      steps: this.listSteps(id)
    };
  },

  createSession(input: CreateRuntimeSessionInput) {
    const timestamp = now();
    const id = createId("rts");

    db.prepare(`
      INSERT INTO runtime_sessions (
        id, job_id, instance_id, host_id, script_id, status, current_step_no,
        context_json, checkpoint_json, started_at, updated_at, finished_at
      ) VALUES (
        @id, @jobId, @instanceId, @hostId, @scriptId, @status, @currentStepNo,
        @contextJson, @checkpointJson, @startedAt, @updatedAt, @finishedAt
      )
    `).run({
      id,
      jobId: input.jobId ?? null,
      instanceId: input.instanceId ?? null,
      hostId: input.hostId ?? null,
      scriptId: input.scriptId ?? null,
      status: input.status,
      currentStepNo: input.currentStepNo,
      contextJson: jsonString(input.context, {}),
      checkpointJson: jsonString(input.checkpoint, {}),
      startedAt: input.status === "RUNNING" ? timestamp : null,
      updatedAt: timestamp,
      finishedAt: input.status === "COMPLETED" || input.status === "FAILED" ? timestamp : null
    });

    return this.getSessionDetail(id);
  },

  updateSession(id: string, input: UpdateRuntimeSessionInput) {
    const current = this.getSession(id);
    if (!current) return null;

    const status = input.status ?? String(current.status);
    const timestamp = now();

    db.prepare(`
      UPDATE runtime_sessions
      SET status = @status,
          script_id = @scriptId,
          host_id = @hostId,
          instance_id = @instanceId,
          current_step_no = @currentStepNo,
          context_json = @contextJson,
          checkpoint_json = @checkpointJson,
          started_at = @startedAt,
          updated_at = @updatedAt,
          finished_at = @finishedAt
      WHERE id = @id
    `).run({
      id,
      status,
      scriptId: input.scriptId === undefined ? current.scriptId : input.scriptId,
      hostId: input.hostId === undefined ? current.hostId : input.hostId,
      instanceId: input.instanceId === undefined ? current.instanceId : input.instanceId,
      currentStepNo: input.currentStepNo ?? current.currentStepNo,
      contextJson: jsonString(input.context ?? current.context, {}),
      checkpointJson: jsonString(input.checkpoint ?? current.checkpoint, {}),
      startedAt: input.startedAt === undefined
        ? (status === "RUNNING" && !current.startedAt ? timestamp : current.startedAt)
        : input.startedAt,
      updatedAt: timestamp,
      finishedAt: input.finishedAt === undefined
        ? (status === "COMPLETED" || status === "FAILED" ? current.finishedAt ?? timestamp : current.finishedAt)
        : input.finishedAt
    });

    return this.getSessionDetail(id);
  },

  createStep(runtimeSessionId: string, input: CreateRuntimeStepInput) {
    const id = createId("rtstep");
    const timestamp = now();

    db.prepare(`
      INSERT INTO runtime_session_steps (
        id, runtime_session_id, step_no, step_type, status, input_json,
        output_json, error_message, started_at, finished_at
      ) VALUES (
        @id, @runtimeSessionId, @stepNo, @stepType, @status, @inputJson,
        @outputJson, NULL, @startedAt, @finishedAt
      )
    `).run({
      id,
      runtimeSessionId,
      stepNo: input.stepNo,
      stepType: input.stepType,
      status: input.status,
      inputJson: jsonString(input.input, {}),
      outputJson: jsonString(input.output, {}),
      startedAt: input.status === "RUNNING" ? timestamp : null,
      finishedAt: input.status === "COMPLETED" || input.status === "FAILED" ? timestamp : null
    });

    const row = db.prepare("SELECT * FROM runtime_session_steps WHERE id = ?").get(id);
    return mapStep(row as Record<string, unknown>);
  },

  getStep(id: string) {
    const row = db.prepare("SELECT * FROM runtime_session_steps WHERE id = ?").get(id);
    return row ? mapStep(row as Record<string, unknown>) : null;
  },

  updateStep(id: string, input: UpdateRuntimeStepInput) {
    const current = this.getStep(id);
    if (!current) return null;

    const status = input.status ?? String(current.status);
    const timestamp = now();

    db.prepare(`
      UPDATE runtime_session_steps
      SET status = @status,
          output_json = @outputJson,
          error_message = @errorMessage,
          started_at = @startedAt,
          finished_at = @finishedAt
      WHERE id = @id
    `).run({
      id,
      status,
      outputJson: jsonString(input.output ?? current.output, {}),
      errorMessage: input.errorMessage === undefined ? current.errorMessage : input.errorMessage,
      startedAt: input.startedAt === undefined
        ? (status === "RUNNING" && !current.startedAt ? timestamp : current.startedAt)
        : input.startedAt,
      finishedAt: input.finishedAt === undefined
        ? (status === "COMPLETED" || status === "FAILED" ? current.finishedAt ?? timestamp : current.finishedAt)
        : input.finishedAt
    });

    return this.getStep(id);
  }
};
