# Storage Policy

FB-CM Factory stores media binaries outside SQLite and outside the repository.

## Storage Root

Backend media files are stored under `STORAGE_ROOT`.

Example `.env`:

```env
STORAGE_ROOT=C:/Users/Khoa Nguyen/Documents/Du an Facebook CM/data/fb-cm-factory/backend-storage
```

If `STORAGE_ROOT` is not set, the backend defaults to:

```text
../data/fb-cm-factory/backend-storage
```

relative to the repository parent directory.

## Public URL Mapping

The backend serves `STORAGE_ROOT` at:

```text
/storage
```

Example:

```text
C:/Users/Khoa Nguyen/Documents/Du an Facebook CM/data/fb-cm-factory/backend-storage/characters/char_123/image.png
```

is exposed as:

```text
/storage/characters/char_123/image.png
```

## SQLite Policy

SQLite stores metadata and file references only.

Allowed asset fields include:

- `storage_provider`
- `storage_key`
- `file_path`
- `public_url`
- `mime_type`
- `file_size`
- `checksum`
- `metadata_json`
- `thumbnail_file_path`
- `thumbnail_public_url`
- `thumbnail_width`
- `thumbnail_height`
- `thumbnail_status`

SQLite must not store:

- image/video/audio binary blobs
- base64 media
- `data:image/...`
- `data:video/...`
- `data:audio/...`

Asset create/update rejects metadata or attribute payloads containing inline media with:

```text
BINARY_CONTENT_NOT_ALLOWED_IN_DB
```

The shared backend JSON serialization helper also rejects inline media before writing JSON fields such as runtime context, script run output, production batch metadata, and import history.

## Cleanup Existing Database Records

Run:

```bash
cd backend
npm run cleanup:media
```

The cleanup scans JSON columns and asset URL fields for embedded media payloads such as:

- `data:image/...`
- `data:video/...`
- `data:audio/...`
- `base64,`
- large base64-like strings

For JSON metadata fields, embedded media payloads are removed and replaced with cleanup markers:

```json
{
  "mediaRemoved": true,
  "cleanupAt": "..."
}
```

For `assets.public_url` or `assets.preview_url` that still contain a media data URL, the cleanup writes the media to `STORAGE_ROOT` and updates the asset row with `storage_key`, `file_path`, `public_url`, `preview_url`, `mime_type`, `file_size`, and `checksum`.

The cleanup preserves valid rows, IDs, relationships, lineage, and non-media metadata.

## Import Behavior

When the UI sends an inline `data:` URL for an uploaded image, the backend writes the file to `STORAGE_ROOT` and stores only the resulting file references in SQLite.

Character Import source images are stored as files under backend storage and referenced from the `assets` table.

## Thumbnails

Image thumbnails are generated as separate media files under:

```text
STORAGE_ROOT/thumbnails/<assetId>/thumb.jpg
```

The public URL is:

```text
/storage/thumbnails/<assetId>/thumb.jpg
```

SQLite stores only thumbnail metadata and file references. Thumbnail binaries and base64 thumbnails must never be stored in SQLite.

## Backup Strategy

Backups must include both:

- the SQLite database
- the complete `backend-storage` directory

Restoring only the database will restore metadata but not media files.
