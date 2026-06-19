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
    `ext="\${f##*.}"`,
    `case "$ext" in ${extensionCases})`,
    `ts=$(stat -c %Y "$f" 2>/dev/null || stat -f %m "$f" 2>/dev/null || echo 0)`,
    `printf '%s\\t%s\\n' "$ts" "$f"`,
    `;; esac`,
    `done | sort -nr | head -n 1 | cut -f2-`
  ].join("; ");
}

export const downloadLatestService = {
  async downloadLatest(input: DownloadLatestInput) {
    const sourceDir = input.sourceDir ?? "/sdcard/Download";
    const extensions = input.extensions?.length ? input.extensions : ["png", "jpg", "jpeg", "webp", "mp4"];
    const targetFolder = input.targetFolder ?? "task-outputs";
    const folder = storageService.ensureTargetFolder(targetFolder);

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
