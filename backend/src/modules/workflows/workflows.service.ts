import { AppError } from "../shared/resource";
import { workflowsRepository } from "./workflows.repository";
import type {
  CompleteWorkflowStageRunInput,
  CreateWorkflowInput,
  CreateWorkflowRunInput,
  CreateWorkflowStageInput,
  FailWorkflowStageRunInput,
  UpdateWorkflowInput,
  UpdateWorkflowStageInput
} from "./workflows.schemas";

export const workflowsService = {
  list: () => workflowsRepository.list(),

  get(id: string) {
    const workflow = workflowsRepository.get(id);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  create: (input: CreateWorkflowInput) => workflowsRepository.create(input),

  update(id: string, input: UpdateWorkflowInput) {
    const workflow = workflowsRepository.update(id, input);
    if (!workflow) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return workflow;
  },

  delete(id: string) {
    if (!workflowsRepository.delete(id)) {
      throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    }
  },

  createStage(workflowId: string, input: CreateWorkflowStageInput) {
    if (!workflowsRepository.get(workflowId)) {
      throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    }

    return workflowsRepository.createStage(workflowId, input);
  },

  updateStage(id: string, input: UpdateWorkflowStageInput) {
    const stage = workflowsRepository.updateStage(id, input);
    if (!stage) throw new AppError("WORKFLOW_STAGE_NOT_FOUND", "Workflow stage not found", 404);
    return stage;
  },

  deleteStage(id: string) {
    if (!workflowsRepository.deleteStage(id)) {
      throw new AppError("WORKFLOW_STAGE_NOT_FOUND", "Workflow stage not found", 404);
    }
  },

  listRuns: () => workflowsRepository.listRuns(),

  getRun(id: string) {
    const run = workflowsRepository.getRunDetail(id);
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);
    return run;
  },

  createRun(workflowId: string, input: CreateWorkflowRunInput) {
    const run = workflowsRepository.createRun(workflowId, input);
    if (!run) throw new AppError("WORKFLOW_NOT_FOUND", "Workflow not found", 404);
    return run;
  },

  startRun(id: string) {
    const run = workflowsRepository.getRunDetail(id);
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);
    if (run.status === "CANCELLED" || run.status === "FAILED" || run.status === "COMPLETED") {
      throw new AppError("WORKFLOW_RUN_NOT_STARTABLE", "Workflow run is already terminal");
    }

    const firstStage = workflowsRepository.getFirstStageRun(id);
    const timestamp = new Date().toISOString();

    if (firstStage && firstStage.status === "PENDING") {
      workflowsRepository.updateStageRunStatus(firstStage.id as string, "RUNNING", {
        startedAt: timestamp
      });
    }

    return workflowsRepository.updateRunStatus(id, "RUNNING", {
      currentStageNo: firstStage ? Number(firstStage.stageNo) : 0,
      startedAt: run.startedAt as string | null || timestamp,
      finishedAt: null,
      errorMessage: null
    });
  },

  cancelRun(id: string) {
    const run = workflowsRepository.getRunDetail(id);
    if (!run) throw new AppError("WORKFLOW_RUN_NOT_FOUND", "Workflow run not found", 404);

    workflowsRepository.cancelOpenStageRuns(id);

    return workflowsRepository.updateRunStatus(id, "CANCELLED", {
      finishedAt: new Date().toISOString()
    });
  },

  startStageRun(id: string) {
    const stageRun = workflowsRepository.getStageRun(id);
    if (!stageRun) throw new AppError("WORKFLOW_STAGE_RUN_NOT_FOUND", "Workflow stage run not found", 404);
    if (stageRun.status !== "PENDING" && stageRun.status !== "WAITING") {
      throw new AppError("WORKFLOW_STAGE_RUN_NOT_STARTABLE", "Workflow stage run is not startable");
    }

    const timestamp = new Date().toISOString();
    const updated = workflowsRepository.updateStageRunStatus(id, "RUNNING", {
      startedAt: timestamp,
      errorMessage: null
    });

    workflowsRepository.updateRunStatus(stageRun.workflowRunId as string, "RUNNING", {
      currentStageNo: Number(stageRun.stageNo),
      startedAt: timestamp,
      finishedAt: null,
      errorMessage: null
    });

    return updated;
  },

  completeStageRun(id: string, input: CompleteWorkflowStageRunInput) {
    const stageRun = workflowsRepository.getStageRun(id);
    if (!stageRun) throw new AppError("WORKFLOW_STAGE_RUN_NOT_FOUND", "Workflow stage run not found", 404);
    if (stageRun.status === "FAILED" || stageRun.status === "CANCELLED") {
      throw new AppError("WORKFLOW_STAGE_RUN_TERMINAL", "Workflow stage run is terminal");
    }

    const timestamp = new Date().toISOString();
    const transaction = () => {
      const completed = workflowsRepository.updateStageRunStatus(id, "COMPLETED", {
        output: input.output,
        finishedAt: timestamp,
        errorMessage: null
      });

      const nextStage = workflowsRepository.getNextStageRun(
        stageRun.workflowRunId as string,
        Number(stageRun.stageNo)
      );

      if (nextStage) {
        workflowsRepository.updateStageRunStatus(nextStage.id as string, "RUNNING", {
          startedAt: timestamp,
          errorMessage: null
        });
        workflowsRepository.updateRunStatus(stageRun.workflowRunId as string, "RUNNING", {
          currentStageNo: Number(nextStage.stageNo)
        });
      } else {
        workflowsRepository.updateRunStatus(stageRun.workflowRunId as string, "COMPLETED", {
          currentStageNo: Number(stageRun.stageNo),
          finishedAt: timestamp
        });
      }

      return completed;
    };

    return transaction();
  },

  failStageRun(id: string, input: FailWorkflowStageRunInput) {
    const stageRun = workflowsRepository.getStageRun(id);
    if (!stageRun) throw new AppError("WORKFLOW_STAGE_RUN_NOT_FOUND", "Workflow stage run not found", 404);

    const timestamp = new Date().toISOString();
    const failed = workflowsRepository.updateStageRunStatus(id, "FAILED", {
      errorMessage: input.errorMessage,
      finishedAt: timestamp
    });

    workflowsRepository.updateRunStatus(stageRun.workflowRunId as string, "FAILED", {
      currentStageNo: Number(stageRun.stageNo),
      errorMessage: input.errorMessage,
      finishedAt: timestamp
    });

    return failed;
  }
};
