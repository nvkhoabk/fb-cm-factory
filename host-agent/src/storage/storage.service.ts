import fs from "node:fs";
import path from "node:path";
import mime from "mime-types";
import { config } from "../config";

export function ensureStorageRoot() {
  fs.mkdirSync(config.hostStorageRoot, { recursive: true });
}

export function ensureTargetFolder(targetFolder: string) {
  const safeFolder = targetFolder.replace(/^[/\\]+/, "").replace(/\.\./g, "");
  const absolutePath = path.join(config.hostStorageRoot, safeFolder);
  fs.mkdirSync(absolutePath, { recursive: true });
  return {
    safeFolder,
    absolutePath
  };
}

export function storageFileResult(absolutePath: string, targetFolder: string) {
  const stats = fs.statSync(absolutePath);
  const fileName = path.basename(absolutePath);
  const relativeUrl = `/storage/${targetFolder.replace(/\\/g, "/")}/${encodeURIComponent(fileName)}`;

  return {
    hostFilePath: path.relative(config.hostStorageRoot, absolutePath),
    publicUrl: `${config.publicBaseUrl}${relativeUrl}`,
    absolutePath,
    mimeType: mime.lookup(absolutePath) || "application/octet-stream",
    fileSize: stats.size
  };
}

export const storageService = {
  ensureStorageRoot,
  ensureTargetFolder,
  storageFileResult
};
