import { Router } from "express";
import { sendError } from "../shared/resource";
import { instanceSchedulerService } from "./instance-scheduler.service";

export const instanceSchedulerRouter = Router();

instanceSchedulerRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: instanceSchedulerService.listAllocations() });
});

instanceSchedulerRouter.get("/active", (_req, res) => {
  res.json({ ok: true, data: instanceSchedulerService.getActiveAllocations() });
});

instanceSchedulerRouter.post("/:id/release", (req, res) => {
  try {
    res.json({ ok: true, data: instanceSchedulerService.releaseAllocation(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

