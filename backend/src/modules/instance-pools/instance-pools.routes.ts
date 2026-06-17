import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  createInstancePoolMemberSchema,
  createInstancePoolSchema,
  updateInstancePoolMemberSchema
} from "./instance-pools.schemas";
import { instancePoolsService } from "./instance-pools.service";

export const instancePoolsRouter = Router();

instancePoolsRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: instancePoolsService.list() });
});

instancePoolsRouter.post("/", (req, res) => {
  try {
    const input = createInstancePoolSchema.parse(req.body);
    res.status(201).json({ ok: true, data: instancePoolsService.create(input) });
  } catch (error) {
    sendError(res, error);
  }
});

instancePoolsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: instancePoolsService.get(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

instancePoolsRouter.post("/:id/members", (req, res) => {
  try {
    const input = createInstancePoolMemberSchema.parse(req.body);
    res.status(201).json({ ok: true, data: instancePoolsService.createMember(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

instancePoolsRouter.patch("/:id/members/:memberId", (req, res) => {
  try {
    const input = updateInstancePoolMemberSchema.parse(req.body ?? {});
    res.json({ ok: true, data: instancePoolsService.updateMember(req.params.id, req.params.memberId, input) });
  } catch (error) {
    sendError(res, error);
  }
});

instancePoolsRouter.delete("/:id/members/:memberId", (req, res) => {
  try {
    instancePoolsService.deleteMember(req.params.id, req.params.memberId);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});
