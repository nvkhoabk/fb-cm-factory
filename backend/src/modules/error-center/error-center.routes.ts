import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  attachRecoveryScriptSchema,
  createScreenTemplateFromErrorSchema,
  updateErrorEventSchema
} from "./error-center.schemas";
import { errorCenterService } from "./error-center.service";

export const errorCenterRouter = Router();
export const errorEventsRouter = Router();

errorCenterRouter.get("/events", (req, res) => {
  res.json({ ok: true, data: errorCenterService.listEvents(req.query as Record<string, unknown>) });
});

errorCenterRouter.get("/kpis", (_req, res) => {
  res.json({ ok: true, data: errorCenterService.kpis() });
});

errorCenterRouter.get("/recovery-rules", (_req, res) => {
  res.json({ ok: true, data: errorCenterService.listRecoveryRules() });
});

errorCenterRouter.get("/events/:id", (req, res) => {
  try {
    res.json({ ok: true, data: errorCenterService.getEvent(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

errorCenterRouter.patch("/events/:id", (req, res) => {
  try {
    res.json({ ok: true, data: errorCenterService.updateEvent(req.params.id, updateErrorEventSchema.parse(req.body)) });
  } catch (error) {
    sendError(res, error);
  }
});

errorCenterRouter.post("/events/:id/screen-template", (req, res) => {
  try {
    res.status(201).json({
      ok: true,
      data: errorCenterService.createScreenTemplateFromError(req.params.id, createScreenTemplateFromErrorSchema.parse(req.body))
    });
  } catch (error) {
    sendError(res, error);
  }
});

errorCenterRouter.post("/events/:id/recovery-script", (req, res) => {
  try {
    res.status(201).json({
      ok: true,
      data: errorCenterService.attachRecoveryScript(req.params.id, attachRecoveryScriptSchema.parse(req.body))
    });
  } catch (error) {
    sendError(res, error);
  }
});

errorEventsRouter.get("/", (req, res) => {
  res.json({ ok: true, data: errorCenterService.listEvents(req.query as Record<string, unknown>) });
});

errorEventsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: errorCenterService.getEvent(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

errorEventsRouter.patch("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: errorCenterService.updateEvent(req.params.id, updateErrorEventSchema.parse(req.body)) });
  } catch (error) {
    sendError(res, error);
  }
});

errorEventsRouter.post("/:id/create-screen-template", (req, res) => {
  try {
    res.status(201).json({
      ok: true,
      data: errorCenterService.createScreenTemplateFromError(req.params.id, createScreenTemplateFromErrorSchema.parse(req.body))
    });
  } catch (error) {
    sendError(res, error);
  }
});

errorEventsRouter.post("/:id/attach-recovery-script", (req, res) => {
  try {
    res.status(201).json({
      ok: true,
      data: errorCenterService.attachRecoveryScript(req.params.id, attachRecoveryScriptSchema.parse(req.body))
    });
  } catch (error) {
    sendError(res, error);
  }
});

errorEventsRouter.post("/:id/resolve", (req, res) => {
  try {
    res.json({
      ok: true,
      data: errorCenterService.updateEvent(req.params.id, { status: "RESOLVED", resolutionType: "MANUAL" })
    });
  } catch (error) {
    sendError(res, error);
  }
});

errorEventsRouter.post("/:id/ignore", (req, res) => {
  try {
    res.json({
      ok: true,
      data: errorCenterService.updateEvent(req.params.id, { status: "IGNORED" })
    });
  } catch (error) {
    sendError(res, error);
  }
});
