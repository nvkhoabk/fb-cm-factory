import { db } from "../../database/db";
import { createId, jsonParse, jsonString, now } from "../shared/resource";
import type {
  CreateInstancePoolInput,
  CreateInstancePoolMemberInput,
  UpdateInstancePoolMemberInput
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
    metadata: jsonParse(row.metadata_json, {}),
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

  getDetail(id: string) {
    const pool = this.get(id);
    if (!pool) return null;
    const members = db.prepare(`
      SELECT * FROM instance_pool_members
      WHERE pool_id = ?
      ORDER BY priority ASC, created_at DESC
    `).all(id).map((row) => mapMember(row as Record<string, unknown>));
    return {
      ...pool,
      members
    };
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

    return this.getDetail(id);
  },

  createMember(poolId: string, input: CreateInstancePoolMemberInput) {
    const createdAt = now();
    const id = createId("ipm");

    db.prepare(`
      INSERT INTO instance_pool_members (
        id, pool_id, instance_id, priority, status, metadata_json, created_at, updated_at
      ) VALUES (
        @id, @poolId, @instanceId, @priority, @status, @metadataJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      poolId,
      instanceId: input.instanceId,
      priority: input.priority,
      status: input.status,
      metadataJson: jsonString(input.metadata, {}),
      createdAt,
      updatedAt: createdAt
    });

    const row = db.prepare("SELECT * FROM instance_pool_members WHERE id = ?").get(id);
    return mapMember(row as Record<string, unknown>);
  },

  updateMember(poolId: string, memberId: string, input: UpdateInstancePoolMemberInput) {
    const current = db.prepare("SELECT * FROM instance_pool_members WHERE id = ? AND pool_id = ?").get(memberId, poolId);
    if (!current) return null;
    const row = current as Record<string, unknown>;

    db.prepare(`
      UPDATE instance_pool_members
      SET priority = @priority,
          status = @status,
          metadata_json = @metadataJson,
          updated_at = @updatedAt
      WHERE id = @id AND pool_id = @poolId
    `).run({
      id: memberId,
      poolId,
      priority: input.priority ?? row.priority,
      status: input.status ?? row.status,
      metadataJson: jsonString(input.metadata ?? jsonParse(row.metadata_json, {}), {}),
      updatedAt: now()
    });

    const updated = db.prepare("SELECT * FROM instance_pool_members WHERE id = ?").get(memberId);
    return mapMember(updated as Record<string, unknown>);
  },

  deleteMember(poolId: string, memberId: string) {
    return db.prepare("DELETE FROM instance_pool_members WHERE id = ? AND pool_id = ?")
      .run(memberId, poolId)
      .changes > 0;
  }
};
