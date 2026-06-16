import { Router } from "express";
import { createResourceRouter, sendError } from "../shared/resource";
import {
  createAttributeDefinitionSchema,
  createCharacterGroupSchema,
  createCharacterSchema,
  createGroupMemberSchema
} from "./character-groups.schemas";
import { characterGroupsService, charactersService } from "./character-groups.service";

export const characterGroupsRouter = Router();

characterGroupsRouter.use("/", createResourceRouter(createCharacterGroupSchema, characterGroupsService));

characterGroupsRouter.get("/:groupId/members", (req, res) => {
  res.json({ ok: true, data: characterGroupsService.listMembers(req.params.groupId) });
});

characterGroupsRouter.post("/:groupId/members", (req, res) => {
  try {
    const payload = createGroupMemberSchema.parse(req.body);
    res.status(201).json({
      ok: true,
      data: characterGroupsService.createMember(req.params.groupId, payload)
    });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.get("/resources/characters", (req, res) => {
  res.json({ ok: true, data: charactersService.list(req.query) });
});

characterGroupsRouter.post("/resources/characters", (req, res) => {
  try {
    const payload = createCharacterSchema.parse(req.body);
    res.status(201).json({ ok: true, data: charactersService.create(payload) });
  } catch (error) {
    sendError(res, error);
  }
});

characterGroupsRouter.get("/attributes/definitions", (req, res) => {
  res.json({ ok: true, data: characterGroupsService.listAttributeDefinitions(req.query) });
});

characterGroupsRouter.post("/attributes/definitions", (req, res) => {
  try {
    const payload = createAttributeDefinitionSchema.parse(req.body);
    res.status(201).json({
      ok: true,
      data: characterGroupsService.createAttributeDefinition(payload)
    });
  } catch (error) {
    sendError(res, error);
  }
});

