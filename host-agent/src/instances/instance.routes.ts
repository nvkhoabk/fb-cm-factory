import { Router } from "express";
import { ldplayerClient } from "../ldplayer/ldplayer.client";
import { requireAgentApiKey } from "../security/api-key.middleware";
import { instanceCommands } from "./instance.commands";

export const instanceRouter = Router();

function sendError(res: import("express").Response, error: unknown) {
  const message = error instanceof Error ? error.message : "INSTANCE_COMMAND_ERROR";
  const errorName = error instanceof Error ? error.name : "";
  const knownCodes = new Set([
    "NO_MATCHING_FILE_FOUND",
    "ADB_KEYBOARD_NOT_AVAILABLE",
    "SEND_TEXT_FAILED",
    "TEXT_REQUIRED",
    "RUNTIME_CONTEXT_REQUIRED",
    "ASSET_ID_REQUIRED",
    "UPLOAD_FILE_NOT_FOUND",
    "INVALID_REMOTE_PATH",
    "INVALID_SCROLL_INPUT",
    "DOWNLOAD_OUTPUT_NOT_FOUND",
    "CLEAR_DOWNLOAD_FAILED"
  ]);
  const code = knownCodes.has(errorName)
    ? errorName
    : message.includes("adbId") ? "ADB_ID_REQUIRED" : "INSTANCE_COMMAND_ERROR";
  const detail = error && typeof error === "object" && "detail" in error
    ? (error as { detail?: unknown }).detail
    : undefined;
  res.status(code === "ADB_ID_REQUIRED" || code === "TEXT_REQUIRED" || code === "NO_MATCHING_FILE_FOUND" || code === "RUNTIME_CONTEXT_REQUIRED" || code === "ASSET_ID_REQUIRED" || code === "UPLOAD_FILE_NOT_FOUND" || code === "INVALID_REMOTE_PATH" || code === "INVALID_SCROLL_INPUT" || code === "DOWNLOAD_OUTPUT_NOT_FOUND" ? 400 : code === "CLEAR_DOWNLOAD_FAILED" ? 502 : 500)
    .json({ ok: false, error: { code, message, ...(detail === undefined ? {} : { detail }) } });
}

function numberBody(value: unknown, key: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${key} must be a number`);
  return parsed;
}

instanceRouter.get("/", async (_req, res) => {
  try {
    res.json({ ok: true, data: await ldplayerClient.listLdInstances() });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/screenshot", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.screenshot(String(req.body?.instanceId ?? req.params.localId), String(req.body?.adbId ?? ""))
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/live-screenshot", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.liveScreenshot(String(req.body?.instanceId ?? req.params.localId), String(req.body?.adbId ?? ""))
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/tap", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.tap({
        adbId: String(req.body?.adbId ?? ""),
        x: numberBody(req.body?.x, "x"),
        y: numberBody(req.body?.y, "y")
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/swipe", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.swipe({
        adbId: String(req.body?.adbId ?? ""),
        x1: numberBody(req.body?.x1, "x1"),
        y1: numberBody(req.body?.y1, "y1"),
        x2: numberBody(req.body?.x2, "x2"),
        y2: numberBody(req.body?.y2, "y2"),
        durationMs: req.body?.durationMs === undefined ? undefined : numberBody(req.body.durationMs, "durationMs")
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/long-press", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.longPress({
        adbId: String(req.body?.adbId ?? ""),
        x: numberBody(req.body?.x, "x"),
        y: numberBody(req.body?.y, "y"),
        durationMs: req.body?.durationMs === undefined ? undefined : numberBody(req.body.durationMs, "durationMs")
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/scroll-to-end", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.scrollToEnd({
        adbId: String(req.body?.adbId ?? ""),
        direction: req.body?.direction === "up" ? "up" : "down",
        iterations: req.body?.iterations === undefined ? undefined : numberBody(req.body.iterations, "iterations"),
        durationMs: req.body?.durationMs === undefined ? undefined : numberBody(req.body.durationMs, "durationMs"),
        pauseMs: req.body?.pauseMs === undefined ? undefined : numberBody(req.body.pauseMs, "pauseMs"),
        startX: req.body?.startX === undefined ? undefined : numberBody(req.body.startX, "startX"),
        startY: req.body?.startY === undefined ? undefined : numberBody(req.body.startY, "startY"),
        endX: req.body?.endX === undefined ? undefined : numberBody(req.body.endX, "endX"),
        endY: req.body?.endY === undefined ? undefined : numberBody(req.body.endY, "endY")
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/send-text", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.sendText({
        adbId: String(req.body?.adbId ?? ""),
        text: req.body?.text
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/send-key", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.sendKey({
        adbId: String(req.body?.adbId ?? ""),
        keyCode: req.body?.keyCode ?? ""
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/download-latest", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.downloadLatest({
        adbId: String(req.body?.adbId ?? ""),
        sourceDir: typeof req.body?.sourceDir === "string" ? req.body.sourceDir : undefined,
        sourceDirs: Array.isArray(req.body?.sourceDirs) ? req.body.sourceDirs.map(String) : undefined,
        extensions: Array.isArray(req.body?.extensions) ? req.body.extensions.map(String) : undefined,
        targetFolder: typeof req.body?.targetFolder === "string" ? req.body.targetFolder : undefined,
        deleteAfterPull: req.body?.deleteAfterPull === true
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/list-download-candidates", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.listDownloadCandidates({
        adbId: String(req.body?.adbId ?? ""),
        sourceDir: typeof req.body?.sourceDir === "string" ? req.body.sourceDir : undefined,
        sourceDirs: Array.isArray(req.body?.sourceDirs) ? req.body.sourceDirs.map(String) : undefined,
        extensions: Array.isArray(req.body?.extensions) ? req.body.extensions.map(String) : undefined
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/clear-download", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.clearDownload({
        adbId: String(req.body?.adbId ?? ""),
        sourceDir: typeof req.body?.sourceDir === "string" ? req.body.sourceDir : undefined,
        extensions: Array.isArray(req.body?.extensions) ? req.body.extensions.map(String) : undefined
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/push-upload-file", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.pushUploadFile({
        instanceId: typeof req.body?.instanceId === "string" ? req.body.instanceId : req.params.localId,
        adbId: String(req.body?.adbId ?? ""),
        runtimeSessionId: typeof req.body?.runtimeSessionId === "string" ? req.body.runtimeSessionId : undefined,
        jobId: typeof req.body?.jobId === "string" ? req.body.jobId : undefined,
        assetId: String(req.body?.assetId ?? ""),
        sourceAbsolutePath: String(req.body?.sourceAbsolutePath ?? ""),
        sourceBase64: typeof req.body?.sourceBase64 === "string" ? req.body.sourceBase64 : undefined,
        fileName: typeof req.body?.fileName === "string" ? req.body.fileName : undefined
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/open-file", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.openFile({
        adbId: String(req.body?.adbId ?? ""),
        remotePath: String(req.body?.remotePath ?? ""),
        mimeType: typeof req.body?.mimeType === "string" ? req.body.mimeType : undefined
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/cleanup-upload-session", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.cleanupUploadSession({
        adbId: String(req.body?.adbId ?? ""),
        runtimeSessionId: typeof req.body?.runtimeSessionId === "string" ? req.body.runtimeSessionId : ""
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/cleanup-upload-staging", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.cleanupUploadStaging({
        adbId: String(req.body?.adbId ?? ""),
        olderThanHours: req.body?.olderThanHours === undefined ? undefined : numberBody(req.body.olderThanHours, "olderThanHours")
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.post("/:localId/cleanup-factory-temp", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.cleanupFactoryTemp({
        adbId: String(req.body?.adbId ?? ""),
        olderThanHours: req.body?.olderThanHours === undefined ? undefined : numberBody(req.body.olderThanHours, "olderThanHours"),
        includeUploads: req.body?.includeUploads === undefined ? undefined : Boolean(req.body.includeUploads),
        includeLiveScreenshots: req.body?.includeLiveScreenshots === undefined ? undefined : Boolean(req.body.includeLiveScreenshots),
        includeDebugScreenshots: req.body?.includeDebugScreenshots === undefined ? undefined : Boolean(req.body.includeDebugScreenshots)
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});

instanceRouter.get("/:localId/factory-temp-usage", requireAgentApiKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      data: await instanceCommands.factoryTempUsage({
        adbId: String(req.query.adbId ?? "")
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});
