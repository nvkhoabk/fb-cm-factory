import { Router } from "express";
import { sendError } from "../shared/resource";
import {
  executeImageEditJobParamsSchema,
  executeMockJobParamsSchema,
  executeV1JobParamsSchema
} from "./job-executor.schemas";
import { jobExecutorService } from "./job-executor.service";

export const jobExecutorRouter = Router();

jobExecutorRouter.post("/jobs/:id/execute-mock", async (req, res) => {
  try {
    const params = executeMockJobParamsSchema.parse(req.params);
    res.json({ ok: true, data: await jobExecutorService.executeMockJob(params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

jobExecutorRouter.post("/jobs/:id/execute-v1", async (req, res) => {
  try {
    const params = executeV1JobParamsSchema.parse(req.params);
    res.json({ ok: true, data: await jobExecutorService.executeV1Job(params.id) });
  } catch (error) {
    sendError(res, error);
  }
});

jobExecutorRouter.post("/jobs/:id/execute-image-edit", async (req, res) => {
  try {
    const params = executeImageEditJobParamsSchema.parse(req.params);
    res.json({ ok: true, data: await jobExecutorService.executeImageEditJob(params.id) });
  } catch (error) {
    sendError(res, error);
  }
});
