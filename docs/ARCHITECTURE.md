# FB-CM Factory V2 Architecture

## Purpose

FB-CM Factory V2 is an orchestration platform for repeatable AI media production workflows across image, video, music, and composition tools. V2 uses the V1 repo at `../fb-cm-manager` as a behavioral reference, but it does not copy V1's structure directly.

V1 combines scripts, tasks, assets, characters, host discovery, LDPlayer control, and host-agent execution into a working but tightly coupled system. V2 separates those concerns into explicit workflow definitions, durable run state, queue orchestration, instance pools, and a modular Host Agent V2.

## Primary Modules

### Backend Orchestration API

The backend is the source of truth for configuration, workflow definitions, run state, asset lineage, host state, instance pool membership, queue leases, and checkpoints.

Because FB-CM Factory is a standalone project, backend routes are mounted at the repository root API surface, such as `/health`, `/workflows`, `/workflow-runs`, `/instance-pools`, `/character-groups`, `/prompt-templates`, and `/assets`.

Responsibilities:

- Manage workflows, workflow versions, stages, task templates, and run policies.
- Expand a workflow run into stage runs and task runs.
- Resolve character groups, group attributes, prompt templates, and input assets.
- Own queue scheduling, retries, failover, checkpoint recovery, and final run status.
- Expose REST APIs and realtime events for frontend and host agents.
- Persist all durable state in the V2 database.

The backend does not execute LDPlayer or ADB commands directly. It assigns work to host agents through queue leases and receives task-run events, checkpoints, logs, and outputs.

### Frontend Management UI

The frontend is the operator surface for:

- Designing workflows and stage graphs.
- Managing character groups and group attributes.
- Building prompt templates and previewing rendered prompts.
- Inspecting asset lineage, approvals, reservations, and derived outputs.
- Managing hosts, instance pools, leases, and queue health.
- Monitoring workflow runs, stage runs, task runs, checkpoints, retries, and failures.

The frontend should not contain orchestration logic. It calls the backend and subscribes to realtime events.

### Host Agent V2

Host Agent V2 is an execution worker that runs on each machine with LDPlayer, ADB, browser automation, local tools, or file-system integrations.

Responsibilities:

- Register with the backend and send heartbeats.
- Discover local capabilities and emulator instances.
- Claim queue leases from the backend.
- Execute task steps through modular adapters.
- Emit progress events, logs, screenshots, checkpoints, and output manifests.
- Upload or expose output assets as instructed by backend storage policy.
- Recover local in-flight work after restart where possible.

The host agent is not the durable source of truth. Any local state is a cache or recovery aid.

### Shared Packages

V2 should keep shared contracts in packages that can be used by backend, frontend, and host agent:

- API schemas and DTOs.
- Workflow definition schemas.
- Prompt variable schemas.
- Agent command and event schemas.
- Common status enums.

## Core Concepts

### Workflow Engine

A workflow is a versioned production recipe. It defines ordered or conditional stages, each stage defines task templates, and each task template declares required inputs, prompt bindings, execution capability, output expectations, retry policy, and checkpoint policy.

Runtime hierarchy:

1. Workflow
2. Workflow Version
3. Workflow Run
4. Stage
5. Stage Run
6. Task
7. Task Run
8. Task Attempt
9. Checkpoint

V1's `scripts`, `script_versions`, `tasks`, `task_runs`, and `script_runs` become separate V2 layers. V2 should avoid a single "script run" object doing both orchestration and device execution.

### Character Groups

V2 character groups are first-class production units. A group can represent a campaign, batch, sequence cast, theme set, age transformation set, or any reusable collection of characters and assets.

Character groups solve limitations in V1 where selection is mostly per-character and policy-based. In V2, workflows can target a group and iterate across members, pairs, ordered sequences, or attribute-filtered subsets.

Examples:

- A group of 50 characters for image editing.
- A sequence group with ordered character items.
- A duet or transition group with source and target roles.
- A review group containing only characters missing approved edited assets.

### Group Attributes

Group attributes are structured fields attached to a character group, a group member, or a group-member role. They feed prompt rendering, selection, workflow branching, and output metadata.

Examples:

- `era`, `genre`, `style`, `mood`, `platform`, `voice_type`.
- `source_age`, `target_age`, `status`, `sequence_order`.
- `prompt_style`, `negative_prompt_profile`, `output_aspect_ratio`.

Attributes should be typed, versionable, and queryable. Avoid hiding production-critical values only in JSON blobs.

### Prompt Builder

The prompt builder composes prompts from:

- Prompt templates and template versions.
- Workflow and stage variables.
- Character fields.
- Character group attributes.
- Selected asset metadata.
- Prior task outputs.
- Operator overrides.

V1 has simple `{{path}}` replacement in prompt content. V2 should formalize prompt rendering into a traceable build artifact: rendered prompt, source template version, resolved variables, missing variables, and policy decisions.

### Instance Pools

An instance pool is a schedulable set of execution slots. A pool may contain LDPlayer instances, browser profiles, API workers, local render workers, or future media tool runners.

Pools describe capabilities and constraints:

- Capability tags such as `image_edit`, `video_generate`, `music_generate`, `video_merge`, `browser`, `adb`.
- Host affinity or anti-affinity.
- Maximum concurrency.
- Cooldown and warmup behavior.
- Health requirements.
- Account/profile constraints.

V1 models LD instances directly. V2 should schedule against pools and slots, where LDPlayer is one slot type.

### Queue Orchestrator

The queue orchestrator turns runnable task runs into queue items and assigns them to host agents through leases.

Key rules:

- Backend decides eligibility, priority, capability requirements, dependencies, and retries.
- Host agents claim leaseable work, execute it, and renew leases while healthy.
- Expired leases return to the queue only from a known checkpoint.
- Queue items are idempotent and tied to task attempts.
- Manual locks are supported, but pool leases are the normal automation path.

### Asset Lifecycle

V2 assets are durable production objects with lineage. They include original inputs, intermediate files, final outputs, screenshots, prompt artifacts, logs, and review exports.

Lifecycle states:

- `ingested`
- `available`
- `reserved`
- `in_use`
- `generated`
- `review_pending`
- `approved`
- `rejected`
- `archived`
- `deleted`

Asset lineage must record source assets, producing workflow run, stage run, task run, task attempt, prompt render, tool adapter, and output manifest.

### Failover and Checkpointing

V2 should treat every task attempt as recoverable only at explicit checkpoints. A checkpoint records enough state to decide whether to resume, retry, skip, or compensate.

Checkpoint examples:

- Input assets selected.
- Prompt rendered.
- Instance slot leased.
- Tool opened and ready.
- File uploaded to app.
- Generation submitted.
- Output downloaded.
- Output asset registered.

If a host goes offline, the backend expires its leases, marks attempts as interrupted, and requeues from the latest checkpoint according to retry policy.

## High-Level Flow

1. Operator creates or imports characters, character groups, group attributes, and assets.
2. Operator creates prompt templates and workflow versions.
3. Operator starts a workflow run against a group, subset, or explicit input payload.
4. Backend expands the workflow run into stage runs and task runs.
5. Queue orchestrator enqueues runnable task runs when dependencies are satisfied.
6. Host Agent V2 claims a queue lease that matches its capabilities and pool slots.
7. Host agent executes through adapters, emits checkpoints, and reports output manifests.
8. Backend registers output assets, updates lineage, releases reservations, and advances downstream stages.
9. Workflow run completes when all required stage runs complete or a terminal policy stops the run.

## Status Model

Use consistent statuses across run objects:

- Definition status: `draft`, `active`, `archived`.
- Run status: `pending`, `queued`, `leased`, `running`, `paused`, `waiting`, `succeeded`, `failed`, `cancelled`, `interrupted`.
- Review status: `draft`, `review_pending`, `approved`, `rejected`.
- Health status: `unknown`, `online`, `degraded`, `offline`, `stale`.

Avoid V1's mixed use of `success`, `completed`, `running_adb_ready`, and task-specific strings as general-purpose statuses. Keep detailed condition in reason fields.

## Boundaries From V1

Keep from V1:

- Workspace concept.
- Host and LDPlayer discovery concepts.
- Character and asset lineage concepts.
- Prompt template versioning concept.
- Script/flow designer concept.
- Direct ADB command vocabulary as one adapter family.

Change in V2:

- Replace script-centric execution with workflow/stage/task orchestration.
- Replace direct backend-to-agent commands for automation with queue leases.
- Replace loose JSON policies with typed configs plus extension JSON where useful.
- Replace per-character selection with character groups and group attributes.
- Replace monolithic host agent file with modular services and adapters.
- Replace implicit recovery with explicit checkpoints and attempt state.

## Non-Goals For Initial Docs

These architecture documents do not define implementation code, migrations, UI components, or final schema DDL. They define V2 design direction and contracts for the next implementation phases.
