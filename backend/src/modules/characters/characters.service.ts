import { db } from "../../database/db";
import { jsonParse, jsonString, now } from "../shared/resource";
import type { UpdateCharacterInput } from "./characters.schemas";

type Row = Record<string, unknown>;

function text(row: Row, key: string) {
  return typeof row[key] === "string" ? row[key] as string : null;
}

function mapCharacter(row: Row) {
  return {
    id: text(row, "id"),
    workspaceId: text(row, "workspace_id"),
    name: text(row, "name"),
    slug: text(row, "slug"),
    status: text(row, "status"),
    age: row.age == null ? null : Number(row.age),
    metadata: jsonParse<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapAsset(row: Row) {
  return {
    id: text(row, "id"),
    characterId: text(row, "character_id"),
    groupId: text(row, "group_id"),
    assetType: text(row, "asset_type"),
    assetCategory: text(row, "asset_category") ?? text(row, "asset_type"),
    assetSubType: text(row, "asset_sub_type"),
    mediaType: text(row, "media_type"),
    versionGroupId: text(row, "version_group_id"),
    versionNo: Number(row.version_no ?? 1),
    isBestVersion: row.is_best_version === 1 || row.is_best_version === true,
    name: text(row, "name"),
    publicUrl: text(row, "public_url"),
    previewUrl: text(row, "preview_url") ?? text(row, "public_url"),
    thumbnailFilePath: text(row, "thumbnail_file_path"),
    thumbnailPublicUrl: text(row, "thumbnail_public_url"),
    thumbnailWidth: row.thumbnail_width == null ? null : Number(row.thumbnail_width),
    thumbnailHeight: row.thumbnail_height == null ? null : Number(row.thumbnail_height),
    thumbnailStatus: text(row, "thumbnail_status") ?? "PENDING",
    filePath: text(row, "file_path"),
    status: text(row, "status"),
    usageStatus: text(row, "usage_status"),
    usagePolicy: text(row, "usage_policy"),
    qualityStatus: text(row, "quality_status"),
    tags: jsonParse<string[]>(row.tags_json, []),
    attributes: jsonParse<Record<string, unknown>>(row.attributes_json, {}),
    metadata: jsonParse<Record<string, unknown>>(row.metadata_json, {}),
    sourceAssetId: text(row, "source_asset_id"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapGroup(row: Row) {
  return {
    id: text(row, "id"),
    memberId: text(row, "member_id"),
    name: text(row, "name"),
    description: text(row, "description"),
    status: text(row, "status"),
    role: text(row, "role"),
    memberCount: Number(row.member_count ?? 0),
    attributesSummary: text(row, "attributes_summary") ?? "",
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapBatch(row: Row) {
  return {
    id: text(row, "id"),
    batchType: text(row, "batch_type"),
    sourceGroupId: text(row, "source_group_id"),
    workflowId: text(row, "workflow_id"),
    workflowRunId: text(row, "workflow_run_id"),
    status: text(row, "status"),
    usageStatus: text(row, "usage_status"),
    attributes: jsonParse<Record<string, unknown>>(row.attributes_json, {}),
    metadata: jsonParse<Record<string, unknown>>(row.metadata_json, {}),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function mapJob(row: Row) {
  return {
    id: text(row, "id"),
    sourceBatchId: text(row, "source_batch_id"),
    targetStageType: text(row, "target_stage_type"),
    status: text(row, "status"),
    payload: jsonParse<Record<string, unknown>>(row.payload_json, {}),
    output: jsonParse<Record<string, unknown>>(row.output_json, {}),
    outputBatchId: text(row, "output_batch_id"),
    runtimeSessionId: text(row, "runtime_session_id"),
    createdAt: text(row, "created_at"),
    updatedAt: text(row, "updated_at")
  };
}

function sourceImagesForCharacter(characterId: string) {
  const rows = db.prepare(`
    SELECT * FROM assets
    WHERE character_id = ?
      AND asset_category = 'CHARACTER_IMAGE'
      AND asset_sub_type IN ('YOUNG_ORIGINAL_IMAGE', 'YOUNG_IMAGE', 'OLD_ORIGINAL_IMAGE', 'OLD_IMAGE')
    ORDER BY updated_at DESC, created_at DESC
  `).all(characterId).map((row) => mapAsset(row as Row));

  return {
    youngOriginalImage: rows.find((asset) => asset.assetSubType === "YOUNG_ORIGINAL_IMAGE" || asset.assetSubType === "YOUNG_IMAGE") ?? null,
    oldOriginalImage: rows.find((asset) => asset.assetSubType === "OLD_ORIGINAL_IMAGE" || asset.assetSubType === "OLD_IMAGE") ?? null
  };
}

function groupsForCharacter(characterId: string) {
  return db.prepare(`
    SELECT
      cg.*,
      cgm.id AS member_id,
      cgm.role,
      (SELECT COUNT(*) FROM character_group_members count_members WHERE count_members.group_id = cg.id) AS member_count,
      (
        SELECT GROUP_CONCAT(COALESCE(ga.name, ga.key) || ': ' || COALESCE(cgav.custom_value, gav.label, gav.value, cgav.value_id), ', ')
        FROM character_group_attribute_values cgav
        LEFT JOIN group_attributes ga ON ga.id = cgav.attribute_id
        LEFT JOIN group_attribute_values gav ON gav.id = cgav.value_id
        WHERE cgav.group_id = cg.id
      ) AS attributes_summary
    FROM character_group_members cgm
    JOIN character_groups cg ON cg.id = cgm.group_id
    WHERE cgm.character_id = ?
    ORDER BY cg.updated_at DESC, cg.created_at DESC
  `).all(characterId).map((row) => mapGroup(row as Row));
}

function assetsForCharacter(characterId: string) {
  const directAssets = db.prepare(`
    SELECT * FROM assets
    WHERE character_id = ?
    ORDER BY created_at DESC
  `).all(characterId).map((row) => mapAsset(row as Row));

  const groupIds = new Set(groupsForCharacter(characterId).map((group) => group.id).filter(Boolean));
  const batches = db.prepare("SELECT * FROM production_batches ORDER BY created_at DESC")
    .all()
    .map((row) => mapBatch(row as Row))
    .filter((batch) => {
      const batchText = JSON.stringify({ sourceGroupId: batch.sourceGroupId, metadata: batch.metadata, attributes: batch.attributes });
      return batchText.includes(characterId) || (batch.sourceGroupId ? groupIds.has(batch.sourceGroupId) : false);
    });

  const originalImages = directAssets.filter((asset) =>
    ["YOUNG_ORIGINAL_IMAGE", "YOUNG_IMAGE", "OLD_ORIGINAL_IMAGE", "OLD_IMAGE"].includes(asset.assetSubType ?? "")
  );
  const editedImages = directAssets.filter((asset) =>
    ["EDITED_IMAGE", "FACE_CROP", "BEST_EDITED_VERSION"].includes(asset.assetSubType ?? "")
      || JSON.stringify(asset.metadata).includes("IMAGE_EDIT")
  );

  return {
    originalImages,
    editedImages,
    videoTransitions: batches.filter((batch) => batch.batchType === "VIDEO_BATCH"),
    finalVideos: batches.filter((batch) => batch.batchType === "FINAL_VIDEO"),
    postContent: batches.filter((batch) => batch.batchType === "POST_CONTENT"),
    all: {
      assets: directAssets,
      batches
    }
  };
}

function jobsForCharacter(characterId: string) {
  const groupIds = new Set(groupsForCharacter(characterId).map((group) => group.id).filter(Boolean));
  const relatedBatchIds = new Set<string>();
  const batches = db.prepare("SELECT * FROM production_batches ORDER BY created_at DESC")
    .all()
    .map((row) => mapBatch(row as Row));

  for (const batch of batches) {
    const batchText = JSON.stringify({ sourceGroupId: batch.sourceGroupId, metadata: batch.metadata, attributes: batch.attributes });
    if (batchText.includes(characterId) || (batch.sourceGroupId ? groupIds.has(batch.sourceGroupId) : false)) {
      if (batch.id) relatedBatchIds.add(batch.id);
    }
  }

  let expanded = true;
  const usages = db.prepare("SELECT * FROM production_batch_usage").all() as Row[];
  while (expanded) {
    expanded = false;
    for (const usage of usages) {
      const sourceBatchId = text(usage, "source_batch_id");
      const targetBatchId = text(usage, "target_batch_id");
      if (sourceBatchId && targetBatchId && relatedBatchIds.has(sourceBatchId) && !relatedBatchIds.has(targetBatchId)) {
        relatedBatchIds.add(targetBatchId);
        expanded = true;
      }
    }
  }

  const jobs = db.prepare(`
    SELECT oj.*, ob.id AS output_batch_id, rs.id AS runtime_session_id
    FROM orchestrator_jobs oj
    LEFT JOIN production_batches ob
      ON json_extract(oj.output_json, '$.outputBatchId') = ob.id
      OR json_extract(oj.payload_json, '$.outputBatchId') = ob.id
      OR json_extract(ob.metadata_json, '$.sourceJobId') = oj.id
    LEFT JOIN runtime_sessions rs ON rs.job_id = oj.id
    ORDER BY oj.created_at DESC
  `).all().map((row) => mapJob(row as Row));

  const related = jobs.filter((job) => {
    const outputBatchId = job.outputBatchId ?? "";
    return (job.sourceBatchId ? relatedBatchIds.has(job.sourceBatchId) : false)
      || (outputBatchId ? relatedBatchIds.has(outputBatchId) : false)
      || JSON.stringify({ payload: job.payload, output: job.output }).includes(characterId);
  });

  const grouped: Record<string, ReturnType<typeof mapJob>[]> = {
    IMAGE_EDIT: [],
    VIDEO_GENERATE: [],
    VIDEO_COMPOSE: [],
    POST_CONTENT: []
  };
  for (const job of related) {
    const key = job.targetStageType ?? "OTHER";
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(job);
  }

  return {
    grouped,
    all: related
  };
}

function characterSummary(row: Row) {
  const character = mapCharacter(row);
  const characterId = character.id ?? "";
  const sourceImages = characterId ? sourceImagesForCharacter(characterId) : { youngOriginalImage: null, oldOriginalImage: null };
  const groups = characterId ? groupsForCharacter(characterId) : [];
  const assetCountRow = db.prepare("SELECT COUNT(*) AS count FROM assets WHERE character_id = ?").get(characterId) as { count?: number } | undefined;

  return {
    ...character,
    sourceImages,
    groupCount: groups.length,
    relatedAssetCount: Number(assetCountRow?.count ?? 0),
    tags: [
      ...new Set(
        db.prepare("SELECT tags_json FROM assets WHERE character_id = ?")
          .all(characterId)
          .flatMap((assetRow) => jsonParse<string[]>((assetRow as Row).tags_json, []))
      )
    ]
  };
}

const originalSourceImageSubtypes = ["YOUNG_ORIGINAL_IMAGE", "YOUNG_IMAGE", "OLD_ORIGINAL_IMAGE", "OLD_IMAGE"];

export const charactersService = {
  list() {
    return db.prepare("SELECT * FROM characters ORDER BY updated_at DESC, created_at DESC")
      .all()
      .map((row) => characterSummary(row as Row));
  },

  get(id: string) {
    const row = db.prepare("SELECT * FROM characters WHERE id = ?").get(id);
    return row ? characterSummary(row as Row) : null;
  },

  update(id: string, input: UpdateCharacterInput) {
    const current = this.get(id);
    if (!current) return null;
    db.prepare(`
      UPDATE characters
      SET name = @name,
          status = @status,
          age = @age,
          metadata_json = @metadataJson,
          updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id,
      name: input.name ?? current.name,
      status: input.status ?? current.status,
      age: input.age ?? current.age,
      metadataJson: jsonString(input.metadata ?? current.metadata, {}),
      updatedAt: now()
    });
    return this.get(id);
  },

  delete(id: string) {
    const current = this.get(id);
    if (!current) return null;

    const deleteOriginalSourceImages = db.prepare(`
      DELETE FROM assets
      WHERE character_id = ?
        AND asset_category = 'CHARACTER_IMAGE'
        AND asset_sub_type IN (${originalSourceImageSubtypes.map(() => "?").join(", ")})
    `);
    const deleteMemberships = db.prepare("DELETE FROM character_group_members WHERE character_id = ?");
    const deleteCharacter = db.prepare("DELETE FROM characters WHERE id = ?");

    return db.transaction(() => {
      const sourceImageResult = deleteOriginalSourceImages.run(id, ...originalSourceImageSubtypes);
      const membershipResult = deleteMemberships.run(id);
      const characterResult = deleteCharacter.run(id);

      const preservedEditedAssets = db.prepare(`
        SELECT COUNT(*) AS count FROM assets
        WHERE character_id = ?
          AND NOT (
            asset_category = 'CHARACTER_IMAGE'
            AND asset_sub_type IN (${originalSourceImageSubtypes.map(() => "?").join(", ")})
          )
      `).get(id, ...originalSourceImageSubtypes) as { count: number };

      return {
        deleted: characterResult.changes > 0,
        character: current,
        deletedOriginalSourceImages: sourceImageResult.changes,
        deletedGroupMemberships: membershipResult.changes,
        preservedEditedAssets: preservedEditedAssets.count
      };
    })();
  },

  groups: groupsForCharacter,
  assets: assetsForCharacter,
  jobs: jobsForCharacter,

  detail(id: string) {
    const character = this.get(id);
    if (!character) return null;
    return {
      character,
      sourceImages: sourceImagesForCharacter(id),
      groups: groupsForCharacter(id),
      relatedAssets: assetsForCharacter(id),
      relatedJobs: jobsForCharacter(id)
    };
  }
};
