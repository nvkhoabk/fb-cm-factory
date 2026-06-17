import { Router } from "express";
import { adbClient } from "./adb.client";
import { requireAgentApiKey } from "../security/api-key.middleware";

export const adbRouter = Router();

function sendError(res: import("express").Response, error: unknown) {
  const message = error instanceof Error ? error.message : "ADB_ERROR";
  res.status(500).json({ ok: false, error: { code: "ADB_ERROR", message } });
}

adbRouter.get("/devices", async (_req, res) => {
  try {
    res.json({ ok: true, data: await adbClient.getAdbDevices() });
  } catch (error) {
    sendError(res, error);
  }
});

adbRouter.post("/test", requireAgentApiKey, async (req, res) => {
  try {
    const adbId = String(req.body?.adbId ?? "");
    if (!adbId) return res.status(400).json({ ok: false, error: { code: "ADB_ID_REQUIRED", message: "adbId is required" } });
    res.json({ ok: true, data: await adbClient.testAdb(adbId) });
  } catch (error) {
    sendError(res, error);
  }
});

adbRouter.post("/reconnect", requireAgentApiKey, async (req, res) => {
  try {
    const adbId = String(req.body?.adbId ?? "");
    if (!adbId) return res.status(400).json({ ok: false, error: { code: "ADB_ID_REQUIRED", message: "adbId is required" } });
    res.json({ ok: true, data: await adbClient.connectAdb(adbId) });
  } catch (error) {
    sendError(res, error);
  }
});
