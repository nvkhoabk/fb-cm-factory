import { Router } from "express";
import { sendError } from "../shared/resource";
import { executeMockJobParamsSchema } from "./job-executor.schemas";
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

