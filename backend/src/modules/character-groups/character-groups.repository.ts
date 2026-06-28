import { db } from "../../database/db";
import { createId, now } from "../shared/resource";
import type {
  AssignGroupAttributeInput,
  CreateCharacterGroupInput,
  CreateGroupMemberInput,
  UpdateCharacterGroupInput
} from "./character-groups.schemas";

function mapGroup(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMember(row: Record<string, unknown>) {
  return {
    id: row.id,
    groupId: row.group_id,
    characterId: row.character_id,
    role: row.role,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  };
}

function mapAssignedAttribute(row: Record<string, unknown>) {
  return {
    id: row.id,
    groupId: row.group_id,
    attributeId: row.attribute_id,
    valueId: row.value_id ?? null,
    customValue: row.custom_value ?? null,
    createdAt: row.created_at
  };
}

export const characterGroupsRepository = {
  list() {
    return db.prepare("SELECT * FROM character_groups ORDER BY created_at DESC")
      .all()
      .map((row) => mapGroup(row as Record<string, unknown>));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM character_groups WHERE id = ?").get(id);
    return row ? mapGroup(row as Record<string, unknown>) : null;
  },

  create(input: CreateCharacterGroupInput) {
    const createdAt = now();
    const id = createId("cg");

    db.prepare(`
      INSERT INTO character_groups (
        id, name, description, status, created_at, updated_at
      ) VALUES (
        @id, @name, @description, @status, @createdAt, @updatedAt
      )
    `).run({
      id,
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  update(id: string, input: UpdateCharacterGroupInput) {
    const current = this.get(id);
    if (!current) return null;

    db.prepare(`
      UPDATE character_groups
      SET name = @name,
          description = @description,
          status = @status,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      status: input.status ?? current.status,
      updatedAt: now()
    });

    return this.get(id);
  },

  delete(id: string) {
    return db.prepare("DELETE FROM character_groups WHERE id = ?").run(id).changes > 0;
  },

  createMember(groupId: string, input: CreateGroupMemberInput) {
    const createdAt = now();
    const id = createId("cgm");

    db.prepare(`
      INSERT INTO character_group_members (
        id, group_id, character_id, role, sort_order, status, member_context_json, created_at, updated_at
      ) VALUES (
        @id, @groupId, @characterId, @role, @sortOrder, 'active', '{}', @createdAt, @updatedAt
      )
    `).run({
      id,
      groupId,
      characterId: input.characterId,
      role: input.role,
      sortOrder: input.sortOrder,
      createdAt,
      updatedAt: createdAt
    });

    const row = db.prepare("SELECT * FROM character_group_members WHERE id = ?").get(id);
    return mapMember(row as Record<string, unknown>);
  },

  deleteMember(groupId: string, memberId: string) {
    return db.prepare("DELETE FROM character_group_members WHERE id = ? AND group_id = ?")
      .run(memberId, groupId)
      .changes > 0;
  },

  members(groupId: string) {
    return db.prepare(`
      SELECT * FROM character_group_members
      WHERE group_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(groupId).map((row) => mapMember(row as Record<string, unknown>));
  },

  reorderMembers(groupId: string, memberIds: string[]) {
    const update = db.prepare(`
      UPDATE character_group_members
      SET sort_order = @sortOrder,
          updated_at = @updatedAt
      WHERE group_id = @groupId
        AND id = @memberId
    `);
    const touchGroup = db.prepare("UPDATE character_groups SET updated_at = ? WHERE id = ?");
    const timestamp = now();
    return db.transaction(() => {
      memberIds.forEach((memberId, index) => {
        update.run({ groupId, memberId, sortOrder: index, updatedAt: timestamp });
      });
      touchGroup.run(timestamp, groupId);
      return this.members(groupId);
    })();
  },

  assignAttribute(groupId: string, input: AssignGroupAttributeInput) {
    const id = createId("cgav");

    db.prepare(`
      INSERT INTO character_group_attribute_values (
        id, group_id, attribute_id, value_id, custom_value, created_at
      ) VALUES (
        @id, @groupId, @attributeId, @valueId, @customValue, @createdAt
      )
    `).run({
      id,
      groupId,
      attributeId: input.attributeId,
      valueId: input.valueId ?? null,
      customValue: input.customValue ?? null,
      createdAt: now()
    });

    const row = db.prepare("SELECT * FROM character_group_attribute_values WHERE id = ?").get(id);
    return mapAssignedAttribute(row as Record<string, unknown>);
  }
};
