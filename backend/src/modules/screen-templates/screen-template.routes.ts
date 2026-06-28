import { Router } from "express";
import { sendError } from "../shared/resource";
import { screenDetectionService } from "./screen-detection.service";
import { screenTemplateSchema, testScreenTemplateSchema, updateScreenTemplateSchema } from "./screen-template.schemas";
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

screenTemplatesRouter.post("/:id/test", async (req, res) => {
  try {
    const input = testScreenTemplateSchema.parse(req.body);
    const result = await screenDetectionService.checkScreen({
      templateId: req.params.id,
      hostId: input.hostId,
      instanceId: input.instanceId,
      adbId: input.adbId,
      screenshotUrl: input.screenshotUrl,
      screenshotPath: input.screenshotPath
    });
    res.json({ ok: true, data: result });
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
