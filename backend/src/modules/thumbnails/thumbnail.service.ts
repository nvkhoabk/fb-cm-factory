import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { config } from "../../config";
import { db } from "../../database/db";
import { now } from "../shared/resource";
import { storageService } from "../storage/storage.service";

type AssetRow = {
  id: string;
  file_path?: string | null;
  public_url?: string | null;
  mime_type?: string | null;
  media_type?: string | null;
};

const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function getAsset(assetId: string) {
  return db.prepare("SELECT * FROM assets WHERE id = ?").get(assetId) as AssetRow | undefined;
}

function isSupportedImage(asset: AssetRow) {
  const mimeType = String(asset.mime_type ?? "").toLowerCase();
  const extension = path.extname(String(asset.file_path ?? asset.public_url ?? "")).toLowerCase();
  return supportedMimeTypes.has(mimeType)
    || supportedExtensions.has(extension)
    || String(asset.media_type ?? "").toLowerCase() === "image";
}

function thumbnailPaths(assetId: string) {
  const storageKey = `thumbnails/${assetId}/thumb.jpg`;
  return {
    storageKey,
    filePath: path.resolve(config.storageRoot, ...storageKey.split("/")),
    publicUrl: storageService.publicUrlForKey(storageKey)
  };
}

function updateThumbnail(assetId: string, input: {
  filePath: string | null;
  publicUrl: string | null;
  width: number | null;
  height: number | null;
  status: "PENDING" | "READY" | "FAILED" | "NOT_APPLICABLE";
}) {
  db.prepare(`
    UPDATE assets
    SET thumbnail_file_path = @filePath,
        thumbnail_public_url = @publicUrl,
        thumbnail_width = @width,
        thumbnail_height = @height,
        thumbnail_status = @status,
        updated_at = @updatedAt
    WHERE id = @assetId
  `).run({
    assetId,
    filePath: input.filePath,
    publicUrl: input.publicUrl,
    width: input.width,
    height: input.height,
    status: input.status,
    updatedAt: now()
  });
}

export const thumbnailService = {
  async generateThumbnailForFile(inputAbsolutePath: string, outputAbsolutePath: string) {
    fs.mkdirSync(path.dirname(outputAbsolutePath), { recursive: true });
    const info = await sharp(inputAbsolutePath)
      .rotate()
      .resize({
        width: 240,
        height: 240,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(outputAbsolutePath);

    return {
      width: info.width,
      height: info.height
    };
  },

  async generateThumbnailForAsset(assetId: string) {
    const asset = getAsset(assetId);
    if (!asset) return null;
    if (!isSupportedImage(asset) || !asset.file_path) {
      updateThumbnail(assetId, { filePath: null, publicUrl: null, width: null, height: null, status: "NOT_APPLICABLE" });
      return null;
    }
    if (!fs.existsSync(asset.file_path)) {
      updateThumbnail(assetId, { filePath: null, publicUrl: null, width: null, height: null, status: "FAILED" });
      return null;
    }

    const paths = thumbnailPaths(assetId);
    try {
      const info = await this.generateThumbnailForFile(asset.file_path, paths.filePath);
      updateThumbnail(assetId, {
        filePath: paths.filePath,
        publicUrl: paths.publicUrl,
        width: info.width,
        height: info.height,
        status: "READY"
      });
      return {
        assetId,
        ...paths,
        width: info.width,
        height: info.height,
        status: "READY"
      };
    } catch {
      updateThumbnail(assetId, { filePath: null, publicUrl: null, width: null, height: null, status: "FAILED" });
      return null;
    }
  },

  async ensureThumbnailForAsset(assetId: string) {
    const row = db.prepare(`
      SELECT thumbnail_public_url, thumbnail_status
      FROM assets
      WHERE id = ?
    `).get(assetId) as { thumbnail_public_url?: string | null; thumbnail_status?: string | null } | undefined;
    if (!row) return null;
    if (row.thumbnail_public_url && row.thumbnail_status === "READY") return row;
    return this.generateThumbnailForAsset(assetId);
  },

  deleteThumbnailForAsset(assetId: string) {
    const row = db.prepare("SELECT thumbnail_file_path FROM assets WHERE id = ?").get(assetId) as { thumbnail_file_path?: string | null } | undefined;
    if (row?.thumbnail_file_path && fs.existsSync(row.thumbnail_file_path)) {
      fs.rmSync(row.thumbnail_file_path, { force: true });
      const folder = path.dirname(row.thumbnail_file_path);
      try {
        fs.rmdirSync(folder);
      } catch {
        // Folder may contain other files; keeping it is safe.
      }
    }
    updateThumbnail(assetId, { filePath: null, publicUrl: null, width: null, height: null, status: "PENDING" });
  }
};
