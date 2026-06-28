import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type { AllocationStatus } from "./instance-scheduler.schemas";

type DynamicCandidate = {
  pool_id: string;
  instance_id: string;
  host_id: string;
  local_id: string;
  adb_id: string | null;
  capabilities: Record<string, unknown>;
};

function mapAllocation(row: Record<string, unknown>) {
  const metadata = jsonParse<Record<string, unknown>>(row.metadata_json, {});
  return {
    id: row.id,
    poolId: row.pool_id,
    instanceId: row.instance_id,
    hostId: row.host_id ?? null,
    localId: row.local_id ?? null,
    adbId: row.adb_id ?? null,
    orchestratorJobId: row.orchestrator_job_id ?? null,
    workflowRunId: row.workflow_run_id ?? null,
    workflowStageRunId: row.workflow_stage_run_id ?? null,
    allocatedAt: row.allocated_at,
    releasedAt: row.released_at ?? null,
    status: row.status,
    allocationMode: metadata.allocationMode ?? null,
    metadata,
    createdAt: row.created_at ?? row.allocated_at,
    updatedAt: row.updated_at ?? row.allocated_at
  };
}

function normalizedLocalId(value: unknown) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && String(numeric) === String(value) ? numeric : value;
}

function capabilitiesCanRun(capabilities: Record<string, unknown>, targetStageType: string) {
  const canRun = Array.isArray(capabilities.canRun) ? capabilities.canRun : [];
  return canRun.some((item) => item === targetStageType);
}

export const instanceSchedulerRepository = {
  listAllocations() {
    return db.prepare("SELECT * FROM instance_allocations ORDER BY allocated_at DESC")
      .all()
      .map((row) => mapAllocation(row as Record<string, unknown>));
  },

  getActiveAllocations() {
    return db.prepare(`
      SELECT * FROM instance_allocations
      WHERE status = 'ALLOCATED'
      ORDER BY allocated_at DESC
    `).all().map((row) => mapAllocation(row as Record<string, unknown>));
  },

  getAllocation(id: string) {
    const row = db.prepare("SELECT * FROM instance_allocations WHERE id = ?").get(id);
    return row ? mapAllocation(row as Record<string, unknown>) : null;
  },

  getActiveAllocationByJob(orchestratorJobId: string) {
    const row = db.prepare(`
      SELECT * FROM instance_allocations
      WHERE orchestrator_job_id = ? AND status = 'ALLOCATED'
      ORDER BY allocated_at DESC
      LIMIT 1
    `).get(orchestratorJobId);

    return row ? mapAllocation(row as Record<string, unknown>) : null;
  },

  ensureDynamicPool(poolType: string) {
    const id = `dynamic_pool_${poolType}`;
    const existing = db.prepare("SELECT id FROM instance_pools WHERE id = ?").get(id);
    if (existing) return id;

    const timestamp = now();
    db.prepare(`
      INSERT INTO instance_pools (
        id, workspace_id, name, pool_type, status, capability_tags_json,
        concurrency_limit, lease_timeout_seconds, cooldown_seconds, selection_policy_json,
        created_at, updated_at
      ) VALUES (
        @id, NULL, @name, @poolType, 'active', '[]',
        1, 120, 0, '{}',
        @createdAt, @updatedAt
      )
    `).run({
      id,
      name: `Dynamic ${poolType}`,
      poolType,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return id;
  },

  findDynamicCandidate(targetStageType: string, excludeInstanceId?: string): DynamicCandidate | undefined {
    const rows = db.prepare(`
      SELECT i.*
      FROM instances i
      LEFT JOIN instance_allocations ia
        ON ia.instance_id = i.id
       AND ia.status = 'ALLOCATED'
      WHERE UPPER(COALESCE(i.current_pool_type, 'AVAILABLE')) = 'STANDBY'
        AND UPPER(COALESCE(i.status, '')) IN ('ACTIVE', 'ONLINE')
        AND (
          i.runtime_status IS NULL
          OR TRIM(i.runtime_status) = ''
          OR UPPER(i.runtime_status) = 'IDLE'
        )
        AND ia.id IS NULL
        AND (? IS NULL OR i.id <> ?)
      ORDER BY i.updated_at ASC, i.created_at ASC
    `).all(excludeInstanceId ?? null, excludeInstanceId ?? null) as Array<Record<string, unknown>>;

    const row = rows.find((item) =>
      capabilitiesCanRun(jsonParse<Record<string, unknown>>(item.capabilities_json, {}), targetStageType)
    );
    if (!row) return undefined;

    return {
      pool_id: this.ensureDynamicPool(targetStageType),
      instance_id: String(row.id),
      host_id: String(row.host_id),
      local_id: String(row.local_id),
      adb_id: typeof row.adb_id === "string" ? row.adb_id : null,
      capabilities: jsonParse<Record<string, unknown>>(row.capabilities_json, {})
    };
  },

  findDynamicCapacityCandidates(targetStageType: string, limit: number, excludeInstanceIds: string[] = []): DynamicCandidate[] {
    if (limit <= 0) return [];

    const rows = db.prepare(`
      SELECT i.*
      FROM instances i
      LEFT JOIN instance_allocations ia
        ON ia.instance_id = i.id
       AND ia.status = 'ALLOCATED'
      WHERE UPPER(COALESCE(i.current_pool_type, 'AVAILABLE')) = 'STANDBY'
        AND UPPER(COALESCE(i.status, '')) IN ('ACTIVE', 'ONLINE')
        AND (
          i.runtime_status IS NULL
          OR TRIM(i.runtime_status) = ''
          OR UPPER(i.runtime_status) = 'IDLE'
        )
        AND ia.id IS NULL
      ORDER BY i.updated_at ASC, i.created_at ASC
    `).all() as Array<Record<string, unknown>>;

    const excluded = new Set(excludeInstanceIds);
    return rows
      .filter((item) => !excluded.has(String(item.id)))
      .filter((item) => capabilitiesCanRun(jsonParse<Record<string, unknown>>(item.capabilities_json, {}), targetStageType))
      .slice(0, limit)
      .map((row) => ({
        pool_id: this.ensureDynamicPool(targetStageType),
        instance_id: String(row.id),
        host_id: String(row.host_id),
        local_id: String(row.local_id),
        adb_id: typeof row.adb_id === "string" ? row.adb_id : null,
        capabilities: jsonParse<Record<string, unknown>>(row.capabilities_json, {})
      }));
  },

  findCandidate(poolType: string, excludeInstanceId?: string) {
    const row = db.prepare(`
      SELECT
        ip.id AS pool_id,
        ipm.instance_id AS instance_id,
        i.host_id AS host_id,
        i.local_id AS local_id,
        i.adb_id AS adb_id,
        COUNT(ia.id) AS active_allocation_count
      FROM instance_pools ip
      JOIN instance_pool_members ipm ON ipm.pool_id = ip.id
      JOIN instances i ON i.id = ipm.instance_id
      LEFT JOIN instance_allocations ia
        ON ia.instance_id = ipm.instance_id
       AND ia.status = 'ALLOCATED'
      WHERE ip.pool_type = ?
        AND UPPER(ip.status) = 'ACTIVE'
        AND UPPER(ipm.status) = 'ACTIVE'
        AND UPPER(ipm.status) NOT IN ('ERROR', 'CAPTCHA', 'OFFLINE')
        AND UPPER(COALESCE(i.status, '')) NOT IN ('OFFLINE', 'INACTIVE', 'ERROR')
        AND (? IS NULL OR ipm.instance_id <> ?)
      GROUP BY ip.id, ipm.instance_id, i.host_id, i.local_id, i.adb_id, ipm.priority
      ORDER BY active_allocation_count ASC, ipm.priority ASC, ipm.created_at ASC
      LIMIT 1
    `).get(poolType, excludeInstanceId ?? null, excludeInstanceId ?? null);

    return row as { pool_id: string; instance_id: string; host_id: string; local_id: string; adb_id: string | null; active_allocation_count: number } | undefined;
  },

  createAllocation(input: {
    poolId: string;
    instanceId: string;
    hostId?: string | null;
    localId?: string | null;
    adbId?: string | null;
    orchestratorJobId?: string | null;
    workflowRunId?: string | null;
    workflowStageRunId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const id = createId("alloc");
    const timestamp = now();

    db.prepare(`
      INSERT INTO instance_allocations (
        id, pool_id, instance_id, host_id, local_id, adb_id, orchestrator_job_id, workflow_run_id,
        workflow_stage_run_id, allocated_at, released_at, status,
        metadata_json, created_at, updated_at
      ) VALUES (
        @id, @poolId, @instanceId, @hostId, @localId, @adbId, @orchestratorJobId, @workflowRunId,
        @workflowStageRunId, @allocatedAt, NULL, 'ALLOCATED',
        @metadataJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      poolId: input.poolId,
      instanceId: input.instanceId,
      hostId: input.hostId ?? null,
      localId: input.localId ?? null,
      adbId: input.adbId ?? null,
      orchestratorJobId: input.orchestratorJobId ?? null,
      workflowRunId: input.workflowRunId ?? null,
      workflowStageRunId: input.workflowStageRunId ?? null,
      allocatedAt: timestamp,
      metadataJson: jsonString(input.metadata ?? {}, {}),
      createdAt: timestamp,
      updatedAt: timestamp
    });

    return this.getAllocation(id);
  },

  moveInstanceToWorkflow(instanceId: string, workflowRunId?: string | null) {
    db.prepare(`
      UPDATE instances
      SET current_pool_type = 'WORKFLOW',
          current_workflow_run_id = @workflowRunId,
          maintenance_reason = NULL,
          updated_at = @updatedAt
      WHERE id = @instanceId
    `).run({
      instanceId,
      workflowRunId: workflowRunId ?? null,
      updatedAt: now()
    });
  },

  moveInstanceToStandby(instanceId: string) {
    db.prepare(`
      UPDATE instances
      SET current_pool_type = 'STANDBY',
          current_workflow_run_id = NULL,
          updated_at = @updatedAt
      WHERE id = @instanceId
    `).run({
      instanceId,
      updatedAt: now()
    });
  },

  moveInstanceToMaintenance(instanceId: string, reason: string) {
    const timestamp = now();
    db.prepare(`
      UPDATE instances
      SET current_pool_type = 'MAINTENANCE',
          current_workflow_run_id = NULL,
          maintenance_reason = @reason,
          last_error_at = @lastErrorAt,
          updated_at = @updatedAt
      WHERE id = @instanceId
    `).run({
      instanceId,
      reason,
      lastErrorAt: timestamp,
      updatedAt: timestamp
    });
  },

  closeAllocation(id: string, status: AllocationStatus) {
    const timestamp = now();

    db.prepare(`
      UPDATE instance_allocations
      SET status = @status,
          released_at = @releasedAt,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      status,
      releasedAt: timestamp,
      updatedAt: timestamp
    });

    return this.getAllocation(id);
  },

  dynamicAllocationMetadata(input: DynamicCandidate & {
    allocationMode: "DYNAMIC_CAPABILITY";
  }) {
    return {
      allocationMode: input.allocationMode,
      instanceId: input.instance_id,
      hostId: input.host_id,
      localId: normalizedLocalId(input.local_id),
      adbId: input.adb_id,
      capabilities: input.capabilities
    };
  }
};
