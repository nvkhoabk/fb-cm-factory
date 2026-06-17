# IMAGE_EDIT Worker Integration Plan

## Purpose

This document audits the current backend readiness for real `IMAGE_EDIT` worker execution and lists the remaining code changes needed before treating the flow as production-ready.

Scope is intentionally narrow:

- No UI work.
- No Host Agent V2 changes.
- No VIDEO_GENERATE, MUSIC_GENERATE, or VIDEO_COMPOSE real execution.
- No risky refactor.

## Current Readiness Summary

The backend already has the main pieces required for an `IMAGE_EDIT` real worker path:

- Script persistence exists.
- Script runtime can load script versions and execute step definitions.
- Runtime sessions and checkpoints exist.
- Runtime step inputs support `{{...}}` context variables.
- Host Agent Adapter supports the required device commands.
- Instance Scheduler can allocate an `IMAGE_EDIT` job to an active instance.
- Job Executor can create a runtime session and script run.
- Production Batch service can create output batches.

The remaining work is mostly hardening and formalizing the contract between Production Studio batches, script selection, host selection, prompt context, output artifacts, and recovery.

## Audit Checklist

### 1. `scripts` and `script_versions` Tables

Status: Present.

Evidence:

- `backend/src/database/migrate.ts` creates:
  - `scripts`
  - `script_versions`
  - `script_runs`
  - `script_run_steps`

Current notes:

- `script_versions.definition_json` stores executable step definitions.
- Script run persistence already records run status, current step, and per-step outputs.

Missing or needs hardening:

- Add stronger validation for script version definitions before execution.
- Add a clear convention for choosing the active IMAGE_EDIT script when multiple scripts exist.

### 2. Script Runtime Can Load Script Version Steps

Status: Present.

Evidence:

- `scriptRuntimeRepository.getScriptVersion()`
- `scriptRuntimeRepository.getLatestScriptVersion()`
- `scriptRuntimeService.createScriptRun()`
- `scriptRuntimeService.executeScriptRun()`
- `orderedSteps()` normalizes and orders script version steps.

Supported step types currently include:

- `wait`
- `screenshot`
- `tap`
- `swipe`
- `send-text`
- `send-key`
- `check-screen`
- `download-result`
- `throw-error` / `simulate-error` for recovery testing

Missing or needs hardening:

- Validate each step has required fields before the run starts.
- Return a script validation error before creating long-running runtime state when a script is invalid.
- Add a formal script category or purpose field for selecting IMAGE_EDIT scripts.

### 3. Runtime Context Supports Variables

Status: Present.

Evidence:

- `renderInputTemplates()` recursively renders strings, arrays, and objects.
- Variables use `{{path.to.value}}` syntax.
- `executeImageEditJob()` builds runtime context containing:
  - `group`
  - `attributes`
  - `prompt.image`
  - `sourceBatch`
  - `job`

Important supported examples:

```json
{
  "text": "{{prompt.image}}"
}
```

```json
{
  "text": "{{group.name}}"
}
```

Current notes:

- Prompt Builder renders the image prompt before script execution.
- Runtime context is saved into the runtime session and script run.

Missing or needs hardening:

- Define the stable public context contract for IMAGE_EDIT scripts.
- Ensure `group.memberCount` is always populated when a source group exists.
- Decide whether batch attributes or persisted group attributes are the source of truth when both exist.

### 4. Host Agent Adapter Command Coverage

Status: Present.

Evidence:

- `hostAgentService.healthCheckAgent()`
- `hostAgentService.takeScreenshot()`
- `hostAgentService.tap()`
- `hostAgentService.swipe()`
- `hostAgentService.sendText()`
- `hostAgentService.sendKey()`
- `hostAgentService.downloadLatest()`

Current notes:

- Commands use the registered host and pass the selected `instanceId`.
- Runtime `download-result` delegates to Host Agent `download-latest`.

Missing or needs hardening:

- Normalize Host Agent command errors into runtime recovery codes.
- Add timeouts and retry policy per command.
- Store Host Agent command outputs in a structured runtime event or audit log if more observability is needed.

### 5. Job Executor Can Create Runtime Session

Status: Present.

Evidence:

- Mock execution creates runtime session via `runtimeSessionsService.createForJob()`.
- IMAGE_EDIT execution creates runtime session via `runtimeSessionsService.createRuntimeSession()`.
- `POST /job-executor/jobs/:id/execute-image-edit` exists.

Current IMAGE_EDIT preconditions:

- Job must exist.
- Job status must be `ALLOCATED`.
- Job target stage type must be `IMAGE_EDIT`.
- Job payload must contain `instanceId`.
- Source production batch must exist.
- Host must be available from job payload, source batch metadata, or default host.
- Script must be available from job payload, source batch metadata, or latest active script.

Missing or needs hardening:

- Do not rely on latest active script as the long-term default for production.
- Require explicit script selection from the source batch or workflow stage.
- Require explicit host or host allocation mapping in multi-host deployments.

### 6. Output Production Batch After Runtime Success

Status: Present at batch level.

Evidence:

- IMAGE_EDIT execution creates an `IMAGE_BATCH` output.
- Output batch is `READY`.
- Output batch usage status is `AVAILABLE`.
- Output metadata includes:
  - `sourceJobId`
  - `runtimeSessionId`
  - `prompt`
  - `sourceBatchId`
  - `targetStageType`

Missing or needs hardening:

- Create production batch usage link from source batch to output IMAGE_BATCH.
- Convert downloaded Host Agent result files into assets or production batch items.
- Store output file metadata, public URL, MIME type, and size in a first-class asset record.

## Current IMAGE_EDIT Flow

1. Production Studio or API creates an input `IMAGE_BATCH`.
2. `POST /production-batches/:id/launch` marks it ready and creates an `IMAGE_EDIT` orchestrator job when appropriate.
3. `POST /orchestrator/jobs/:id/allocate` allocates an active `IMAGE_EDIT` pool member.
4. `POST /job-executor/jobs/:id/execute-image-edit`:
   - validates job state
   - loads source batch
   - resolves host, instance, script, group, and image prompt
   - creates runtime session
   - creates script run
   - executes script runtime steps through Host Agent Adapter
   - creates output `IMAGE_BATCH`
   - completes the orchestrator job

## Required Code Changes Before Real Worker Production Use

### Required, Small Scope

1. Formalize IMAGE_EDIT script selection.

   Add a stable source for `scriptId`, preferably source batch metadata from Production Studio or workflow stage config. Keep latest active script only as a development fallback.

2. Formalize host selection.

   Add a clear mapping from pool member or allocation to host id. Current fallback through batch metadata or default host is enough for local MVP, but ambiguous for multiple hosts.

3. Add script definition validation.

   Validate supported step types and required input fields before starting runtime execution.

4. Add output artifact linkage.

   When an IMAGE_EDIT script uses `download-result`, create or update:

   - asset record
   - production batch item
   - output batch metadata

5. Add production batch usage link.

   Link source IMAGE_BATCH to output IMAGE_BATCH with a dedicated usage type such as `IMAGE_EDIT_OUTPUT`.

6. Normalize Host Agent errors.

   Map Host Agent failures to recovery codes such as:

   - `HOST_AGENT_UNAVAILABLE`
   - `INSTANCE_OFFLINE`
   - `INSTANCE_HUNG`
   - `SCREEN_TIMEOUT`
   - `NETWORK_ERROR`

### Required for Operator Flow

1. Ensure Production Studio stores IMAGE_EDIT metadata on created batches:

   - image prompt template id
   - script id
   - host id when needed

2. Ensure launch creates the intended `IMAGE_EDIT` job.

   Current launch path creates an `IMAGE_EDIT` job for an `IMAGE_BATCH`. Decide whether this remains launch-specific or moves into seeded `orchestrator_rules`.

3. Add queue action support if not already surfaced:

   - allocate IMAGE_EDIT job
   - execute IMAGE_EDIT job
   - inspect runtime session
   - inspect output batch

### Recommended Hardening

1. Add indexes for script and runtime lookups used by worker execution.
2. Add an automated smoke test for IMAGE_EDIT with Host Agent mock mode.
3. Add runtime event logging for each Host Agent call.
4. Add idempotency protection around `execute-image-edit` so a repeated request cannot create duplicate output batches after success.
5. Add configurable per-step timeout policy.

## Minimal Implementation Sequence

1. Add validation for IMAGE_EDIT script definitions.
2. Persist explicit `scriptId` and prompt template id in batch metadata.
3. Add host id mapping to allocation or pool member metadata.
4. Add output asset and batch item creation from `download-result`.
5. Add source to output batch usage link.
6. Add smoke test covering:
   - input IMAGE_BATCH
   - launch
   - allocate
   - execute-image-edit
   - runtime session completed
   - script run completed
   - output IMAGE_BATCH created
   - output asset or item attached

## No-Risky-Refactor Guidance

Keep the current module boundaries:

- Job orchestration stays in `job-executor`.
- Script execution stays in `script-runtime`.
- Host calls stay in `host-agent-adapter`.
- Batch creation and lineage stay in `production-batches`.
- Allocation stays in `instance-scheduler`.

The next pass should add narrow validation, explicit metadata, and artifact linkage rather than rewriting the worker flow.

