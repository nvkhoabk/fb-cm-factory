import { AppError } from "../shared/resource";
import { db } from "../../database/db";
import { productionBatchService } from "../production-batches/production-batch.service";
import { characterSourceAssetsService } from "../character-assets/character-source-assets.service";
import { characterGroupsRepository } from "./character-groups.repository";
import type {
  AssignGroupAttributeInput,
  CreateCharacterGroupInput,
  CreateGroupMemberInput,
  ReorderGroupMembersInput,
  UpdateCharacterGroupInput
} from "./character-groups.schemas";

type Row = Record<string, unknown>;

function text(row: Row, key: string) {
  return typeof row[key] === "string" ? row[key] as string : null;
}

function mapCharacter(row: Row) {
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    status: text(row, "status"),
    age: row.age == null ? null : Number(row.age),
    metadata: row.metadata_json ? JSON.parse(String(row.metadata_json)) : {},
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapAttribute(row: Row) {
  return {
    id: text(row, "id"),
    groupId: text(row, "group_id"),
    attributeId: text(row, "attribute_id"),
    attributeKey: text(row, "attribute_key"),
    attributeName: text(row, "attribute_name"),
    valueId: text(row, "value_id"),
    value: text(row, "selected_value"),
    label: text(row, "selected_label"),
    customValue: text(row, "custom_value"),
    createdAt: text(row, "created_at")
  };
}

function groupAttributes(groupId: string) {
  return db.prepare(`
    SELECT
      cgav.*,
      ga.key AS attribute_key,
      ga.name AS attribute_name,
      gav.value AS selected_value,
      gav.label AS selected_label
    FROM character_group_attribute_values cgav
    LEFT JOIN group_attributes ga ON ga.id = cgav.attribute_id
    LEFT JOIN group_attribute_values gav ON gav.id = cgav.value_id
    WHERE cgav.group_id = ?
    ORDER BY cgav.created_at ASC
  `).all(groupId).map((row) => mapAttribute(row as Row));
}

function attributesSummary(attributes: ReturnType<typeof mapAttribute>[]) {
  return attributes
    .map((attribute) => `${attribute.attributeName ?? attribute.attributeKey ?? attribute.attributeId}: ${attribute.customValue ?? attribute.label ?? attribute.value ?? attribute.valueId ?? ""}`)
    .filter((value) => !value.endsWith(": "))
    .join(", ");
}

function productionHistory(groupId: string) {
  const batches = db.prepare(`
    SELECT * FROM production_batches
    WHERE source_group_id = ?
       OR json_extract(metadata_json, '$.groupId') = ?
    ORDER BY created_at DESC
  `).all(groupId, groupId) as Row[];
  const batchIds = new Set(batches.map((batch) => text(batch, "id")).filter(Boolean));
  const jobs = db.prepare("SELECT * FROM orchestrator_jobs ORDER BY created_at DESC").all() as Row[];
  return {
    batches: batches.map((batch) => ({
      id: text(batch, "id"),
      batchType: text(batch, "batch_type"),
      status: text(batch, "status"),
      usageStatus: text(batch, "usage_status"),
      createdAt: text(batch, "created_at")
    })),
    jobs: jobs
      .filter((job) => {
        const sourceBatchId = text(job, "source_batch_id");
        return Boolean(sourceBatchId && batchIds.has(sourceBatchId));
      })
      .map((job) => ({
        id: text(job, "id"),
        targetStageType: text(job, "target_stage_type"),
        status: text(job, "status"),
        sourceBatchId: text(job, "source_batch_id"),
        createdAt: text(job, "created_at")
      }))
  };
}

function groupDetail(id: string) {
  const group = characterGroupsRepository.get(id);
  if (!group) throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);
  const sourceAssets = characterSourceAssetsService.resolveCharacterGroupSourceAssets(id);
  const sourceByCharacterId = new Map(sourceAssets.characters.map((item) => [item.characterId, item]));
  const memberRows = db.prepare(`
    SELECT cgm.id AS member_id, cgm.role, cgm.sort_order, cgm.created_at AS member_created_at, c.*
    FROM character_group_members cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.group_id = ?
    ORDER BY cgm.sort_order ASC, cgm.created_at ASC
  `).all(id) as Row[];
  const members = memberRows.map((row) => {
    const character = mapCharacter(row);
    const source = character.id ? sourceByCharacterId.get(character.id) : null;
    const young = source?.youngOriginalImage ?? null;
    const old = source?.oldOriginalImage ?? null;
    return {
      memberId: text(row, "member_id"),
      role: text(row, "role"),
      sortOrder: Number(row.sort_order ?? 0),
      createdAt: text(row, "member_created_at"),
      character,
      youngThumbnailUrl: young?.thumbnailPublicUrl ?? null,
      oldThumbnailUrl: old?.thumbnailPublicUrl ?? null,
      hasYoungOriginal: Boolean(young),
      hasOldOriginal: Boolean(old),
      youngOriginalImage: young,
      oldOriginalImage: old
    };
  });
  const attrs = groupAttributes(id);
  const missingImages = members.filter((member) => !member.hasYoungOriginal || !member.hasOldOriginal).length;
  const readinessCode = members.length === 0
    ? "EMPTY_GROUP"
    : missingImages > 0
      ? "MISSING_IMAGES"
      : attrs.length === 0
        ? "MISSING_ATTRIBUTES"
        : "READY";
  const readiness = {
    code: readinessCode,
    label: readinessCode === "READY" ? "Ready" : readinessCode === "MISSING_IMAGES" ? "Missing Images" : readinessCode === "MISSING_ATTRIBUTES" ? "Missing Attributes" : "Empty Group",
    ready: readinessCode === "READY",
    missingImages,
    missingAttributes: readinessCode === "MISSING_ATTRIBUTES" ? 1 : 0
  };
  return {
    group: {
      ...group,
      memberCount: members.length,
      attributesSummary: attributesSummary(attrs)
    },
    members,
    attributes: attrs,
    readiness,
    productionHistory: productionHistory(id),
    sourceAssets
  };
}

export const characterGroupsService = {
  list: () => characterGroupsRepository.list().map((group) => {
    const detail = groupDetail(String(group.id));
    return {
      ...group,
      memberCount: detail.members.length,
      attributesSummary: detail.group.attributesSummary,
      readiness: detail.readiness,
      membersPreview: detail.members.slice(0, 6),
      productionBatchCount: detail.productionHistory.batches.length
    };
  }),

  get(id: string) {
    const group = characterGroupsRepository.get(id);
    if (!group) throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);
    return group;
  },

  create: (input: CreateCharacterGroupInput) => characterGroupsRepository.create(input),

  update(id: string, input: UpdateCharacterGroupInput) {
    const group = characterGroupsRepository.update(id, input);
    if (!group) throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);
    return group;
  },

  delete(id: string) {
    if (!characterGroupsRepository.delete(id)) {
      throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);
    }
  },

  createMember: (groupId: string, input: CreateGroupMemberInput) =>
    characterGroupsRepository.createMember(groupId, input),

  deleteMember(groupId: string, memberId: string) {
    if (!characterGroupsRepository.deleteMember(groupId, memberId)) {
      throw new AppError("CHARACTER_GROUP_MEMBER_NOT_FOUND", "Character group member not found", 404);
    }
  },

  reorderMembers(groupId: string, input: ReorderGroupMembersInput) {
    this.get(groupId);
    const current = characterGroupsRepository.members(groupId);
    const currentIds = current.map((member) => String(member.id));
    const requested = [...new Set(input.memberIds)];
    if (requested.length !== currentIds.length || currentIds.some((id) => !requested.includes(id))) {
      throw new AppError("INVALID_MEMBER_ORDER", "Member order must include every current group member exactly once", 400);
    }
    characterGroupsRepository.reorderMembers(groupId, requested);
    return groupDetail(groupId);
  },

  shuffleMembers(groupId: string) {
    this.get(groupId);
    const memberIds = characterGroupsRepository.members(groupId)
      .map((member) => String(member.id))
      .sort(() => Math.random() - 0.5);
    if (!memberIds.length) return groupDetail(groupId);
    characterGroupsRepository.reorderMembers(groupId, memberIds);
    return groupDetail(groupId);
  },

  assignAttribute: (groupId: string, input: AssignGroupAttributeInput) =>
    characterGroupsRepository.assignAttribute(groupId, input),

  detail: groupDetail,

  duplicate(id: string) {
    const detail = groupDetail(id);
    const copy = characterGroupsRepository.create({
      name: `${detail.group.name} Copy`,
      description: detail.group.description ? String(detail.group.description) : undefined,
      status: "draft"
    });
    if (!copy?.id) throw new AppError("CHARACTER_GROUP_DUPLICATE_FAILED", "Could not duplicate character group", 500);
    for (const member of detail.members) {
      if (member.character.id) {
        characterGroupsRepository.createMember(String(copy.id), {
          characterId: member.character.id,
          role: member.role ?? "member",
          sortOrder: member.sortOrder
        });
      }
    }
    for (const attribute of detail.attributes) {
      if (attribute.attributeId) {
        characterGroupsRepository.assignAttribute(String(copy.id), {
          attributeId: attribute.attributeId,
          valueId: attribute.valueId ?? undefined,
          customValue: attribute.customValue ?? attribute.label ?? attribute.value
            ? String(attribute.customValue ?? attribute.label ?? attribute.value)
            : undefined
        });
      }
    }
    return groupDetail(String(copy.id));
  },

  createProductionBatch(id: string) {
    groupDetail(id);
    return productionBatchService.create({
      batchType: "CHARACTER_GROUP",
      sourceGroupId: id,
      status: "READY",
      usageStatus: "AVAILABLE",
      attributes: {},
      metadata: {
        createdFrom: "Character Groups Management",
        groupId: id
      }
    });
  }
};
