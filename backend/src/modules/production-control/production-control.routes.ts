import { Router } from "express";
import { productionControlService } from "./production-control.service";

export const productionControlRouter = Router();

productionControlRouter.get("/jobs", (_req, res) => {
  res.json({ ok: true, data: productionControlService.listJobs() });
});

productionControlRouter.get("/group-runs", (_req, res) => {
  res.json({ ok: true, data: productionControlService.listGroupRuns() });
});

productionControlRouter.get("/group-runs/:batchId", (req, res) => {
  res.json({ ok: true, data: productionControlService.getGroupRun(req.params.batchId) });
});
