import { config } from "../../config";
import { db } from "../../database/db";
import { runtimeSessionsService } from "../runtime-sessions/runtime-sessions.service";
import { instancesRepository } from "../instances/instances.repository";
import { AppError, createId, now } from "../shared/resource";
import { hostAgentClient } from "./host-agent.client";
import type {
  CreateHostInput,
  DownloadLatestCommandInput,
  SendKeyCommandInput,
  SendTextCommandInput,
  SwipeCommandInput,
  TapCommandInput
} from "./host-agent.schemas";

function mapHost(row: Record<string, unknown>) {
  return {
    id: row.id,
    hostId: row.host_id,
    name: row.name,
    baseUrl: row.base_url,
    apiKey: row.api_key ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function publicHost(host: ReturnType<typeof mapHost>) {
  return {
    ...host,
    apiKey: host.apiKey ? "***" : null
  };
}

function canonicalInstanceId(hostId: string, localId: string) {
  return `${hostId}-ld-${localId}`;
}

function normalizeHostInstances(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const instances = (value as { instances?: unknown }).instances;
  if (!Array.isArray(instances)) return [];
  return instances.map((item) => item as Record<string, unknown>);
}

function normalizeAdbDevices(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const devices = (value as { devices?: unknown }).devices;
  if (!Array.isArray(devices)) return [];
  return devices.map((item) => item as Record<string, unknown>);
}

export const hostAgentService = {
  listHosts() {
    return db.prepare("SELECT * FROM hosts ORDER BY created_at DESC")
      .all()
      .map((row) => publicHost(mapHost(row as Record<string, unknown>)));
  },

  createHost(input: CreateHostInput) {
    const id = createId("host");
    const timestamp = now();

    db.prepare(`
      INSERT INTO hosts (
        id, host_id, name, base_url, api_key, status, created_at, updated_at
      ) VALUES (
        @id, @hostId, @name, @baseUrl, @apiKey, @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      hostId: input.hostId,
      name: input.name,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey ?? null,
      status: input.status,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return publicHost(this.getHostRequired(id));
  },

  deleteHost(idOrHostId: string) {
    const host = this.getHostRequired(idOrHostId);
    const deleted = db.prepare("DELETE FROM hosts WHERE id = ?").run(host.id).changes > 0;
    if (!deleted) throw new AppError("HOST_NOT_FOUND", "Host not found", 404);
    return {
      deleted: true,
      host: publicHost(host)
    };
  },

  getHost(idOrHostId: string) {
    const row = db.prepare(`
      SELECT * FROM hosts
      WHERE id = ? OR host_id = ?
      LIMIT 1
    `).get(idOrHostId, idOrHostId);

    return row ? mapHost(row as Record<string, unknown>) : null;
  },

  getHostRequired(idOrHostId: string) {
    const host = this.getHost(idOrHostId);
    if (!host) throw new AppError("HOST_NOT_FOUND", "Host not found", 404);
    return host;
  },

  getDefaultHost() {
    const row = db.prepare(`
      SELECT * FROM hosts
      WHERE UPPER(status) = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    return row ? mapHost(row as Record<string, unknown>) : null;
  },

  targetForHost(idOrHostId: string) {
    const host = this.getHostRequired(idOrHostId);
    return {
      host,
      target: {
        baseUrl: String(host.baseUrl),
        apiKey: String(host.apiKey || config.hostAgentApiKey)
      }
    };
  },

  async healthCheckAgent(hostId: string) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      health: await hostAgentClient.healthCheckAgent(target)
    };
  },

  async syncInstances(hostId: string) {
    const { host, target } = this.targetForHost(hostId);
    const [instancePayload, adbPayload] = await Promise.all([
      hostAgentClient.listInstances(target),
      hostAgentClient.listAdbDevices(target).catch(() => ({ devices: [] }))
    ]);
    const discovered = normalizeHostInstances(instancePayload);
    const devices = normalizeAdbDevices(adbPayload);
    const timestamp = now();

    const synced = discovered.map((item, index) => {
      const localId = String(item.localId ?? item.index ?? item.id ?? index);
      const adbDevice = devices[index];
      const adbId = typeof item.adbId === "string"
        ? item.adbId
        : typeof adbDevice?.adbId === "string"
          ? adbDevice.adbId
          : null;
      return instancesRepository.upsert({
        id: canonicalInstanceId(String(host.hostId), localId),
        hostId: String(host.hostId),
        localId,
        name: typeof item.name === "string" ? item.name : `LDPlayer ${localId}`,
        adbId,
        status: adbId ? "ONLINE" : "DISCOVERED",
        runtimeStatus: "IDLE",
        metadata: {
          raw: item,
          adbDevice: adbDevice ?? null,
          hostDbId: host.id
        },
        lastSeenAt: timestamp
      });
    }).filter(Boolean);

    instancesRepository.markMissingForHost(String(host.hostId), synced.map((item) => String(item?.id)));

    return {
      host: publicHost(host),
      instances: instancesRepository.listByHost(String(host.hostId))
    };
  },

  async startInstance(hostId: string, localId: string) {
    const { host, target } = this.targetForHost(hostId);
    return { host: publicHost(host), result: await hostAgentClient.startInstance(target, localId) };
  },

  async stopInstance(hostId: string, localId: string) {
    const { host, target } = this.targetForHost(hostId);
    return { host: publicHost(host), result: await hostAgentClient.stopInstance(target, localId) };
  },

  async restartInstance(hostId: string, localId: string) {
    const { host, target } = this.targetForHost(hostId);
    return { host: publicHost(host), result: await hostAgentClient.restartInstance(target, localId) };
  },

  async takeScreenshot(hostId: string, input: { instanceId: string; adbId: string }) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.takeScreenshot(target, input.instanceId, input.adbId)
    };
  },

  async tap(hostId: string, input: TapCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.tap(target, input.instanceId, input.adbId, input.x, input.y)
    };
  },

  async swipe(hostId: string, input: SwipeCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.swipe(target, input)
    };
  },

  async sendText(hostId: string, input: SendTextCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.sendText(target, input.instanceId, input.adbId, input.text)
    };
  },

  async sendKey(hostId: string, input: SendKeyCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.sendKey(target, input.instanceId, input.adbId, input.key)
    };
  },

  async downloadLatest(hostId: string, input: DownloadLatestCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.downloadLatest(target, input)
    };
  },

  async testRuntimeScreenshot(runtimeSessionId: string) {
    const session = runtimeSessionsService.getSession(runtimeSessionId);

    if (typeof session.hostId !== "string" || !session.hostId) {
      throw new AppError("RUNTIME_SESSION_HOST_REQUIRED", "Runtime session must include hostId");
    }

    if (typeof session.instanceId !== "string" || !session.instanceId) {
      throw new AppError("RUNTIME_SESSION_INSTANCE_REQUIRED", "Runtime session must include instanceId");
    }

    const stepNo = Number(session.currentStepNo ?? 0) + 1;
    const step = runtimeSessionsService.createRuntimeStep(runtimeSessionId, {
      stepNo,
      stepType: "TEST_SCREENSHOT",
      status: "RUNNING",
      input: {
        hostId: session.hostId,
        instanceId: session.instanceId
      },
      output: {}
    });

    try {
      const checkpoint = session.checkpoint && typeof session.checkpoint === "object"
        ? session.checkpoint as Record<string, unknown>
        : {};
      const context = session.context && typeof session.context === "object"
        ? session.context as Record<string, unknown>
        : {};
      const adbId = typeof checkpoint.adbId === "string"
        ? checkpoint.adbId
        : typeof context.adbId === "string"
          ? context.adbId
          : "";

      if (!adbId) {
        throw new AppError("ADB_ID_REQUIRED", "adbId is required", 400);
      }

      const output = await this.takeScreenshot(session.hostId, {
        instanceId: session.instanceId,
        adbId
      });
      const completedStep = runtimeSessionsService.updateRuntimeStep(String(step.id), {
        status: "COMPLETED",
        output
      });
      runtimeSessionsService.saveCheckpoint(runtimeSessionId, {
        currentStepNo: stepNo,
        context: {
          lastScreenshot: output
        },
        checkpoint: {
          lastStepId: step.id,
          lastScreenshot: output
        }
      });

      return {
        session: runtimeSessionsService.getSession(runtimeSessionId),
        step: completedStep
      };
    } catch (error) {
      runtimeSessionsService.updateRuntimeStep(String(step.id), {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Screenshot failed"
      });
      throw error;
    }
  }
};
