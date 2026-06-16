import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  createGroupAttributeSchema,
  createGroupAttributeValueSchema
} from "./group-attributes.schemas";
import { groupAttributesService } from "./group-attributes.service";

export const groupAttributesRouter = Router();

groupAttributesRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: groupAttributesService.list() });
});

groupAttributesRouter.post("/", (req, res) => {
  try {
    const input = createGroupAttributeSchema.parse(req.body);
    res.status(201).json({ ok: true, data: groupAttributesService.create(input) });
  } catch (error) {
    sendError(res, error);
  }
});

groupAttributesRouter.post("/:id/values", (req, res) => {
  try {
    const input = createGroupAttributeValueSchema.parse(req.body);
    res.status(201).json({ ok: true, data: groupAttributesService.createValue(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

