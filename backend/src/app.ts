import cors from "cors";
import express from "express";
import { config } from "./config";
import { healthRouter } from "./modules/health/health.routes";
import {
  workflowRunsRouter,
  workflowsRouter,
  workflowStageRunsRouter,
  workflowStagesRouter
} from "./modules/workflows/workflows.routes";
import { instancePoolsRouter } from "./modules/instance-pools/instance-pools.routes";
import { instancesRouter } from "./modules/instances/instances.routes";
import { instanceSchedulerRouter } from "./modules/instance-scheduler/instance-scheduler.routes";
import { characterGroupsRouter } from "./modules/character-groups/character-groups.routes";
import { charactersRouter } from "./modules/characters/characters.routes";
import { groupAttributesRouter } from "./modules/group-attributes/group-attributes.routes";
import { promptTemplateVersionsRouter, promptTemplatesRouter, promptsRouter } from "./modules/prompt-builder/prompt-builder.routes";
import { promptRenderRouter } from "./modules/prompt-builder/prompt-render.routes";
import { productionBatchRouter } from "./modules/production-batches/production-batch.routes";
import { characterImportRouter } from "./modules/character-import/character-import.routes";
import { orchestratorRouter } from "./modules/orchestrator/orchestrator.routes";
import { jobExecutorRouter } from "./modules/job-executor/job-executor.routes";
import { managerBridgeRouter } from "./modules/manager-bridge/manager-bridge.routes";
import { runtimeSessionsRouter } from "./modules/runtime-sessions/runtime-sessions.routes";
import { runtimeRecoveryRouter } from "./modules/runtime-recovery/runtime-recovery.routes";
import { hostAgentRouter } from "./modules/host-agent-adapter/host-agent.routes";
import { scriptRunsRouter, scriptVersionsRouter, scriptsRouter } from "./modules/script-runtime/script-runtime.routes";
import { assetsRouter } from "./modules/assets/assets.routes";
import { assetCenterRouter } from "./modules/asset-center/asset-center.routes";
import { productionControlRouter } from "./modules/production-control/production-control.routes";
import { screenTemplatesRouter } from "./modules/screen-templates/screen-template.routes";
import { errorCenterRouter } from "./modules/error-center/error-center.routes";

export const app = express();

app.use(cors());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? "100mb" }));
app.use("/storage", express.static(config.storageRoot));

function mountRoutes(prefix = "") {
  app.use(`${prefix}/health`, healthRouter);
  app.use(`${prefix}/workflows`, workflowsRouter);
  app.use(`${prefix}/workflow-runs`, workflowRunsRouter);
  app.use(`${prefix}/workflow-stages`, workflowStagesRouter);
  app.use(`${prefix}/workflow-stage-runs`, workflowStageRunsRouter);
  app.use(`${prefix}/instance-pools`, instancePoolsRouter);
  app.use(`${prefix}/instances`, instancesRouter);
  app.use(`${prefix}/instance-allocations`, instanceSchedulerRouter);
  app.use(`${prefix}/character-groups`, characterGroupsRouter);
  app.use(`${prefix}/characters`, charactersRouter);
  app.use(`${prefix}/group-attributes`, groupAttributesRouter);
  app.use(`${prefix}/prompt-templates`, promptTemplatesRouter);
  app.use(`${prefix}/prompt-template-versions`, promptTemplateVersionsRouter);
  app.use(`${prefix}/prompt-builder`, promptRenderRouter);
  app.use(`${prefix}/prompts`, promptsRouter);
  app.use(`${prefix}/production-batches`, productionBatchRouter);
  app.use(`${prefix}/character-import`, characterImportRouter);
  app.use(`${prefix}/orchestrator`, orchestratorRouter);
  app.use(`${prefix}/job-executor`, jobExecutorRouter);
  app.use(`${prefix}/manager-bridge`, managerBridgeRouter);
  app.use(`${prefix}/runtime-sessions`, runtimeSessionsRouter);
  app.use(`${prefix}/runtime-sessions`, runtimeRecoveryRouter);
  app.use(`${prefix}/hosts`, hostAgentRouter);
  app.use(`${prefix}/scripts`, scriptsRouter);
  app.use(`${prefix}/script-versions`, scriptVersionsRouter);
  app.use(`${prefix}/script-runs`, scriptRunsRouter);
  app.use(`${prefix}/assets`, assetsRouter);
  app.use(`${prefix}/asset-center`, assetCenterRouter);
  app.use(`${prefix}/production-control`, productionControlRouter);
  app.use(`${prefix}/screen-templates`, screenTemplatesRouter);
  app.use(`${prefix}/error-center`, errorCenterRouter);
}

mountRoutes();

// Temporary compatibility for pre-correction clients.
mountRoutes("/api/v2");
app.use("/api/v2/prompt-builder/templates", promptTemplatesRouter);
app.use("/api/v2/prompt-builder", promptsRouter);
app.use("/api/v2/workflows/runs", workflowRunsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  const payloadError = error as { type?: string; status?: number; message?: string };
  if (payloadError?.type === "entity.too.large" || payloadError?.status === 413) {
    return res.status(413).json({
      ok: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: `Request body is too large. Current JSON_BODY_LIMIT is ${process.env.JSON_BODY_LIMIT ?? "100mb"}.`
      }
    });
  }
  return next(error);
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `No route for ${req.method} ${req.path}`
    }
  });
});
