import { AppError } from "../shared/resource";
import { characterGroupsRepository } from "./character-groups.repository";
import type {
  AssignGroupAttributeInput,
  CreateCharacterGroupInput,
  CreateGroupMemberInput,
  UpdateCharacterGroupInput
} from "./character-groups.schemas";

export const characterGroupsService = {
  list: () => characterGroupsRepository.list(),

  get(id: string) {
    const group = characterGroupsRepository.get(id);
    if (!group) throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);
    return group;
  },

  create: (input: CreateCharacterGroupInput) => characterGroupsRepository.create(input),

  update(id: string, input: UpdateCharacterGroupInput) {
    const group = characterGroupsRepository.update(id, input);
    if (!group) throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);
    return group;
  },

  delete(id: string) {
    if (!characterGroupsRepository.delete(id)) {
      throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);
    }
  },

  createMember: (groupId: string, input: CreateGroupMemberInput) =>
    characterGroupsRepository.createMember(groupId, input),

  deleteMember(groupId: string, memberId: string) {
    if (!characterGroupsRepository.deleteMember(groupId, memberId)) {
      throw new AppError("CHARACTER_GROUP_MEMBER_NOT_FOUND", "Character group member not found", 404);
    }
  },

  assignAttribute: (groupId: string, input: AssignGroupAttributeInput) =>
    characterGroupsRepository.assignAttribute(groupId, input)
};

