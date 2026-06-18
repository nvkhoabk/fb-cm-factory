import { instancesRepository } from "./instances.repository";

export const instancesService = {
  list: () => instancesRepository.list(),
  get: (id: string) => instancesRepository.get(id)
};
