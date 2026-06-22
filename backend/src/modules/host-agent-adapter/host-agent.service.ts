import { config } from "../../config";
import fs from "node:fs";
import path from "node:path";
import { db } from "../../database/db";
import { assetsService } from "../assets/assets.service";
import { runtimeSessionsService } from "../runtime-sessions/runtime-sessions.service";
import { instancesRepository } from "../instances/instances.repository";
import { AppError, createId, now } from "../shared/resource";
import { hostAgentClient } from "./host-agent.client";
import type {
  CreateHostInput,
  ClearDownloadCommandInput,
  DownloadLatestCommandInput,
  InstanceCommandInput,
  ListDownloadCandidatesCommandInput,
  LiveScreenshotCommandInput,
  CleanupOldTempCommandInput,
  CleanupUploadSessionCommandInput,
  LongPressCommandInput,
  OpenFileCommandInput,
  PushUploadFileCommandInput,
  ScrollToEndCommandInput,
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

function normalizeHostStorageUrl(host: ReturnType<typeof mapHost>, value: unknown) {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const hostFilePath = typeof record.hostFilePath === "string" ? record.hostFilePath : "";
  if (!hostFilePath) return value;
  const storagePath = `/storage/${hostFilePath.replace(/\\/g, "/").split("/").map(encodeURIComponent).join("/")}`;
  const url = `${String(host.baseUrl).replace(/\/+$/, "")}${storagePath}`;
  return {
    ...record,
    publicUrl: url,
    screenshotUrl: typeof record.screenshotUrl === "string" ? url : record.screenshotUrl,
    url: typeof record.url === "string" ? url : record.url
  };
}

function ensureInsideStorageRoot(filePath: string) {
  const root = path.resolve(config.storageRoot);
  const resolved = path.resolve(filePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new AppError("ASSET_FILE_OUTSIDE_STORAGE_ROOT", "Asset file must be stored under STORAGE_ROOT", 400);
  }
  return resolved;
}

function resolveAssetSourceFile(assetId: string) {
  const asset = assetsService.get(assetId);
  if (!asset) throw new AppError("ASSET_NOT_FOUND", "Asset not found", 404);
  if (!asset.filePath) throw new AppError("ASSET_FILE_NOT_AVAILABLE", "Asset does not have a filePath", 400);

  const candidate = path.isAbsolute(asset.filePath)
    ? asset.filePath
    : path.resolve(config.storageRoot, asset.filePath);
  const sourceAbsolutePath = ensureInsideStorageRoot(candidate);
  if (!fs.existsSync(sourceAbsolutePath) || !fs.statSync(sourceAbsolutePath).isFile()) {
    throw new AppError("ASSET_FILE_NOT_FOUND", "Asset file does not exist on disk", 404);
  }

  const sourceExtension = path.extname(sourceAbsolutePath);
  const assetName = typeof asset.name === "string" && asset.name.trim() ? asset.name.trim() : "";
  const assetNameWithExtension = assetName
    ? path.extname(assetName) ? assetName : `${assetName}${sourceExtension}`
    : path.basename(sourceAbsolutePath);

  return {
    asset,
    sourceAbsolutePath,
    fileName: assetNameWithExtension || path.basename(sourceAbsolutePath)
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

function normalizeHostAdbDevices(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const devices = (value as { adbDevices?: unknown }).adbDevices;
  if (!Array.isArray(devices)) return [];
  return devices.map((item) => item as Record<string, unknown>);
}

function directAdbId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizedText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function trustedMappingConfidence(value: unknown) {
  const confidence = normalizedText(value);
  return ["direct", "derived", "manual"].includes(confidence) ? confidence : null;
}

function isStoppedOrOffline(item: Record<string, unknown>) {
  const ldStatus = normalizedText(item.ldStatus);
  const adbStatus = normalizedText(item.adbStatus);
  const status = normalizedText(item.status);
  return ["stopped", "offline"].includes(ldStatus)
    || ["offline", "stopped"].includes(adbStatus)
    || ["offline", "stopped"].includes(status);
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

  async listAdbDevices(hostId: string) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      devices: await hostAgentClient.listAdbDevices(target)
    };
  },

  async syncInstances(hostId: string) {
    const { host, target } = this.targetForHost(hostId);
    const instancePayload = await hostAgentClient.listInstances(target);
    const discovered = normalizeHostInstances(instancePayload);
    const payloadAdbDevices = normalizeHostAdbDevices(instancePayload);
    const timestamp = now();

    const synced = discovered.map((item, index) => {
      const localId = String(item.localId ?? item.index ?? item.id ?? index);
      const id = canonicalInstanceId(String(host.hostId), localId);
      const existing = instancesRepository.get(id);
      const confidence = trustedMappingConfidence(item.adbMappingConfidence);
      const stoppedOrOffline = isStoppedOrOffline(item);
      const manualAdbId = directAdbId(existing?.manualAdbId);
      const manualStillOnline = Boolean(manualAdbId && !stoppedOrOffline && payloadAdbDevices.some((device) => (
        directAdbId(device.adbId) === manualAdbId
        && ["device", "online"].includes(normalizedText(device.state))
      )));
      const agentAdbId = !stoppedOrOffline && confidence ? directAdbId(item.adbId) : null;
      const mappedAdbId = manualStillOnline ? manualAdbId : agentAdbId;
      const adbMappingConfidence = manualStillOnline ? "manual" : mappedAdbId ? confidence : "unknown";
      const mappingSource = manualStillOnline ? "manual" : mappedAdbId ? String(item.mappingSource ?? confidence) : "none";
      const status = stoppedOrOffline
        ? (normalizedText(item.ldStatus) === "stopped" ? "STOPPED" : "OFFLINE")
        : mappedAdbId ? "ONLINE" : "DISCOVERED";
      return instancesRepository.upsert({
        id,
        hostId: String(host.hostId),
        localId,
        name: typeof item.name === "string" ? item.name : `LDPlayer ${localId}`,
        adbId: mappedAdbId,
        status,
        runtimeStatus: mappedAdbId ? "IDLE" : stoppedOrOffline ? "INACTIVE" : "IDLE",
        metadata: {
          ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
          raw: item,
          adbMappingConfidence,
          mappingSource,
          adbMappingUpdatedAt: timestamp,
          hostDbId: host.id
        },
        adbMappingConfidence,
        adbMappingSource: mappingSource,
        adbMappingUpdatedAt: timestamp,
        manualAdbId: manualAdbId ?? (confidence === "manual" && mappedAdbId ? mappedAdbId : null),
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
    const result = await hostAgentClient.takeScreenshot(target, input.instanceId, input.adbId);
    return {
      host: publicHost(host),
      result: normalizeHostStorageUrl(host, result)
    };
  },

  async takeLiveScreenshot(hostId: string, input: LiveScreenshotCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    const result = await hostAgentClient.takeLiveScreenshot(target, input);
    return {
      host: publicHost(host),
      result: normalizeHostStorageUrl(host, result)
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

  async longPress(hostId: string, input: LongPressCommandInput & { localId?: string | number }) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.longPress(target, input)
    };
  },

  async scrollToEnd(hostId: string, input: ScrollToEndCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.scrollToEnd(target, input)
    };
  },

  async sendText(hostId: string, input: SendTextCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.sendText(target, input)
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

  async listDownloadCandidates(hostId: string, input: ListDownloadCandidatesCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.listDownloadCandidates(target, input)
    };
  },

  async listDownloadFolder(hostId: string, input: ListDownloadCandidatesCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.listDownloadFolder(target, input)
    };
  },

  async clearDownload(hostId: string, input: ClearDownloadCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.clearDownload(target, input)
    };
  },

  async pushUploadFile(hostId: string, input: PushUploadFileCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    const source = resolveAssetSourceFile(input.assetId);
    return {
      host: publicHost(host),
      asset: source.asset,
      result: await hostAgentClient.pushUploadFile(target, {
        instanceId: input.instanceId,
        localId: input.localId,
        adbId: input.adbId,
        runtimeSessionId: input.runtimeSessionId,
        jobId: input.jobId,
        assetId: input.assetId,
        sourceAbsolutePath: source.sourceAbsolutePath,
        sourceBase64: fs.readFileSync(source.sourceAbsolutePath).toString("base64"),
        fileName: source.fileName
      })
    };
  },

  async openFile(hostId: string, input: OpenFileCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.openFile(target, input)
    };
  },

  async cleanupUploadSession(hostId: string, input: CleanupUploadSessionCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.cleanupUploadSession(target, input)
    };
  },

  async cleanupUploadStaging(hostId: string, input: CleanupOldTempCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.cleanupUploadStaging(target, input)
    };
  },

  async cleanupFactoryTemp(hostId: string, input: CleanupOldTempCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.cleanupFactoryTemp(target, input)
    };
  },

  async factoryTempUsage(hostId: string, input: InstanceCommandInput) {
    const { host, target } = this.targetForHost(hostId);
    return {
      host: publicHost(host),
      result: await hostAgentClient.factoryTempUsage(target, input)
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
