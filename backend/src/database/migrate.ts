import { db } from "./db";

function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.length === 0) return;
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      slug TEXT,
      description TEXT,
      category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'draft',
      active_version_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      definition_json TEXT DEFAULT '{}',
      input_schema_json TEXT DEFAULT '{}',
      output_schema_json TEXT DEFAULT '{}',
      validation_json TEXT DEFAULT '{}',
      created_by TEXT,
      created_at TEXT NOT NULL,
      activated_at TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      UNIQUE(workflow_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS workflow_runs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      workflow_id TEXT NOT NULL,
      workflow_version_id TEXT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      priority INTEGER DEFAULT 50,
      input_json TEXT DEFAULT '{}',
      run_context_json TEXT DEFAULT '{}',
      target_group_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      queued_at TEXT,
      started_at TEXT,
      finished_at TEXT,
      error_code TEXT,
      error_message TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id),
      FOREIGN KEY (workflow_version_id) REFERENCES workflow_versions(id)
    );

    CREATE TABLE IF NOT EXISTS instance_pools (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      pool_type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      capability_tags_json TEXT DEFAULT '[]',
      concurrency_limit INTEGER DEFAULT 1,
      lease_timeout_seconds INTEGER DEFAULT 120,
      cooldown_seconds INTEGER DEFAULT 0,
      selection_policy_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS instance_slots (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      host_id TEXT,
      slot_type TEXT NOT NULL,
      local_ref TEXT,
      display_name TEXT NOT NULL,
      status TEXT DEFAULT 'available',
      health_status TEXT DEFAULT 'unknown',
      capability_tags_json TEXT DEFAULT '[]',
      active_lease_id TEXT,
      last_seen_at TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES instance_pools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      slug TEXT,
      status TEXT DEFAULT 'unknown',
      gender TEXT,
      birth_year INTEGER,
      age INTEGER,
      notes TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS character_groups (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      slug TEXT,
      group_type TEXT DEFAULT 'batch',
      status TEXT DEFAULT 'active',
      description TEXT,
      selection_policy_json TEXT DEFAULT '{}',
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS character_group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      role TEXT DEFAULT 'subject',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      member_context_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES character_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS group_attribute_definitions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      key TEXT NOT NULL,
      label TEXT NOT NULL,
      value_type TEXT NOT NULL,
      scope TEXT NOT NULL,
      allowed_values_json TEXT DEFAULT '[]',
      default_value_json TEXT DEFAULT 'null',
      is_required INTEGER DEFAULT 0,
      is_queryable INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_attribute_values (
      id TEXT PRIMARY KEY,
      definition_id TEXT NOT NULL,
      group_id TEXT,
      group_member_id TEXT,
      value_text TEXT,
      value_number REAL,
      value_boolean INTEGER,
      value_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (definition_id) REFERENCES group_attribute_definitions(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES character_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (group_member_id) REFERENCES character_group_members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT NOT NULL,
      scope TEXT NOT NULL,
      description TEXT,
      variable_schema_json TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      content TEXT NOT NULL,
      negative_content TEXT,
      rendering_engine TEXT DEFAULT 'template-v1',
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      activated_at TEXT,
      FOREIGN KEY (template_id) REFERENCES prompt_templates(id) ON DELETE CASCADE,
      UNIQUE(template_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS prompt_sets (
      id TEXT PRIMARY KEY,
      task_run_id TEXT,
      workflow_run_id TEXT,
      stage_run_id TEXT,
      status TEXT DEFAULT 'created',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rendered_prompts (
      id TEXT PRIMARY KEY,
      prompt_set_id TEXT NOT NULL,
      template_id TEXT,
      prompt_version_id TEXT,
      prompt_role TEXT DEFAULT 'main',
      content TEXT NOT NULL,
      negative_content TEXT,
      variables_json TEXT DEFAULT '{}',
      missing_variables_json TEXT DEFAULT '[]',
      source_context_json TEXT DEFAULT '{}',
      checksum TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (prompt_set_id) REFERENCES prompt_sets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      character_id TEXT,
      group_id TEXT,
      group_member_id TEXT,
      asset_type TEXT NOT NULL,
      media_type TEXT NOT NULL,
      version_group_id TEXT,
      version_no INTEGER DEFAULT 1,
      is_best_version INTEGER DEFAULT 0,
      name TEXT NOT NULL,
      storage_provider TEXT DEFAULT 'local',
      storage_key TEXT,
      file_path TEXT,
      public_url TEXT,
      mime_type TEXT,
      file_size INTEGER DEFAULT 0,
      checksum TEXT,
      status TEXT DEFAULT 'available',
      usage_status TEXT DEFAULT 'available',
      usage_policy TEXT DEFAULT 'reusable',
      quality_status TEXT DEFAULT 'draft',
      metadata_json TEXT DEFAULT '{}',
      created_by_workflow_run_id TEXT,
      created_by_stage_run_id TEXT,
      created_by_task_run_id TEXT,
      created_by_task_attempt_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS asset_relations (
      id TEXT PRIMARY KEY,
      source_asset_id TEXT NOT NULL,
      target_asset_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      workflow_run_id TEXT,
      stage_run_id TEXT,
      task_run_id TEXT,
      task_attempt_id TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_asset_id) REFERENCES assets(id),
      FOREIGN KEY (target_asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS asset_reservations (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      workflow_run_id TEXT,
      stage_run_id TEXT,
      task_run_id TEXT,
      reservation_role TEXT,
      status TEXT DEFAULT 'reserved',
      leased_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON workflows(workspace_id, status);
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status, priority);
    CREATE INDEX IF NOT EXISTS idx_instance_slots_pool ON instance_slots(pool_id, status, health_status);
    CREATE INDEX IF NOT EXISTS idx_character_groups_workspace ON character_groups(workspace_id, status);
    CREATE INDEX IF NOT EXISTS idx_assets_lookup ON assets(workspace_id, character_id, asset_type, quality_status);
    CREATE INDEX IF NOT EXISTS idx_prompt_templates_workspace ON prompt_templates(workspace_id, scope, status);
  `);

  addColumnIfMissing("character_groups", "description", "TEXT");
  addColumnIfMissing("character_groups", "status", "TEXT DEFAULT 'active'");
  addColumnIfMissing("character_groups", "updated_at", "TEXT");
  addColumnIfMissing("character_group_members", "role", "TEXT DEFAULT 'subject'");
  addColumnIfMissing("character_group_members", "sort_order", "INTEGER DEFAULT 0");

  db.exec(`
    CREATE TABLE IF NOT EXISTS group_attributes (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      value_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS character_group_attribute_values (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      attribute_id TEXT NOT NULL,
      value_id TEXT,
      custom_value TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES character_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (attribute_id) REFERENCES group_attributes(id) ON DELETE CASCADE,
      FOREIGN KEY (value_id) REFERENCES group_attribute_values(id) ON DELETE SET NULL
    );
  `);

  addColumnIfMissing("group_attribute_values", "attribute_id", "TEXT");
  addColumnIfMissing("group_attribute_values", "value", "TEXT");
  addColumnIfMissing("group_attribute_values", "label", "TEXT");

  addColumnIfMissing("prompt_templates", "category", "TEXT DEFAULT 'general'");
  addColumnIfMissing("prompt_templates", "status", "TEXT DEFAULT 'active'");
  addColumnIfMissing("workflow_runs", "output_json", "TEXT DEFAULT '{}'");
  addColumnIfMissing("workflow_runs", "current_stage_no", "INTEGER DEFAULT 0");
  addColumnIfMissing("workflow_runs", "updated_at", "TEXT");
  addColumnIfMissing("orchestrator_jobs", "output_json", "TEXT DEFAULT '{}'");
  addColumnIfMissing("instance_pool_members", "metadata_json", "TEXT DEFAULT '{}'");
  addColumnIfMissing("instance_pool_members", "role", "TEXT");
  addColumnIfMissing("instance_pool_members", "notes", "TEXT");
  addColumnIfMissing("instance_allocations", "host_id", "TEXT");
  addColumnIfMissing("instance_allocations", "local_id", "TEXT");
  addColumnIfMissing("instance_allocations", "adb_id", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_template_versions (
      id TEXT PRIMARY KEY,
      prompt_template_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      template_text TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (prompt_template_id) REFERENCES prompt_templates(id) ON DELETE CASCADE,
      UNIQUE(prompt_template_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS instance_pool_members (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      priority INTEGER DEFAULT 100,
      status TEXT DEFAULT 'active',
      role TEXT,
      notes TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES instance_pools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      local_id TEXT NOT NULL,
      name TEXT,
      adb_id TEXT,
      status TEXT DEFAULT 'UNKNOWN',
      runtime_status TEXT DEFAULT 'IDLE',
      metadata_json TEXT DEFAULT '{}',
      last_seen_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(host_id, local_id)
    );

    CREATE TABLE IF NOT EXISTS workflow_stages (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      stage_no INTEGER NOT NULL,
      stage_type TEXT NOT NULL,
      name TEXT NOT NULL,
      script_id TEXT,
      pool_type TEXT,
      prompt_template_id TEXT,
      config_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workflow_stage_runs (
      id TEXT PRIMARY KEY,
      workflow_run_id TEXT NOT NULL,
      workflow_stage_id TEXT NOT NULL,
      stage_no INTEGER NOT NULL,
      stage_type TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      input_json TEXT DEFAULT '{}',
      output_json TEXT DEFAULT '{}',
      error_message TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workflow_run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (workflow_stage_id) REFERENCES workflow_stages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS production_batches (
      id TEXT PRIMARY KEY,
      batch_type TEXT NOT NULL,
      source_group_id TEXT,
      workflow_id TEXT,
      workflow_run_id TEXT,
      status TEXT DEFAULT 'NEW',
      usage_status TEXT DEFAULT 'AVAILABLE',
      attributes_json TEXT DEFAULT '{}',
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS production_batch_items (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      role TEXT,
      sort_order INTEGER DEFAULT 0,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES production_batches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS production_batch_usage (
      id TEXT PRIMARY KEY,
      source_batch_id TEXT NOT NULL,
      target_batch_id TEXT NOT NULL,
      usage_type TEXT NOT NULL,
      workflow_run_id TEXT,
      stage_run_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_batch_id) REFERENCES production_batches(id),
      FOREIGN KEY (target_batch_id) REFERENCES production_batches(id)
    );

    CREATE TABLE IF NOT EXISTS orchestrator_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_batch_type TEXT NOT NULL,
      trigger_status TEXT NOT NULL,
      target_stage_type TEXT NOT NULL,
      priority INTEGER DEFAULT 100,
      is_active INTEGER DEFAULT 1,
      config_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orchestrator_jobs (
      id TEXT PRIMARY KEY,
      rule_id TEXT,
      source_batch_id TEXT NOT NULL,
      target_stage_type TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      payload_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (rule_id) REFERENCES orchestrator_rules(id),
      FOREIGN KEY (source_batch_id) REFERENCES production_batches(id)
    );

    CREATE TABLE IF NOT EXISTS instance_allocations (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      host_id TEXT,
      local_id TEXT,
      adb_id TEXT,
      orchestrator_job_id TEXT,
      workflow_run_id TEXT,
      workflow_stage_run_id TEXT,
      allocated_at TEXT NOT NULL,
      released_at TEXT,
      status TEXT DEFAULT 'ALLOCATED',
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (pool_id) REFERENCES instance_pools(id),
      FOREIGN KEY (orchestrator_job_id) REFERENCES orchestrator_jobs(id)
    );

    CREATE INDEX IF NOT EXISTS idx_group_attribute_values_attribute ON group_attribute_values(attribute_id);
    CREATE INDEX IF NOT EXISTS idx_character_group_attribute_values_group ON character_group_attribute_values(group_id, attribute_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_template_versions_template ON prompt_template_versions(prompt_template_id, version_no);
    CREATE INDEX IF NOT EXISTS idx_instance_pool_members_pool ON instance_pool_members(pool_id, priority);
    CREATE INDEX IF NOT EXISTS idx_workflow_stages_workflow ON workflow_stages(workflow_id, stage_no);
    CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id, status);
    CREATE INDEX IF NOT EXISTS idx_workflow_stage_runs_run ON workflow_stage_runs(workflow_run_id, stage_no);
    CREATE INDEX IF NOT EXISTS idx_production_batches_ready ON production_batches(batch_type, status, usage_status);
    CREATE INDEX IF NOT EXISTS idx_production_batch_items_batch ON production_batch_items(batch_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_production_batch_usage_source ON production_batch_usage(source_batch_id);
    CREATE INDEX IF NOT EXISTS idx_production_batch_usage_target ON production_batch_usage(target_batch_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orchestrator_jobs_unique_source_stage ON orchestrator_jobs(source_batch_id, target_stage_type);
    CREATE INDEX IF NOT EXISTS idx_orchestrator_jobs_status ON orchestrator_jobs(status, target_stage_type);
    CREATE INDEX IF NOT EXISTS idx_instance_allocations_active ON instance_allocations(instance_id, status);
    CREATE INDEX IF NOT EXISTS idx_instance_allocations_job ON instance_allocations(orchestrator_job_id, status);

    CREATE TABLE IF NOT EXISTS runtime_sessions (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      instance_id TEXT,
      host_id TEXT,
      script_id TEXT,
      status TEXT DEFAULT 'PENDING',
      current_step_no INTEGER DEFAULT 0,
      context_json TEXT DEFAULT '{}',
      checkpoint_json TEXT DEFAULT '{}',
      started_at TEXT,
      updated_at TEXT NOT NULL,
      finished_at TEXT,
      FOREIGN KEY (job_id) REFERENCES orchestrator_jobs(id)
    );

    CREATE TABLE IF NOT EXISTS runtime_session_steps (
      id TEXT PRIMARY KEY,
      runtime_session_id TEXT NOT NULL,
      step_no INTEGER NOT NULL,
      step_type TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      input_json TEXT DEFAULT '{}',
      output_json TEXT DEFAULT '{}',
      error_message TEXT,
      started_at TEXT,
      finished_at TEXT,
      FOREIGN KEY (runtime_session_id) REFERENCES runtime_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_runtime_sessions_job ON runtime_sessions(job_id, status);
    CREATE INDEX IF NOT EXISTS idx_runtime_session_steps_session ON runtime_session_steps(runtime_session_id, step_no);

    CREATE TABLE IF NOT EXISTS hosts (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_hosts_host_id ON hosts(host_id);
    CREATE INDEX IF NOT EXISTS idx_hosts_status ON hosts(status);

    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS script_versions (
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      definition_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
      UNIQUE(script_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS script_runs (
      id TEXT PRIMARY KEY,
      runtime_session_id TEXT NOT NULL,
      script_id TEXT NOT NULL,
      script_version_id TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      current_step_no INTEGER DEFAULT 0,
      context_json TEXT DEFAULT '{}',
      started_at TEXT,
      finished_at TEXT,
      FOREIGN KEY (runtime_session_id) REFERENCES runtime_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (script_id) REFERENCES scripts(id),
      FOREIGN KEY (script_version_id) REFERENCES script_versions(id)
    );

    CREATE TABLE IF NOT EXISTS script_run_steps (
      id TEXT PRIMARY KEY,
      script_run_id TEXT NOT NULL,
      step_no INTEGER NOT NULL,
      step_type TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      input_json TEXT DEFAULT '{}',
      output_json TEXT DEFAULT '{}',
      error_message TEXT,
      started_at TEXT,
      finished_at TEXT,
      FOREIGN KEY (script_run_id) REFERENCES script_runs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_script_versions_script ON script_versions(script_id, version_no);
    CREATE INDEX IF NOT EXISTS idx_script_runs_session ON script_runs(runtime_session_id, status);
    CREATE INDEX IF NOT EXISTS idx_script_run_steps_run ON script_run_steps(script_run_id, step_no);
  `);

  addColumnIfMissing("instance_allocations", "created_at", "TEXT");
  addColumnIfMissing("instance_allocations", "updated_at", "TEXT");
  addColumnIfMissing("instances", "capabilities_json", "TEXT DEFAULT '{}'");
  addColumnIfMissing("instances", "current_pool_type", "TEXT DEFAULT 'AVAILABLE'");
  addColumnIfMissing("instances", "current_workflow_run_id", "TEXT");
  addColumnIfMissing("instances", "maintenance_reason", "TEXT");
  addColumnIfMissing("instances", "last_error_at", "TEXT");
  addColumnIfMissing("workflows", "capacity_config_json", "TEXT DEFAULT '{}'");
  addColumnIfMissing("workflows", "music_policy_json", "TEXT DEFAULT '{}'");
  addColumnIfMissing("workflow_runs", "capacity_config_json", "TEXT DEFAULT '{}'");

  db.prepare(`
    UPDATE instances
    SET current_pool_type = 'AVAILABLE'
    WHERE current_pool_type IS NULL OR current_pool_type = ''
  `).run();
}

if (require.main === module) {
  migrate();
  console.log(`V2 database migrated at ${db.name}`);
}
