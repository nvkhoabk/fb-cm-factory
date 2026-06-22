import {
  instancePoolStates,
  instancesRepository,
  type InstanceCapabilities,
  type InstancePoolState
} from "./instances.repository";
import { db } from "../../database/db";
import { AppError } from "../shared/resource";
import { hostAgentClient } from "../host-agent-adapter/host-agent.client";

function publicHostTargetForInstance(hostId: string) {
  const row = db.prepare("SELECT * FROM hosts WHERE host_id = ? OR id = ? LIMIT 1").get(hostId, hostId) as Record<string, unknown> | undefined;
  if (!row) return null;
  const apiKey = typeof row.api_key === "string" ? row.api_key.trim() : "";
  if (!apiKey) {
    throw new AppError("HOST_AGENT_API_KEY_REQUIRED", "Host Agent API key must be stored on the host record in the database", 400);
  }
  return {
    host: row,
    target: {
      baseUrl: String(row.base_url),
      apiKey
    }
  };
}

function normalizeDevices(value: unknown): Array<Record<string, unknown>> {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const devices = Array.isArray(record.devices)
    ? record.devices
    : record.data && typeof record.data === "object" && Array.isArray((record.data as Record<string, unknown>).devices)
      ? (record.data as Record<string, unknown>).devices
      : [];
  return (devices as unknown[]).map((device) => device as Record<string, unknown>);
}

export const instancesService = {
  list: (filters?: { hostId?: string; currentPoolType?: string; runtimeStatus?: string; capability?: string }) =>
    instancesRepository.list(filters),
  listStandby: () => instancesRepository.list({ currentPoolType: "STANDBY" }),
  listMaintenance: () => instancesRepository.list({ currentPoolType: "MAINTENANCE" }),
  get: (id: string) => instancesRepository.get(id),
  updateCapabilities: (id: string, capabilities: InstanceCapabilities) =>
    instancesRepository.updateCapabilities(id, capabilities),
  moveToPoolState: (id: string, currentPoolType: InstancePoolState, maintenanceReason?: string | null) =>
    instancesRepository.moveToPoolState(id, currentPoolType, maintenanceReason),
  async setManualAdbMapping(id: string, adbId: string) {
    const instance = instancesRepository.get(id);
    if (!instance) throw new AppError("INSTANCE_NOT_FOUND", "Instance not found", 404);
    if (!adbId.trim()) throw new AppError("ADB_ID_REQUIRED", "adbId is required", 400);

    let validated = false;
    const hostTarget = publicHostTargetForInstance(instance.hostId);
    if (hostTarget) {
      const data = await hostAgentClient.listAdbDevices(hostTarget.target);
      validated = normalizeDevices(data).some((device) => (
        String(device.adbId ?? "") === adbId
        && ["device", "online"].includes(String(device.state ?? "").toLowerCase())
      ));
      if (!validated) throw new AppError("ADB_DEVICE_NOT_AVAILABLE", "ADB device is not online for this host", 400);
    }

    return instancesRepository.setManualAdbMapping(id, adbId.trim(), validated);
  },
  clearAdbMapping: (id: string) => instancesRepository.clearAdbMapping(id)
};

export { instancePoolStates };
