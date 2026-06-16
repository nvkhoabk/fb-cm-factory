import { Router } from "express";
import { createResourceRouter, sendError } from "../shared/resource";
import { createInstancePoolSchema, createInstanceSlotSchema } from "./instance-pools.schemas";
import { instancePoolsService } from "./instance-pools.service";

export const instancePoolsRouter = Router();

instancePoolsRouter.use("/", createResourceRouter(createInstancePoolSchema, instancePoolsService));

instancePoolsRouter.get("/:poolId/slots", (req, res) => {
  res.json({ ok: true, data: instancePoolsService.listSlots(req.params.poolId) });
});

instancePoolsRouter.post("/:poolId/slots", (req, res) => {
  try {
    const payload = createInstanceSlotSchema.parse(req.body);
    res.status(201).json({
      ok: true,
      data: instancePoolsService.createSlot(req.params.poolId, payload)
    });
  } catch (error) {
    sendError(res, error);
  }
});

