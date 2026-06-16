import { db } from "../../database/db";
import { createId, now } from "../shared/resource";
import type {
  CreateGroupAttributeInput,
  CreateGroupAttributeValueInput
} from "./group-attributes.schemas";

function mapAttribute(row: Record<string, unknown>) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    valueType: row.value_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapValue(row: Record<string, unknown>) {
  return {
    id: row.id,
    attributeId: row.attribute_id ?? row.definition_id,
    value: row.value,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const groupAttributesRepository = {
  list() {
    return db.prepare("SELECT * FROM group_attributes ORDER BY created_at DESC")
      .all()
      .map((row) => mapAttribute(row as Record<string, unknown>));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM group_attributes WHERE id = ?").get(id);
    return row ? mapAttribute(row as Record<string, unknown>) : null;
  },

  create(input: CreateGroupAttributeInput) {
    const createdAt = now();
    const id = createId("ga");

    db.prepare(`
      INSERT INTO group_attributes (
        id, key, name, value_type, created_at, updated_at
      ) VALUES (
        @id, @key, @name, @valueType, @createdAt, @updatedAt
      )
    `).run({
      id,
      key: input.key,
      name: input.name,
      valueType: input.valueType,
      createdAt,
      updatedAt: createdAt
    });

    db.prepare(`
      INSERT OR IGNORE INTO group_attribute_definitions (
        id, key, label, value_type, scope, created_at, updated_at
      ) VALUES (
        @id, @key, @name, @valueType, 'group', @createdAt, @updatedAt
      )
    `).run({
      id,
      key: input.key,
      name: input.name,
      valueType: input.valueType,
      createdAt,
      updatedAt: createdAt
    });

    return this.get(id);
  },

  createValue(attributeId: string, input: CreateGroupAttributeValueInput) {
    const createdAt = now();
    const id = createId("gav");

    db.prepare(`
      INSERT INTO group_attribute_values (
        id, definition_id, attribute_id, value, label, created_at, updated_at
      ) VALUES (
        @id, @attributeId, @attributeId, @value, @label, @createdAt, @updatedAt
      )
    `).run({
      id,
      attributeId,
      value: input.value,
      label: input.label,
      createdAt,
      updatedAt: createdAt
    });

    const row = db.prepare("SELECT * FROM group_attribute_values WHERE id = ?").get(id);
    return mapValue(row as Record<string, unknown>);
  }
};
