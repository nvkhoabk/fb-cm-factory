# Host Agent V2 Design

## Purpose

Host Agent V2 is the local execution worker for FB-CM Factory V2. It runs on machines that host LDPlayer, ADB, browser sessions, local AI tools, file-system integrations, or media utilities.

V1 Host Agent is a single Express file that exposes health, metrics, LDPlayer discovery, ADB commands, screenshots, text input, swipe/tap, and latest-file download. V2 keeps those capabilities but splits them into modules and changes the control model from direct backend command forwarding to queue leases.

## Design Goals

- Modular adapters for LDPlayer, ADB, browser, filesystem, and future tools.
- Pull-based queue claiming with lease renewal.
- Durable progress reporting through backend checkpoints.
- Clean separation between local discovery, execution, storage, and API transport.
- Safe restart behavior with local recovery metadata.
- Capability reporting so backend scheduling can match work to slots.
- Idempotent task execution where backend retry policy allows it.

## Non-Goals

- Host Agent V2 is not the durable source of truth.
- Host Agent V2 does not decide global workflow dependencies.
- Host Agent V2 does not mutate V2 database directly.
- Host Agent V2 does not permanently store production assets unless configured as a storage provider.

## Proposed Directory Structure

```text
host-agent/
  src/
    index.ts
    config/
      load-config.ts
      schema.ts
    api/
      local-server.ts
      health.routes.ts
      diagnostics.routes.ts
    backend-client/
      auth.ts
      client.ts
      queue-client.ts
      event-client.ts
    runtime/
      agent-runtime.ts
      heartbeat.service.ts
      lease-runner.ts
      recovery.service.ts
      shutdown.service.ts
    scheduler/
      claim-loop.ts
      lease-renewal.ts
      local-concurrency.ts
    slots/
      slot-registry.ts
      slot-discovery.ts
      slot-health.ts
      slot-locks.ts
    adapters/
      adapter.ts
      ldplayer/
        ldconsole.client.ts
        ldplayer.discovery.ts
        ldplayer.lifecycle.ts
      adb/
        adb.client.ts
        adb.input.ts
        adb.screenshot.ts
        adb.files.ts
      browser/
        browser.adapter.ts
      filesystem/
        filesystem.adapter.ts
    execution/
      execution-plan.ts
      step-runner.ts
      checkpoint-reporter.ts
      output-reporter.ts
      prompt-artifact-writer.ts
    storage/
      local-storage.ts
      upload-client.ts
      manifest-builder.ts
    observability/
      logger.ts
      metrics.ts
      event-buffer.ts
    util/
      ids.ts
      retry.ts
      paths.ts
```

## Runtime Components

### Agent Runtime

Starts the process, loads config, initializes modules, registers with backend, starts heartbeat, starts slot discovery, and starts the claim loop.

### Backend Client

Owns all communication with backend:

- Agent registration.
- Heartbeat.
- Slot sync.
- Queue claim.
- Lease renew.
- Event submit.
- Checkpoint submit.
- Output submit.
- Complete or fail attempt.

All backend calls should include agent identity and request IDs. Lease-scoped calls include the lease token.

### Claim Loop

Periodically asks backend for work if local concurrency allows it.

Inputs:

- Current slots and health.
- Active local leases.
- Agent capabilities.
- Configured max concurrency.

Outputs:

- Starts one lease runner per claimed queue item.
- Does not execute more work than configured slot capacity.

### Lease Runner

Runs one task attempt under one backend lease.

Responsibilities:

- Validate lease payload.
- Bind execution to a slot.
- Start lease renewal.
- Execute the provided task execution plan.
- Emit checkpoints at policy-defined points.
- Report output manifests.
- Complete or fail the lease.
- Release local slot lock.

### Lease Renewal

Renews active leases before expiry. If renewal fails repeatedly, the runner should stop at the next safe checkpoint and report interruption if possible.

### Recovery Service

Maintains a small local recovery journal:

- Active lease ID.
- Task attempt ID.
- Slot ID.
- Last local checkpoint key.
- Local output paths not yet reported.
- Process start time.

On restart, the agent asks the backend whether old leases are still valid. If not valid, it reports local diagnostics and waits for backend requeue.

## Adapter Model

Adapters expose capabilities through a shared interface.

Conceptual interface:

```text
Adapter
  name
  capabilityTags
  discoverSlots()
  healthCheck(slot)
  canRun(step)
  runStep(step, context)
  collectOutputs(context)
```

Adapters must return structured results and avoid throwing raw tool output as user-facing errors. Raw output can be attached to diagnostic events.

### LDPlayer Adapter

Wraps LDConsole behavior from V1:

- List instances.
- Start, stop, restart, rename.
- Map local LD instance to slot metadata.
- Report process IDs and running state.

Capability tags:

- `ldplayer`
- `emulator`

### ADB Adapter

Wraps ADB behavior from V1:

- Connect and reconnect.
- List devices.
- Test device.
- Tap, swipe, key event, text input.
- Screenshot.
- Pull files.
- Find latest files by directory and extension.

Capability tags:

- `adb`
- `android_input`
- `screenshot`
- `file_pull`

### Filesystem Adapter

Handles local file staging, checksum, MIME detection, and manifest creation.

Capability tags:

- `local_storage`
- `file_stage`

### Browser Adapter

Reserved for future browser-based workflows.

Capability tags:

- `browser`
- `web_automation`

## Slot Model

A slot is a local execution target, such as one LDPlayer instance or one browser profile.

Slot state reported to backend:

- `slotId`
- `hostId`
- `slotType`
- `localRef`
- `displayName`
- `status`
- `healthStatus`
- `capabilityTags`
- `metadata`
- `lastSeenAt`

LDPlayer slot metadata:

- `localId`
- `ldName`
- `adbId`
- `adbStatus`
- `pid`
- `vboxPid`
- `screenshotUrl`

The backend decides which slots belong to which instance pools. The agent reports what exists and what is healthy.

## Queue Lease Flow

1. Agent registers and receives or confirms `agentId`.
2. Agent sends heartbeat and slot sync.
3. Claim loop posts available slots to `/api/v2/agent/queue/claim`.
4. Backend grants one or more leases with execution plans.
5. Lease runner starts and renews lease.
6. Runner emits `attempt_started` event.
7. Runner executes steps through adapters.
8. Runner emits checkpoints and logs.
9. Runner reports output manifests.
10. Runner completes or fails the lease.
11. Backend advances workflow and releases or requeues work.

## Execution Plan

The backend sends an execution plan that is already resolved enough for the agent to execute safely.

Execution plan should include:

- Task attempt ID.
- Required slot ID or slot constraints.
- Input assets and local acquisition instructions.
- Rendered prompt set or prompt text.
- Ordered steps.
- Checkpoint policy.
- Output collection policy.
- Timeout and retry hints.

Host agent should not make workflow-level decisions from the plan. It executes the plan and reports facts.

## Checkpoints

Agent reports checkpoints through the backend API. A checkpoint is a durable statement that a recovery boundary has been reached.

Recommended checkpoint keys for LDPlayer image-edit MVP:

- `lease_started`
- `slot_ready`
- `input_assets_acquired`
- `prompt_available`
- `app_opened`
- `input_uploaded`
- `generation_submitted`
- `output_detected`
- `output_downloaded`
- `output_manifest_reported`
- `attempt_completed`

Checkpoint payload should include recovery facts, not large logs.

## Output Manifest

The output manifest tells backend what files were produced.

Fields:

- `assetType`
- `mediaType`
- `name`
- `storageProvider`
- `filePath`
- `publicUrl`
- `mimeType`
- `fileSize`
- `checksum`
- `sourceLocalPath`
- `metadata`

Backend decides how to register assets and lineage. Agent does not create database assets directly.

## Local API

Host Agent V2 may expose a local diagnostic API for operators and backend checks.

Suggested routes:

```text
GET  /agent/health
GET  /agent/metrics
GET  /agent/config/redacted
GET  /agent/slots
GET  /agent/leases
POST /agent/slots/:slotId/screenshot
POST /agent/diagnostics/adb-test
```

These routes are for diagnostics. Production automation should use queue leases.

## Config

Suggested config fields:

- `agentName`
- `agentId`
- `hostId`
- `backendBaseUrl`
- `agentToken`
- `publicBaseUrl`
- `mockMode`
- `maxConcurrentLeases`
- `heartbeatIntervalMs`
- `claimIntervalMs`
- `leaseRenewalIntervalMs`
- `ldConsolePath`
- `adbPath`
- `storageRoot`
- `logLevel`

Secrets should come from environment variables or local secret files excluded from source control.

## Failure Handling

### Backend Unreachable

- Stop claiming new leases.
- Continue active lease only while renewal succeeds.
- If renewal cannot be confirmed, stop at safe checkpoint.
- Buffer non-critical diagnostics locally with size limits.

### Slot Failure

- Mark slot degraded locally.
- Report event and fail current lease with structured error.
- Backend decides retry or failover.

### ADB Failure

- Attempt configured reconnect steps.
- Emit diagnostic event with command category and stderr summary.
- Fail at checkpoint boundary if unrecoverable.

### Agent Restart

- Load local recovery journal.
- Register with backend.
- Ask backend about prior active leases.
- Resume only if backend explicitly confirms lease validity.
- Otherwise wait for requeue and keep orphaned local files for cleanup policy.

## Migration From V1 Host Agent

Keep capabilities:

- Health and metrics.
- LDPlayer discovery via LDConsole.
- ADB device list and reconnect.
- Start, stop, restart, rename LD instances.
- Screenshot.
- Tap, swipe, send key, send text.
- Download latest file from Android directory.
- Local static storage for outputs.

Change structure:

- Move LDConsole operations into `adapters/ldplayer`.
- Move ADB operations into `adapters/adb`.
- Move file staging and MIME detection into `storage`.
- Move queue and backend communication into `backend-client`.
- Move long-running execution into `runtime` and `execution`.
- Keep local routes only for diagnostics and manual operator commands.

## MVP Implementation Order

1. Config loader and redacted config diagnostics.
2. Backend client with register, heartbeat, slot sync, claim, renew, events, checkpoints, outputs, complete, fail.
3. Slot registry and LDPlayer/ADB discovery.
4. Local health and metrics routes.
5. Claim loop and lease runner with mock adapter.
6. ADB adapter commands ported from V1.
7. LDPlayer adapter commands ported from V1.
8. Output manifest and local storage.
9. Recovery journal.
10. End-to-end image-edit task attempt.
