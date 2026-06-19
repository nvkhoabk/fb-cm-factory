import { db } from "../src/database/db";
import { thumbnailService } from "../src/modules/thumbnails/thumbnail.service";

type AssetRow = {
  id: string;
};

async function main() {
  const rows = db.prepare(`
    SELECT id
    FROM assets
    WHERE COALESCE(thumbnail_public_url, '') = ''
      AND (
        lower(COALESCE(media_type, '')) = 'image'
        OR lower(COALESCE(mime_type, '')) LIKE 'image/%'
        OR lower(COALESCE(file_path, '')) LIKE '%.png'
        OR lower(COALESCE(file_path, '')) LIKE '%.jpg'
        OR lower(COALESCE(file_path, '')) LIKE '%.jpeg'
        OR lower(COALESCE(file_path, '')) LIKE '%.webp'
      )
    ORDER BY created_at ASC
  `).all() as AssetRow[];

  const report = {
    scanned: rows.length,
    generated: 0,
    failed: 0
  };

  for (const row of rows) {
    const result = await thumbnailService.generateThumbnailForAsset(row.id);
    if (result?.status === "READY") report.generated += 1;
    else report.failed += 1;
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
