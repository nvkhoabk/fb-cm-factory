import { AppError } from "../shared/resource";
import { instancePoolsRepository } from "./instance-pools.repository";
import type {
  CreateInstancePoolInput,
  CreateInstancePoolMemberInput
} from "./instance-pools.schemas";

export const instancePoolsService = {
  list: () => instancePoolsRepository.list(),

  get(id: string) {
    const pool = instancePoolsRepository.get(id);
    if (!pool) throw new AppError("INSTANCE_POOL_NOT_FOUND", "Instance pool not found", 404);
    return pool;
  },

  create: (input: CreateInstancePoolInput) => instancePoolsRepository.create(input),

  createMember(poolId: string, input: CreateInstancePoolMemberInput) {
    if (!instancePoolsRepository.get(poolId)) {
      throw new AppError("INSTANCE_POOL_NOT_FOUND", "Instance pool not found", 404);
    }

    return instancePoolsRepository.createMember(poolId, input);
  },

  deleteMember(poolId: string, memberId: string) {
    if (!instancePoolsRepository.deleteMember(poolId, memberId)) {
      throw new AppError("INSTANCE_POOL_MEMBER_NOT_FOUND", "Instance pool member not found", 404);
    }
  }
};

