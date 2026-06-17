import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  createRuntimeSessionSchema,
  createRuntimeStepSchema,
  saveRuntimeCheckpointSchema,
  updateRuntimeSessionSchema,
  updateRuntimeStepSchema
} from "./runtime-sessions.schemas";
import { hostAgentService } from "../host-agent-adapter/host-agent.service";
import { runScriptSchema } from "../script-runtime/script-runtime.schemas";
import { scriptRuntimeService } from "../script-runtime/script-runtime.service";
import { runtimeSessionsService } from "./runtime-sessions.service";

export const runtimeSessionsRouter = Router();

runtimeSessionsRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: runtimeSessionsService.listSessions() });
});

runtimeSessionsRouter.post("/", (req, res) => {
  try {
    const input = createRuntimeSessionSchema.parse(req.body ?? {});
    res.status(201).json({ ok: true, data: runtimeSessionsService.createRuntimeSession(input) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: runtimeSessionsService.getSession(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.patch("/:id", (req, res) => {
  try {
    const input = updateRuntimeSessionSchema.parse(req.body ?? {});
    res.json({ ok: true, data: runtimeSessionsService.updateRuntimeSession(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.get("/:id/steps", (req, res) => {
  try {
    res.json({ ok: true, data: runtimeSessionsService.listSteps(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.post("/:id/steps", (req, res) => {
  try {
    const input = createRuntimeStepSchema.parse(req.body ?? {});
    res.status(201).json({ ok: true, data: runtimeSessionsService.createRuntimeStep(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.patch("/steps/:stepId", (req, res) => {
  try {
    const input = updateRuntimeStepSchema.parse(req.body ?? {});
    res.json({ ok: true, data: runtimeSessionsService.updateRuntimeStep(req.params.stepId, input) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.post("/:id/pause", (req, res) => {
  try {
    res.json({ ok: true, data: runtimeSessionsService.pauseSession(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.post("/:id/resume", (req, res) => {
  try {
    res.json({ ok: true, data: runtimeSessionsService.resumeSession(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.post("/:id/checkpoint", (req, res) => {
  try {
    const input = saveRuntimeCheckpointSchema.parse(req.body ?? {});
    res.json({ ok: true, data: runtimeSessionsService.saveCheckpoint(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.post("/:id/test-screenshot", async (req, res) => {
  try {
    res.json({ ok: true, data: await hostAgentService.testRuntimeScreenshot(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeSessionsRouter.post("/:id/run-script", async (req, res) => {
  try {
    const input = runScriptSchema.parse(req.body ?? {});
    const run = scriptRuntimeService.createScriptRun(req.params.id, input);
    if (!run) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "SCRIPT_RUN_CREATE_FAILED",
          message: "Could not create script run"
        }
      });
    }
    return res.status(201).json({ ok: true, data: await scriptRuntimeService.executeScriptRun(String(run.id)) });
  } catch (error) {
    return sendError(res, error);
  }
});
