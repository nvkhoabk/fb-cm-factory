import { Router } from "express";
import { sendError } from "../shared/resource";
import { failOrchestratorJobSchema } from "./orchestrator.schemas";
import { orchestratorService } from "./orchestrator.service";

export const orchestratorRouter = Router();

orchestratorRouter.get("/jobs", (_req, res) => {
  res.json({ ok: true, data: orchestratorService.listJobs() });
});

orchestratorRouter.post("/scan", (_req, res) => {
  try {
    res.json({ ok: true, data: orchestratorService.scan() });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.post("/jobs/:id/start", (req, res) => {
  try {
    res.json({ ok: true, data: orchestratorService.startJob(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.post("/jobs/:id/complete", (req, res) => {
  try {
    res.json({ ok: true, data: orchestratorService.completeJob(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.post("/jobs/:id/fail", (req, res) => {
  try {
    const input = failOrchestratorJobSchema.parse(req.body ?? {});
    res.json({ ok: true, data: orchestratorService.failJob(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

