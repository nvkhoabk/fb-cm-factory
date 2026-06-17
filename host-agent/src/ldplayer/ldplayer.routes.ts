import { Router } from "express";
import { ldplayerClient } from "./ldplayer.client";
import { requireAgentApiKey } from "../security/api-key.middleware";

export const ldplayerRouter = Router();

function sendError(res: import("express").Response, error: unknown) {
  const message = error instanceof Error ? error.message : "LDPLAYER_ERROR";
  res.status(500).json({ ok: false, error: { code: "LDPLAYER_ERROR", message } });
}

ldplayerRouter.get("/instances", async (_req, res) => {
  try {
    res.json({ ok: true, data: await ldplayerClient.listLdInstances() });
  } catch (error) {
    sendError(res, error);
  }
});

ldplayerRouter.post("/instances/:localId/start", requireAgentApiKey, async (req, res) => {
  try {
    res.json({ ok: true, data: await ldplayerClient.startInstance(req.params.localId) });
  } catch (error) {
    sendError(res, error);
  }
});

ldplayerRouter.post("/instances/:localId/stop", requireAgentApiKey, async (req, res) => {
  try {
    res.json({ ok: true, data: await ldplayerClient.stopInstance(req.params.localId) });
  } catch (error) {
    sendError(res, error);
  }
});

ldplayerRouter.post("/instances/:localId/restart", requireAgentApiKey, async (req, res) => {
  try {
    res.json({ ok: true, data: await ldplayerClient.restartInstance(req.params.localId) });
  } catch (error) {
    sendError(res, error);
  }
});

ldplayerRouter.post("/instances/:localId/rename", requireAgentApiKey, async (req, res) => {
  try {
    const name = String(req.body?.name ?? "");
    if (!name) return res.status(400).json({ ok: false, error: { code: "NAME_REQUIRED", message: "name is required" } });
    res.json({ ok: true, data: await ldplayerClient.renameInstance(req.params.localId, name) });
  } catch (error) {
    sendError(res, error);
  }
});
