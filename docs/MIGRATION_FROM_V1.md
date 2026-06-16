# Migration From V1 To V2

## Scope

This document describes how V2 should migrate concepts from the V1 repo at `../fb-cm-manager`. It is a design guide only. Do not modify V1 as part of V2 architecture work.

## V1 Summary

V1 is an Express and SQLite application with:

- Workspaces, users, auth, and role middleware.
- Hosts and LDPlayer instances.
- Host health refresh and direct agent command forwarding.
- Characters with original young and old image assets.
- Bulk character image import based on filename parsing.
- Assets with versions, best-version flag, usage state, quality state, and lineage relations.
- Prompt templates and prompt versions with simple variable replacement.
- Scripts and script versions with step or flow design.
- Script executor that runs linear compiled steps against a selected instance.
- Tasks and task runs for image-edit style work.
- Video sequences and content posts.
- A Host Agent implemented as a single Express file with LDConsole, ADB, screenshot, input, and download endpoints.

## Migration Strategy

Use V1 as a source of concepts and existing data semantics, not as a structure to copy. V2 should migrate in phases:

1. Document V2 architecture and contracts.
2. Create V2 schema and API skeleton.
3. Create Host Agent V2 skeleton.
4. Build a V1 bridge adapter for selected import and compatibility flows.
5. Implement Workflow Engine MVP.
6. Migrate or import V1 data into V2 models.
7. Retire bridge paths once V2 workflows cover production use.

## Concept Mapping

| V1 Concept | V2 Concept | Migration Notes |
| --- | --- | --- |
| `workspaces` | `workspaces` | Keep concept, add settings and tighter tenancy boundaries. |
| `users` | `users` | Keep concept, normalize workspace membership later if needed. |
| `characters` | `characters` | Keep core fields, move production batch meaning into groups. |
| Character filename pairs | Character import pipeline | Keep parser behavior as an import adapter, not core model. |
| No first-class groups | `character_groups`, `character_group_members` | New V2 capability. Build groups from imports, sequences, and selection policies. |
| Character metadata JSON | Group and member attributes | Promote queryable production fields into typed attribute definitions and values. |
| `assets` | `assets` | Keep versioning, quality, usage, storage, and lineage ideas. Add workflow/stage/attempt lineage. |
| `asset_usage` | `asset_reservations` | Replace loose usage with explicit reservation lifecycle. |
| `asset_relations` | `asset_relations` | Keep, add richer run and attempt references. |
| `prompt_templates` | `prompt_templates` | Keep. |
| `prompt_versions` | `prompt_versions` | Keep, add negative content and rendering engine fields. |
| Rendered prompt not durable | `prompt_sets`, `rendered_prompts` | New traceability requirement. |
| `scripts` | `workflows` or adapter-level action libraries | Most V1 scripts become workflow versions or stage task templates. |
| `script_versions` | `workflow_versions`, `stages` | Split definition graph from runtime execution. |
| `script_runs` | `task_attempts`, `checkpoints`, `run_events` | V2 separates attempt state from orchestration state. |
| `script_run_steps` | `checkpoints` and attempt events | Durable recovery markers replace linear step logs for recovery. |
| `tasks` | `tasks`, `task_runs` | V2 tasks are expanded work units inside workflow runs. |
| `task_runs` | `task_runs` | Keep concept, link to workflow and stage runs. |
| `hosts` | `hosts` | Keep, add agent identity, capabilities, and heartbeat contracts. |
| `ld_instances` | `instance_slots` in `instance_pools` | LDPlayer becomes one slot type. |
| Manual instance locks | Queue leases and optional manual holds | Leases become the automation path. |
| Host Agent single file | Host Agent V2 modules | Split into adapters, queue client, slot manager, storage, and checkpoint reporter. |

## Data Migration Approach

### Characters

Import V1 characters into V2 `characters` with stable generated IDs or preserved IDs if safe.

V1 fields:

- `name`
- `slug`
- `status`
- `age`
- `gender`
- `metadata_json`
- `notes`

V2 handling:

- Keep `name`, `slug`, `status`, `age`, `gender`, `notes`.
- Preserve metadata under `metadata_json`.
- Promote common metadata keys into group attributes only after reviewing real usage.

### Character Groups

V1 has no group table. Create V2 groups through migration rules:

- Create a default group per workspace for all imported characters.
- Create optional groups from V1 video sequences.
- Create review groups for incomplete or ambiguous imported pairs.
- Create dynamic groups later for "least edited versions" and similar selection policies.

For V1 video sequences:

- `video_sequences` becomes a `character_group` with `group_type = sequence`.
- `video_sequence_items` becomes ordered `character_group_members`.
- Clip-specific transition information can become group member attributes or workflow input.

### Group Attributes

Recommended initial definitions:

- `status`: member or character derived value, text enum.
- `age`: member or character derived value, number.
- `sequence_order`: member value, number.
- `source_role`: member value, text.
- `prompt_style`: group value, text.
- `output_aspect_ratio`: group value, text.

Avoid migrating every V1 metadata key into a definition automatically. Unknown keys can remain in metadata until they are needed for selection, rendering, or reporting.

### Assets

V1 assets are close to V2 needs.

Migrate:

- `asset_type`
- `version_group_id`
- `version_no`
- `is_best_version`
- `name`
- `file_path`
- `public_url`
- `storage_provider`
- `mime_type`
- `file_size`
- `checksum`
- `status`
- `usage_status`
- `usage_policy`
- `quality_status`
- `metadata_json`
- `character_id`

Add:

- `media_type`, inferred from asset type or MIME type.
- `group_id` and `group_member_id` where asset belongs to a migrated group context.
- Run lineage if source V1 task/script IDs exist.

Asset files should not be moved during initial migration unless V2 storage policy requires it. Preserve paths and register storage provider metadata first.

### Prompt Templates

Migrate V1 `prompt_templates` and `prompt_versions`.

V2 changes:

- Preserve V1 `content`.
- Add `negative_content` as empty unless detected elsewhere.
- Set `rendering_engine` to `handlebars-lite` or a chosen V2 engine name.
- Convert `variables_json` into `variable_schema_json` where possible.

Rendered prompts from old runs are not available unless stored in V1 task or script contexts. Do not fabricate rendered prompt history.

### Scripts and Workflows

V1 scripts can migrate in two ways:

1. As V2 workflows for production processes.
2. As low-level action libraries referenced by task templates.

Recommended MVP migration:

- Convert each active V1 script into a V2 workflow with one stage.
- Convert compiled V1 steps into a task template execution plan.
- Preserve original V1 step payload under adapter config.
- Mark migrated workflows as `draft` until validated.

Do not assume V1 flow graphs are fully safe. V1 compiler warns about unreachable nodes and loop limits, but V2 validation should re-check.

### Tasks and Runs

V1 task data can be imported for historical reference or skipped for MVP.

If imported:

- V1 `tasks` become V2 `workflow_runs` plus one `stage_run` and one or more `task_runs`.
- V1 `task_runs` become V2 `task_runs`.
- V1 `script_runs` become V2 `task_attempts`.
- V1 `script_run_steps` become V2 events and, only when useful, checkpoints.

Historical statuses should be normalized:

- V1 `success` becomes V2 `succeeded`.
- V1 `completed` becomes V2 `succeeded`.
- V1 `failed` remains `failed`.
- V1 `pending`, `running`, `cancelled` remain equivalent where applicable.

### Hosts and LD Instances

Migrate V1 hosts to V2 `hosts`.

Migrate V1 `ld_instances` into:

- An `instance_pool` per workspace or per host and capability grouping.
- An `instance_slot` per LD instance.

Suggested pool creation:

- Group by workspace, host, and V1 `type`.
- Convert V1 `type` into capability tags.
- Preserve `local_id`, `ld_name`, `adb_id`, PID fields, screenshot URL, and notes in slot metadata.

V2 should rediscover slots through Host Agent V2 after migration, because ADB ids and process ids are volatile.

## V1 Bridge Adapter

The V1 bridge adapter is a temporary compatibility layer inside V2. It may read V1-style payloads, import V1 data, or translate V1 script concepts, but it should output V2 resources.

Bridge responsibilities:

- Import characters and original assets.
- Import prompt templates and versions.
- Import scripts as draft workflows.
- Import hosts and LD instances as hosts, pools, and slots.
- Provide mapping reports and validation errors.

Bridge non-responsibilities:

- Running V1 scripts inside V2 unchanged forever.
- Exposing V1 tables as permanent APIs.
- Modifying the V1 repo or V1 database directly.

## Workflow Engine MVP From V1

The first V2 workflow should cover V1's image-edit production path:

1. Select group members with original young and old image assets.
2. Reserve input assets.
3. Render prompt from template and group/member attributes.
4. Queue image edit task runs to an LDPlayer-capable pool.
5. Host Agent V2 executes ADB steps through an LDPlayer adapter.
6. Download latest result.
7. Register output assets with lineage.
8. Mark outputs `review_pending` or `available` according to policy.
9. Release or mark input reservations.

## Risks and Decisions

### Preserve IDs Or Generate New IDs

Preserving V1 IDs helps traceability but can leak old naming conventions. Generating V2 IDs with a mapping table is cleaner. Recommended: generate V2 IDs and maintain a migration map.

### JSON Versus Typed Fields

V1 uses JSON heavily for policies and contexts. V2 should keep JSON for flexible configs but promote anything used in scheduling, filtering, prompt rendering, or recovery.

### Historical Runs

Historical V1 runs may be incomplete or inconsistent. Recommended: migrate definitions and active inventory first. Import historical run summaries only if the operator needs reporting continuity.

### File Storage

Initial migration should register existing files in place. A later storage normalization job can copy assets into V2 storage layout and verify checksums.

## Validation Checklist

Before V2 uses migrated data in production:

- Characters have unique slugs within workspace policy.
- Original young and old image assets are linked to the correct character.
- Character groups have expected member counts and ordering.
- Group attributes required by workflows are present.
- Prompt versions validate against variable schema.
- Workflows validate and compile without missing capabilities.
- Instance slots are rediscovered and healthy through Host Agent V2.
- Asset paths resolve through configured storage provider.
- Queue dry-run can match task requirements to an instance pool.
