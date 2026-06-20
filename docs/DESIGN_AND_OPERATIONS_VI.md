# FB-CM Factory - Tai lieu thiet ke va van hanh hien tai

Tai lieu nay tong hop kien truc, du lieu, UI va quy trinh van hanh cua FB-CM Factory tai thoi diem hien tai. Noi dung viet bang Tieng Viet; cac keyword, status, API path, table name, batch type, job type va field name duoc giu nguyen bang English de thong nhat voi codebase.

## 1. Nguyen tac kien truc

- `Character Group` la don vi san xuat chinh.
- `Character` so huu anh goc `Young Original Image` va `Old Original Image`.
- `Character Group` chua `Characters`, khong so huu image assets.
- Mot `Character` co the nam trong nhieu `Character Groups`.
- `IMAGE_EDIT` luon dung source images goc tu `sourceAssetsSnapshot`, khong dung edited image lam source.
- `Music` la ngoai le: music khong thuoc `Character Group`, ma duoc chon theo `musicPolicy` va metadata nhu `mood`, `tempo`, `emotion`, `scene`, `style`.
- `Workflow` la resource-driven production template, khong phai strict sequential chain.
- `workflow_stages` van duoc giu cho legacy compatibility, nhung model khuyen nghi la `resource_rules_json`.
- SQLite chi luu metadata va file references. Media binary/base64 khong duoc luu trong SQLite.

## 2. Storage policy

Backend dung `STORAGE_ROOT` trong `.env`.

Neu thieu `STORAGE_ROOT`, default la:

```text
../data/fb-cm-factory/backend-storage
```

Backend serve media qua:

```text
/storage
```

`assets` chi luu metadata:

- `file_path`
- `public_url`
- `mime_type`
- `file_size`
- `checksum`
- `storage_provider`
- `storage_key`
- `metadata_json`
- `thumbnail_file_path`
- `thumbnail_public_url`
- `thumbnail_width`
- `thumbnail_height`
- `thumbnail_status`

Cam luu vao DB:

- `data:image/...`
- `data:video/...`
- `data:audio/...`
- `base64,`
- binary-like string lon
- browser `blob:` URL

Neu payload vi pham, backend tra:

```text
BINARY_CONTENT_NOT_ALLOWED_IN_DB
BLOB_URL_NOT_ALLOWED_IN_DB
```

Thumbnails duoc luu tai:

```text
STORAGE_ROOT/thumbnails/<assetId>/thumb.jpg
```

Va serve qua:

```text
/storage/thumbnails/<assetId>/thumb.jpg
```

Chi tiet xem them: `docs/STORAGE_POLICY.md`.

## 3. Core domain model

### 3.1 Character

`Character` la source-of-truth cho nhan vat.

Du lieu chinh:

- `name`
- `status`: `alive` | `rip`
- `age`
- `metadata_json`
- source images:
  - `YOUNG_ORIGINAL_IMAGE`
  - `OLD_ORIGINAL_IMAGE`

Anh da edit, videos, final videos va post content co the lien quan den character qua metadata/lineage, nhung khong thay the source images.

### 3.2 Character Import Center

Dung de bulk import cap anh nhan vat.

Quy tac file:

```text
Young image: <Name>.<ext>
Old image: <Name> aXX.<ext>
Old image: <Name> rXX.<ext>
```

Vi du:

```text
Merle Oberon.png
Merle Oberon r68.jpg
```

Ket qua:

- tao `Character`
- tao `YOUNG_ORIGINAL_IMAGE`
- tao `OLD_ORIGINAL_IMAGE`
- tao thumbnail neu file la image hop le
- khong gan image truc tiep vao `Character Group`

Neu da import bang client loi truoc day va DB co `blob:` URL, import lai cung file/cung ten se repair bang cach tao source assets moi co file path that.

### 3.3 Character Group

`Character Group` la production context.

Group chua:

- `character_group`
- `character_group_members`
- `character_group_attribute_values`

`character_group_members.sort_order` la vi tri san xuat cua character trong group. Thu tu nay quan trong cho video generation/composition sau nay.

Tat ca API tra danh sach member/source assets theo group phai ton trong:

```text
ORDER BY sort_order ASC, created_at ASC
```

Tinh nang hien co:

- create group voi default name:

```text
Nhóm YYmmdd hhmm
```

- default description:

```text
Nhóm nhân vật tạo ngày dd/mm/YYYY, vào lúc hh:mm
```

- `Full Random`
- `Partial Manual + Random`
- `Full Manual`
- `Shuffle Positions`
- drag/drop reorder trong tab `Members`
- duplicate group
- archive group
- delete group
- create production batch

`Delete Group` chi xoa group va memberships. Khong xoa `Characters` va khong xoa source images.

### 3.4 Group Attributes

Group detail tab `Attributes` hien dung bo attribute chinh:

- `background`
- `outfit`
- `emotion`
- `scene`

Ngoai ra ho tro custom free-form attributes.

Khi save attributes:

- xoa toan bo attributes cu cua group
- luu lai bo attributes moi
- tu tao `group_attributes` key neu chua ton tai

UI hien `Quick values used by other groups` de chon nhanh value da tung dung.

## 4. Asset Center va media lifecycle

`Asset Center` quan ly cac loai asset:

- `CHARACTER_IMAGE`
- `PROMPT_TEMPLATE`
- `MUSIC_TRACK`
- `VIDEO_TEMPLATE`
- `POST_TEMPLATE`

Image assets co thumbnail de list/grid khong load original images.

Quy tac:

- list/card/grid dung `thumbnailPublicUrl`
- full preview/detail moi dung `publicUrl`
- thumbnail generation fail khong lam asset invalid
- non-image asset co `thumbnail_status = NOT_APPLICABLE`

Script backfill:

```bash
cd backend
npm run thumbnails:generate
```

## 5. Production Batch Engine

Batch types hien co:

- `CHARACTER_GROUP`
- `IMAGE_BATCH`
- `VIDEO_BATCH`
- `MUSIC_TRACK`
- `FINAL_VIDEO`
- `POST_CONTENT`

`CHARACTER_GROUP` batch duoc tao tu group se co metadata:

```json
{
  "groupId": "...",
  "characterIds": ["..."],
  "sourceAssetsSnapshot": {
    "groupId": "...",
    "characters": [
      {
        "characterId": "...",
        "youngOriginalImage": {},
        "oldOriginalImage": {}
      }
    ]
  }
}
```

`sourceAssetsSnapshot.characters` phai theo dung `character_group_members.sort_order`.

## 6. Resource-driven Workflow Template

`Workflow` hien duoc hieu la production template gom:

- `capacity_config_json`
- `music_policy_json`
- `post_content_policy_json`
- `resource_rules_json`
- `script_mapping_json`
- `prompt_mapping_json`

`resource_rules_json` la model khuyen nghi. Vi du:

```json
[
  {
    "trigger": "CHARACTER_GROUP.READY",
    "targetJobType": "IMAGE_EDIT",
    "outputBatchType": "IMAGE_BATCH",
    "scriptCategory": "IMAGE_EDIT",
    "promptCategory": "IMAGE"
  },
  {
    "trigger": "IMAGE_BATCH.READY",
    "targetJobType": "VIDEO_GENERATE",
    "outputBatchType": "VIDEO_BATCH",
    "scriptCategory": "VIDEO_GENERATE",
    "promptCategory": "VIDEO"
  },
  {
    "trigger": "VIDEO_BATCH.READY",
    "targetJobType": "VIDEO_COMPOSE",
    "outputBatchType": "FINAL_VIDEO",
    "requires": ["MUSIC_TRACK"],
    "scriptCategory": "VIDEO_COMPOSE"
  },
  {
    "trigger": "FINAL_VIDEO.READY",
    "targetJobType": "POST_CONTENT",
    "outputBatchType": "POST_CONTENT",
    "scriptCategory": "POST_CONTENT",
    "promptCategory": "POST_CONTENT"
  }
]
```

`workflow_stages` van ton tai trong DB/API de backward compatibility, nhung UI can label la:

```text
Legacy Sequential Stages
```

Resource rules section can label:

```text
Resource-Driven Rules (Recommended)
```

## 7. Dynamic Instance Pool va Scheduler

`instances` la source chinh cho dynamic allocation.

Pool states:

- `AVAILABLE`
- `STANDBY`
- `WORKFLOW`
- `MAINTENANCE`
- `DISABLED`
- `RETIRED`

Default state:

```text
AVAILABLE
```

Eligible dynamic instance:

- `current_pool_type = STANDBY`
- `status = ACTIVE` hoac `ONLINE`
- `runtime_status = IDLE` hoac NULL/empty
- `capabilities_json.canRun` include `targetStageType`
- khong `MAINTENANCE`, `DISABLED`, `RETIRED`
- khong co active allocation

On allocation:

- create `instance_allocations`
- set instance `current_pool_type = WORKFLOW`
- set `current_workflow_run_id` neu co
- job payload co:
  - `allocationId`
  - `instanceId`
  - `hostId`
  - `localId`
  - `adbId`
  - `allocationMode = DYNAMIC_CAPABILITY`

Fallback:

- neu khong co dynamic match, fallback sang legacy `instance_pool_members`
- payload `allocationMode = STATIC_POOL_FALLBACK`
- neu van fail: `NO_INSTANCE_AVAILABLE`

## 8. Workflow Capacity Model

Workflow/run co capacity config:

```json
{
  "IMAGE_EDIT": 3,
  "VIDEO_GENERATE": 2,
  "MUSIC_GENERATE": 1,
  "VIDEO_COMPOSE": 1,
  "POST_CONTENT": 1
}
```

`POST /workflow-runs/:id/allocate-capacity`:

- doc `workflow_run.capacity_config_json` truoc
- fallback `workflow.capacity_config_json`
- chon eligible `STANDBY` instances theo `capabilities.canRun`
- tao `instance_allocations` voi:

```json
{
  "allocationType": "WORKFLOW_CAPACITY",
  "workflowRunId": "...",
  "stageType": "IMAGE_EDIT"
}
```

Neu thieu instance:

```text
PARTIAL_CAPACITY_ALLOCATED
```

## 9. POST_CONTENT

`POST_CONTENT` la production resource first-class.

Metadata:

```json
{
  "caption": "...",
  "postText": "...",
  "hashtags": ["..."],
  "title": "...",
  "cta": "...",
  "platform": "facebook"
}
```

Co:

- batch type `POST_CONTENT`
- prompt template category `POST_CONTENT`
- job type `POST_CONTENT`
- orchestrator rule `FINAL_VIDEO READY -> POST_CONTENT`
- mock executor tao `POST_CONTENT` batch `READY` va `AVAILABLE`

`POST_CONTENT Worker` dung:

- Character Metadata
- Character Group
- Group Attributes
- Final Video Metadata

Khong dung image assets lam input chinh.

## 10. Music Matching Policy

`MUSIC_TRACK` reusable mac dinh.

Metadata ho tro:

- `mood`
- `tempo`
- `style`
- `scene`
- `emotion`
- `tags`

`musicPolicy`:

```json
{
  "mode": "RANDOM_LIBRARY",
  "matchAttributes": ["mood", "tempo", "emotion"]
}
```

Modes:

- `RANDOM_LIBRARY`: chon random `READY + REUSABLE MUSIC_TRACK`
- `REQUIRE_MATCHED`: chi chon track match attributes
- `CREATE_DEDICATED`: neu khong co match thi tao `MUSIC_GENERATE` job truoc

## 11. Script Management

`Script` khong phai `Workflow`.

`Script` la automation recipe cho mot worker/app/platform.

Categories:

- `IMAGE_EDIT`
- `VIDEO_GENERATE`
- `MUSIC_GENERATE`
- `VIDEO_COMPOSE`
- `POST_CONTENT`
- `UTILITY`

Step types:

- `wait`
- `screenshot`
- `tap`
- `swipe`
- `send-text`
- `send-key`
- `upload-file`
- `download-latest`
- `check-screen`
- `wait-screen`
- `if`
- `retry`
- `run-sub-script`

Runtime variables:

- `{{prompt.image}}`
- `{{prompt.video}}`
- `{{prompt.music}}`
- `{{prompt.post}}`
- `{{group.name}}`
- `{{batch.id}}`
- `{{asset.publicUrl}}`
- `{{runtime.instanceId}}`

## 12. Prompt Templates

Prompt Template UI gom:

- category sidebar
- compact prompt cards
- filters
- detail drawer
- versions
- editor
- preview
- variable helper

Categories:

- `IMAGE_EDIT`
- `VIDEO_GENERATE`
- `MUSIC_GENERATE`
- `VIDEO_COMPOSE`
- `POST_CONTENT`
- `UTILITY`

Card actions da dung icon:

- edit/view
- duplicate
- preview
- activate
- archive disabled
- delete

`Delete Template` se xoa template va tat ca versions cua template do.

## 13. Factory Control Center

Control Center dung de operator nhin tong quan:

KPI:

- `AVAILABLE instances`
- `STANDBY instances`
- `WORKFLOW instances`
- `MAINTENANCE instances`
- `DISABLED instances`
- `READY batches`
- `PENDING jobs`
- `RUNNING jobs`
- `FAILED_RECOVERABLE sessions`
- `FINAL_VIDEO count`
- `POST_CONTENT count`

Boards:

- Pipeline Board
- Instance Board
- Job Board
- Runtime Board
- Debug Drawer
- Host Test Panel

Auto-refresh co toggle va interval 5 seconds.

## 14. Host Agent va ADB mapping

Host sync khong duoc map `adbId` bang array index.

Quy tac:

- neu Host Agent `/instances` tra `adbId`, dung truc tiep
- neu khong co, giu `adbId` cu neu da ton tai
- neu khong co thong tin, de `adbId = null`
- metadata:

```text
adbMappingConfidence = direct | preserved | unknown
```

UI:

- neu `adbId` missing hoac mapping unknown, hien `ADB mapping unknown`
- khong cho runtime commands neu thieu `adbId`

`download-latest` trong Host Agent phai chon newest file theo modified time, khong lay first/head tuy tien.

Supported extension:

- `png`
- `jpg`
- `jpeg`
- `webp`
- `mp4`

Neu khong co file:

```text
NO_MATCHING_FILE_FOUND
```

## 15. Manager Bridge

`manager-bridge` la deprecated.

Huong di moi:

```text
Host Agent V2 direct execution
```

Khong xoa `manager-bridge`, nhung khong dung no trong new job executor paths.

Chi tiet xem:

```text
docs/MANAGER_BRIDGE_DEPRECATED.md
```

## 16. API quan trong

### Character

- `GET /characters`
- `GET /characters/:id`
- `PATCH /characters/:id`
- `DELETE /characters/:id`
- `GET /characters/:id/detail`
- `GET /characters/:id/groups`
- `GET /characters/:id/assets`
- `GET /characters/:id/jobs`

### Character Import

- `POST /character-import/pair`
- `POST /character-import/bulk`
- `GET /character-import/preview`
- `GET /character-import/history`

### Character Groups

- `GET /character-groups`
- `POST /character-groups`
- `GET /character-groups/:id`
- `PATCH /character-groups/:id`
- `DELETE /character-groups/:id`
- `GET /character-groups/:id/detail`
- `GET /character-groups/:id/source-assets`
- `POST /character-groups/:id/members`
- `DELETE /character-groups/:id/members/:memberId`
- `PATCH /character-groups/:id/members/reorder`
- `POST /character-groups/:id/members/shuffle`
- `POST /character-groups/:id/attributes`
- `PUT /character-groups/:id/attributes`
- `POST /character-groups/:id/duplicate`
- `POST /character-groups/:id/create-production-batch`

### Assets

- `GET /assets`
- `POST /assets`
- `GET /assets/:id`
- `PATCH /assets/:id`
- `DELETE /assets/:id`
- `POST /assets/:id/set-best`
- `GET /assets/categories`

### Prompt Templates

- `GET /prompt-templates`
- `POST /prompt-templates`
- `GET /prompt-templates/:id`
- `DELETE /prompt-templates/:id`
- `POST /prompt-templates/:id/versions`
- `GET /prompt-template-versions/:id`
- `POST /prompt-template-versions/:id/activate`

### Instances / Scheduler

- `GET /instances`
- `GET /instances/standby`
- `GET /instances/maintenance`
- `PATCH /instances/:id/capabilities`
- `POST /instances/:id/move-available`
- `POST /instances/:id/move-standby`
- `POST /instances/:id/move-maintenance`
- `POST /instances/:id/disable`
- `POST /instances/:id/retire`
- `POST /orchestrator/jobs/:id/allocate`
- `GET /instance-allocations/active`

## 17. Van hanh thuong ngay

### Start dev

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

### Migration

```bash
cd backend
npm run db:migrate
```

### Build check

```bash
cd backend
npm run build
cd ../frontend
npm run build
```

### Cleanup media trong DB

```bash
cd backend
npm run cleanup:media
```

### Backfill thumbnails

```bash
cd backend
npm run thumbnails:generate
```

### Compact SQLite DB

Khi DB tung chua media/base64 lon, sau cleanup file SQLite co the van phinh. Can:

1. Tat moi app/backend dang dung DB.
2. Backup DB.
3. Chay `VACUUM INTO` hoac compact script thu cong.
4. Kiem tra `PRAGMA integrity_check`.
5. Khoi dong lai backend.

## 18. Troubleshooting nhanh

### Anh thumbnail bi vo trong frontend

Nguyen nhan thuong gap:

- frontend dang request `/storage/...` tu port `5173` thay vi backend port `3200`
- can normalize media URL bang `API_BASE`
- backend `/storage/...` phai tra `200 image/jpeg`

### Character import xong thumbnail pending

Kiem tra DB `assets`:

- `file_path` co null khong
- `public_url` co phai `blob:http...` khong
- `thumbnail_status` la gi

Neu `public_url = blob:http...`, do la data loi tu client cu. Import lai file that de repair.

### Bulk preview bi `413 Payload Too Large`

Preview chi nen gui metadata file, khong gui `dataUrl`.

Import that moi gui `dataUrl`.

### DB lon bat thuong

Kiem tra:

- `data:image`
- `data:video`
- `base64,`
- WAL file
- `VACUUM INTO` compact size

Neu compact copy nho hon rat nhieu, DB can vacuum.

### Runtime command khong chay

Kiem tra:

- instance co `adbId` khong
- `adbMappingConfidence`
- Host Agent health
- ADB devices
- runtime session status

## 19. Quy tac cho Codex/dev tiep theo

- Khong xoa existing APIs neu khong co yeu cau ro.
- Khong xoa `instance_pools` hoac `instance_pool_members`.
- Khong xoa `workflow_stages`.
- Khong rewrite `migrate.ts` toan bo; chi safe migration/add columns.
- Khong dua binary/base64 media vao SQLite.
- Khong luu `blob:` URL vao DB.
- UI list/grid phai dung thumbnail, khong load original image.
- `Character Group` chi chua `Characters`, khong chua image assets.
- Production batch snapshot phai dung original source images.
- Thu tu member trong group phai ton trong `sort_order`.
- New execution path uu tien `Host Agent V2 direct execution`.
- Sau thay doi lon can chay:

```bash
cd backend && npm run build
cd frontend && npm run build
```

## 20. Tai lieu lien quan

- `docs/STORAGE_POLICY.md`
- `docs/MANAGER_BRIDGE_DEPRECATED.md`
- `docs/WORKFLOW_RESOURCE_DRIVEN_MODEL.md`
- `docs/DATA_MODEL.md`
- `docs/API_DESIGN.md`
- `docs/HOST_AGENT_V2_DESIGN.md`
- `docs/IMAGE_EDIT_WORKER_PLAN.md`
