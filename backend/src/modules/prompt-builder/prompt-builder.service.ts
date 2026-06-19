import { AppError } from "../shared/resource";
import { promptTemplatesRepository } from "./prompt-builder.repository";
import type {
  CreatePromptTemplateInput,
  CreatePromptTemplateVersionInput
} from "./prompt-builder.schemas";

export const promptTemplatesService = {
  list: () => promptTemplatesRepository.list(),

  get(id: string) {
    const template = promptTemplatesRepository.get(id);
    if (!template) throw new AppError("PROMPT_TEMPLATE_NOT_FOUND", "Prompt template not found", 404);
    return template;
  },

  create: (input: CreatePromptTemplateInput) => promptTemplatesRepository.create(input),

  delete(id: string) {
    if (!promptTemplatesRepository.delete(id)) {
      throw new AppError("PROMPT_TEMPLATE_NOT_FOUND", "Prompt template not found", 404);
    }
  },

  getVersion(id: string) {
    const version = promptTemplatesRepository.getVersion(id);
    if (!version) throw new AppError("PROMPT_TEMPLATE_VERSION_NOT_FOUND", "Prompt template version not found", 404);
    return version;
  },

  createVersion(promptTemplateId: string, input: CreatePromptTemplateVersionInput) {
    if (!promptTemplatesRepository.get(promptTemplateId)) {
      throw new AppError("PROMPT_TEMPLATE_NOT_FOUND", "Prompt template not found", 404);
    }

    return promptTemplatesRepository.createVersion(promptTemplateId, input);
  },

  activateVersion(id: string) {
    const version = promptTemplatesRepository.activateVersion(id);
    if (!version) throw new AppError("PROMPT_TEMPLATE_VERSION_NOT_FOUND", "Prompt template version not found", 404);
    return version;
  }
};
