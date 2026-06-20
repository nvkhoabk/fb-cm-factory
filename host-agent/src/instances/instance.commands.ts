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

function mockPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAYAAADtt+XCAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBQQ0xpcCByZW5kZXJlcjSByy0AAARNSURBVHic7d1BbsIwEABB//9lOAuItjQq2h5UIJY9kMGEiPWrUfTAcQzDMEzbsT4A4Oe1+wAA8J0ECAIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEEQBAgCIAgRBAAQYAgAIIQQQAEAYIACEIEARAECIIgCBAEQBAiCIAgQBAAQYggAIIAQQAEIYIACAIEQRAECIIgCBEGQ7vcBvE5hMzs7hWwAAAAASUVORK5CYII=",
    "base64"
  );
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
      fs.writeFileSync(absolutePath, mockPngBuffer());
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
    return adbClient.runAdb(["-s", input.adbId, "shell", "input", "tap", String(input.x), String(input.y)]);
  },

  async swipe(input: SwipeInput) {
    requireAdbId(input.adbId);
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
    return adbClient.runAdb(["-s", input.adbId, "shell", "input", "keyevent", String(input.keyCode)]);
  },

  async downloadLatest(input: DownloadLatestInput) {
    requireAdbId(input.adbId);
    return downloadLatestService.downloadLatest(input);
  }
};
