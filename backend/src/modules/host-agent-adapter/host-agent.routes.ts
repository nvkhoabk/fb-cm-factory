import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  createHostSchema,
  downloadLatestCommandSchema,
  instanceCommandSchema,
  sendKeyCommandSchema,
  sendTextCommandSchema,
  swipeCommandSchema,
  tapCommandSchema
} from "./host-agent.schemas";
import { hostAgentService } from "./host-agent.service";

export const hostAgentRouter = Router();

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

hostAgentRouter.get("/:id/health", async (req, res) => {
  try {
    res.json({ ok: true, data: await hostAgentService.healthCheckAgent(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/screenshot", async (req, res) => {
  try {
    const input = instanceCommandSchema.parse(req.body ?? {});
    res.json({ ok: true, data: await hostAgentService.takeScreenshot(req.params.id, input.instanceId) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/tap", async (req, res) => {
  try {
    const input = tapCommandSchema.parse(req.body ?? {});
    res.json({ ok: true, data: await hostAgentService.tap(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/swipe", async (req, res) => {
  try {
    const input = swipeCommandSchema.parse(req.body ?? {});
    res.json({ ok: true, data: await hostAgentService.swipe(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/send-text", async (req, res) => {
  try {
    const input = sendTextCommandSchema.parse(req.body ?? {});
    res.json({ ok: true, data: await hostAgentService.sendText(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/send-key", async (req, res) => {
  try {
    const input = sendKeyCommandSchema.parse(req.body ?? {});
    res.json({ ok: true, data: await hostAgentService.sendKey(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

hostAgentRouter.post("/:id/download-latest", async (req, res) => {
  try {
    const input = downloadLatestCommandSchema.parse(req.body ?? {});
    res.json({ ok: true, data: await hostAgentService.downloadLatest(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});
