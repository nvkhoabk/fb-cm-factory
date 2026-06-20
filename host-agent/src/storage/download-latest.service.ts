import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import { adbClient } from "../adb/adb.client";
import { storageService } from "./storage.service";

export type DownloadLatestInput = {
  adbId: string;
  sourceDir?: string;
  extensions?: string[];
  targetFolder?: string;
};

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function latestFileCommand(sourceDir: string, extensions: string[]) {
  const normalizedExtensions = extensions
    .flatMap((extension) => {
      const normalized = extension.replace(/^\./, "");
      if (!/^[a-z0-9]+$/i.test(normalized)) return [];
      return [normalized.toLowerCase(), normalized.toUpperCase()];
    })
    .filter((extension, index, all) => extension && all.indexOf(extension) === index);
  const extensionCases = (normalizedExtensions.length ? normalizedExtensions : ["png", "PNG", "jpg", "JPG", "jpeg", "JPEG", "webp", "WEBP", "mp4", "MP4"])
    .join("|");

  return [
    `dir=${shellQuote(sourceDir)}`,
    `for f in "$dir"/*; do`,
    `[ -f "$f" ] || continue`,
    `base="\${f##*/}"`,
    `lower=$(printf '%s' "$base" | tr 'A-Z' 'a-z')`,
    `case "$lower" in *fb-cm-factory-screenshot*|*live-screenshot*|*debug-screenshot*|live-*) continue ;; esac`,
    `ext="\${f##*.}"`,
    `case "$ext" in ${extensionCases})`,
    `ts=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo 0)`,
    `printf '%s\\t%s\\n' "$ts" "$f"`,
    `;; esac`,
    `done | sort -nr | head -n 1 | cut -f2-`
  ].join("; ");
}

function isBlockedFactorySourceDir(sourceDir: string) {
  const normalized = sourceDir.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return [
    "/sdcard/fb-cm-factory/uploads",
    "/sdcard/fb-cm-factory/temp",
    "/sdcard/fb-cm-factory/live",
    "/sdcard/fb-cm-factory/screenshots"
  ].some((blocked) => normalized === blocked || normalized.startsWith(`${blocked}/`));
}

function taskOutputFolder(targetFolder?: string) {
  if (!targetFolder) return "task-outputs";
  const normalized = targetFolder.replace(/^[/\\]+/, "").replace(/\.\./g, "");
  if (!normalized || normalized === "task-outputs" || normalized.startsWith("task-outputs/") || normalized.startsWith("task-outputs\\")) {
    return normalized || "task-outputs";
  }
  return path.join("task-outputs", normalized);
}

export const downloadLatestService = {
  async downloadLatest(input: DownloadLatestInput) {
    const sourceDir = input.sourceDir ?? "/sdcard/Download";
    const extensions = input.extensions?.length ? input.extensions : ["png", "jpg", "jpeg", "webp", "mp4"];
    const targetFolder = taskOutputFolder(input.targetFolder);
    const folder = storageService.ensureTargetFolder(targetFolder);

    if (isBlockedFactorySourceDir(sourceDir)) {
      const error = new Error("NO_MATCHING_FILE_FOUND");
      error.name = "NO_MATCHING_FILE_FOUND";
      throw error;
    }

    if (config.mockMode) {
      const absolutePath = path.join(folder.absolutePath, `mock-latest-${Date.now()}.png`);
      fs.writeFileSync(absolutePath, Buffer.from("mock host-agent download\n", "utf8"));
      return storageService.storageFileResult(absolutePath, folder.safeFolder);
    }

    const latest = await adbClient.runAdb(["-s", input.adbId, "shell", "sh", "-c", latestFileCommand(sourceDir, extensions)]);
    const remotePath = latest.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);

    if (!remotePath) {
      const error = new Error("NO_MATCHING_FILE_FOUND");
      error.name = "NO_MATCHING_FILE_FOUND";
      throw error;
    }

    const localName = `${Date.now()}-${path.posix.basename(remotePath)}`;
    const absolutePath = path.join(folder.absolutePath, localName);
    await adbClient.runAdb(["-s", input.adbId, "pull", remotePath, absolutePath]);

    return storageService.storageFileResult(absolutePath, folder.safeFolder);
  }
};
