import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import { adbClient } from "../adb/adb.client";
import { storageService } from "./storage.service";

export type DownloadLatestInput = {
  adbId: string;
  sourceDir?: string;
  sourceDirs?: string[];
  extensions?: string[];
  targetFolder?: string;
  deleteAfterPull?: boolean;
};

export type ListDownloadCandidatesInput = {
  adbId: string;
  sourceDir?: string;
  sourceDirs?: string[];
  extensions?: string[];
};

export type ClearDownloadInput = {
  adbId: string;
  sourceDir?: string;
  extensions?: string[];
};

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
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
const defaultDownloadSourceDirs = ["/sdcard/Download", "/storage/emulated/0/Download"];

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

function normalizeSourceDirs(input: { sourceDir?: string; sourceDirs?: string[] }) {
  const fromList = input.sourceDirs
    ?.map((sourceDir) => sourceDir.trim())
    .filter(Boolean);
  const dirs = fromList?.length
    ? fromList
    : input.sourceDir?.trim()
      ? [input.sourceDir.trim()]
      : defaultDownloadSourceDirs;
  return dirs.filter((sourceDir, index, all) => all.indexOf(sourceDir) === index);
}

function fileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === fileName.length - 1) return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function modifiedAtFromLs(date: string, time: string) {
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  const parsed = new Date(`${date}T${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseLsCandidateLine(sourceDir: string, line: string, extensions: string[]) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("total ")) return null;
  if (trimmed.startsWith("d")) return null;
  const match = trimmed.match(/^(\S+)\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)\s+(.+)$/);
  if (!match) return null;
  const [, mode, sizeText, dateText, timeText, fileName] = match;
  if (mode.startsWith("d")) return null;
  const extension = fileExtension(fileName);
  if (!extensions.includes(extension)) return null;
  const normalizedSourceDir = sourceDir.replace(/\/+$/, "");
  return {
    sourceDir,
    fileName,
    remotePath: `${normalizedSourceDir}/${fileName}`,
    size: Number(sizeText) || 0,
    modifiedAt: modifiedAtFromLs(dateText, timeText)
  };
}

function candidateTime(candidate: { modifiedAt: string | null }) {
  if (!candidate.modifiedAt) return null;
  const parsed = new Date(candidate.modifiedAt).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function outputNotFound(sourceDirs: string[] | string, detail?: unknown) {
  const dirs = Array.isArray(sourceDirs) ? sourceDirs.join(", ") : sourceDirs;
  const error = new Error(`No downloaded image/video was found in ${dirs}. The previous generation/download action may have failed.`);
  error.name = "DOWNLOAD_OUTPUT_NOT_FOUND";
  (error as Error & { detail?: unknown }).detail = detail;
  return error;
}

function clearDownloadCommand(sourceDir: string, extensions: string[]) {
  const extensionCases = extensions.flatMap((extension) => [extension.toLowerCase(), extension.toUpperCase()]).join("|");
  return [
    `dir=${shellQuote(sourceDir)}`,
    `count=0`,
    `names=""`,
    `[ -d "$dir" ] || { printf 'COUNT=0\\n'; exit 0; }`,
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
  ].join("\n");
}

export const downloadLatestService = {
  async listDownloadCandidates(input: ListDownloadCandidatesInput) {
    const sourceDirs = normalizeSourceDirs(input);
    const extensions = allowedExtensions(input.extensions);
    const rawOutputs: Record<string, { stdout: string; stderr: string; error?: string }> = {};

    if (config.mockMode) {
      const candidates = [{
        sourceDir: sourceDirs[0],
        fileName: "mock-latest.png",
        remotePath: `${sourceDirs[0].replace(/\/+$/, "")}/mock-latest.png`,
        size: 25,
        modifiedAt: new Date().toISOString()
      }];
      console.info("[download-latest] list candidates", JSON.stringify({ adbId: input.adbId, sourceDirs, rawOutputs, candidates }));
      return { adbId: input.adbId, sourceDirs, extensions, candidates, rawOutputs };
    }

    const candidatesWithOrder: Array<ReturnType<typeof parseLsCandidateLine> & { sourceIndex: number; listIndex: number }> = [];
    for (const [sourceIndex, sourceDir] of sourceDirs.entries()) {
      const args = ["-s", input.adbId, "shell", "ls", "-lt", sourceDir];
      try {
        const result = await adbClient.runAdb(args);
        rawOutputs[sourceDir] = { stdout: result.stdout, stderr: result.stderr };
        result.stdout.split(/\r?\n/).forEach((line, listIndex) => {
          const candidate = parseLsCandidateLine(sourceDir, line, extensions);
          if (candidate) candidatesWithOrder.push({ ...candidate, sourceIndex, listIndex });
        });
      } catch (error) {
        const cause = error && typeof error === "object" ? error as Record<string, unknown> : {};
        rawOutputs[sourceDir] = {
          stdout: typeof cause.stdout === "string" ? cause.stdout : "",
          stderr: typeof cause.stderr === "string" ? cause.stderr : "",
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    candidatesWithOrder.sort((left, right) => {
      const leftTime = candidateTime(left);
      const rightTime = candidateTime(right);
      if (leftTime !== null && rightTime !== null && leftTime !== rightTime) return rightTime - leftTime;
      if (leftTime !== null && rightTime === null) return -1;
      if (leftTime === null && rightTime !== null) return 1;
      if (left.sourceIndex !== right.sourceIndex) return left.sourceIndex - right.sourceIndex;
      return left.listIndex - right.listIndex;
    });
    const candidates = candidatesWithOrder.map(({ sourceIndex: _sourceIndex, listIndex: _listIndex, ...candidate }) => candidate);
    console.info("[download-latest] list candidates", JSON.stringify({
      adbId: input.adbId,
      sourceDirs,
      rawOutputs,
      candidates
    }));
    return { adbId: input.adbId, sourceDirs, extensions, candidates, rawOutputs };
  },

  async clearDownload(input: ClearDownloadInput) {
    const sourceDir = input.sourceDir?.trim() || "/sdcard/Download";
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
      const cause = error && typeof error === "object" ? error as Record<string, unknown> : {};
      (clearError as Error & { cause?: unknown; detail?: unknown }).cause = error;
      (clearError as Error & { detail?: unknown }).detail = {
        adbId: input.adbId,
        sourceDir,
        extensions,
        command: config.adbPath,
        args: ["-s", input.adbId, "shell", "sh", "-c", clearDownloadCommand(sourceDir, extensions)],
        stdout: typeof cause.stdout === "string" ? cause.stdout : "",
        stderr: typeof cause.stderr === "string" ? cause.stderr : "",
        message: error instanceof Error ? error.message : String(error)
      };
      throw clearError;
    }
  },

  async downloadLatest(input: DownloadLatestInput) {
    const sourceDirs = normalizeSourceDirs(input);
    const extensions = allowedExtensions(input.extensions);
    const targetFolder = taskOutputFolder(input.targetFolder);
    const folder = storageService.ensureTargetFolder(targetFolder);

    const blockedSourceDir = sourceDirs.find(isBlockedFactorySourceDir);
    if (blockedSourceDir) {
      throw outputNotFound(sourceDirs, {
        adbId: input.adbId,
        sourceDirs,
        extensions,
        blockedSourceDir,
        reason: "sourceDir is reserved for factory internal files"
      });
    }

    if (config.mockMode) {
      const absolutePath = path.join(folder.absolutePath, `mock-latest-${Date.now()}.png`);
      fs.writeFileSync(absolutePath, Buffer.from("mock host-agent download\n", "utf8"));
      const stored = storageService.storageFileResult(absolutePath, folder.safeFolder);
      return {
        adbId: input.adbId,
        remotePath: `${sourceDirs[0].replace(/\/+$/, "")}/mock-latest.png`,
        fileName: path.basename(absolutePath),
        modifiedAt: new Date().toISOString(),
        ...stored
      };
    }

    const discovery = await this.listDownloadCandidates({ adbId: input.adbId, sourceDirs, extensions });
    const newest = discovery.candidates[0];

    if (!newest) {
      throw outputNotFound(sourceDirs, {
        adbId: input.adbId,
        sourceDirs,
        extensions,
        rawOutputs: discovery.rawOutputs,
        parsedCandidates: discovery.candidates,
        hint: "No candidate matched the configured extensions. Verify the app actually saved/downloaded a file before download-latest runs, and check whether the file is saved to a different folder or extension."
      });
    }

    const localName = `${Date.now()}-${newest.fileName}`;
    const absolutePath = path.join(folder.absolutePath, localName);
    console.info("[download-latest] selected candidate", JSON.stringify({
      adbId: input.adbId,
      sourceDirs,
      rawOutputs: discovery.rawOutputs,
      parsedCandidates: discovery.candidates,
      selectedCandidate: newest,
      pullTarget: absolutePath
    }));
    await adbClient.runAdb(["-s", input.adbId, "pull", newest.remotePath, absolutePath]);
    if (input.deleteAfterPull) {
      await adbClient.runAdb(["-s", input.adbId, "shell", "rm", "-f", newest.remotePath]);
    }

    const stored = storageService.storageFileResult(absolutePath, folder.safeFolder);
    return {
      adbId: input.adbId,
      remotePath: newest.remotePath,
      fileName: newest.fileName,
      modifiedAt: newest.modifiedAt ?? undefined,
      warning: discovery.candidates.length > 1 ? "MULTIPLE_DOWNLOAD_CANDIDATES" : undefined,
      ...stored
    };
  }
};
