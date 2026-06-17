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

function findCommand(sourceDir: string, extensions: string[]) {
  const extensionPredicates = extensions
    .map((extension) => `-iname '*.${extension.replace(/^\./, "")}'`)
    .join(" -o ");

  return `find '${sourceDir}' -maxdepth 1 -type f \\( ${extensionPredicates} \\) | head -n 1`;
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

    const latest = await adbClient.runAdb(["-s", input.adbId, "shell", "sh", "-c", findCommand(sourceDir, extensions)]);
    const remotePath = latest.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);

    if (!remotePath) {
      throw new Error("No matching remote file found");
    }

    const localName = `${Date.now()}-${path.posix.basename(remotePath)}`;
    const absolutePath = path.join(folder.absolutePath, localName);
    await adbClient.runAdb(["-s", input.adbId, "pull", remotePath, absolutePath]);

    return storageService.storageFileResult(absolutePath, folder.safeFolder);
  }
};
