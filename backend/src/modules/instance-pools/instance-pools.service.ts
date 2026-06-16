import { db } from "../../database/db";
import { createId, getRow, jsonParse, jsonString, listRows, now } from "../shared/resource";
import type { CreateInstancePoolInput, CreateInstanceSlotInput } from "./instance-pools.schemas";

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] : null;
}

function mapPool(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    name: text(row, "name"),
    poolType: text(row, "pool_type"),
    status: text(row, "status"),
    capabilityTags: jsonParse(row.capability_tags_json, []),
    concurrencyLimit: Number(row.concurrency_limit ?? 1),
    leaseTimeoutSeconds: Number(row.lease_timeout_seconds ?? 120),
    cooldownSeconds: Number(row.cooldown_seconds ?? 0),
    selectionPolicy: jsonParse(row.selection_policy_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapSlot(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    poolId: text(row, "pool_id"),
    hostId: text(row, "host_id"),
    slotType: text(row, "slot_type"),
    localRef: text(row, "local_ref"),
    displayName: text(row, "display_name"),
    status: text(row, "status"),
    healthStatus: text(row, "health_status"),
    capabilityTags: jsonParse(row.capability_tags_json, []),
    activeLeaseId: text(row, "active_lease_id"),
    lastSeenAt: text(row, "last_seen_at"),
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

export const instancePoolsService = {
  list: (query: Record<string, unknown>) =>
    listRows("instance_pools", mapPool, query, {
      workspaceId: "workspace_id",
      status: "status",
      poolType: "pool_type"
    }),

  get: (id: string) => getRow("instance_pools", id, mapPool),

  create(payload: CreateInstancePoolInput) {
    const createdAt = now();
    const id = createId("pool");

    db.prepare(`
      INSERT INTO instance_pools (
        id, workspace_id, name, pool_type, status, capability_tags_json,
        concurrency_limit, lease_timeout_seconds, cooldown_seconds,
        selection_policy_json, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @name, @poolType, @status, @capabilityTagsJson,
        @concurrencyLimit, @leaseTimeoutSeconds, @cooldownSeconds,
        @selectionPolicyJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      name: payload.name,
      poolType: payload.poolType,
      status: payload.status,
      capabilityTagsJson: jsonString(payload.capabilityTags, []),
      concurrencyLimit: payload.concurrencyLimit,
      leaseTimeoutSeconds: payload.leaseTimeoutSeconds,
      cooldownSeconds: payload.cooldownSeconds,
      selectionPolicyJson: jsonString(payload.selectionPolicy, {}),
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  listSlots: (poolId: string) =>
    db.prepare("SELECT * FROM instance_slots WHERE pool_id = ? ORDER BY created_at DESC")
      .all(poolId)
      .map((row) => mapSlot(row as Record<string, unknown>)),

  createSlot(poolId: string, payload: CreateInstanceSlotInput) {
    const createdAt = now();
    const id = createId("slot");

    db.prepare(`
      INSERT INTO instance_slots (
        id, pool_id, host_id, slot_type, local_ref, display_name, status,
        health_status, capability_tags_json, metadata_json, created_at, updated_at
      ) VALUES (
        @id, @poolId, @hostId, @slotType, @localRef, @displayName, @status,
        @healthStatus, @capabilityTagsJson, @metadataJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      poolId,
      hostId: payload.hostId ?? null,
      slotType: payload.slotType,
      localRef: payload.localRef ?? null,
      displayName: payload.displayName,
      status: payload.status,
      healthStatus: payload.healthStatus,
      capabilityTagsJson: jsonString(payload.capabilityTags, []),
      metadataJson: jsonString(payload.metadata, {}),
      createdAt,
      updatedAt: createdAt
    });

    return getRow("instance_slots", id, mapSlot);
  }
};

