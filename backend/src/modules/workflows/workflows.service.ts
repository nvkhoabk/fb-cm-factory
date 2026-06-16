import { AppError } from "../shared/resource";
import { workflowsRepository } from "./workflows.repository";
import type {
  CreateWorkflowInput,
  CreateWorkflowStageInput,
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
  }
};

