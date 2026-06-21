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
  deleteAfterPull?: boolean;
};

export type ClearDownloadInput = {
  adbId: string;
  sourceDir?: string;
  extensions?: string[];
};

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function latestFileCommand(sourceDir: string, extensions: string[]) {
  const normalizedExtensions = allowedExtensions(extensions).flatMap((extension) => [extension.toLowerCase(), extension.toUpperCase()]);
  const extensionCases = normalizedExtensions
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
    `size=$(wc -c < "$f" 2>/dev/null || echo 0)`,
    `printf '%s\\t%s\\t%s\\n' "$ts" "$size" "$f"`,
    `;; esac`,
    `done | sort -nr`
  ].join("; ");
}

function isBlockedFactorySourceDir(sourceDir: string) {
  const normalized = sourceDir.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return [
    "/sdcard/fb-cm-factory/uploads",
    "/sdcard/fb-cm-factory/temp",
    "/sdcard/fb-cm-factory/live",
    "/sdcard/fb-cm-factory/screenshots",
    "/sdcard/pictures/fb-cm-factory/uploads"
  ].some((blocked) => normalized === blocked || normalized.startsWith(`${blocked}/`));
}

const allowedMediaExtensions = ["png", "jpg", "jpeg", "webp", "mp4", "mov", "webm"];

function allowedExtensions(extensions?: string[]) {
  const normalized = (extensions?.length ? extensions : allowedMediaExtensions)
    .map((extension) => extension.replace(/^\./, "").trim().toLowerCase())
    .filter((extension, index, all) => allowedMediaExtensions.includes(extension) && all.indexOf(extension) === index);
  return normalized.length ? normalized : allowedMediaExtensions;
}

function taskOutputFolder(targetFolder?: string) {
  const dateFolder = new Date().toISOString().slice(0, 10);
  if (!targetFolder) return path.join("task-outputs", dateFolder);
  const normalized = targetFolder.replace(/^[/\\]+/, "").replace(/\.\./g, "");
  if (!normalized) return path.join("task-outputs", dateFolder);
  if (normalized === "task-outputs") return path.join("task-outputs", dateFolder);
  if (normalized.startsWith("task-outputs/") || normalized.startsWith("task-outputs\\")) {
    return normalized;
  }
  return path.join("task-outputs", normalized, dateFolder);
}

function parseCandidateLine(line: string) {
  const [timestamp, size, ...pathParts] = line.split("\t");
  const remotePath = pathParts.join("\t").trim();
  if (!remotePath) return null;
  return {
    modifiedAtUnix: Number(timestamp) || 0,
    fileSize: Number(size) || 0,
    remotePath,
    fileName: path.posix.basename(remotePath)
  };
}

function outputNotFound(sourceDir: string) {
  const error = new Error(`No downloaded image/video was found in ${sourceDir}. The previous generation/download action may have failed.`);
  error.name = "DOWNLOAD_OUTPUT_NOT_FOUND";
  return error;
}

function clearDownloadCommand(sourceDir: string, extensions: string[]) {
  const extensionCases = extensions.flatMap((extension) => [extension.toLowerCase(), extension.toUpperCase()]).join("|");
  return [
    `dir=${shellQuote(sourceDir)}`,
    `count=0`,
    `names=""`,
    `for f in "$dir"/*; do`,
    `[ -f "$f" ] || continue`,
    `ext="\${f##*.}"`,
    `case "$ext" in ${extensionCases})`,
    `base="\${f##*/}"`,
    `if rm -f "$f"; then count=$((count + 1)); names="$names$base\\n"; fi`,
    `;; esac`,
    `done`,
    `printf 'COUNT=%s\\n' "$count"`,
    `printf '%b' "$names"`
  ].join("; ");
}

export const downloadLatestService = {
  async clearDownload(input: ClearDownloadInput) {
    const sourceDir = input.sourceDir ?? "/sdcard/Download";
    const extensions = allowedExtensions(input.extensions);

    if (config.mockMode) {
      return {
        adbId: input.adbId,
        sourceDir,
        extensions,
        deletedFiles: 0,
        fileNames: []
      };
    }

    try {
      const result = await adbClient.runAdb(["-s", input.adbId, "shell", "sh", "-c", clearDownloadCommand(sourceDir, extensions)]);
      const lines = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const countLine = lines.find((line) => line.startsWith("COUNT="));
      const deletedFiles = Number(countLine?.replace("COUNT=", "") ?? 0) || 0;
      const fileNames = lines.filter((line) => !line.startsWith("COUNT="));
      return {
        adbId: input.adbId,
        sourceDir,
        extensions,
        deletedFiles,
        fileNames
      };
    } catch (error) {
      const clearError = new Error("CLEAR_DOWNLOAD_FAILED");
      clearError.name = "CLEAR_DOWNLOAD_FAILED";
      (clearError as Error & { cause?: unknown }).cause = error;
      throw clearError;
    }
  },

  async downloadLatest(input: DownloadLatestInput) {
    const sourceDir = input.sourceDir ?? "/sdcard/Download";
    const extensions = allowedExtensions(input.extensions);
    const targetFolder = taskOutputFolder(input.targetFolder);
    const folder = storageService.ensureTargetFolder(targetFolder);

    if (isBlockedFactorySourceDir(sourceDir)) {
      throw outputNotFound(sourceDir);
    }

    if (config.mockMode) {
      const absolutePath = path.join(folder.absolutePath, `mock-latest-${Date.now()}.png`);
      fs.writeFileSync(absolutePath, Buffer.from("mock host-agent download\n", "utf8"));
      const stored = storageService.storageFileResult(absolutePath, folder.safeFolder);
      return {
        adbId: input.adbId,
        remotePath: `${sourceDir}/mock-latest.png`,
        fileName: path.basename(absolutePath),
        modifiedAt: new Date().toISOString(),
        ...stored
      };
    }

    const latest = await adbClient.runAdb(["-s", input.adbId, "shell", "sh", "-c", latestFileCommand(sourceDir, extensions)]);
    const candidates = latest.stdout.split(/\r?\n/)
      .map((line) => parseCandidateLine(line))
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
    const newest = candidates[0];

    if (!newest) throw outputNotFound(sourceDir);

    const localName = `${Date.now()}-${newest.fileName}`;
    const absolutePath = path.join(folder.absolutePath, localName);
    await adbClient.runAdb(["-s", input.adbId, "pull", newest.remotePath, absolutePath]);
    if (input.deleteAfterPull) {
      await adbClient.runAdb(["-s", input.adbId, "shell", "rm", "-f", newest.remotePath]);
    }

    const stored = storageService.storageFileResult(absolutePath, folder.safeFolder);
    return {
      adbId: input.adbId,
      remotePath: newest.remotePath,
      fileName: newest.fileName,
      modifiedAt: newest.modifiedAtUnix ? new Date(newest.modifiedAtUnix * 1000).toISOString() : undefined,
      warning: candidates.length > 1 ? "MULTIPLE_DOWNLOAD_CANDIDATES" : undefined,
      ...stored
    };
  }
};
