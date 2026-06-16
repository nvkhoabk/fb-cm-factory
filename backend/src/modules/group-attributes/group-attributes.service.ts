import { AppError } from "../shared/resource";
import { groupAttributesRepository } from "./group-attributes.repository";
import type {
  CreateGroupAttributeInput,
  CreateGroupAttributeValueInput
} from "./group-attributes.schemas";

export const groupAttributesService = {
  list: () => groupAttributesRepository.list(),

  create: (input: CreateGroupAttributeInput) => groupAttributesRepository.create(input),

  createValue(attributeId: string, input: CreateGroupAttributeValueInput) {
    if (!groupAttributesRepository.get(attributeId)) {
      throw new AppError("GROUP_ATTRIBUTE_NOT_FOUND", "Group attribute not found", 404);
    }

    return groupAttributesRepository.createValue(attributeId, input);
  }
};

