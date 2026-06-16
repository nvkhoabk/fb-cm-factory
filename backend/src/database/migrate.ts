import { db } from "./db";

function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (pool_id) REFERENCES instance_pools(id) ON DELETE CASCADE
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

    CREATE INDEX IF NOT EXISTS idx_group_attribute_values_attribute ON group_attribute_values(attribute_id);
    CREATE INDEX IF NOT EXISTS idx_character_group_attribute_values_group ON character_group_attribute_values(group_id, attribute_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_template_versions_template ON prompt_template_versions(prompt_template_id, version_no);
    CREATE INDEX IF NOT EXISTS idx_instance_pool_members_pool ON instance_pool_members(pool_id, priority);
    CREATE INDEX IF NOT EXISTS idx_workflow_stages_workflow ON workflow_stages(workflow_id, stage_no);
  `);
}

if (require.main === module) {
  migrate();
  console.log(`V2 database migrated at ${db.name}`);
}
