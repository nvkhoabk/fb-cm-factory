import fs from "node:fs";
import path from "node:path";
import { adbClient } from "../adb/adb.client";
import { config } from "../config";
import { downloadLatestService, type DownloadLatestInput } from "../storage/download-latest.service";
import { storageService } from "../storage/storage.service";

export type PointInput = {
  adbId: string;
  x: number;
  y: number;
};

export type SwipeInput = {
  adbId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  durationMs?: number;
};

export type TextInput = {
  adbId: string;
  text: unknown;
};

export type KeyInput = {
  adbId: string;
  keyCode: string | number;
};

export type PushUploadFileInput = {
  instanceId?: string;
  adbId: string;
  runtimeSessionId?: string;
  jobId?: string;
  assetId: string;
  sourceAbsolutePath: string;
  sourceBase64?: string;
  fileName?: string;
};

export type OpenFileInput = {
  adbId: string;
  remotePath: string;
  mimeType?: string;
};

export type CleanupUploadSessionInput = {
  adbId: string;
  runtimeSessionId: string;
};

export type CleanupOldTempInput = {
  adbId: string;
  olderThanHours?: number;
  includeUploads?: boolean;
  includeLiveScreenshots?: boolean;
  includeDebugScreenshots?: boolean;
};

function requireAdbId(adbId: unknown) {
  if (typeof adbId !== "string" || !adbId) {
    throw new Error("adbId is required");
  }
  return adbId;
}

function commandError(code: string, message: string, cause?: unknown) {
  const error = new Error(message);
  error.name = code;
  if (cause) {
    (error as Error & { cause?: unknown }).cause = cause;
  }
  return error;
}

export function encodeTextToBase64(text: string) {
  return Buffer.from(text, "utf8").toString("base64");
}

function requireText(text: unknown) {
  if (typeof text !== "string") {
    throw commandError("TEXT_REQUIRED", "text must be a string");
  }
  return text;
}

function outputLooksLikeMissingAdbKeyboard(stdout: string, stderr: string) {
  return /unknown|not found|not selected|does not exist|error/i.test(`${stdout}\n${stderr}`);
}

function safePathSegment(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "instance";
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function safeRemoteFileName(value: string) {
  return path.basename(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "upload-file";
}

function fileNameWithFallbackExtension(fileName: string, sourceAbsolutePath: string) {
  const safeName = safeRemoteFileName(fileName || path.basename(sourceAbsolutePath));
  if (path.extname(safeName)) return safeName;
  const extension = path.extname(sourceAbsolutePath);
  return extension ? `${safeName}${extension}` : safeName;
}

function timestampForFileName(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function uploadRemoteDir() {
  return "/sdcard/fb-cm-factory/uploads";
}

function localUploadSourcePath(fileName: string, sourceBase64: string) {
  const folder = storageService.ensureTargetFolder("upload-sources");
  const absolutePath = path.join(folder.absolutePath, fileName);
  fs.writeFileSync(absolutePath, Buffer.from(sourceBase64, "base64"));
  return absolutePath;
}

function oldEntriesCleanupCommand(baseDir: string, olderThanHours: number) {
  const minutes = Math.max(1, Math.floor(olderThanHours * 60));
  return [
    `dir=${shellQuote(baseDir)}`,
    `[ -d "$dir" ] || exit 0`,
    `find "$dir" -mindepth 1 -mmin +${minutes} -exec rm -rf {} \\;`
  ].join("; ");
}

function tempUsageCommand() {
  return `for item in uploads:/sdcard/fb-cm-factory/uploads temp:/sdcard/fb-cm-factory/temp live:/sdcard/fb-cm-factory/live screenshots:/sdcard/fb-cm-factory/screenshots; do name="\${item%%:*}"; dir="\${item#*:}"; if [ -d "$dir" ]; then bytes=$(du -s "$dir" 2>/dev/null | awk '{print $1 * 1024}'); else bytes=0; fi; printf '%s=%s\\n' "$name" "\${bytes:-0}"; done`;
}

function mockPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAYAAADtt+XCAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBQQ0xpcCByZW5kZXJlcjSByy0AAARNSURBVHic7d1BbsIwEABB//9lOAuItjQq2h5UIJY9kMGEiPWrUfTAcQzDMEzbsT4A4Oe1+wAA8J0ECAIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEGQ7vcBvE5hMzs7hWwAAAAASUVORK5CYII=",
    "base64"
  );
}

function validMockPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x02,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x72, 0xb6, 0x0e, 0x7b, 0x00, 0x00, 0x00,
    0x16, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0xfc, 0xcf, 0xc0, 0xf0,
    0x9f, 0x01, 0x09, 0x30, 0x31, 0xa0, 0x01, 0xc5, 0x3b, 0x00, 0x15, 0xe3,
    0x03, 0xfd, 0xd6, 0x46, 0xf6, 0x66, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
    0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
}

function debugInteraction(action: string, details: Record<string, unknown>) {
  console.info(`[host-agent][interaction] ${action} ${JSON.stringify(details)}`);
}

function normalizeKeyCode(keyCode: string | number) {
  if (typeof keyCode === "number") return keyCode;
  const normalized = String(keyCode).trim().toUpperCase();
  return ({
    BACK: 4,
    HOME: 3,
    ENTER: 66,
    TAB: 61
  } as Record<string, number>)[normalized] ?? keyCode;
}

export const instanceCommands = {
  async liveScreenshot(instanceId: string, adbId: string) {
    requireAdbId(adbId);
    const safeInstanceId = safePathSegment(instanceId);
    const remoteDir = "/sdcard/fb-cm-factory/live";
    const remotePath = `${remoteDir}/live-${safeInstanceId}.png`;
    const folder = storageService.ensureTargetFolder(path.join("live-screenshots", safeInstanceId));
    const absolutePath = path.join(folder.absolutePath, "latest.png");

    if (config.mockMode) {
      fs.writeFileSync(absolutePath, validMockPngBuffer());
    } else {
      await adbClient.runAdb(["-s", adbId, "shell", "mkdir", "-p", remoteDir]);
      await adbClient.runAdb(["-s", adbId, "shell", "screencap", "-p", remotePath]);
      await adbClient.runAdb(["-s", adbId, "pull", remotePath, absolutePath]);
    }

    const result = storageService.storageFileResult(absolutePath, folder.safeFolder);
    return {
      instanceId,
      adbId,
      screenshotUrl: result.publicUrl,
      absolutePath: result.absolutePath,
      hostFilePath: result.hostFilePath,
      timestamp: new Date().toISOString()
    };
  },

  async screenshot(instanceId: string, adbId: string) {
    return this.liveScreenshot(instanceId, adbId);
  },

  async tap(input: PointInput) {
    requireAdbId(input.adbId);
    debugInteraction("tap", { adbId: input.adbId, x: input.x, y: input.y });
    return adbClient.runAdb(["-s", input.adbId, "shell", "input", "tap", String(input.x), String(input.y)]);
  },

  async swipe(input: SwipeInput) {
    requireAdbId(input.adbId);
    debugInteraction("swipe", {
      adbId: input.adbId,
      x1: input.x1,
      y1: input.y1,
      x2: input.x2,
      y2: input.y2,
      durationMs: input.durationMs ?? 300
    });
    return adbClient.runAdb([
      "-s",
      input.adbId,
      "shell",
      "input",
      "swipe",
      String(input.x1),
      String(input.y1),
      String(input.x2),
      String(input.y2),
      String(input.durationMs ?? 300)
    ]);
  },

  async sendText(input: TextInput) {
    const adbId = requireAdbId(input.adbId);
    const text = requireText(input.text);
    const base64Text = encodeTextToBase64(text);
    debugInteraction("send-text", {
      adbId,
      method: "ADB_INPUT_B64",
      textLength: text.length,
      useAdbKeyboard: config.useAdbKeyboard
    });

    if (config.useAdbKeyboard) {
      try {
        const imeResult = await adbClient.runAdb(["-s", adbId, "shell", "ime", "set", "com.android.adbkeyboard/.AdbIME"]);
        if (outputLooksLikeMissingAdbKeyboard(imeResult.stdout, imeResult.stderr)) {
          throw commandError("ADB_KEYBOARD_NOT_AVAILABLE", "ADB Keyboard IME is not available or could not be selected");
        }
      } catch (error) {
        if (error instanceof Error && error.name === "ADB_KEYBOARD_NOT_AVAILABLE") throw error;
        throw commandError("ADB_KEYBOARD_NOT_AVAILABLE", "ADB Keyboard IME is not available or could not be selected", error);
      }
    }

    try {
      await adbClient.runAdb([
        "-s",
        adbId,
        "shell",
        "am",
        "broadcast",
        "-a",
        "ADB_INPUT_B64",
        "--es",
        "msg",
        base64Text
      ]);
    } catch (error) {
      throw commandError("SEND_TEXT_FAILED", "Failed to send text through ADB_INPUT_B64", error);
    }

    return {
      adbId,
      method: "ADB_INPUT_B64",
      textLength: text.length
    };
  },

  async sendKey(input: KeyInput) {
    requireAdbId(input.adbId);
    const keyCode = normalizeKeyCode(input.keyCode);
    debugInteraction("send-key", { adbId: input.adbId, keyCode });
    return adbClient.runAdb(["-s", input.adbId, "shell", "input", "keyevent", String(keyCode)]);
  },

  async downloadLatest(input: DownloadLatestInput) {
    requireAdbId(input.adbId);
    return downloadLatestService.downloadLatest(input);
  },

  async pushUploadFile(input: PushUploadFileInput) {
    const adbId = requireAdbId(input.adbId);
    if (!input.assetId) throw commandError("ASSET_ID_REQUIRED", "assetId is required");
    const remoteDir = uploadRemoteDir();
    const originalName = fileNameWithFallbackExtension(input.fileName || path.basename(input.sourceAbsolutePath), input.sourceAbsolutePath);
    const remoteFileName = `${safePathSegment(input.assetId)}_${timestampForFileName()}_${originalName}`;
    const remotePath = `${remoteDir}/${remoteFileName}`;
    const canUseSourcePath = input.sourceAbsolutePath && fs.existsSync(input.sourceAbsolutePath) && fs.statSync(input.sourceAbsolutePath).isFile();
    const readableSourcePath = canUseSourcePath
      ? input.sourceAbsolutePath
      : typeof input.sourceBase64 === "string" && input.sourceBase64
        ? localUploadSourcePath(remoteFileName, input.sourceBase64)
        : "";
    const shouldDeleteLocalTemp = Boolean(readableSourcePath && !canUseSourcePath);
    if (!readableSourcePath) {
      throw commandError("UPLOAD_FILE_NOT_FOUND", "sourceAbsolutePath is not accessible by Host Agent and no sourceBase64 transfer was provided");
    }

    debugInteraction("push-upload-file", {
      adbId,
      assetId: input.assetId,
      remotePath
    });

    try {
      if (!config.mockMode) {
        await adbClient.runAdb(["-s", adbId, "shell", "mkdir", "-p", remoteDir]);
        await adbClient.runAdb(["-s", adbId, "push", readableSourcePath, remotePath]);
        await adbClient.runAdb([
          "-s",
          adbId,
          "shell",
          "am",
          "broadcast",
          "-a",
          "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
          "-d",
          `file://${remotePath}`
        ]);
      }
    } finally {
      if (shouldDeleteLocalTemp) {
        fs.rmSync(readableSourcePath, { force: true });
      }
    }

    return {
      assetId: input.assetId,
      adbId,
      remotePath,
      remoteFileName
    };
  },

  async openFile(input: OpenFileInput) {
    const adbId = requireAdbId(input.adbId);
    if (!input.remotePath || !input.remotePath.startsWith(`${uploadRemoteDir()}/`)) {
      throw commandError("INVALID_REMOTE_PATH", "remotePath must point to fb-cm-factory uploads workspace");
    }
    debugInteraction("open-file", { adbId, remotePath: input.remotePath, mimeType: input.mimeType ?? "*/*" });
    if (!config.mockMode) {
      await adbClient.runAdb([
        "-s",
        adbId,
        "shell",
        "am",
        "start",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        `file://${input.remotePath}`,
        "-t",
        input.mimeType ?? "*/*"
      ]);
    }
    return { adbId, remotePath: input.remotePath, mimeType: input.mimeType ?? "*/*" };
  },

  async cleanupUploadSession(input: CleanupUploadSessionInput) {
    const adbId = requireAdbId(input.adbId);
    const olderThanHours = 24;
    debugInteraction("cleanup-upload-session", { adbId, remoteDir: uploadRemoteDir(), compatibilityMode: true, olderThanHours });
    if (!config.mockMode) {
      await adbClient.runAdb(["-s", adbId, "shell", "sh", "-c", oldEntriesCleanupCommand(uploadRemoteDir(), olderThanHours)]);
    }
    return { adbId, remoteDir: uploadRemoteDir(), olderThanHours, cleaned: true, compatibilityMode: true };
  },

  async cleanupUploadStaging(input: CleanupOldTempInput) {
    const adbId = requireAdbId(input.adbId);
    const olderThanHours = input.olderThanHours ?? 24;
    debugInteraction("cleanup-upload-staging", { adbId, olderThanHours });
    if (!config.mockMode) {
      await adbClient.runAdb(["-s", adbId, "shell", "sh", "-c", oldEntriesCleanupCommand(uploadRemoteDir(), olderThanHours)]);
    }
    return { adbId, olderThanHours, cleaned: true };
  },

  async cleanupFactoryTemp(input: CleanupOldTempInput) {
    const adbId = requireAdbId(input.adbId);
    const olderThanHours = input.olderThanHours ?? 24;
    const dirs = [
      input.includeUploads === false ? null : uploadRemoteDir(),
      "/sdcard/fb-cm-factory/temp",
      input.includeLiveScreenshots === false ? null : "/sdcard/fb-cm-factory/live",
      input.includeDebugScreenshots === false ? null : "/sdcard/fb-cm-factory/screenshots"
    ].filter(Boolean) as string[];
    debugInteraction("cleanup-factory-temp", { adbId, olderThanHours, dirs });
    if (!config.mockMode) {
      for (const dir of dirs) {
        await adbClient.runAdb(["-s", adbId, "shell", "sh", "-c", oldEntriesCleanupCommand(dir, olderThanHours)]);
      }
    }
    return { adbId, olderThanHours, dirs, cleaned: true };
  },

  async factoryTempUsage(input: { adbId: string }) {
    const adbId = requireAdbId(input.adbId);
    if (config.mockMode) {
      return { adbId, uploadsBytes: 0, tempBytes: 0, liveBytes: 0, screenshotsBytes: 0, totalBytes: 0 };
    }
    const result = await adbClient.runAdb(["-s", adbId, "shell", "sh", "-c", tempUsageCommand()]);
    const values = Object.fromEntries(
      result.stdout.split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, value] = line.split("=");
          return [key, Number(value) || 0];
        })
    );
    const uploadsBytes = Number(values.uploads ?? 0);
    const tempBytes = Number(values.temp ?? 0);
    const liveBytes = Number(values.live ?? 0);
    const screenshotsBytes = Number(values.screenshots ?? 0);
    return {
      adbId,
      uploadsBytes,
      tempBytes,
      liveBytes,
      screenshotsBytes,
      totalBytes: uploadsBytes + tempBytes + liveBytes + screenshotsBytes
    };
  }
};
