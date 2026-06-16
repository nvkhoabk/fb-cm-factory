import cors from "cors";
import express from "express";
import { healthRouter } from "./modules/health/health.routes";
import { workflowRunsRouter, workflowsRouter } from "./modules/workflows/workflows.routes";
import { instancePoolsRouter } from "./modules/instance-pools/instance-pools.routes";
import { characterGroupsRouter } from "./modules/character-groups/character-groups.routes";
import { promptTemplatesRouter, promptsRouter } from "./modules/prompt-builder/prompt-builder.routes";
import { assetsRouter } from "./modules/assets/assets.routes";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

function mountRoutes(prefix = "") {
  app.use(`${prefix}/health`, healthRouter);
  app.use(`${prefix}/workflows`, workflowsRouter);
  app.use(`${prefix}/workflow-runs`, workflowRunsRouter);
  app.use(`${prefix}/instance-pools`, instancePoolsRouter);
  app.use(`${prefix}/character-groups`, characterGroupsRouter);
  app.use(`${prefix}/prompt-templates`, promptTemplatesRouter);
  app.use(`${prefix}/prompts`, promptsRouter);
  app.use(`${prefix}/assets`, assetsRouter);
}

mountRoutes();

// Temporary compatibility for pre-correction clients.
mountRoutes("/api/v2");
app.use("/api/v2/prompt-builder/templates", promptTemplatesRouter);
app.use("/api/v2/prompt-builder", promptsRouter);
app.use("/api/v2/workflows/runs", workflowRunsRouter);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `No route for ${req.method} ${req.path}`
    }
  });
});
