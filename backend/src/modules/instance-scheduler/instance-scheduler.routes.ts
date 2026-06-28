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

instanceSchedulerRouter.post("/:id/fail", (req, res) => {
  try {
    const body = req.body && typeof req.body === "object"
      ? req.body as { reason?: unknown; errorMessage?: unknown; errorCode?: unknown; instanceIssue?: unknown }
      : {};
    const reason = typeof body.errorCode === "string"
      ? body.errorCode
      : typeof body.reason === "string"
        ? body.reason
        : typeof body.errorMessage === "string"
          ? body.errorMessage
          : null;
    res.json({
      ok: true,
      data: instanceSchedulerService.failAllocation(req.params.id, reason, body.instanceIssue === true)
    });
  } catch (error) {
    sendError(res, error);
  }
});
