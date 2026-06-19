import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  createScriptSchema,
  createScriptVersionSchema,
  runScriptSchema,
  testRunScriptSchema,
  updateScriptSchema,
  updateScriptVersionSchema
} from "./script-runtime.schemas";
import { scriptRuntimeService } from "./script-runtime.service";

export const scriptsRouter = Router();
export const scriptVersionsRouter = Router();
export const scriptRunsRouter = Router();

scriptsRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: scriptRuntimeService.listScripts() });
});

scriptsRouter.post("/", (req, res) => {
  try {
    const input = createScriptSchema.parse(req.body ?? {});
    res.status(201).json({ ok: true, data: scriptRuntimeService.createScript(input) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: scriptRuntimeService.getScript(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptsRouter.patch("/:id", (req, res) => {
  try {
    const input = updateScriptSchema.parse(req.body ?? {});
    res.json({ ok: true, data: scriptRuntimeService.updateScript(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptsRouter.get("/:id/versions", (req, res) => {
  try {
    res.json({ ok: true, data: scriptRuntimeService.listScriptVersions(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptsRouter.post("/:id/versions", (req, res) => {
  try {
    const input = createScriptVersionSchema.parse(req.body ?? {});
    res.status(201).json({ ok: true, data: scriptRuntimeService.createScriptVersion(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptsRouter.post("/:id/test-run", async (req, res) => {
  try {
    const input = testRunScriptSchema.parse(req.body ?? {});
    res.status(201).json({ ok: true, data: await scriptRuntimeService.testRunScript(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptVersionsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: scriptRuntimeService.getScriptVersion(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptVersionsRouter.patch("/:id", (req, res) => {
  try {
    const input = updateScriptVersionSchema.parse(req.body ?? {});
    res.json({ ok: true, data: scriptRuntimeService.updateScriptVersion(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptVersionsRouter.post("/:id/activate", (req, res) => {
  try {
    res.json({ ok: true, data: scriptRuntimeService.activateScriptVersion(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptRunsRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: scriptRuntimeService.listScriptRuns() });
});

scriptRunsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: scriptRuntimeService.getScriptRun(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptRunsRouter.get("/:id/steps", (req, res) => {
  try {
    res.json({ ok: true, data: scriptRuntimeService.listScriptRunSteps(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

scriptRunsRouter.post("/:id/resume", async (req, res) => {
  try {
    res.json({ ok: true, data: await scriptRuntimeService.resumeScriptRun(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

export function createRuntimeScriptRouter() {
  const router = Router();

  router.post("/:id/run-script", async (req, res) => {
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
      res.status(201).json({ ok: true, data: await scriptRuntimeService.executeScriptRun(String(run.id)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
