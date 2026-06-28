import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { config } from "../../config";
import { assetsService } from "../assets/assets.service";
import { hostAgentService } from "../host-agent-adapter/host-agent.service";
import { AppError, now } from "../shared/resource";
import { storageService } from "../storage/storage.service";
import { screenTemplateService } from "../screen-templates/screen-template.service";
import { errorCenterRepository } from "./error-center.repository";
import type { AttachRecoveryScriptInput, CreateScreenTemplateFromErrorInput, UpdateErrorEventInput } from "./error-center.schemas";

function errorCode(error: unknown) {
  if (error instanceof AppError) return error.code;
  if (error && typeof error === "object" && "code" in error) return String((error as { code?: unknown }).code ?? "STEP_FAILED");
  return error instanceof Error ? error.name || "STEP_FAILED" : "STEP_FAILED";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "Step failed");
}

function findUrl(value: unknown): string | null {
  if (typeof value === "string" && (/^https?:\/\//i.test(value) || value.startsWith("/storage/"))) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = findUrl(item);
      if (found) return found;
    }
  }
  return null;
}

function findStringByKey(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, keys);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === "string" && String(record[key]).trim()) return String(record[key]);
  }
  for (const item of Object.values(record)) {
    const found = findStringByKey(item, keys);
    if (found) return found;
  }
  return null;
}

function extensionFromContentType(value: string | null) {
  const contentType = String(value ?? "").toLowerCase();
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  return ".png";
}

async function downloadBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new AppError("ERROR_SCREENSHOT_DOWNLOAD_FAILED", `Could not download error screenshot: ${response.status}`, 502);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer,
    mimeType: response.headers.get("content-type") ?? "image/png"
  };
}

async function materializeScreenshot(screenshotResult: unknown, eventId: string) {
  const directPath = findStringByKey(screenshotResult, ["absolutePath", "filePath"]);
  const hostFilePath = findStringByKey(screenshotResult, ["hostFilePath"]);
  const url = findUrl(screenshotResult);
  let buffer: Buffer;
  let mimeType = "image/png";
  let sourceUrl = url ?? directPath ?? hostFilePath ?? "";
  if (directPath && fs.existsSync(directPath)) {
    buffer = fs.readFileSync(directPath);
    mimeType = path.extname(directPath).toLowerCase() === ".jpg" || path.extname(directPath).toLowerCase() === ".jpeg" ? "image/jpeg" : "image/png";
  } else if (hostFilePath) {
    const candidate = path.resolve(config.storageRoot, ...hostFilePath.replace(/\\/g, "/").split("/"));
    if (fs.existsSync(candidate)) {
      buffer = fs.readFileSync(candidate);
      mimeType = path.extname(candidate).toLowerCase() === ".jpg" || path.extname(candidate).toLowerCase() === ".jpeg" ? "image/jpeg" : "image/png";
      sourceUrl = hostFilePath;
    } else if (url) {
      if (url.startsWith("/storage/")) {
        const localPath = path.resolve(config.storageRoot, ...url.replace(/^\/storage\/?/, "").split("/"));
        if (!fs.existsSync(localPath)) throw new AppError("ERROR_SCREENSHOT_FILE_NOT_FOUND", `Error screenshot file does not exist: ${localPath}`, 404);
        buffer = fs.readFileSync(localPath);
        mimeType = path.extname(localPath).toLowerCase() === ".jpg" || path.extname(localPath).toLowerCase() === ".jpeg" ? "image/jpeg" : "image/png";
      } else {
        const downloaded = await downloadBuffer(url);
        buffer = downloaded.buffer;
        mimeType = downloaded.mimeType;
      }
    } else {
      return null;
    }
  } else if (url) {
    if (url.startsWith("/storage/")) {
      const localPath = path.resolve(config.storageRoot, ...url.replace(/^\/storage\/?/, "").split("/"));
      if (!fs.existsSync(localPath)) throw new AppError("ERROR_SCREENSHOT_FILE_NOT_FOUND", `Error screenshot file does not exist: ${localPath}`, 404);
      buffer = fs.readFileSync(localPath);
      mimeType = path.extname(localPath).toLowerCase() === ".jpg" || path.extname(localPath).toLowerCase() === ".jpeg" ? "image/jpeg" : "image/png";
    } else {
      const downloaded = await downloadBuffer(url);
      buffer = downloaded.buffer;
      mimeType = downloaded.mimeType;
    }
  } else {
    return null;
  }
  const storageKey = `error-screenshots/${eventId}/failure-${randomUUID()}${extensionFromContentType(mimeType)}`;
  const filePath = path.resolve(config.storageRoot, ...storageKey.split("/"));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return {
    storageKey,
    filePath,
    publicUrl: storageService.publicUrlForKey(storageKey),
    mimeType,
    fileSize: buffer.length,
    checksum: createHash("sha256").update(buffer).digest("hex"),
    sourceUrl
  };
}

function errorSnapshot(error: unknown) {
  return {
    code: errorCode(error),
    message: errorMessage(error),
    name: error instanceof Error ? error.name : undefined,
    detail: error instanceof AppError ? error.detail : error && typeof error === "object" && "detail" in error ? (error as { detail?: unknown }).detail : undefined
  };
}

export const errorCenterService = {
  listEvents: (query: Record<string, unknown>) => errorCenterRepository.listEvents(query),
  getEvent(id: string) {
    const event = errorCenterRepository.getEvent(id);
    if (!event) throw new AppError("ERROR_EVENT_NOT_FOUND", "Error event not found", 404);
    return event;
  },
  kpis: () => errorCenterRepository.kpis(),
  listRecoveryRules: () => errorCenterRepository.listRecoveryRules(),
  findRecoveryRule: (screenTemplateId: string) => errorCenterRepository.findRecoveryRule(screenTemplateId),

  updateEvent(id: string, input: UpdateErrorEventInput) {
    const event = errorCenterRepository.updateEvent(id, input);
    if (!event) throw new AppError("ERROR_EVENT_NOT_FOUND", "Error event not found", 404);
    return event;
  },

  async captureRuntimeStepError(input: {
    runtimeSessionId: string;
    scriptRunId: string;
    stepNo: number;
    hostId?: string | null;
    instanceId?: string | null;
    adbId?: string | null;
    error: unknown;
    context?: Record<string, unknown>;
  }) {
    const placeholder = errorCenterRepository.createEvent({
      runtimeSessionId: input.runtimeSessionId,
      scriptRunId: input.scriptRunId,
      stepNo: input.stepNo,
      hostId: input.hostId ?? null,
      instanceId: input.instanceId ?? null,
      adbId: input.adbId ?? null,
      errorCode: errorCode(input.error),
      errorMessage: errorMessage(input.error),
      screenshotAssetId: null,
      screenshotFilePath: null,
      screenshotPublicUrl: null,
      screenshotThumbnailUrl: null,
      metadata: {
        context: input.context ?? {},
        capturedAt: now(),
        originalError: errorSnapshot(input.error)
      }
    });
    if (!placeholder?.id) return placeholder;

    let screenshotAssetId: string | null = null;
    if (input.hostId && input.instanceId && input.adbId) {
      try {
        const screenshot = await hostAgentService.takeScreenshot(input.hostId, {
          instanceId: input.instanceId,
          adbId: input.adbId
        });
        const stored = await materializeScreenshot(screenshot, placeholder.id);
        if (stored) {
          const asset = await assetsService.create({
            name: `Error Screenshot ${placeholder.id}`,
            assetType: "ERROR_SCREENSHOT",
            assetCategory: "PRODUCTION_RESOURCE",
            assetSubType: "ERROR_SCREENSHOT",
            mediaType: "image",
            versionNo: 1,
            isBestVersion: false,
            storageProvider: "local",
            storageKey: stored.storageKey,
            filePath: stored.filePath,
            publicUrl: stored.publicUrl,
            previewUrl: stored.publicUrl,
            mimeType: stored.mimeType,
            fileSize: stored.fileSize,
            checksum: stored.checksum,
            status: "available",
            usageStatus: "available",
            usagePolicy: "diagnostic",
            qualityStatus: "debug",
            tags: ["error", "runtime", String(input.error instanceof Error ? input.error.name : "step")],
            attributes: {},
            metadata: {
              errorEventId: placeholder.id,
              runtimeSessionId: input.runtimeSessionId,
              scriptRunId: input.scriptRunId,
              stepNo: input.stepNo,
              hostId: input.hostId,
              instanceId: input.instanceId,
              adbId: input.adbId,
              sourceUrl: stored.sourceUrl,
              capturedAt: now(),
              context: input.context ?? {}
            }
          });
          screenshotAssetId = typeof asset?.id === "string" ? asset.id : null;
          if (screenshotAssetId) {
            const assetRecord = asset as NonNullable<typeof asset>;
            return errorCenterRepository.setScreenshot({
              id: placeholder.id,
              screenshotAssetId,
              screenshotFilePath: typeof assetRecord.filePath === "string" ? assetRecord.filePath : stored.filePath,
              screenshotPublicUrl: typeof assetRecord.publicUrl === "string" ? assetRecord.publicUrl : stored.publicUrl,
              screenshotThumbnailUrl: typeof assetRecord.thumbnailPublicUrl === "string" ? assetRecord.thumbnailPublicUrl : stored.publicUrl,
              metadata: {
                sourceUrl: stored.sourceUrl,
                screenshotStorageKey: stored.storageKey
              }
            });
          }
        }
      } catch (captureError) {
        const captureSnapshot = errorSnapshot(captureError);
        console.warn("[error-center] failed to capture error screenshot", {
          originalError: errorSnapshot(input.error),
          screenshotCaptureError: captureSnapshot,
          runtimeSessionId: input.runtimeSessionId,
          scriptRunId: input.scriptRunId,
          stepNo: input.stepNo,
          hostId: input.hostId,
          instanceId: input.instanceId,
          adbId: input.adbId
        });
        errorCenterRepository.updateMetadata(placeholder.id, {
          screenshotCaptureFailed: true,
          screenshotCaptureError: captureSnapshot.message,
          screenshotCaptureErrorDetail: captureSnapshot,
          originalError: errorSnapshot(input.error)
        });
      }
    }

    return screenshotAssetId ? errorCenterRepository.setScreenshotAsset(placeholder.id, screenshotAssetId) : placeholder;
  },

  createScreenTemplateFromError(id: string, input: CreateScreenTemplateFromErrorInput) {
    const event = this.getEvent(id);
    const asset = event.screenshotAsset as Record<string, unknown> | null;
    if (!asset?.id && !event.screenshotPublicUrl) throw new AppError("ERROR_SCREENSHOT_REQUIRED", "Error event does not have a screenshot", 400);
    return screenTemplateService.create({
      name: input.name ?? `${event.errorCode ?? "Error"} ${event.id}`,
      category: input.category,
      matchType: input.matchType,
      templateType: input.matchType,
      templateImageAssetId: asset?.id ? String(asset.id) : null,
      templateImagePath: typeof asset?.filePath === "string" ? asset.filePath : event.screenshotFilePath ?? null,
      templateImageUrl: typeof asset?.publicUrl === "string" ? asset.publicUrl : event.screenshotPublicUrl ?? null,
      templateThumbnailUrl: typeof asset?.thumbnailPublicUrl === "string" ? asset.thumbnailPublicUrl : event.screenshotThumbnailUrl ?? event.screenshotPublicUrl ?? null,
      threshold: input.threshold,
      status: "DRAFT",
      description: `Created from error event ${event.id}`,
      metadata: {
        errorEventId: event.id,
        runtimeSessionId: event.runtimeSessionId,
        scriptRunId: event.scriptRunId,
        stepNo: event.stepNo,
        errorCode: event.errorCode
      },
      region: {},
      ocrText: null
    });
  },

  attachRecoveryScript(id: string, input: AttachRecoveryScriptInput) {
    const event = this.getEvent(id);
    const screenTemplateId = input.screenTemplateId;
    if (!screenTemplateId) throw new AppError("SCREEN_TEMPLATE_REQUIRED", "screenTemplateId is required to attach recovery script", 400);
    const rule = errorCenterRepository.createRecoveryRule({
      screenTemplateId,
      recoveryScriptId: input.recoveryScriptId,
      enabled: input.enabled,
      priority: input.priority,
      notes: input.notes
    });
    const updated = errorCenterRepository.updateEvent(id, {
      status: "AUTO_RECOVERABLE",
      classification: event.classification ?? "UNKNOWN",
      resolutionType: "RECOVERY_SCRIPT",
      recoveryScriptId: input.recoveryScriptId
    });
    return { event: updated, recoveryRule: rule };
  }
};
