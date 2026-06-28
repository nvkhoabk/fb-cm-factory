import { hostAgentService } from "../host-agent-adapter/host-agent.service";
import { AppError } from "../shared/resource";
import { screenTemplateService } from "./screen-template.service";

export type ScreenDetectionInput = {
  templateId: string;
  hostId?: string;
  instanceId?: string;
  adbId?: string;
  screenshotUrl?: string;
  screenshotPath?: string;
  threshold?: number;
  screenText?: string;
};

function findUrl(value: unknown): string | null {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (typeof value === "string" && value.startsWith("/")) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const found = findUrl(item);
      if (found) return found;
    }
  }
  return null;
}

function boolFromMetadata(value: unknown) {
  const metadata = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (typeof metadata.manualMatched === "boolean") return metadata.manualMatched;
  if (typeof metadata.matched === "boolean") return metadata.matched;
  if (typeof metadata.defaultMatched === "boolean") return metadata.defaultMatched;
  return false;
}

export const screenDetectionService = {
  async checkScreen(input: ScreenDetectionInput) {
    const template = screenTemplateService.getRequired(input.templateId);
    const threshold = Math.max(0, Math.min(Number(input.threshold ?? template.threshold ?? 0.8), 1));
    let screenshot: unknown = null;
    let screenshotUrl = input.screenshotUrl ?? "";
    const debug: Record<string, unknown> = {
      matchType: template.matchType,
      threshold,
      screenshotSource: screenshotUrl ? "provided" : "captured"
    };

    if (!screenshotUrl && input.hostId && input.instanceId && input.adbId) {
      screenshot = await hostAgentService.takeScreenshot(input.hostId, {
        instanceId: input.instanceId,
        adbId: input.adbId
      });
      screenshotUrl = findUrl(screenshot) ?? "";
    }

    if (!screenshotUrl && !input.screenshotPath) {
      throw new AppError("SCREENSHOT_REQUIRED", "screenDetectionService requires screenshotUrl/screenshotPath or hostId/instanceId/adbId", 400, {
        templateId: input.templateId
      });
    }

    const matchType = String(template.matchType ?? template.templateType ?? "OCR_TEXT").toUpperCase();
    let matched = false;
    let confidence = 0;
    let details: Record<string, unknown> = {};

    if (matchType === "MANUAL_FLAG") {
      matched = boolFromMetadata(template.metadata);
      confidence = matched ? 1 : 0;
      details = { mode: "manual-flag", note: "Uses template metadata manualMatched/matched/defaultMatched" };
    } else if (matchType === "OCR_TEXT") {
      const needle = String(template.ocrText ?? "").trim().toLowerCase();
      const haystack = String(input.screenText ?? "").trim().toLowerCase();
      matched = Boolean(needle && haystack.includes(needle));
      confidence = matched ? 1 : 0;
      details = {
        mode: "ocr-text-placeholder",
        implemented: Boolean(input.screenText),
        note: input.screenText ? "Matched against provided screenText" : "OCR engine is not installed; pass screenText or use IMAGE/MANUAL_FLAG for now"
      };
    } else {
      const templateImage = String(template.templateImagePath ?? template.templateImageUrl ?? "").trim();
      const hasTemplate = Boolean(templateImage);
      const sameUrl = Boolean(templateImage && screenshotUrl && templateImage === screenshotUrl);
      confidence = sameUrl ? 1 : hasTemplate && screenshotUrl ? 0.5 : 0;
      matched = confidence >= threshold;
      details = {
        mode: matchType === "REGION_IMAGE" ? "basic-region-image-placeholder" : "basic-image-placeholder",
        implemented: false,
        templateImage,
        region: template.region,
        note: "Basic sprint implementation; full pixel/template matching can be added with sharp later"
      };
    }

    return {
      matched,
      confidence,
      screenshotUrl,
      screenshotPath: input.screenshotPath ?? null,
      template,
      details,
      debug: {
        ...debug,
        capturedScreenshot: screenshot,
        evaluatedAt: new Date().toISOString()
      }
    };
  }
};
