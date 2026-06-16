import { db } from "../../database/db";
import { createId, now } from "../shared/resource";
import type {
  CreateInstancePoolInput,
  CreateInstancePoolMemberInput
} from "./instance-pools.schemas";

function mapPool(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    poolType: row.pool_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMember(row: Record<string, unknown>) {
  return {
    id: row.id,
    poolId: row.pool_id,
    instanceId: row.instance_id,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const instancePoolsRepository = {
  list() {
    return db.prepare("SELECT * FROM instance_pools ORDER BY created_at DESC")
      .all()
      .map((row) => mapPool(row as Record<string, unknown>));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM instance_pools WHERE id = ?").get(id);
    return row ? mapPool(row as Record<string, unknown>) : null;
  },

  create(input: CreateInstancePoolInput) {
    const createdAt = now();
    const id = createId("pool");

    db.prepare(`
      INSERT INTO instance_pools (
        id, name, pool_type, status, created_at, updated_at
      ) VALUES (
        @id, @name, @poolType, @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      name: input.name,
      poolType: input.poolType,
      status: input.status,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  createMember(poolId: string, input: CreateInstancePoolMemberInput) {
    const createdAt = now();
    const id = createId("ipm");

    db.prepare(`
      INSERT INTO instance_pool_members (
        id, pool_id, instance_id, priority, status, created_at, updated_at
      ) VALUES (
        @id, @poolId, @instanceId, @priority, @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      poolId,
      instanceId: input.instanceId,
      priority: input.priority,
      status: input.status,
      createdAt,
      updatedAt: createdAt
    });

    const row = db.prepare("SELECT * FROM instance_pool_members WHERE id = ?").get(id);
    return mapMember(row as Record<string, unknown>);
  },

  deleteMember(poolId: string, memberId: string) {
    return db.prepare("DELETE FROM instance_pool_members WHERE id = ? AND pool_id = ?")
      .run(memberId, poolId)
      .changes > 0;
  }
};

