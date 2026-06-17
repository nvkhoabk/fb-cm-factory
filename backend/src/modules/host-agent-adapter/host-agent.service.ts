import { config } from "../../config";
import { db } from "../../database/db";
import { runtimeSessionsService } from "../runtime-sessions/runtime-sessions.service";
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

  async takeScreenshot(hostId: string, instanceId: string) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.takeScreenshot(target, instanceId)
    };
  },

  async tap(hostId: string, input: TapCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.tap(target, input.instanceId, input.x, input.y)
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
      result: await hostAgentClient.sendText(target, input.instanceId, input.text)
    };
  },

  async sendKey(hostId: string, input: SendKeyCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.sendKey(target, input.instanceId, input.key)
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
      const output = await this.takeScreenshot(session.hostId, session.instanceId);
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
