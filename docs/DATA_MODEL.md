# FB-CM Factory V2 Data Model

## Model Principles

- Store durable orchestration state in backend tables, not in host-agent memory.
- Prefer typed columns for fields used in filtering, scheduling, recovery, and reporting.
- Use JSON only for flexible tool configs, adapter payloads, metadata, and external provider details.
- Version user-authored definitions before they can be run.
- Record lineage for every generated asset and rendered prompt.
- Treat queue leases and checkpoints as first-class records.

## Entity Groups

### Tenancy and Users

#### workspaces

Represents a production workspace.

Key fields:

- `id`
- `name`
- `code`
- `status`
- `settings_json`
- `created_at`
- `updated_at`

#### users

Represents backend users.

Key fields:

- `id`
- `workspace_id`
- `name`
- `email`
- `password_hash`
- `role`
- `status`
- `created_at`
- `updated_at`

## Workflow Engine

Current implementation note: workflow templates are resource-driven. Prefer `workflows.resource_rules_json`, `script_mapping_json`, `prompt_mapping_json`, capacity config, music policy, and post content policy for new production templates. `workflow_stages` is legacy compatibility for older sequential workflow APIs and must remain available, but it is not the preferred model for new work.

### workflows

User-facing workflow container.

Key fields:

- `id`
- `workspace_id`
- `name`
- `slug`
- `description`
- `category`
- `status`
- `active_version_id`
- `created_by`
- `created_at`
- `updated_at`

### workflow_versions

Immutable runnable workflow definition.

Key fields:

- `id`
- `workflow_id`
- `version_no`
- `status`
- `definition_json`
- `input_schema_json`
- `output_schema_json`
- `validation_json`
- `created_by`
- `created_at`
- `activated_at`

`definition_json` contains the graph or ordered structure of stages, dependency rules, default policies, variable declarations, and output mappings.

### stages

Reusable stage definitions inside a workflow version.

Key fields:

- `id`
- `workflow_version_id`
- `key`
- `name`
- `stage_type`
- `sort_order`
- `depends_on_json`
- `condition_json`
- `task_template_json`
- `retry_policy_json`
- `checkpoint_policy_json`
- `output_mapping_json`

Stages can be materialized from `definition_json` for easier querying and validation.

### workflow_runs

Runtime instance of a workflow version.

Key fields:

- `id`
- `workspace_id`
- `workflow_id`
- `workflow_version_id`
- `name`
- `status`
- `priority`
- `input_json`
- `run_context_json`
- `target_group_id`
- `created_by`
- `created_at`
- `queued_at`
- `started_at`
- `finished_at`
- `error_code`
- `error_message`

### stage_runs

Runtime instance of a stage for a workflow run.

Key fields:

- `id`
- `workflow_run_id`
- `stage_id`
- `stage_key`
- `status`
- `sort_order`
- `input_json`
- `context_json`
- `output_json`
- `total_task_runs`
- `succeeded_task_runs`
- `failed_task_runs`
- `started_at`
- `finished_at`
- `error_code`
- `error_message`

### tasks

Task definition expanded from a stage. This is the planned unit of work before attempts.

Key fields:

- `id`
- `workspace_id`
- `workflow_run_id`
- `stage_run_id`
- `task_key`
- `task_type`
- `status`
- `capability_requirements_json`
- `pool_selector_json`
- `input_json`
- `prompt_plan_json`
- `asset_plan_json`
- `output_plan_json`
- `retry_policy_json`
- `created_at`
- `updated_at`

### task_runs

Executable run of a task. Most workflows use one task run per task, but repeat and matrix stages can create many.

Key fields:

- `id`
- `task_id`
- `workflow_run_id`
- `stage_run_id`
- `run_no`
- `status`
- `selected_character_id`
- `selected_group_member_id`
- `selected_pool_id`
- `selected_slot_id`
- `rendered_prompt_set_id`
- `input_assets_json`
- `output_assets_json`
- `context_json`
- `created_at`
- `queued_at`
- `started_at`
- `finished_at`
- `error_code`
- `error_message`

### task_attempts

Single execution attempt for a task run. Retries, failover, and lease expiry create new attempts.

Key fields:

- `id`
- `task_run_id`
- `attempt_no`
- `status`
- `queue_item_id`
- `lease_id`
- `host_id`
- `pool_id`
- `slot_id`
- `agent_id`
- `started_at`
- `last_heartbeat_at`
- `finished_at`
- `exit_code`
- `error_code`
- `error_message`

### checkpoints

Durable recovery markers for attempts.

Key fields:

- `id`
- `task_attempt_id`
- `task_run_id`
- `checkpoint_key`
- `checkpoint_type`
- `sequence_no`
- `status`
- `payload_json`
- `asset_ids_json`
- `created_at`

Checkpoint payload should contain only recovery-relevant facts, not full logs.

## Character Groups

### characters

V2 keeps the V1 character concept but allows richer attributes through related tables.

Key fields:

- `id`
- `workspace_id`
- `name`
- `slug`
- `status`
- `gender`
- `birth_year`
- `age`
- `notes`
- `metadata_json`
- `created_at`
- `updated_at`

### character_groups

Production group or batch.

Key fields:

- `id`
- `workspace_id`
- `name`
- `slug`
- `group_type`
- `status`
- `description`
- `selection_policy_json`
- `created_by`
- `created_at`
- `updated_at`

Suggested `group_type` values:

- `batch`
- `sequence`
- `campaign`
- `pairing`
- `review`
- `dynamic_filter`

### character_group_members

Membership and role of a character in a group.

Key fields:

- `id`
- `group_id`
- `character_id`
- `role`
- `sort_order`
- `status`
- `member_context_json`
- `created_at`
- `updated_at`

Examples of `role`: `subject`, `source`, `target`, `narrator`, `reference`, `sequence_item`.

### group_attribute_definitions

Typed attribute definitions available to groups.

Key fields:

- `id`
- `workspace_id`
- `key`
- `label`
- `value_type`
- `scope`
- `allowed_values_json`
- `default_value_json`
- `is_required`
- `is_queryable`
- `created_at`
- `updated_at`

Suggested `scope` values:

- `group`
- `member`
- `role`
- `workflow_input`

### group_attribute_values

Actual group or member attribute values.

Key fields:

- `id`
- `definition_id`
- `group_id`
- `group_member_id`
- `value_text`
- `value_number`
- `value_boolean`
- `value_json`
- `created_at`
- `updated_at`

Use the typed value column matching `value_type`. Use `value_json` for arrays and objects.

## Prompt Builder

### prompt_templates

Versioned prompt template container.

Key fields:

- `id`
- `workspace_id`
- `name`
- `scope`
- `description`
- `variable_schema_json`
- `status`
- `created_at`
- `updated_at`

### prompt_versions

Immutable prompt content version.

Key fields:

- `id`
- `template_id`
- `version_no`
- `status`
- `content`
- `negative_content`
- `rendering_engine`
- `metadata_json`
- `created_at`
- `activated_at`

### prompt_sets

Logical grouping of rendered prompts for a task run.

Key fields:

- `id`
- `task_run_id`
- `workflow_run_id`
- `stage_run_id`
- `status`
- `created_at`

### rendered_prompts

Rendered prompt artifact with traceability.

Key fields:

- `id`
- `prompt_set_id`
- `template_id`
- `prompt_version_id`
- `prompt_role`
- `content`
- `negative_content`
- `variables_json`
- `missing_variables_json`
- `source_context_json`
- `checksum`
- `created_at`

## Assets

### assets

Durable file or generated artifact.

Key fields:

- `id`
- `workspace_id`
- `character_id`
- `group_id`
- `group_member_id`
- `asset_type`
- `media_type`
- `version_group_id`
- `version_no`
- `is_best_version`
- `name`
- `storage_provider`
- `storage_key`
- `file_path`
- `public_url`
- `mime_type`
- `file_size`
- `checksum`
- `status`
- `usage_status`
- `usage_policy`
- `quality_status`
- `metadata_json`
- `created_by_workflow_run_id`
- `created_by_stage_run_id`
- `created_by_task_run_id`
- `created_by_task_attempt_id`
- `created_at`
- `updated_at`

### asset_relations

Lineage edges between assets.

Key fields:

- `id`
- `source_asset_id`
- `target_asset_id`
- `relation_type`
- `workflow_run_id`
- `stage_run_id`
- `task_run_id`
- `task_attempt_id`
- `metadata_json`
- `created_at`

Suggested `relation_type` values:

- `generated_from`
- `edited_from`
- `merged_from`
- `extracted_from`
- `thumbnail_of`
- `prompt_artifact_for`
- `review_export_of`

### asset_reservations

Reservation lifecycle for input and output planning.

Key fields:

- `id`
- `asset_id`
- `workflow_run_id`
- `stage_run_id`
- `task_run_id`
- `reservation_role`
- `status`
- `leased_until`
- `created_at`
- `updated_at`

## Instance Pools and Hosts

### hosts

Machine-level worker host.

Key fields:

- `id`
- `workspace_id`
- `name`
- `agent_url`
- `agent_id`
- `status`
- `agent_version`
- `capabilities_json`
- `metrics_json`
- `last_heartbeat_at`
- `last_error`
- `created_at`
- `updated_at`

### instance_pools

Schedulable pool.

Key fields:

- `id`
- `workspace_id`
- `name`
- `pool_type`
- `status`
- `capability_tags_json`
- `concurrency_limit`
- `lease_timeout_seconds`
- `cooldown_seconds`
- `selection_policy_json`
- `created_at`
- `updated_at`

### instance_slots

Concrete execution slot within a pool.

Key fields:

- `id`
- `pool_id`
- `host_id`
- `slot_type`
- `local_ref`
- `display_name`
- `status`
- `health_status`
- `capability_tags_json`
- `active_lease_id`
- `last_seen_at`
- `metadata_json`
- `created_at`
- `updated_at`

For LDPlayer, `local_ref` is the local LD index or stable local id. ADB id is metadata because it may change.

## Queue Orchestrator

### queue_items

Schedulable unit tied to a task run and attempt.

Key fields:

- `id`
- `workspace_id`
- `workflow_run_id`
- `stage_run_id`
- `task_run_id`
- `task_attempt_id`
- `status`
- `priority`
- `run_after`
- `capability_requirements_json`
- `pool_selector_json`
- `dependency_fingerprint`
- `created_at`
- `updated_at`

### queue_leases

Lease granted to a host agent.

Key fields:

- `id`
- `queue_item_id`
- `task_attempt_id`
- `host_id`
- `agent_id`
- `pool_id`
- `slot_id`
- `status`
- `lease_token_hash`
- `leased_at`
- `expires_at`
- `renewed_at`
- `released_at`
- `release_reason`

Agents use lease tokens to submit events. The backend stores only a hash.

## Events and Logs

### run_events

Append-only event stream for workflow, stage, task, attempt, queue, host, and asset events.

Key fields:

- `id`
- `workspace_id`
- `entity_type`
- `entity_id`
- `event_type`
- `level`
- `message`
- `payload_json`
- `created_at`

### agent_events

Raw or normalized host-agent events.

Key fields:

- `id`
- `host_id`
- `agent_id`
- `lease_id`
- `event_type`
- `payload_json`
- `received_at`

## Mapping From V1

- V1 `scripts` and `script_versions` map to V2 `workflows`, `workflow_versions`, `stages`, and task templates.
- V1 `tasks` map to V2 `tasks` plus `task_runs`.
- V1 `script_runs` map to V2 `task_attempts`, `checkpoints`, and `run_events`.
- V1 `characters` remain `characters`.
- V1 has no first-class group model. V2 adds `character_groups`, `character_group_members`, and group attributes.
- V1 `assets`, `asset_relations`, and `asset_usage` map to V2 `assets`, `asset_relations`, and `asset_reservations`.
- V1 `hosts` and `ld_instances` map to V2 `hosts`, `instance_pools`, and `instance_slots`.
- V1 `prompt_templates` and `prompt_versions` remain but V2 adds `prompt_sets` and `rendered_prompts`.
