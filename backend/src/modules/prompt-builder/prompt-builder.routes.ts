import { Router } from "express";
import { createResourceRouter, sendError } from "../shared/resource";
import {
  createPromptTemplateSchema,
  createPromptVersionSchema,
  renderPromptPreviewSchema
} from "./prompt-builder.schemas";
import { promptBuilderService } from "./prompt-builder.service";

export const promptTemplatesRouter = Router();
export const promptsRouter = Router();

promptTemplatesRouter.use("/", createResourceRouter(createPromptTemplateSchema, promptBuilderService));

promptTemplatesRouter.get("/:templateId/versions", (req, res) => {
  res.json({ ok: true, data: promptBuilderService.listVersions(req.params.templateId) });
});

promptTemplatesRouter.post("/:templateId/versions", (req, res) => {
  try {
    const payload = createPromptVersionSchema.parse(req.body);
    res.status(201).json({
      ok: true,
      data: promptBuilderService.createVersion(req.params.templateId, payload)
    });
  } catch (error) {
    sendError(res, error);
  }
});

promptsRouter.post("/render-preview", (req, res) => {
  try {
    const payload = renderPromptPreviewSchema.parse(req.body);
    res.json({
      ok: true,
      data: promptBuilderService.renderPreview(payload.content, payload.context)
    });
  } catch (error) {
    sendError(res, error);
  }
});
