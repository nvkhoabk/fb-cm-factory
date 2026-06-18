import {
  instancePoolStates,
  instancesRepository,
  type InstanceCapabilities,
  type InstancePoolState
} from "./instances.repository";

export const instancesService = {
  list: (filters?: { hostId?: string; currentPoolType?: string; runtimeStatus?: string; capability?: string }) =>
    instancesRepository.list(filters),
  listStandby: () => instancesRepository.list({ currentPoolType: "STANDBY" }),
  listMaintenance: () => instancesRepository.list({ currentPoolType: "MAINTENANCE" }),
  get: (id: string) => instancesRepository.get(id),
  updateCapabilities: (id: string, capabilities: InstanceCapabilities) =>
    instancesRepository.updateCapabilities(id, capabilities),
  moveToPoolState: (id: string, currentPoolType: InstancePoolState, maintenanceReason?: string | null) =>
    instancesRepository.moveToPoolState(id, currentPoolType, maintenanceReason)
};

export { instancePoolStates };
