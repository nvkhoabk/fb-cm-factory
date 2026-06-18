import { db } from "../../database/db";
import { productionBatchRepository } from "../production-batches/production-batch.repository";
import { AppError } from "../shared/resource";
import type { RenderPromptInput } from "./prompt-render.schemas";

type TemplateVersionRow = {
  id: string;
  prompt_template_id: string;
  version_no: number;
  template_text: string;
  status: string;
};

function latestTemplateVersion(templateId: string) {
  const row = db.prepare(`
    SELECT * FROM prompt_template_versions
    WHERE prompt_template_id = ?
    ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, version_no DESC
    LIMIT 1
  `).get(templateId) as TemplateVersionRow | undefined;

  return row ?? null;
}

function latestTemplateByCategory(category: string) {
  const row = db.prepare(`
    SELECT ptv.*
    FROM prompt_templates pt
    JOIN prompt_template_versions ptv ON ptv.prompt_template_id = pt.id
    WHERE UPPER(COALESCE(pt.category, pt.scope, '')) = UPPER(?)
      AND UPPER(COALESCE(pt.status, 'active')) = 'ACTIVE'
    ORDER BY CASE LOWER(ptv.status) WHEN 'active' THEN 0 ELSE 1 END, ptv.version_no DESC
    LIMIT 1
  `).get(category) as TemplateVersionRow | undefined;

  return row ?? null;
}

function getGroup(groupId: string) {
  return db.prepare("SELECT * FROM character_groups WHERE id = ?").get(groupId) as Record<string, unknown> | undefined;
}

function getWorkflow(workflowId?: string) {
  if (!workflowId) return null;
  return db.prepare("SELECT * FROM workflows WHERE id = ?").get(workflowId) as Record<string, unknown> | undefined ?? null;
}

function groupSize(groupId: string) {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM character_group_members
    WHERE group_id = ?
  `).get(groupId) as { count: number };

  return row.count;
}

function groupAttributeValues(groupId: string) {
  const rows = db.prepare(`
    SELECT
      ga.key AS attribute_key,
      ga.name AS attribute_name,
      gav.value AS selected_value,
      gav.label AS selected_label,
      cgav.custom_value AS custom_value
    FROM character_group_attribute_values cgav
    JOIN group_attributes ga ON ga.id = cgav.attribute_id
    LEFT JOIN group_attribute_values gav ON gav.id = cgav.value_id
    WHERE cgav.group_id = ?
    ORDER BY cgav.created_at ASC
  `).all(groupId) as Array<Record<string, unknown>>;

  const values: Record<string, string> = {};
  for (const row of rows) {
    const key = String(row.attribute_key);
    const name = String(row.attribute_name ?? "");
    const rawValue = row.custom_value ?? row.selected_label ?? row.selected_value ?? "";
    values[key] = String(rawValue);
    if (name) values[name] = String(rawValue);
  }

  return values;
}

function displayValue(key: string, value: string) {
  if (key === "outfit" && value && !/\b(clothes|outfit|wear|uniform|costume)\b/i.test(value)) {
    return `${value} clothes`;
  }

  return value;
}

function replacePlaceholders(templateText: string, values: Record<string, string>) {
  let rendered = templateText;

  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`{${key}}`, displayValue(key, value));
  }

  rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (_match, expression: string) => {
    const key = String(expression).trim();
    return values[key] ?? "";
  });

  return rendered;
}

function stringList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeHashtag(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "";
  return cleaned.startsWith("#") ? cleaned : `#${cleaned.replace(/^#+/, "")}`;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export const promptRenderService = {
  getGroupPromptContext(groupId: string) {
    const group = getGroup(groupId);
    if (!group) throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);
    return {
      id: String(group.id),
      name: String(group.name ?? ""),
      memberCount: groupSize(groupId)
    };
  },

  renderPrompt(input: RenderPromptInput) {
    const templateVersion = latestTemplateVersion(input.templateId);
    if (!templateVersion) throw new AppError("PROMPT_TEMPLATE_VERSION_NOT_FOUND", "Prompt template version not found", 404);

    const group = getGroup(input.groupId);
    if (!group) throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);

    const workflow = getWorkflow(input.workflowId);
    const attributes = groupAttributeValues(input.groupId);
    const values: Record<string, string> = {
      scene: attributes.scene ?? "",
      emotion: attributes.emotion ?? "",
      outfit: attributes.outfit ?? "",
      ...attributes,
      "group.name": String(group.name ?? ""),
      "group.size": String(groupSize(input.groupId)),
      "workflow.name": workflow ? String(workflow.name ?? "") : ""
    };

    return {
      prompt: replacePlaceholders(templateVersion.template_text, values),
      templateVersionId: templateVersion.id,
      values
    };
  },

  renderImagePrompt(input: RenderPromptInput) {
    return this.renderPrompt(input);
  },

  renderVideoPrompt(input: RenderPromptInput) {
    return this.renderPrompt(input);
  },

  renderMusicPrompt(input: RenderPromptInput) {
    return this.renderPrompt(input);
  },

  renderPostContentPrompt(input: RenderPromptInput & {
    finalVideoMetadata?: Record<string, unknown>;
    hashtagsTemplateId?: string;
  }) {
    const templateVersion = latestTemplateVersion(input.templateId);
    if (!templateVersion) throw new AppError("PROMPT_TEMPLATE_VERSION_NOT_FOUND", "Prompt template version not found", 404);

    const group = getGroup(input.groupId);
    if (!group) throw new AppError("CHARACTER_GROUP_NOT_FOUND", "Character group not found", 404);

    const workflow = getWorkflow(input.workflowId);
    const attributes = groupAttributeValues(input.groupId);
    const finalVideoMetadata = input.finalVideoMetadata ?? {};
    const values: Record<string, string> = {
      ...attributes,
      "group.name": String(group.name ?? ""),
      "group.size": String(groupSize(input.groupId)),
      "workflow.name": workflow ? String(workflow.name ?? "") : "",
      "finalVideo.title": String(finalVideoMetadata.title ?? finalVideoMetadata.name ?? ""),
      "finalVideo.caption": String(finalVideoMetadata.caption ?? ""),
      "finalVideo.description": String(finalVideoMetadata.description ?? ""),
      "finalVideo.url": String(finalVideoMetadata.publicUrl ?? finalVideoMetadata.url ?? "")
    };
    for (const [key, value] of Object.entries(finalVideoMetadata)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        values[`finalVideo.${key}`] = String(value);
      }
    }

    let hashtags = stringList(finalVideoMetadata.hashtags).map(normalizeHashtag).filter(Boolean);
    const hashtagTemplate = input.hashtagsTemplateId
      ? latestTemplateVersion(input.hashtagsTemplateId)
      : latestTemplateByCategory("HASHTAGS");
    if (hashtagTemplate) {
      hashtags = replacePlaceholders(hashtagTemplate.template_text, values)
        .split(/[\s,]+/)
        .map(normalizeHashtag)
        .filter(Boolean);
    }

    values.hashtags = hashtags.join(" ");

    return {
      prompt: replacePlaceholders(templateVersion.template_text, values),
      templateVersionId: templateVersion.id,
      values,
      hashtags
    };
  },

  generatePostContentForFinalVideo(batchId: string, input: {
    templateId?: string;
    hashtagsTemplateId?: string;
    mock?: boolean;
  } = {}) {
    const batch = productionBatchRepository.get(batchId);
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);

    const metadata = objectValue(batch.metadata);
    const promptTemplateId = input.templateId
      ?? (typeof metadata.postContentPromptTemplateId === "string" ? metadata.postContentPromptTemplateId : undefined)
      ?? (typeof metadata.promptTemplateId === "string" ? metadata.promptTemplateId : undefined);
    const categoryTemplate = promptTemplateId ? null : latestTemplateByCategory("POST_CONTENT");
    const resolvedTemplateId = promptTemplateId ?? categoryTemplate?.prompt_template_id;

    let renderedPrompt = "";
    let hashtags = stringList(metadata.hashtags).map(normalizeHashtag).filter(Boolean);
    if (resolvedTemplateId && typeof batch.sourceGroupId === "string" && batch.sourceGroupId) {
      const rendered = this.renderPostContentPrompt({
        templateId: resolvedTemplateId,
        groupId: batch.sourceGroupId,
        workflowId: typeof batch.workflowId === "string" ? batch.workflowId : undefined,
        finalVideoMetadata: metadata,
        hashtagsTemplateId: input.hashtagsTemplateId
      });
      renderedPrompt = rendered.prompt;
      hashtags = rendered.hashtags.length ? rendered.hashtags : hashtags;
    }

    if (!hashtags.length) hashtags = ["#facebook", "#video", "#creator"];
    const title = String(metadata.title ?? "New video is ready");
    const caption = renderedPrompt || String(metadata.caption ?? "A fresh final video is ready to share.");
    const postText = renderedPrompt || `${caption}\n\n${hashtags.join(" ")}`;

    return {
      caption,
      postText,
      hashtags,
      title,
      cta: String(metadata.cta ?? "Watch now"),
      platform: String(metadata.platform ?? "facebook")
    };
  },

  generatePromptForBatch(batchId: string, templateId?: string) {
    const batch = productionBatchRepository.get(batchId);
    if (!batch) throw new AppError("PRODUCTION_BATCH_NOT_FOUND", "Production batch not found", 404);
    if (typeof batch.sourceGroupId !== "string" || !batch.sourceGroupId) {
      throw new AppError("BATCH_GROUP_NOT_FOUND", "Production batch is not linked to a character group");
    }

    const resolvedTemplateId = templateId ??
      (batch.metadata && typeof batch.metadata === "object"
        ? (batch.metadata as Record<string, unknown>).promptTemplateId
        : undefined);

    if (typeof resolvedTemplateId !== "string" || !resolvedTemplateId) {
      throw new AppError("PROMPT_TEMPLATE_REQUIRED", "templateId is required for batch prompt generation");
    }

    return this.renderPrompt({
      templateId: resolvedTemplateId,
      groupId: batch.sourceGroupId,
      workflowId: typeof batch.workflowId === "string" ? batch.workflowId : undefined
    });
  }
};
