import { Router } from "express";
import { sendError } from "../shared/resource";
import { instancesService } from "./instances.service";

export const instancesRouter = Router();

instancesRouter.get("/", (req, res) => {
  res.json({
    ok: true,
    data: instancesService.list({
      hostId: typeof req.query.hostId === "string" ? req.query.hostId : undefined,
      currentPoolType: typeof req.query.currentPoolType === "string" ? req.query.currentPoolType : undefined,
      runtimeStatus: typeof req.query.runtimeStatus === "string" ? req.query.runtimeStatus : undefined,
      capability: typeof req.query.capability === "string" ? req.query.capability : undefined
    })
  });
});

instancesRouter.get("/standby", (_req, res) => {
  res.json({ ok: true, data: instancesService.listStandby() });
});

instancesRouter.get("/maintenance", (_req, res) => {
  res.json({ ok: true, data: instancesService.listMaintenance() });
});

instancesRouter.get("/:id", (req, res) => {
  try {
    const instance = instancesService.get(req.params.id);
    if (!instance) return res.status(404).json({ ok: false, error: { code: "INSTANCE_NOT_FOUND", message: "Instance not found" } });
    res.json({ ok: true, data: instance });
  } catch (error) {
    sendError(res, error);
  }
});

instancesRouter.patch("/:id/capabilities", (req, res) => {
  try {
    const capabilities = req.body && typeof req.body === "object" ? req.body : {};
    res.json({ ok: true, data: instancesService.updateCapabilities(req.params.id, capabilities) });
  } catch (error) {
    sendError(res, error);
  }
});

instancesRouter.post("/:id/move-available", (req, res) => {
  try {
    res.json({ ok: true, data: instancesService.moveToPoolState(req.params.id, "AVAILABLE") });
  } catch (error) {
    sendError(res, error);
  }
});

instancesRouter.post("/:id/move-standby", (req, res) => {
  try {
    res.json({ ok: true, data: instancesService.moveToPoolState(req.params.id, "STANDBY") });
  } catch (error) {
    sendError(res, error);
  }
});

instancesRouter.post("/:id/move-maintenance", (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body as { reason?: unknown } : {};
    const reason = typeof body.reason === "string" ? body.reason : null;
    res.json({ ok: true, data: instancesService.moveToPoolState(req.params.id, "MAINTENANCE", reason) });
  } catch (error) {
    sendError(res, error);
  }
});

instancesRouter.post("/:id/disable", (req, res) => {
  try {
    res.json({ ok: true, data: instancesService.moveToPoolState(req.params.id, "DISABLED") });
  } catch (error) {
    sendError(res, error);
  }
});

instancesRouter.post("/:id/retire", (req, res) => {
  try {
    res.json({ ok: true, data: instancesService.moveToPoolState(req.params.id, "RETIRED") });
  } catch (error) {
    sendError(res, error);
  }
});
