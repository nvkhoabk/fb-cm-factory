# FB-CM Factory V2 API Design

## API Principles

- REST APIs manage durable resources.
- Host Agent V2 uses authenticated queue and event APIs.
- Realtime channels publish state changes but are not the source of truth.
- All create and mutation endpoints should validate with shared schemas.
- Long-running execution is represented as run, queue, lease, attempt, checkpoint, and event resources.
- APIs return V2 model names. Do not expose V1 script-run terminology except in migration adapters.

## Conventions

Base path:

```text
/
```

Response envelope for mutations:

```json
{
  "ok": true,
  "data": {},
  "meta": {}
}
```

Error envelope:

```json
{
  "ok": false,
  "error": {
    "code": "TASK_RUN_NOT_FOUND",
    "message": "Task run not found",
    "detail": {}
  }
}
```

Common query params:

- `workspaceId`
- `status`
- `q`
- `limit`
- `cursor`
- `sort`

Common mutation headers:

- `Idempotency-Key` for create/run/claim endpoints.
- `If-Match` for version-sensitive updates where needed.

## Workflow APIs

### Workflows

```text
GET    /workflows
POST   /workflows
GET    /workflows/:workflowId
PATCH  /workflows/:workflowId
POST   /workflows/:workflowId/archive
```

Create workflow request:

```json
{
  "workspaceId": "ws_123",
  "name": "Character Image Edit",
  "description": "Generate edited young and old images for a group",
  "category": "image"
}
```

### Workflow Versions

```text
GET    /workflows/:workflowId/versions
POST   /workflows/:workflowId/versions
GET    /workflow-versions/:versionId
POST   /workflow-versions/:versionId/validate
POST   /workflow-versions/:versionId/activate
POST   /workflow-versions/:versionId/archive
```

Version definition should include stages, dependencies, task templates, prompt bindings, pool requirements, checkpoint policy, retry policy, and output mapping.

### Workflow Runs

```text
GET    /workflow-runs
POST   /workflow-runs
GET    /workflow-runs/:runId
POST   /workflow-runs/:runId/pause
POST   /workflow-runs/:runId/resume
POST   /workflow-runs/:runId/cancel
POST   /workflow-runs/:runId/retry-failed
```

Start run request:

```json
{
  "workspaceId": "ws_123",
  "workflowId": "wf_123",
  "workflowVersionId": "wfv_5",
  "targetGroupId": "cg_123",
  "priority": 50,
  "input": {
    "outputAspectRatio": "9:16",
    "style": "cinematic"
  }
}
```

Run detail response should include:

- Workflow run summary.
- Stage run summaries.
- Task run counts.
- Latest run events.
- Blocking errors or waiting dependencies.

## Stage and Task Run APIs

```text
GET    /workflow-runs/:runId/stage-runs
GET    /stage-runs/:stageRunId
POST   /stage-runs/:stageRunId/retry
POST   /stage-runs/:stageRunId/skip

GET    /task-runs
GET    /task-runs/:taskRunId
POST   /task-runs/:taskRunId/retry
POST   /task-runs/:taskRunId/cancel
GET    /task-runs/:taskRunId/attempts
GET    /task-attempts/:attemptId/checkpoints
GET    /task-attempts/:attemptId/events
```

Task run detail should expose selected character, group member, prompt set, input assets, output assets, assigned pool and slot, current attempt, latest checkpoint, and error state.

## Character Group APIs

### Characters

```text
GET    /characters
POST   /characters
GET    /characters/:characterId
PATCH  /characters/:characterId
GET    /characters/:characterId/assets
GET    /characters/:characterId/groups
```

### Character Groups

```text
GET    /character-groups
POST   /character-groups
GET    /character-groups/:groupId
PATCH  /character-groups/:groupId
POST   /character-groups/:groupId/archive
GET    /character-groups/:groupId/members
POST   /character-groups/:groupId/members
PATCH  /character-group-members/:memberId
DELETE /character-group-members/:memberId
POST   /character-groups/:groupId/reorder
POST   /character-groups/:groupId/preview-selection
```

Group create request:

```json
{
  "workspaceId": "ws_123",
  "name": "June Image Batch",
  "groupType": "batch",
  "selectionPolicy": {
    "mode": "ordered",
    "limit": 50
  }
}
```

### Group Attributes

```text
GET    /group-attribute-definitions
POST   /group-attribute-definitions
PATCH  /group-attribute-definitions/:definitionId
GET    /character-groups/:groupId/attributes
PUT    /character-groups/:groupId/attributes
GET    /character-group-members/:memberId/attributes
PUT    /character-group-members/:memberId/attributes
```

Attribute update request:

```json
{
  "values": [
    {
      "key": "era",
      "value": "classic_hollywood"
    },
    {
      "key": "output_aspect_ratio",
      "value": "9:16"
    }
  ]
}
```

## Prompt Builder APIs

```text
GET    /prompt-templates
POST   /prompt-templates
GET    /prompt-templates/:templateId
PATCH  /prompt-templates/:templateId
GET    /prompt-templates/:templateId/versions
POST   /prompt-templates/:templateId/versions
POST   /prompt-versions/:versionId/activate
POST   /prompts/render-preview
GET    /prompt-sets/:promptSetId
GET    /task-runs/:taskRunId/rendered-prompts
```

Render preview request:

```json
{
  "promptVersionId": "pv_123",
  "context": {
    "character": {
      "name": "Example Name"
    },
    "group": {
      "attributes": {
        "era": "classic_hollywood"
      }
    }
  }
}
```

Render preview response:

```json
{
  "ok": true,
  "data": {
    "content": "Rendered prompt text",
    "negativeContent": "",
    "variables": {
      "character.name": "Example Name",
      "group.attributes.era": "classic_hollywood"
    },
    "missingVariables": []
  }
}
```

## Asset APIs

```text
GET    /assets
POST   /assets
GET    /assets/:assetId
PATCH  /assets/:assetId
POST   /assets/:assetId/approve
POST   /assets/:assetId/reject
POST   /assets/:assetId/archive
POST   /assets/:assetId/set-best-version
GET    /assets/:assetId/relations
GET    /assets/:assetId/usage
POST   /assets/:assetId/reserve
POST   /asset-reservations/:reservationId/release
```

Create asset request:

```json
{
  "workspaceId": "ws_123",
  "characterId": "char_123",
  "groupId": "cg_123",
  "assetType": "original_young_image",
  "mediaType": "image",
  "name": "Example - Young",
  "storageProvider": "local",
  "filePath": "characters/example/original/file.png",
  "mimeType": "image/png",
  "qualityStatus": "approved"
}
```

Generated assets are normally registered by host-agent output manifests through queue APIs, not manually.

## Instance Pool APIs

```text
GET    /hosts
POST   /hosts
GET    /hosts/:hostId
PATCH  /hosts/:hostId
POST   /hosts/:hostId/refresh
GET    /hosts/:hostId/slots

GET    /instance-pools
POST   /instance-pools
GET    /instance-pools/:poolId
PATCH  /instance-pools/:poolId
GET    /instance-pools/:poolId/slots
POST   /instance-pools/:poolId/slots
PATCH  /instance-slots/:slotId
POST   /instance-slots/:slotId/disable
POST   /instance-slots/:slotId/enable
```

Pool create request:

```json
{
  "workspaceId": "ws_123",
  "name": "Image Edit LD Pool",
  "poolType": "ldplayer",
  "capabilityTags": ["image_edit", "adb", "screenshot"],
  "concurrencyLimit": 8,
  "leaseTimeoutSeconds": 120
}
```

## Queue Orchestrator APIs

Operator and backend inspection:

```text
GET    /queue/items
GET    /queue/items/:queueItemId
POST   /queue/items/:queueItemId/requeue
POST   /queue/items/:queueItemId/cancel
GET    /queue/leases
POST   /queue/leases/:leaseId/revoke
```

Host-agent APIs:

```text
POST   /agent/register
POST   /agent/heartbeat
POST   /agent/slots/sync
POST   /agent/queue/claim
POST   /agent/queue/leases/:leaseId/renew
POST   /agent/queue/leases/:leaseId/events
POST   /agent/queue/leases/:leaseId/checkpoints
POST   /agent/queue/leases/:leaseId/outputs
POST   /agent/queue/leases/:leaseId/complete
POST   /agent/queue/leases/:leaseId/fail
```

Claim request:

```json
{
  "agentId": "agent_123",
  "hostId": "host_123",
  "availableSlots": [
    {
      "slotId": "slot_1",
      "capabilityTags": ["image_edit", "adb"],
      "healthStatus": "online"
    }
  ],
  "maxItems": 1
}
```

Claim response:

```json
{
  "ok": true,
  "data": {
    "leases": [
      {
        "leaseId": "lease_123",
        "leaseToken": "one-time-secret-token",
        "expiresAt": "2026-06-17T02:30:00.000Z",
        "queueItem": {
          "id": "qi_123",
          "taskRunId": "tr_123",
          "taskAttemptId": "ta_123",
          "input": {},
          "executionPlan": {},
          "checkpointPolicy": {}
        }
      }
    ]
  }
}
```

Checkpoint request:

```json
{
  "leaseToken": "one-time-secret-token",
  "checkpointKey": "prompt_rendered",
  "checkpointType": "logical",
  "sequenceNo": 20,
  "status": "succeeded",
  "payload": {
    "promptSetId": "ps_123"
  },
  "assetIds": []
}
```

Output manifest request:

```json
{
  "leaseToken": "one-time-secret-token",
  "outputs": [
    {
      "assetType": "edited_young_image",
      "mediaType": "image",
      "name": "Example output",
      "storageProvider": "agent_local",
      "filePath": "task-outputs/file.png",
      "publicUrl": "http://host:4100/storage/task-outputs/file.png",
      "mimeType": "image/png",
      "fileSize": 123456,
      "checksum": "sha256:..."
    }
  ]
}
```

## Realtime Events

Suggested channels:

- `workflow-run.updated`
- `stage-run.updated`
- `task-run.updated`
- `task-attempt.updated`
- `queue.updated`
- `host.updated`
- `instance-pool.updated`
- `asset.created`
- `asset.updated`
- `prompt.rendered`

Realtime payloads should include IDs and status summaries. Clients fetch full details through REST APIs.

## Compatibility APIs

During migration, a V1 bridge can expose adapter endpoints under:

```text
/v1-bridge/*
```

Bridge APIs should be temporary and should translate V1 concepts into V2 resources rather than leaking V1 tables into new frontend features.
