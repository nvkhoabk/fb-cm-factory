import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  createPromptTemplateSchema,
  createPromptTemplateVersionSchema
} from "./prompt-builder.schemas";
import { promptTemplatesService } from "./prompt-builder.service";

export const promptTemplatesRouter = Router();
export const promptTemplateVersionsRouter = Router();
export const promptsRouter = Router();

promptTemplatesRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: promptTemplatesService.list() });
});

promptTemplatesRouter.post("/", (req, res) => {
  try {
    const input = createPromptTemplateSchema.parse(req.body);
    res.status(201).json({ ok: true, data: promptTemplatesService.create(input) });
  } catch (error) {
    sendError(res, error);
  }
});

promptTemplatesRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: promptTemplatesService.get(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

promptTemplatesRouter.delete("/:id", (req, res) => {
  try {
    promptTemplatesService.delete(req.params.id);
    res.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    sendError(res, error);
  }
});

promptTemplatesRouter.post("/:id/versions", (req, res) => {
  try {
    const input = createPromptTemplateVersionSchema.parse(req.body);
    res.status(201).json({ ok: true, data: promptTemplatesService.createVersion(req.params.id, input) });
  } catch (error) {
    sendError(res, error);
  }
});

promptTemplateVersionsRouter.post("/:id/activate", (req, res) => {
  try {
    res.json({ ok: true, data: promptTemplatesService.activateVersion(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

promptTemplateVersionsRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: promptTemplatesService.getVersion(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});
