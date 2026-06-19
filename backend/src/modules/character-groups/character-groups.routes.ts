import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  assignGroupAttributeSchema,
  createCharacterGroupSchema,
  createGroupMemberSchema,
  updateCharacterGroupSchema
} from "./character-groups.schemas";
import { characterGroupsService } from "./character-groups.service";
import { characterSourceAssetsService } from "../character-assets/character-source-assets.service";

export const characterGroupsRouter = Router();

characterGroupsRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: characterGroupsService.list() });
});

characterGroupsRouter.post("/", (req, res) => {
  try {
    const input = createCharacterGroupSchema.parse(req.body);
    res.status(201).json({ ok: true, data: characterGroupsService.create(input) });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: characterGroupsService.get(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.get("/:id/source-assets", (req, res) => {
  try {
    res.json({ ok: true, data: characterSourceAssetsService.resolveCharacterGroupSourceAssets(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.patch("/:id", (req, res) => {
  try {
    const input = updateCharacterGroupSchema.parse(req.body);
    res.json({ ok: true, data: characterGroupsService.update(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.delete("/:id", (req, res) => {
  try {
    characterGroupsService.delete(req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.post("/:id/members", (req, res) => {
  try {
    const input = createGroupMemberSchema.parse(req.body);
    res.status(201).json({ ok: true, data: characterGroupsService.createMember(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.delete("/:id/members/:memberId", (req, res) => {
  try {
    characterGroupsService.deleteMember(req.params.id, req.params.memberId);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.post("/:id/attributes", (req, res) => {
  try {
    const input = assignGroupAttributeSchema.parse(req.body);
    res.status(201).json({ ok: true, data: characterGroupsService.assignAttribute(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});
