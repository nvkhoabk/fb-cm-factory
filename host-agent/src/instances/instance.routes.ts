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
    "TEXT_REQUIRED"
  ]);
  const code = knownCodes.has(errorName)
    ? errorName
    : message.includes("adbId") ? "ADB_ID_REQUIRED" : "INSTANCE_COMMAND_ERROR";
  res.status(code === "ADB_ID_REQUIRED" || code === "TEXT_REQUIRED" || code === "NO_MATCHING_FILE_FOUND" ? 400 : 500)
    .json({ ok: false, error: { code, message } });
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
        extensions: Array.isArray(req.body?.extensions) ? req.body.extensions.map(String) : undefined,
        targetFolder: typeof req.body?.targetFolder === "string" ? req.body.targetFolder : undefined
      })
    });
  } catch (error) {
    sendError(res, error);
  }
});
