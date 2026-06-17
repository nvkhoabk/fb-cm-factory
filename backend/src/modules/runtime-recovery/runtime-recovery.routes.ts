import { Router } from "express";
import { sendError } from "../shared/resource";
import { recoverRuntimeSessionSchema } from "./runtime-recovery.schemas";
import { runtimeRecoveryService } from "./runtime-recovery.service";

export const runtimeRecoveryRouter = Router();

runtimeRecoveryRouter.post("/:id/recover", async (req, res) => {
  try {
    const input = recoverRuntimeSessionSchema.parse(req.body ?? {});
    res.json({ ok: true, data: await runtimeRecoveryService.recoverRuntimeSession(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

runtimeRecoveryRouter.post("/:id/mark-unrecoverable", (req, res) => {
  try {
    res.json({ ok: true, data: runtimeRecoveryService.markUnrecoverable(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});
