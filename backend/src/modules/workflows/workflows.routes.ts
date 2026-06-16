import { Router } from "express";
import { createResourceRouter, sendError } from "../shared/resource";
import {
  createWorkflowRunSchema,
  createWorkflowSchema,
  createWorkflowVersionSchema
} from "./workflows.schemas";
import { workflowsService } from "./workflows.service";

export const workflowsRouter = Router();
export const workflowRunsRouter = Router();

workflowsRouter.use("/", createResourceRouter(createWorkflowSchema, workflowsService));

workflowsRouter.get("/:workflowId/versions", (req, res) => {
  res.json({ ok: true, data: workflowsService.listVersions(req.params.workflowId) });
});

workflowsRouter.post("/:workflowId/versions", (req, res) => {
  try {
    const payload = createWorkflowVersionSchema.parse(req.body);
    res.status(201).json({
      ok: true,
      data: workflowsService.createVersion(req.params.workflowId, payload)
    });
  } catch (error) {
    sendError(res, error);
  }
});

workflowRunsRouter.get("/", (req, res) => {
  res.json({ ok: true, data: workflowsService.listRuns(req.query) });
});

workflowRunsRouter.post("/", (req, res) => {
  try {
    const payload = createWorkflowRunSchema.parse(req.body);
    res.status(201).json({ ok: true, data: workflowsService.createRun(payload) });
  } catch (error) {
    sendError(res, error);
  }
});
