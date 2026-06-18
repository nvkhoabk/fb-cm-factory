import { Router } from "express";
import { sendError } from "../shared/resource";
import { instancesService } from "./instances.service";

export const instancesRouter = Router();

instancesRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: instancesService.list() });
});

instancesRouter.get("/:id", (req, res) => {
  try {
    const instance = instancesService.get(req.params.id);
    if (!instance) return res.status(404).json({ ok: false, error: { code: "INSTANCE_NOT_FOUND", message: "Instance not found" } });
    res.json({ ok: true, data: instance });
  } catch (error) {
    sendError(res, error);
  }
});
