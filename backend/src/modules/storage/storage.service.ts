import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { config } from "../../config";
import { AppError } from "../shared/resource";

const mimeExtensions: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav"
};

function sanitizeSegment(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "media";
}

function normalizeStorageKey(key: string) {
  return key.replace(/\\/g, "/").replace(/^\/+/, "");
}

function ensureInsideStorageRoot(filePath: string) {
  const root = path.resolve(config.storageRoot);
  const resolved = path.resolve(filePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new AppError("INVALID_STORAGE_PATH", "Storage path escapes STORAGE_ROOT", 400);
  }
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) {
    throw new AppError("INVALID_DATA_URL", "Invalid data URL", 400);
  }
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const raw = match[3] ?? "";
  const buffer = isBase64 ? Buffer.from(raw, "base64") : Buffer.from(decodeURIComponent(raw));
  return { buffer, mimeType };
}

export function containsBinaryContent(value: unknown): boolean {
  if (typeof value === "string") {
    const compact = value.replace(/\s+/g, "");
    const looksLikeLargeBase64 = compact.length > 4096
      && compact.length % 4 === 0
      && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
    return /data:(image|video|audio)\//i.test(value)
      || /base64,/i.test(value)
      || looksLikeLargeBase64;
  }
  if (Array.isArray(value)) return value.some((item) => containsBinaryContent(item));
  if (value && typeof value === "object") return Object.values(value).some((item) => containsBinaryContent(item));
  return false;
}

export const storageService = {
  root: () => path.resolve(config.storageRoot),

  publicUrlForKey(storageKey: string) {
    return `/storage/${normalizeStorageKey(storageKey)}`;
  },

  writeDataUrl(input: {
    dataUrl: string;
    folder: string;
    fileName?: string;
  }) {
    const { buffer, mimeType } = parseDataUrl(input.dataUrl);
    const safeFolder = normalizeStorageKey(input.folder).split("/").map(sanitizeSegment).join("/");
    const originalName = sanitizeSegment(input.fileName ?? "media");
    const parsedName = path.parse(originalName);
    const extension = parsedName.ext || mimeExtensions[mimeType] || "";
    const baseName = parsedName.name || "media";
    const fileName = `${baseName}-${randomUUID()}${extension}`;
    const storageKey = normalizeStorageKey(path.posix.join(safeFolder, fileName));
    const filePath = path.resolve(config.storageRoot, ...storageKey.split("/"));
    ensureInsideStorageRoot(filePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    return {
      storageProvider: "local",
      storageKey,
      filePath,
      publicUrl: this.publicUrlForKey(storageKey),
      previewUrl: this.publicUrlForKey(storageKey),
      mimeType,
      fileSize: buffer.length,
      checksum: createHash("sha256").update(buffer).digest("hex")
    };
  }
};
