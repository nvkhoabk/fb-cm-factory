import { Router } from "express";
import { sendError } from "../shared/resource";
import { renderBatchPromptSchema, renderPromptSchema } from "./prompt-render.schemas";
import { promptRenderService } from "./prompt-render.service";

export const promptRenderRouter = Router();

promptRenderRouter.post("/render", (req, res) => {
  try {
    const input = renderPromptSchema.parse(req.body ?? {});
    res.json({ ok: true, data: promptRenderService.renderPrompt(input) });
  } catch (error) {
    sendError(res, error);
  }
});

promptRenderRouter.post("/batches/:batchId/render", (req, res) => {
  try {
    const input = renderBatchPromptSchema.parse(req.body ?? {});
    res.json({
      ok: true,
      data: promptRenderService.generatePromptForBatch(req.params.batchId, input.templateId)
    });
  } catch (error) {
    sendError(res, error);
  }
});
