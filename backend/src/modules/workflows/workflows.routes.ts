import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  completeWorkflowStageRunSchema,
  capacityConfigSchema,
  createWorkflowSchema,
  createWorkflowRunSchema,
  createWorkflowStageSchema,
  failWorkflowStageRunSchema,
  updateWorkflowSchema,
  updateWorkflowStageSchema
} from "./workflows.schemas";
import { workflowsService } from "./workflows.service";

export const workflowsRouter = Router();
export const workflowRunsRouter = Router();
export const workflowStagesRouter = Router();

workflowsRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: workflowsService.list() });
});

workflowsRouter.post("/", (req, res) => {
  try {
    const input = createWorkflowSchema.parse(req.body);
    res.status(201).json({ ok: true, data: workflowsService.create(input) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: workflowsService.get(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowsRouter.patch("/:id", (req, res) => {
  try {
    const input = updateWorkflowSchema.parse(req.body);
    res.json({ ok: true, data: workflowsService.update(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowsRouter.patch("/:id/capacity", (req, res) => {
  try {
    const input = capacityConfigSchema.parse(req.body ?? {});
    res.json({ ok: true, data: workflowsService.updateCapacity(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowsRouter.delete("/:id", (req, res) => {
  try {
    workflowsService.delete(req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

workflowsRouter.post("/:id/stages", (req, res) => {
  try {
    const input = createWorkflowStageSchema.parse(req.body);
    res.status(201).json({ ok: true, data: workflowsService.createStage(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowsRouter.post("/:id/run", (req, res) => {
  try {
    const input = createWorkflowRunSchema.parse(req.body);
    res.status(201).json({ ok: true, data: workflowsService.createRun(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowStagesRouter.patch("/:id", (req, res) => {
  try {
    const input = updateWorkflowStageSchema.parse(req.body);
    res.json({ ok: true, data: workflowsService.updateStage(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowStagesRouter.delete("/:id", (req, res) => {
  try {
    workflowsService.deleteStage(req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

workflowRunsRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: workflowsService.listRuns() });
});

workflowRunsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: workflowsService.getRun(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowRunsRouter.get("/:id/capacity", (req, res) => {
  try {
    res.json({ ok: true, data: workflowsService.getRunCapacity(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowRunsRouter.post("/:id/capacity", (req, res) => {
  try {
    const input = capacityConfigSchema.parse(req.body ?? {});
    res.json({ ok: true, data: workflowsService.updateRunCapacity(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowRunsRouter.post("/:id/allocate-capacity", (req, res) => {
  try {
    res.json({ ok: true, data: workflowsService.allocateCapacity(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowRunsRouter.post("/:id/start", (req, res) => {
  try {
    res.json({ ok: true, data: workflowsService.startRun(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowRunsRouter.post("/:id/cancel", (req, res) => {
  try {
    res.json({ ok: true, data: workflowsService.cancelRun(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

export const workflowStageRunsRouter = Router();

workflowStageRunsRouter.post("/:id/start", (req, res) => {
  try {
    res.json({ ok: true, data: workflowsService.startStageRun(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowStageRunsRouter.post("/:id/complete", (req, res) => {
  try {
    const input = completeWorkflowStageRunSchema.parse(req.body);
    res.json({ ok: true, data: workflowsService.completeStageRun(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

workflowStageRunsRouter.post("/:id/fail", (req, res) => {
  try {
    const input = failWorkflowStageRunSchema.parse(req.body);
    res.json({ ok: true, data: workflowsService.failStageRun(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});
