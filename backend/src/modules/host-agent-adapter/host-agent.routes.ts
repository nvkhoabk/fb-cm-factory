import { Router } from "express";
import { ZodError, type z } from "zod";
import { sendError } from "../shared/resource";
import {
  createHostSchema,
  clearDownloadCommandSchema,
  cleanupOldTempCommandSchema,
  cleanupUploadSessionCommandSchema,
  downloadLatestCommandSchema,
  instanceCommandSchema,
  listDownloadCandidatesCommandSchema,
  liveScreenshotCommandSchema,
  longPressCommandSchema,
  openFileCommandSchema,
  pushUploadFileCommandSchema,
  scrollToEndCommandSchema,
  sendKeyCommandSchema,
  sendTextCommandSchema,
  swipeCommandSchema,
  tapCommandSchema
} from "./host-agent.schemas";
import { hostAgentService } from "./host-agent.service";

export const hostAgentRouter = Router();

function parseCommand<T>(schema: z.ZodType<T>, body: unknown) {
  try {
    return schema.parse(body ?? {});
  } catch (error) {
    if (error instanceof ZodError && error.issues.some((issue) => issue.path.includes("adbId"))) {
      const adbIdError = new Error("adbId is required");
      adbIdError.name = "ADB_ID_REQUIRED";
      throw adbIdError;
    }
    throw error;
  }
}

function sendHostAgentError(res: import("express").Response, error: unknown) {
  if (error instanceof Error && error.name === "ADB_ID_REQUIRED") {
    return res.status(400).json({
      ok: false,
      error: {
        code: "ADB_ID_REQUIRED",
        message: "adbId is required"
      }
    });
  }

  return sendError(res, error);
}

hostAgentRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: hostAgentService.listHosts() });
});

hostAgentRouter.post("/", (req, res) => {
  try {
    const input = createHostSchema.parse(req.body ?? {});
    res.status(201).json({ ok: true, data: hostAgentService.createHost(input) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.delete("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: hostAgentService.deleteHost(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.get("/:id/health", async (req, res) => {
  try {
    res.json({ ok: true, data: await hostAgentService.healthCheckAgent(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.get("/:id/adb-devices", async (req, res) => {
  try {
    res.json({ ok: true, data: await hostAgentService.listAdbDevices(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/sync-instances", async (req, res) => {
  try {
    res.json({ ok: true, data: await hostAgentService.syncInstances(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:localId/start", async (req, res) => {
  try {
    res.json({ ok: true, data: await hostAgentService.startInstance(req.params.id, req.params.localId) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:localId/stop", async (req, res) => {
  try {
    res.json({ ok: true, data: await hostAgentService.stopInstance(req.params.id, req.params.localId) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:localId/restart", async (req, res) => {
  try {
    res.json({ ok: true, data: await hostAgentService.restartInstance(req.params.id, req.params.localId) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/screenshot", async (req, res) => {
  try {
    const input = parseCommand(instanceCommandSchema, req.body);
    res.json({ ok: true, data: await hostAgentService.takeScreenshot(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/live-screenshot", async (req, res) => {
  try {
    const input = parseCommand(liveScreenshotCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.takeLiveScreenshot(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/tap", async (req, res) => {
  try {
    const input = parseCommand(tapCommandSchema, req.body);
    res.json({ ok: true, data: await hostAgentService.tap(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/swipe", async (req, res) => {
  try {
    const input = parseCommand(swipeCommandSchema, req.body);
    res.json({ ok: true, data: await hostAgentService.swipe(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/long-press", async (req, res) => {
  try {
    const input = parseCommand(longPressCommandSchema.extend({
      localId: liveScreenshotCommandSchema.shape.localId
    }), {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.longPress(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/scroll-to-end", async (req, res) => {
  try {
    const input = parseCommand(scrollToEndCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.scrollToEnd(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/send-text", async (req, res) => {
  try {
    const input = parseCommand(sendTextCommandSchema, req.body);
    res.json({ ok: true, data: await hostAgentService.sendText(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/send-key", async (req, res) => {
  try {
    const input = parseCommand(sendKeyCommandSchema, req.body);
    res.json({ ok: true, data: await hostAgentService.sendKey(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/download-latest", async (req, res) => {
  try {
    const input = parseCommand(downloadLatestCommandSchema, req.body);
    res.json({ ok: true, data: await hostAgentService.downloadLatest(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/download-latest", async (req, res) => {
  try {
    const input = parseCommand(downloadLatestCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.downloadLatest(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/list-download-candidates", async (req, res) => {
  try {
    const input = parseCommand(listDownloadCandidatesCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.listDownloadCandidates(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/clear-download", async (req, res) => {
  try {
    const input = parseCommand(clearDownloadCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.clearDownload(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/push-upload-file", async (req, res) => {
  try {
    const input = parseCommand(pushUploadFileCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.pushUploadFile(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/open-file", async (req, res) => {
  try {
    const input = parseCommand(openFileCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.openFile(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/cleanup-upload-session", async (req, res) => {
  try {
    const input = parseCommand(cleanupUploadSessionCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.cleanupUploadSession(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/cleanup-upload-staging", async (req, res) => {
  try {
    const input = parseCommand(cleanupOldTempCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.cleanupUploadStaging(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.post("/:id/instances/:instanceId/cleanup-factory-temp", async (req, res) => {
  try {
    const input = parseCommand(cleanupOldTempCommandSchema, {
      ...(req.body ?? {}),
      instanceId: req.params.instanceId
    });
    res.json({ ok: true, data: await hostAgentService.cleanupFactoryTemp(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});

hostAgentRouter.get("/:id/instances/:instanceId/factory-temp-usage", async (req, res) => {
  try {
    const input = parseCommand(instanceCommandSchema, {
      instanceId: req.params.instanceId,
      adbId: req.query.adbId
    });
    res.json({ ok: true, data: await hostAgentService.factoryTempUsage(req.params.id, input) });
  } catch (error) {
    sendHostAgentError(res, error);
  }
});
