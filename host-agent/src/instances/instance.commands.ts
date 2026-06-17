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
  text: string;
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

export const instanceCommands = {
  async screenshot(localId: string, adbId: string) {
    requireAdbId(adbId);
    const folder = storageService.ensureTargetFolder("screenshots");
    const absolutePath = path.join(folder.absolutePath, `${localId}-${Date.now()}.png`);

    if (config.mockMode) {
      fs.writeFileSync(absolutePath, Buffer.from("mock screenshot\n", "utf8"));
      return storageService.storageFileResult(absolutePath, folder.safeFolder);
    }

    await adbClient.runAdb(["-s", adbId, "shell", "screencap", "-p", "/sdcard/Download/fb-cm-factory-screenshot.png"]);
    await adbClient.runAdb(["-s", adbId, "pull", "/sdcard/Download/fb-cm-factory-screenshot.png", absolutePath]);
    return storageService.storageFileResult(absolutePath, folder.safeFolder);
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
    requireAdbId(input.adbId);
    const base64Text = Buffer.from(input.text, "utf8").toString("base64");
    return adbClient.runAdb([
      "-s",
      input.adbId,
      "shell",
      "am",
      "broadcast",
      "-a",
      "ADB_INPUT_B64",
      "--es",
      "msg",
      base64Text
    ]);
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
