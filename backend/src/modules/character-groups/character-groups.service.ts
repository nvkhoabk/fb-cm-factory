import { db } from "../../database/db";
import { createId, getRow, jsonParse, jsonString, listRows, now } from "../shared/resource";
import type {
  CreateAttributeDefinitionInput,
  CreateCharacterGroupInput,
  CreateCharacterInput,
  CreateGroupMemberInput
} from "./character-groups.schemas";

function text(row: Record<string, unknown>, key: string) {
  return typeof row[key] === "string" ? row[key] : null;
}

function bool(value: unknown) {
  return value === 1 || value === true;
}

function mapCharacter(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    name: text(row, "name"),
    slug: text(row, "slug"),
    status: text(row, "status"),
    gender: text(row, "gender"),
    birthYear: row.birth_year === null ? null : Number(row.birth_year ?? 0),
    age: row.age === null ? null : Number(row.age ?? 0),
    notes: text(row, "notes"),
    metadata: jsonParse(row.metadata_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapGroup(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    name: text(row, "name"),
    slug: text(row, "slug"),
    groupType: text(row, "group_type"),
    status: text(row, "status"),
    description: text(row, "description"),
    selectionPolicy: jsonParse(row.selection_policy_json, {}),
    createdBy: text(row, "created_by"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapMember(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    groupId: text(row, "group_id"),
    characterId: text(row, "character_id"),
    role: text(row, "role"),
    sortOrder: Number(row.sort_order ?? 0),
    status: text(row, "status"),
    memberContext: jsonParse(row.member_context_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapAttributeDefinition(row: Record<string, unknown>) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    key: text(row, "key"),
    label: text(row, "label"),
    valueType: text(row, "value_type"),
    scope: text(row, "scope"),
    allowedValues: jsonParse(row.allowed_values_json, []),
    defaultValue: jsonParse(row.default_value_json, null),
    isRequired: bool(row.is_required),
    isQueryable: bool(row.is_queryable),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

export const charactersService = {
  list: (query: Record<string, unknown>) =>
    listRows("characters", mapCharacter, query, {
      workspaceId: "workspace_id",
      status: "status"
    }),

  get: (id: string) => getRow("characters", id, mapCharacter),

  create(payload: CreateCharacterInput) {
    const createdAt = now();
    const id = createId("char");

    db.prepare(`
      INSERT INTO characters (
        id, workspace_id, name, slug, status, gender, birth_year, age,
        notes, metadata_json, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @name, @slug, @status, @gender, @birthYear, @age,
        @notes, @metadataJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      name: payload.name,
      slug: payload.slug ?? null,
      status: payload.status,
      gender: payload.gender ?? null,
      birthYear: payload.birthYear ?? null,
      age: payload.age ?? null,
      notes: payload.notes ?? null,
      metadataJson: jsonString(payload.metadata, {}),
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  }
};

export const characterGroupsService = {
  list: (query: Record<string, unknown>) =>
    listRows("character_groups", mapGroup, query, {
      workspaceId: "workspace_id",
      status: "status",
      groupType: "group_type"
    }),

  get: (id: string) => getRow("character_groups", id, mapGroup),

  create(payload: CreateCharacterGroupInput) {
    const createdAt = now();
    const id = createId("cg");

    db.prepare(`
      INSERT INTO character_groups (
        id, workspace_id, name, slug, group_type, status, description,
        selection_policy_json, created_by, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @name, @slug, @groupType, @status, @description,
        @selectionPolicyJson, @createdBy, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      name: payload.name,
      slug: payload.slug ?? null,
      groupType: payload.groupType,
      status: payload.status,
      description: payload.description ?? null,
      selectionPolicyJson: jsonString(payload.selectionPolicy, {}),
      createdBy: payload.createdBy ?? null,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  listMembers: (groupId: string) =>
    db.prepare("SELECT * FROM character_group_members WHERE group_id = ? ORDER BY sort_order ASC, created_at ASC")
      .all(groupId)
      .map((row) => mapMember(row as Record<string, unknown>)),

  createMember(groupId: string, payload: CreateGroupMemberInput) {
    const createdAt = now();
    const id = createId("cgm");

    db.prepare(`
      INSERT INTO character_group_members (
        id, group_id, character_id, role, sort_order, status,
        member_context_json, created_at, updated_at
      ) VALUES (
        @id, @groupId, @characterId, @role, @sortOrder, @status,
        @memberContextJson, @createdAt, @updatedAt
      )
    `).run({
      id,
      groupId,
      characterId: payload.characterId,
      role: payload.role,
      sortOrder: payload.sortOrder,
      status: payload.status,
      memberContextJson: jsonString(payload.memberContext, {}),
      createdAt,
      updatedAt: createdAt
    });

    return getRow("character_group_members", id, mapMember);
  },

  listAttributeDefinitions: (query: Record<string, unknown>) =>
    listRows("group_attribute_definitions", mapAttributeDefinition, query, {
      workspaceId: "workspace_id",
      scope: "scope"
    }),

  createAttributeDefinition(payload: CreateAttributeDefinitionInput) {
    const createdAt = now();
    const id = createId("gad");

    db.prepare(`
      INSERT INTO group_attribute_definitions (
        id, workspace_id, key, label, value_type, scope, allowed_values_json,
        default_value_json, is_required, is_queryable, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @key, @label, @valueType, @scope, @allowedValuesJson,
        @defaultValueJson, @isRequired, @isQueryable, @createdAt, @updatedAt
      )
    `).run({
      id,
      workspaceId: payload.workspaceId ?? null,
      key: payload.key,
      label: payload.label,
      valueType: payload.valueType,
      scope: payload.scope,
      allowedValuesJson: jsonString(payload.allowedValues, []),
      defaultValueJson: jsonString(payload.defaultValue ?? null, null),
      isRequired: payload.isRequired ? 1 : 0,
      isQueryable: payload.isQueryable ? 1 : 0,
      createdAt,
      updatedAt: createdAt
    });

    return getRow("group_attribute_definitions", id, mapAttributeDefinition);
  }
};

