import cors from "cors";
import express from "express";
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
import { groupAttributesRouter } from "./modules/group-attributes/group-attributes.routes";
import { promptTemplateVersionsRouter, promptTemplatesRouter, promptsRouter } from "./modules/prompt-builder/prompt-builder.routes";
import { promptRenderRouter } from "./modules/prompt-builder/prompt-render.routes";
import { productionBatchRouter } from "./modules/production-batches/production-batch.routes";
import { orchestratorRouter } from "./modules/orchestrator/orchestrator.routes";
import { jobExecutorRouter } from "./modules/job-executor/job-executor.routes";
import { managerBridgeRouter } from "./modules/manager-bridge/manager-bridge.routes";
import { runtimeSessionsRouter } from "./modules/runtime-sessions/runtime-sessions.routes";
import { runtimeRecoveryRouter } from "./modules/runtime-recovery/runtime-recovery.routes";
import { hostAgentRouter } from "./modules/host-agent-adapter/host-agent.routes";
import { scriptRunsRouter, scriptsRouter } from "./modules/script-runtime/script-runtime.routes";
import { assetsRouter } from "./modules/assets/assets.routes";

export const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
  app.use(`${prefix}/group-attributes`, groupAttributesRouter);
  app.use(`${prefix}/prompt-templates`, promptTemplatesRouter);
  app.use(`${prefix}/prompt-template-versions`, promptTemplateVersionsRouter);
  app.use(`${prefix}/prompt-builder`, promptRenderRouter);
  app.use(`${prefix}/prompts`, promptsRouter);
  app.use(`${prefix}/production-batches`, productionBatchRouter);
  app.use(`${prefix}/orchestrator`, orchestratorRouter);
  app.use(`${prefix}/job-executor`, jobExecutorRouter);
  app.use(`${prefix}/manager-bridge`, managerBridgeRouter);
  app.use(`${prefix}/runtime-sessions`, runtimeSessionsRouter);
  app.use(`${prefix}/runtime-sessions`, runtimeRecoveryRouter);
  app.use(`${prefix}/hosts`, hostAgentRouter);
  app.use(`${prefix}/scripts`, scriptsRouter);
  app.use(`${prefix}/script-runs`, scriptRunsRouter);
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
