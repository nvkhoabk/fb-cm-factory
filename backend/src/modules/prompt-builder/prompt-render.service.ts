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
