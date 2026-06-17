import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type { AllocationStatus } from "./instance-scheduler.schemas";

function mapAllocation(row: Record<string, unknown>) {
  return {
    id: row.id,
    poolId: row.pool_id,
    instanceId: row.instance_id,
    orchestratorJobId: row.orchestrator_job_id ?? null,
    workflowRunId: row.workflow_run_id ?? null,
    workflowStageRunId: row.workflow_stage_run_id ?? null,
    allocatedAt: row.allocated_at,
    releasedAt: row.released_at ?? null,
    status: row.status,
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: row.created_at ?? row.allocated_at,
    updatedAt: row.updated_at ?? row.allocated_at
  };
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

  findCandidate(poolType: string, excludeInstanceId?: string) {
    const row = db.prepare(`
      SELECT
        ip.id AS pool_id,
        ipm.instance_id AS instance_id,
        COUNT(ia.id) AS active_allocation_count
      FROM instance_pools ip
      JOIN instance_pool_members ipm ON ipm.pool_id = ip.id
      LEFT JOIN instance_allocations ia
        ON ia.instance_id = ipm.instance_id
       AND ia.status = 'ALLOCATED'
      WHERE ip.pool_type = ?
        AND UPPER(ip.status) = 'ACTIVE'
        AND UPPER(ipm.status) = 'ACTIVE'
        AND UPPER(ipm.status) NOT IN ('ERROR', 'CAPTCHA', 'OFFLINE')
        AND (? IS NULL OR ipm.instance_id <> ?)
      GROUP BY ip.id, ipm.instance_id, ipm.priority
      ORDER BY active_allocation_count ASC, ipm.priority ASC, ipm.created_at ASC
      LIMIT 1
    `).get(poolType, excludeInstanceId ?? null, excludeInstanceId ?? null);

    return row as { pool_id: string; instance_id: string; active_allocation_count: number } | undefined;
  },

  createAllocation(input: {
    poolId: string;
    instanceId: string;
    orchestratorJobId?: string | null;
    workflowRunId?: string | null;
    workflowStageRunId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const id = createId("alloc");
    const timestamp = now();

    db.prepare(`
      INSERT INTO instance_allocations (
        id, pool_id, instance_id, orchestrator_job_id, workflow_run_id,
        workflow_stage_run_id, allocated_at, released_at, status,
        metadata_json, created_at, updated_at
      ) VALUES (
        @id, @poolId, @instanceId, @orchestratorJobId, @workflowRunId,
        @workflowStageRunId, @allocatedAt, NULL, 'ALLOCATED',
        @metadataJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      poolId: input.poolId,
      instanceId: input.instanceId,
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
  }
};
