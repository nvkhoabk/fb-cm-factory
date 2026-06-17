import { Router } from "express";
import { sendError } from "../shared/resource";
import { instanceAllocationService } from "./instance-allocation.service";

export const instanceAllocationsRouter = Router();

instanceAllocationsRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: instanceAllocationService.list() });
});

instanceAllocationsRouter.get("/active", (_req, res) => {
  res.json({ ok: true, data: instanceAllocationService.listActive() });
});

instanceAllocationsRouter.post("/:id/release", (req, res) => {
  try {
    res.json({ ok: true, data: instanceAllocationService.releaseAllocation(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

