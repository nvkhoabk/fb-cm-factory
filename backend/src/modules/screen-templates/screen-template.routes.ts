import { Router } from "express";
import { sendError } from "../shared/resource";
import { screenTemplateSchema, updateScreenTemplateSchema } from "./screen-template.schemas";
import { screenTemplateService } from "./screen-template.service";

export const screenTemplatesRouter = Router();

screenTemplatesRouter.get("/", (_req, res) => {
  res.json({ ok: true, data: screenTemplateService.list() });
});

screenTemplatesRouter.get("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: screenTemplateService.getRequired(req.params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

screenTemplatesRouter.post("/", (req, res) => {
  try {
    res.status(201).json({ ok: true, data: screenTemplateService.create(screenTemplateSchema.parse(req.body)) });
  } catch (error) {
    sendError(res, error);
  }
});

screenTemplatesRouter.patch("/:id", (req, res) => {
  try {
    res.json({ ok: true, data: screenTemplateService.update(req.params.id, updateScreenTemplateSchema.parse(req.body)) });
  } catch (error) {
    sendError(res, error);
  }
});

screenTemplatesRouter.delete("/:id", (req, res) => {
  if (!screenTemplateService.delete(req.params.id)) {
    return res.status(404).json({ ok: false, error: { code: "SCREEN_TEMPLATE_NOT_FOUND", message: "Screen template not found" } });
  }
  return res.json({ ok: true, data: { id: req.params.id } });
});
