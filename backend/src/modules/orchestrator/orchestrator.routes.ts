import { Router } from "express";
import { jobExecutorService } from "../job-executor/job-executor.service";
import { sendError } from "../shared/resource";
import {
  createOrchestratorRuleSchema,
  failOrchestratorJobSchema,
  updateOrchestratorRuleSchema
} from "./orchestrator.schemas";
import { orchestratorService } from "./orchestrator.service";

export const orchestratorRouter = Router();

orchestratorRouter.get("/rules", (_req, res) => {
  try {
    res.json({ ok: true, data: orchestratorService.listRules() });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.post("/rules", (req, res) => {
  try {
    const input = createOrchestratorRuleSchema.parse(req.body ?? {});
    res.status(201).json({ ok: true, data: orchestratorService.createRule(input) });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.patch("/rules/:id", (req, res) => {
  try {
    const input = updateOrchestratorRuleSchema.parse(req.body ?? {});
    res.json({ ok: true, data: orchestratorService.updateRule(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.post("/rules/:id/enable", (req, res) => {
  try {
    res.json({ ok: true, data: orchestratorService.enableRule(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.post("/rules/:id/disable", (req, res) => {
  try {
    res.json({ ok: true, data: orchestratorService.disableRule(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.delete("/rules/:id", (req, res) => {
  try {
    orchestratorService.deleteRule(req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

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

orchestratorRouter.post("/jobs/:id/allocate", (req, res) => {
  try {
    res.json({ ok: true, data: orchestratorService.allocateJob(req.params.id) });
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

orchestratorRouter.post("/jobs/:id/retry", (req, res) => {
  try {
    res.json({ ok: true, data: orchestratorService.retryJob(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.delete("/jobs/:id", (req, res) => {
  try {
    orchestratorService.deleteJob(req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

orchestratorRouter.post("/jobs/:id/execute-mock", async (req, res) => {
  try {
    res.json({ ok: true, data: await jobExecutorService.executeMockJob(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});
