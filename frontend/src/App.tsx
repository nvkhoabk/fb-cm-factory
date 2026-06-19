import {
  Boxes,
  Check,
  ClipboardList,
  Copy,
  Dices,
  Edit3,
  Eye,
  Languages,
  Image,
  Loader2,
  Music,
  PackagePlus,
  Play,
  Rocket,
  RefreshCcw,
  Archive,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3200";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
};

type CharacterGroup = {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  memberCount?: number;
  attributesSummary?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  readiness?: GroupReadiness;
  membersPreview?: CharacterGroupMemberSummary[];
  productionBatchCount?: number;
};

type GroupReadiness = {
  code: string;
  label: string;
  ready: boolean;
  missingImages?: number;
  missingAttributes?: number;
};

type CharacterGroupMemberSummary = {
  memberId?: string | null;
  role?: string | null;
  sortOrder?: number;
  character: CharacterRecord;
  youngThumbnailUrl?: string | null;
  oldThumbnailUrl?: string | null;
  hasYoungOriginal?: boolean;
  hasOldOriginal?: boolean;
  youngOriginalImage?: AssetRecord | null;
  oldOriginalImage?: AssetRecord | null;
};

type CharacterGroupDetail = {
  group: CharacterGroup;
  members: CharacterGroupMemberSummary[];
  attributes: Array<{
    id?: string | null;
    attributeId?: string | null;
    attributeKey?: string | null;
    attributeName?: string | null;
    valueId?: string | null;
    value?: string | null;
    label?: string | null;
    customValue?: string | null;
  }>;
  readiness: GroupReadiness;
  productionHistory: {
    batches: ProductionBatch[];
    jobs: OrchestratorJob[];
  };
  sourceAssets?: Record<string, unknown>;
};

type CharacterRecord = {
  id: string;
  name: string;
  status?: string | null;
  age?: number | null;
  metadata?: Record<string, unknown>;
  sourceImages?: {
    youngOriginalImage?: AssetRecord | null;
    oldOriginalImage?: AssetRecord | null;
  };
  groupCount?: number;
  relatedAssetCount?: number;
  tags?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

type CharacterDetail = {
  character: CharacterRecord;
  sourceImages: {
    youngOriginalImage?: AssetRecord | null;
    oldOriginalImage?: AssetRecord | null;
  };
  groups: Array<CharacterGroup & {
    memberId?: string | null;
    role?: string | null;
    memberCount?: number;
    attributesSummary?: string;
    createdAt?: string | null;
  }>;
  relatedAssets: {
    originalImages: AssetRecord[];
    editedImages: AssetRecord[];
    videoTransitions: ProductionBatch[];
    finalVideos: ProductionBatch[];
    postContent: ProductionBatch[];
    all?: {
      assets?: AssetRecord[];
      batches?: ProductionBatch[];
    };
  };
  relatedJobs: {
    grouped: Record<string, OrchestratorJob[]>;
    all: OrchestratorJob[];
  };
};

type GroupAttribute = {
  id: string;
  key: string;
  name: string;
  valueType: string;
};

type PromptTemplate = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  status?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  versions?: PromptTemplateVersion[];
  activeVersion?: PromptTemplateVersion | null;
};

type PromptTemplateVersion = {
  id: string;
  promptTemplateId: string;
  versionNo: number;
  templateText: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type HostRecord = {
  id: string;
  hostId: string;
  name: string;
  baseUrl: string;
  status: string;
};

type AdbDevice = {
  adbId: string;
  state: string;
};

type InstancePool = {
  id: string;
  name: string;
  poolType: string;
  status: string;
  members?: InstancePoolMember[];
};

type InstancePoolMember = {
  id: string;
  poolId: string;
  instanceId: string;
  priority: number;
  status: string;
  metadata?: Record<string, unknown>;
  role?: string | null;
  notes?: string | null;
  instance?: InstanceRecord | null;
};

type WorkflowRecord = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  mode?: string;
  capacityConfig?: CapacityConfig;
  musicPolicy?: Record<string, unknown>;
  postContentPolicy?: Record<string, unknown>;
  resourceRules?: Array<Record<string, unknown>>;
  scriptMapping?: Record<string, unknown>;
  promptMapping?: Record<string, unknown>;
};

type WorkflowRunRecord = {
  id: string;
  workflowId: string;
  status: string;
  capacityConfig?: CapacityConfig;
  currentStageNo?: number;
  createdAt?: string;
  updatedAt?: string;
};

type CapacityConfig = Record<string, number>;

type CapacityAllocation = {
  id: string;
  instanceId: string;
  hostId?: string | null;
  localId?: string | number | null;
  adbId?: string | null;
  status: string;
  metadata?: Record<string, unknown>;
};

type WorkflowCapacityResponse = {
  workflowRunId: string;
  workflowId: string;
  capacityConfig: CapacityConfig;
  code?: string;
  allocations: CapacityAllocation[];
  details?: Array<Record<string, unknown>>;
};

type InstanceRecord = {
  id: string;
  hostId: string;
  localId: string;
  name?: string | null;
  adbId?: string | null;
  status: string;
  runtimeStatus: string;
  capabilities?: InstanceCapabilities;
  currentPoolType?: string;
  currentWorkflowRunId?: string | null;
  maintenanceReason?: string | null;
  lastErrorAt?: string | null;
  metadata?: Record<string, unknown>;
  lastSeenAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type InstanceCapabilities = {
  canRun?: string[];
  apps?: string[];
  supportsUpload?: boolean;
  supportsDownload?: boolean;
  notes?: string;
  [key: string]: unknown;
};

type ScriptRecord = {
  id: string;
  name: string;
  category?: string;
  description?: string | null;
  status: string;
  createdAt?: string;
};

type ScriptVersionRecord = {
  id: string;
  scriptId: string;
  versionNo: number;
  status: string;
  steps?: Array<Record<string, unknown>>;
  variables?: Record<string, unknown>;
  retryPolicy?: Record<string, unknown>;
  detectionPolicy?: Record<string, unknown>;
};

type OrchestratorRule = {
  id: string;
  name: string;
  triggerBatchType: string;
  triggerStatus: string;
  targetStageType: string;
  priority: number;
  isActive: boolean;
  config?: Record<string, unknown>;
};

type ProductionBatch = {
  id: string;
  batchType: string;
  sourceGroupId?: string | null;
  workflowId?: string | null;
  workflowRunId?: string | null;
  status: string;
  usageStatus: string;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type AssetRecord = {
  id: string;
  name: string;
  assetType?: string | null;
  assetCategory?: string | null;
  assetSubType?: string | null;
  mediaType?: string | null;
  groupId?: string | null;
  characterId?: string | null;
  versionGroupId?: string | null;
  versionNo?: number;
  isBestVersion?: boolean;
  publicUrl?: string | null;
  previewUrl?: string | null;
  thumbnailFilePath?: string | null;
  thumbnailPublicUrl?: string | null;
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
  thumbnailStatus?: string | null;
  filePath?: string | null;
  usageStatus?: string | null;
  usagePolicy?: string | null;
  qualityStatus?: string | null;
  status?: string | null;
  tags?: string[];
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  sourceAssetId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AssetCategory = {
  id: string;
  label: string;
  subTypes?: string[];
};

type CharacterImportFile = {
  fileName: string;
  dataUrl?: string;
  publicUrl?: string;
  filePath?: string;
  mimeType?: string;
  size?: number;
};

type CharacterImportPairPreview = {
  name: string;
  status: "alive" | "rip" | null;
  age: number | null;
  young: CharacterImportFile | null;
  old: CharacterImportFile | null;
  valid: boolean;
  errors: string[];
  warnings: string[];
  existingCharacter?: Record<string, unknown> | null;
  existingAssetCount?: number;
};

type CharacterImportResult = {
  importedCount: number;
  skippedCount: number;
  preview?: CharacterImportPairPreview[];
  imported?: Array<Record<string, unknown>>;
  skipped?: Array<Record<string, unknown>>;
  history?: Record<string, unknown>;
};

type OrchestratorJob = {
  id: string;
  sourceBatchId: string;
  targetStageType: string;
  status: string;
  payload?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
};

type RuntimeStep = {
  id: string;
  stepNo: number;
  stepType: string;
  status: string;
  output?: Record<string, unknown>;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
};

type RuntimeSession = {
  id: string;
  jobId?: string | null;
  instanceId?: string | null;
  hostId?: string | null;
  scriptId?: string | null;
  status: string;
  currentStepNo: number;
  context?: Record<string, unknown>;
  checkpoint?: Record<string, unknown>;
  updatedAt?: string;
  finishedAt?: string | null;
  steps?: RuntimeStep[];
};

type ScriptRunStep = {
  id: string;
  stepNo: number;
  stepType: string;
  status: string;
  output?: Record<string, unknown>;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
};

type ScriptRun = {
  id: string;
  runtimeSessionId: string;
  scriptId: string;
  scriptVersionId: string;
  status: string;
  currentStepNo: number;
  context?: Record<string, unknown>;
  startedAt?: string | null;
  finishedAt?: string | null;
  steps?: ScriptRunStep[];
};

type PromptKind = "image" | "video" | "music";
type LanguageCode = "en" | "vi";
type ManagementSection =
  | "hosts"
  | "workflows"
  | "instances"
  | "instance-pools"
  | "scripts"
  | "prompt-templates"
  | "characters"
  | "character-groups"
  | "character-import"
  | "production-resources"
  | "orchestrator-rules"
  | "jobs"
  | "runtime-sessions";
type AppPage = "control-center" | "studio" | "asset-center" | "production-jobs" | "management";

type PromptPreviews = Record<PromptKind, string>;
type PromptSelections = Record<PromptKind, string>;

const workflowStages = [
  { type: "IMAGE_EDIT", resource: "1 image slot", icon: Image },
  { type: "VIDEO_GENERATE", resource: "1 video slot", icon: Video },
  { type: "MUSIC_GENERATE", resource: "1 music slot", icon: Music },
  { type: "VIDEO_COMPOSE", resource: "1 compose slot", icon: Play }
];

const attributePresets: Record<string, string[]> = {
  scene: ["street", "studio", "beach", "rooftop"],
  emotion: ["happy", "calm", "confident", "surprised"],
  outfit: ["sport", "casual", "formal", "retro"]
};

const stageTypeToPoolType: Record<string, string> = {
  IMAGE_EDIT: "IMAGE_EDIT",
  VIDEO_GENERATE: "VIDEO_GENERATE",
  MUSIC_GENERATE: "MUSIC_GENERATE",
  VIDEO_COMPOSE: "VIDEO_COMPOSE",
  POST_CONTENT: "POST_CONTENT"
};

const pageSizeOptions = [10, 20, 50];
const instancePoolStateOptions = ["AVAILABLE", "STANDBY", "WORKFLOW", "MAINTENANCE", "DISABLED", "RETIRED"];
const capacityStageOptions = ["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT"];
const productionBatchTypeOptions = ["CHARACTER_GROUP", "IMAGE_BATCH", "VIDEO_BATCH", "MUSIC_TRACK", "FINAL_VIDEO", "POST_CONTENT"];
const assetCategoryTabs = [
  { id: "CHARACTER_IMAGE", label: "Character Images" },
  { id: "PROMPT_TEMPLATE", label: "Prompt Templates" },
  { id: "MUSIC_TRACK", label: "Music Library" },
  { id: "VIDEO_TEMPLATE", label: "Video Templates" },
  { id: "POST_TEMPLATE", label: "Post Templates" }
];
const jobBoardStatusOptions = ["PENDING", "ALLOCATED", "RUNNING", "COMPLETED", "FAILED"];
const promptCategoryOptions = ["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT", "UTILITY"];
const promptVariableHelpers = [
  { group: "Character / Group", values: ["{{group.name}}", "{{group.size}}", "{{character.name}}", "{{character.status}}", "{{character.age}}"] },
  { group: "Attributes", values: ["{scene}", "{emotion}", "{outfit}", "{mood}", "{style}", "{tempo}"] },
  { group: "Assets", values: ["{{batch.id}}", "{{asset.publicUrl}}", "{{finalVideo.title}}"] },
  { group: "Prompt", values: ["{{prompt.image}}", "{{prompt.video}}", "{{prompt.music}}", "{{prompt.post}}"] }
];
const musicPolicyModes = ["RANDOM_LIBRARY", "REQUIRE_MATCHED", "CREATE_DEDICATED"];
const musicMatchAttributeOptions = ["mood", "tempo", "style", "scene", "emotion", "tags"];
const scriptCategoryOptions = ["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT", "UTILITY"];

const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    "app.controlCenter": "Factory Control Center",
    "app.productionJobs": "Production Jobs",
    "app.assetCenter": "Asset Center",
    "app.productionStudio": "Production Studio",
    "app.management": "Management",
    "app.language": "Language",
    "app.refresh": "Refresh",
    "management.subtitle": "Simple CRUD tools for operators",
    "management.characters": "Characters",
    "management.characterImport": "Character Import",
    "management.characterGroups": "Character Groups",
    "management.promptTemplates": "Prompt Templates",
    "management.productionResources": "Production Resources",
    "management.scripts": "Scripts",
    "management.jobs": "Jobs",
    "management.workflows": "Workflows",
    "management.runtimeSessions": "Runtime Sessions",
    "management.orchestratorRules": "Orchestrator Rules",
    "management.hosts": "Hosts",
    "management.instances": "Instances",
    "management.instancePools": "Instance Pools",
    "management.search": "Search/filter"
  },
  vi: {
    "app.controlCenter": "Trung Tâm Điều Khiển Factory",
    "app.productionJobs": "Công Việc Sản Xuất",
    "app.assetCenter": "Trung Tâm Tài Sản",
    "app.productionStudio": "Studio Sản Xuất",
    "app.management": "Quản Lý",
    "app.language": "Ngôn ngữ",
    "app.refresh": "Làm mới",
    "management.subtitle": "Công cụ quản trị nhanh cho operator",
    "management.characters": "Character",
    "management.characterImport": "Nhập Character",
    "management.characterGroups": "Nhóm Character",
    "management.promptTemplates": "Mẫu Prompt",
    "management.productionResources": "Tài Nguyên Sản Xuất",
    "management.scripts": "Scripts",
    "management.jobs": "Jobs",
    "management.workflows": "Workflows",
    "management.runtimeSessions": "Phiên Runtime",
    "management.orchestratorRules": "Luật Orchestrator",
    "management.hosts": "Hosts",
    "management.instances": "Instances",
    "management.instancePools": "Instance Pools",
    "management.search": "Tìm kiếm/lọc"
  }
};

const managementMenuItems: Array<{ id: ManagementSection; labelKey: string }> = [
  { id: "characters", labelKey: "management.characters" },
  { id: "character-import", labelKey: "management.characterImport" },
  { id: "character-groups", labelKey: "management.characterGroups" },
  { id: "prompt-templates", labelKey: "management.promptTemplates" },
  { id: "production-resources", labelKey: "management.productionResources" },
  { id: "scripts", labelKey: "management.scripts" },
  { id: "jobs", labelKey: "management.jobs" },
  { id: "workflows", labelKey: "management.workflows" },
  { id: "runtime-sessions", labelKey: "management.runtimeSessions" },
  { id: "orchestrator-rules", labelKey: "management.orchestratorRules" },
  { id: "hosts", labelKey: "management.hosts" },
  { id: "instances", labelKey: "management.instances" },
  { id: "instance-pools", labelKey: "management.instancePools" }
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error?.message ?? `Request failed: ${path}`);
  }
  return payload.data;
}

async function hostApi<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error?.message ?? `Host Agent request failed: ${path}`);
  }
  return payload.data;
}

function normalizeCategory(category: string) {
  const lower = category.toLowerCase();
  if (lower.includes("post")) return "post";
  if (lower.includes("video")) return "video";
  if (lower.includes("music")) return "music";
  return "image";
}

function applyWorkingAttributes(prompt: string, attributes: Record<string, string>) {
  return Object.entries(attributes).reduce((text, [key, value]) => {
    const display = key === "outfit" && value && !/\b(clothes|outfit|wear|uniform|costume)\b/i.test(value)
      ? `${value} clothes`
      : value;
    return text.split(`{${key}}`).join(display);
  }, prompt);
}

function normalizePromptCategory(category?: string | null) {
  const raw = String(category ?? "").toUpperCase();
  if (raw.includes("IMAGE")) return "IMAGE_EDIT";
  if (raw.includes("VIDEO_COMPOSE") || raw.includes("COMPOSE")) return "VIDEO_COMPOSE";
  if (raw.includes("VIDEO")) return "VIDEO_GENERATE";
  if (raw.includes("MUSIC")) return "MUSIC_GENERATE";
  if (raw.includes("POST")) return "POST_CONTENT";
  return raw || "UTILITY";
}

function detectPromptVariables(text: string) {
  return [...new Set([
    ...Array.from(text.matchAll(/\{\{([^}]+)\}\}/g)).map((match) => `{{${match[1].trim()}}}`),
    ...Array.from(text.matchAll(/\{([a-zA-Z0-9_.-]+)\}/g)).map((match) => `{${match[1].trim()}}`)
  ])].sort();
}

function flattenContext(value: unknown, prefix = ""): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const output: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      Object.assign(output, flattenContext(item, path));
    } else if (Array.isArray(item)) {
      output[path] = item.join(", ");
    } else if (item != null) {
      output[path] = String(item);
    }
  }
  return output;
}

function renderPromptLocally(templateText: string, context: Record<string, unknown>) {
  const flat = flattenContext(context);
  const replaced: string[] = [];
  const missing = new Set<string>();
  let rendered = templateText.replace(/\{\{([^}]+)\}\}/g, (match, expression: string) => {
    const key = expression.trim();
    if (flat[key] != null) {
      replaced.push(match);
      return flat[key];
    }
    missing.add(match);
    return "";
  });
  rendered = rendered.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (match, key: string) => {
    if (flat[key] != null) {
      replaced.push(match);
      return flat[key];
    }
    missing.add(match);
    return match;
  });
  return { rendered, replaced: [...new Set(replaced)], missing: [...missing] };
}

function batchReadyLabel(batch: ProductionBatch) {
  if (batch.status === "READY" && ["AVAILABLE", "REUSABLE"].includes(batch.usageStatus)) return "ready";
  if (batch.usageStatus === "RESERVED") return "reserved";
  return batch.status.toLowerCase();
}

function isLaunchable(batch: ProductionBatch) {
  return ["NEW", "READY"].includes(batch.status) && batch.usageStatus === "AVAILABLE";
}

function displayShortId(id?: string | null) {
  if (!id) return "-";
  return id.length > 10 ? `${id.slice(0, 8)}...` : id;
}

function displayJobInstance(job: OrchestratorJob) {
  const instanceId = job.payload?.instanceId;
  return typeof instanceId === "string" && instanceId ? instanceId : "-";
}

function displayJobAllocationMode(job: OrchestratorJob) {
  const allocationMode = job.payload?.allocationMode;
  return typeof allocationMode === "string" && allocationMode ? allocationMode : "-";
}

function displayJobPool(job: OrchestratorJob, pools: InstancePool[]) {
  const payload = getRecord(job.payload);
  const poolId = getString(payload.poolId);
  const pool = poolId ? pools.find((item) => item.id === poolId) : null;
  if (pool) return `${pool.name} / ${pool.poolType}`;
  return stageTypeToPoolType[job.targetStageType] ?? "-";
}

function adbMappingConfidence(instance?: InstanceRecord | null) {
  const confidence = instance?.metadata?.adbMappingConfidence;
  return typeof confidence === "string" ? confidence : "";
}

function hasUnknownAdbMapping(instance?: InstanceRecord | null) {
  return !instance?.adbId || adbMappingConfidence(instance) === "unknown";
}

function getJobPoolType(job: OrchestratorJob, pools: InstancePool[]) {
  const payload = getRecord(job.payload);
  const poolId = getString(payload.poolId);
  const pool = poolId ? pools.find((item) => item.id === poolId) : null;
  return pool?.poolType ?? stageTypeToPoolType[job.targetStageType] ?? "";
}

function displayDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function groupTimestampParts(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return { date: `${yy}${mm}${dd}`, time: `${hh}${mi}` };
}

function defaultGroupDraft() {
  const stamp = groupTimestampParts();
  return {
    name: `Nhóm ${stamp.date} ${stamp.time}`,
    description: `Nhóm tạo ngày ${stamp.date} vào lúc ${stamp.time}`,
    status: "draft"
  };
}

function getRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function getString(value: unknown) {
  return typeof value === "string" && value ? value : "";
}

function mediaUrl(value?: string | null) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/")) return `${API_BASE.replace(/\/+$/, "")}${value}`;
  return value;
}

function listImageUrl(asset?: AssetRecord | null) {
  return mediaUrl(asset?.thumbnailPublicUrl);
}

function originalImageUrl(asset?: AssetRecord | null) {
  return mediaUrl(asset?.publicUrl || asset?.previewUrl || asset?.thumbnailPublicUrl);
}

function thumbnailPairUrl(asset?: AssetRecord | null, fallback?: string | null) {
  return mediaUrl(asset?.thumbnailPublicUrl || fallback);
}

function groupReadinessClass(readiness?: GroupReadiness) {
  const code = readiness?.code ?? "";
  if (code === "READY") return "ready";
  if (code === "MISSING_IMAGES") return "warning";
  if (code === "MISSING_ATTRIBUTES") return "muted";
  return "danger";
}

function getJobWorkflowRunId(job?: OrchestratorJob | null) {
  const payload = getRecord(job?.payload);
  const output = getRecord(job?.output);
  return getString(payload.workflowRunId) || getString(output.workflowRunId);
}

function getOutputBatchIds(job?: OrchestratorJob | null) {
  if (!job) return new Set<string>();
  const payload = getRecord(job.payload);
  const output = getRecord(job.output);
  return new Set([
    getString(payload.outputBatchId),
    getString(output.outputBatchId)
  ].filter(Boolean));
}

function batchMatchesJob(batch: ProductionBatch, job?: OrchestratorJob | null) {
  if (!job) return false;
  const metadata = getRecord(batch.metadata);
  const outputBatchIds = getOutputBatchIds(job);
  const workflowRunId = getJobWorkflowRunId(job);
  return outputBatchIds.has(batch.id)
    || getString(metadata.sourceJobId) === job.id
    || Boolean(workflowRunId && getString(metadata.workflowRunId) === workflowRunId)
    || Boolean(workflowRunId && getString(metadata.sourceWorkflowRunId) === workflowRunId);
}

function compactJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function findUrl(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["screenshotUrl", "publicUrl", "url"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate) return candidate;
  }
  for (const item of Object.values(record)) {
    const nested = findUrl(item);
    if (nested) return nested;
  }
  return "";
}

function parseJsonText(value: string, fallback: Record<string, unknown> = {}) {
  try {
    return JSON.parse(value || "{}") as Record<string, unknown>;
  } catch {
    return fallback;
  }
}

function fileToImportFile(file: File): Promise<CharacterImportFile> {
  return new Promise((resolve) => {
    const base = {
      fileName: file.name,
      mimeType: file.type,
      size: file.size
    };
    const reader = new FileReader();
    reader.onload = () => resolve({
      ...base,
      dataUrl: typeof reader.result === "string" ? reader.result : undefined
    });
    reader.onerror = () => resolve(base);
    reader.readAsDataURL(file);
  });
}

function characterImportMetadataOnly(file: CharacterImportFile): CharacterImportFile {
  return {
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size
  };
}

function characterImportUploadPayload(file: CharacterImportFile): CharacterImportFile {
  const publicUrl = file.publicUrl?.startsWith("blob:") ? undefined : file.publicUrl;
  return {
    ...file,
    publicUrl
  };
}

function postContentMetadata(batch: ProductionBatch) {
  const metadata = getRecord(batch.metadata);
  const hashtags = Array.isArray(metadata.hashtags)
    ? metadata.hashtags.map((item) => String(item)).filter(Boolean)
    : [];
  return {
    caption: getString(metadata.caption),
    postText: getString(metadata.postText),
    hashtags,
    title: getString(metadata.title),
    cta: getString(metadata.cta),
    platform: getString(metadata.platform) || "facebook"
  };
}

function musicTrackMetadata(batch: ProductionBatch) {
  const metadata = getRecord(batch.metadata);
  const attributes = getRecord(batch.attributes);
  const tagsValue = metadata.tags ?? attributes.tags;
  const tags = Array.isArray(tagsValue) ? tagsValue.map((item) => String(item)).filter(Boolean) : [];
  return {
    mood: getString(metadata.mood) || getString(attributes.mood),
    tempo: getString(metadata.tempo) || getString(attributes.tempo),
    style: getString(metadata.style) || getString(attributes.style),
    scene: getString(metadata.scene) || getString(attributes.scene),
    emotion: getString(metadata.emotion) || getString(attributes.emotion),
    tags
  };
}

function instanceCapabilityLabels(instance: InstanceRecord) {
  const capabilities = instance.capabilities ?? {};
  const canRun = Array.isArray(capabilities.canRun) ? capabilities.canRun : [];
  const apps = Array.isArray(capabilities.apps) ? capabilities.apps : [];
  return [
    ...canRun.filter((item): item is string => typeof item === "string" && Boolean(item)),
    ...apps.filter((item): item is string => typeof item === "string" && Boolean(item)),
    capabilities.supportsUpload ? "upload" : "",
    capabilities.supportsDownload ? "download" : ""
  ].filter(Boolean);
}

function findJobError(job?: OrchestratorJob | null, runtimeSession?: RuntimeSession | null, scriptRun?: ScriptRun | null) {
  const jobOutput = getRecord(job?.output);
  const jobPayload = getRecord(job?.payload);
  const scriptFailure = scriptRun?.steps?.find((step) => step.status === "FAILED" && step.errorMessage);
  const runtimeFailure = runtimeSession?.steps?.find((step) => step.status === "FAILED" && step.errorMessage);
  return getString(jobOutput.errorMessage)
    || getString(jobOutput.error)
    || getString(jobPayload.errorMessage)
    || scriptFailure?.errorMessage
    || runtimeFailure?.errorMessage
    || "";
}

function AdminSimpleList({ items, search }: { items: Array<Record<string, unknown>>; search: string }) {
  const lower = search.toLowerCase();
  return (
    <div className="adminTable">
      {items
        .filter((item) => compactJson(item).toLowerCase().includes(lower))
        .slice(0, 20)
        .map((item) => (
          <div className="adminRow" key={String(item.id ?? compactJson(item))}>
            <b>{String(item.name ?? item.id ?? "item")}</b>
            <span>{String(item.status ?? item.category ?? item.batchType ?? "")}</span>
            <small>{displayShortId(String(item.id ?? ""))}</small>
            <pre>{compactJson(item)}</pre>
          </div>
        ))}
    </div>
  );
}

function AdminJobsPanel({
  jobs,
  pools,
  busy,
  runJobAction,
  search
}: {
  jobs: OrchestratorJob[];
  pools: InstancePool[];
  busy: boolean;
  runJobAction: (job: OrchestratorJob, action: "allocate" | "execute-mock" | "execute-image-edit" | "start" | "complete" | "fail") => void;
  search: string;
}) {
  return (
    <div className="adminTable">
      {jobs.filter((job) => compactJson(job).toLowerCase().includes(search.toLowerCase())).slice(0, 20).map((job) => (
        <div className="adminRow" key={job.id}>
          <b>{job.targetStageType}</b><span>{job.status}</span><span>{displayJobPool(job, pools)}</span><small>{job.id}</small>
          <pre>{compactJson(job.payload)}</pre>
          <div className="controlActions">
            {(["allocate", "execute-mock", "execute-image-edit", "start", "complete", "fail"] as const).map((action) => (
              <button key={action} disabled={busy} onClick={() => runJobAction(job, action)}>{action}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminRuntimePanel({
  sessions,
  scriptRuns,
  busy,
  selectRuntimeSession,
  runtimeAction,
  search
}: {
  sessions: RuntimeSession[];
  scriptRuns: ScriptRun[];
  busy: boolean;
  selectRuntimeSession: (session: RuntimeSession) => void;
  runtimeAction: (action: "test-screenshot" | "recover" | "mark-unrecoverable") => void;
  search: string;
}) {
  return (
    <div className="adminTable">
      {sessions.filter((session) => compactJson(session).toLowerCase().includes(search.toLowerCase())).slice(0, 20).map((session) => (
        <div className="adminRow" key={session.id}>
          <b>{session.status}</b><span>{session.hostId ?? "-"}</span><span>{session.instanceId ?? "-"}</span><small>{session.id}</small>
          <pre>{compactJson(session.checkpoint)}</pre>
          <div className="controlActions">
            <button disabled={busy} onClick={() => selectRuntimeSession(session)}>View Timeline</button>
            <button disabled={busy} onClick={() => runtimeAction("test-screenshot")}>Test Screenshot</button>
            <button disabled={busy || session.status !== "FAILED_RECOVERABLE"} onClick={() => runtimeAction("recover")}>Recover</button>
            <button disabled={busy} onClick={() => runtimeAction("mark-unrecoverable")}>Mark Unrecoverable</button>
          </div>
          {scriptRuns.filter((run) => run.runtimeSessionId === session.id).map((run) => <small key={run.id}>Script run {run.id} / {run.status}</small>)}
        </div>
      ))}
    </div>
  );
}

export function App() {
  const [page, setPage] = useState<AppPage>("control-center");
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const saved = window.localStorage.getItem("fbcm-language");
    return saved === "vi" || saved === "en" ? saved : "en";
  });
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [groups, setGroups] = useState<CharacterGroup[]>([]);
  const [attributes, setAttributes] = useState<GroupAttribute[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRunRecord[]>([]);
  const [pools, setPools] = useState<InstancePool[]>([]);
  const [instances, setInstances] = useState<InstanceRecord[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [jobs, setJobs] = useState<OrchestratorJob[]>([]);
  const [runtimeSessions, setRuntimeSessions] = useState<RuntimeSession[]>([]);
  const [scriptRuns, setScriptRuns] = useState<ScriptRun[]>([]);
  const [scriptVersions, setScriptVersions] = useState<ScriptVersionRecord[]>([]);
  const [launchedJobs, setLaunchedJobs] = useState<OrchestratorJob[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({
    scene: "street",
    emotion: "happy",
    outfit: "sport"
  });
  const [musicPolicyMode, setMusicPolicyMode] = useState("RANDOM_LIBRARY");
  const [musicMatchAttributes, setMusicMatchAttributes] = useState<string[]>(["mood", "tempo", "emotion"]);
  const [promptSelections, setPromptSelections] = useState<PromptSelections>({
    image: "",
    video: "",
    music: ""
  });
  const [previews, setPreviews] = useState<PromptPreviews>({
    image: "",
    video: "",
    music: ""
  });
  const [selectedJobId, setSelectedJobId] = useState("");
  const [runtimeSession, setRuntimeSession] = useState<RuntimeSession | null>(null);
  const [scriptRun, setScriptRun] = useState<ScriptRun | null>(null);
  const [outputBatch, setOutputBatch] = useState<ProductionBatch | null>(null);
  const [jobDetailError, setJobDetailError] = useState("");
  const [jobDetailLoading, setJobDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [poolFilter, setPoolFilter] = useState("");
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState(10);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedRuntimeId, setSelectedRuntimeId] = useState("");
  const [selectedHostId, setSelectedHostId] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [debugOpen, setDebugOpen] = useState(true);
  const [hostAdbId, setHostAdbId] = useState("");
  const [hostInstanceId, setHostInstanceId] = useState("");
  const [hostSendText, setHostSendText] = useState("hello");
  const [hostResult, setHostResult] = useState<unknown>(null);
  const [adbDevices, setAdbDevices] = useState<AdbDevice[]>([]);
  const [managementSection, setManagementSection] = useState<ManagementSection>("characters");
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [orchestratorRules, setOrchestratorRules] = useState<OrchestratorRule[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [selectedHostDrawerId, setSelectedHostDrawerId] = useState("");
  const [poolModalInstanceId, setPoolModalInstanceId] = useState("");
  const [selectedPoolMemberships, setSelectedPoolMemberships] = useState<string[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [selectedWorkflowRunId, setSelectedWorkflowRunId] = useState("");
  const [capacityForm, setCapacityForm] = useState<CapacityConfig>({
    IMAGE_EDIT: 0,
    VIDEO_GENERATE: 0,
    MUSIC_GENERATE: 0,
    VIDEO_COMPOSE: 0,
    POST_CONTENT: 0
  });
  const [workflowTemplateJson, setWorkflowTemplateJson] = useState({
    resourceRules: "[]",
    scriptMapping: "{}",
    promptMapping: "{}",
    musicPolicy: "{}",
    postContentPolicy: "{}"
  });
  const [capacityResult, setCapacityResult] = useState<WorkflowCapacityResponse | null>(null);
  const [instancePoolStateFilter, setInstancePoolStateFilter] = useState("");
  const [instanceCapabilityFilter, setInstanceCapabilityFilter] = useState("");
  const [instanceRuntimeFilter, setInstanceRuntimeFilter] = useState("");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [selectedScriptVersionId, setSelectedScriptVersionId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedPromptCategory, setSelectedPromptCategory] = useState("IMAGE_EDIT");
  const [promptStatusFilter, setPromptStatusFilter] = useState("");
  const [promptHasVariableFilter, setPromptHasVariableFilter] = useState("");
  const [promptRecentFilter, setPromptRecentFilter] = useState("");
  const [promptDrawerTab, setPromptDrawerTab] = useState<"overview" | "versions" | "editor" | "preview">("overview");
  const [promptDetail, setPromptDetail] = useState<PromptTemplate | null>(null);
  const [promptEditorText, setPromptEditorText] = useState("");
  const [promptPreviewContext, setPromptPreviewContext] = useState(JSON.stringify({
    group: { name: "Ballroom Icons", size: 2 },
    character: { name: "Merle Oberon", status: "rip", age: 68 },
    scene: "ballroom",
    emotion: "nostalgic",
    outfit: "formal",
    mood: "romantic",
    style: "classic cinema",
    tempo: "slow",
    batch: { id: "pb_sample" },
    asset: { publicUrl: "https://example.com/source.png" },
    finalVideo: { title: "A Nostalgic Ballroom Reveal" },
    prompt: { image: "image prompt", video: "video prompt", music: "music prompt", post: "post prompt" }
  }, null, 2));
  const [promptPreviewResult, setPromptPreviewResult] = useState<{ rendered: string; replaced: string[]; missing: string[] }>({ rendered: "", replaced: [], missing: [] });
  const [showPromptCreateModal, setShowPromptCreateModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [assetTab, setAssetTab] = useState("CHARACTER_IMAGE");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetTagFilter, setAssetTagFilter] = useState("");
  const [assetAttributeFilter, setAssetAttributeFilter] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetForm, setAssetForm] = useState({
    name: "",
    assetCategory: "CHARACTER_IMAGE",
    assetSubType: "YOUNG_ORIGINAL_IMAGE",
    mediaType: "image",
    groupId: "",
    characterId: "",
    publicUrl: "",
    filePath: "",
    tags: "",
    attributes: "{}",
    metadata: "{}",
    sourceAssetId: "",
    usageStatus: "available",
    usagePolicy: "reusable",
    qualityStatus: "draft"
  });
  const [characterImportMode, setCharacterImportMode] = useState<"pair" | "bulk">("pair");
  const [characterImportFiles, setCharacterImportFiles] = useState<CharacterImportFile[]>([]);
  const [characterImportPreview, setCharacterImportPreview] = useState<CharacterImportPairPreview[]>([]);
  const [characterImportResult, setCharacterImportResult] = useState<CharacterImportResult | null>(null);
  const [createCharacterGroupCandidates, setCreateCharacterGroupCandidates] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [characterDetail, setCharacterDetail] = useState<CharacterDetail | null>(null);
  const [characterFilters, setCharacterFilters] = useState({
    status: "",
    ageMin: "",
    ageMax: "",
    hasYoung: false,
    hasOld: false,
    groupState: "",
    tag: ""
  });
  const [characterForm, setCharacterForm] = useState({
    name: "",
    status: "alive",
    age: "",
    metadata: "{}"
  });
  const [adminSearch, setAdminSearch] = useState("");
  const [adminJson, setAdminJson] = useState("{}");
  const [hostForm, setHostForm] = useState({ hostId: "", name: "", baseUrl: "http://localhost:3300", apiKey: "", status: "active" });
  const [poolForm, setPoolForm] = useState({ name: "", poolType: "IMAGE_EDIT", status: "active" });
  const [memberForm, setMemberForm] = useState({ instanceId: "", priority: "100", status: "ACTIVE", metadata: "{\n  \"hostId\": \"\",\n  \"localId\": \"\",\n  \"adbId\": \"\"\n}" });
  const [scriptForm, setScriptForm] = useState({
    name: "",
    category: "IMAGE_EDIT",
    description: "",
    status: "active",
    steps: "{\n  \"steps\": [\n    { \"type\": \"wait\", \"config\": { \"ms\": 500 } },\n    { \"type\": \"screenshot\", \"config\": {} },\n    { \"type\": \"send-text\", \"config\": { \"text\": \"{{prompt.image}}\" } }\n  ]\n}"
  });
  const [templateForm, setTemplateForm] = useState({ name: "", category: "IMAGE_EDIT", description: "", status: "active", templateText: "Transform into a {scene} scene." });
  const [groupForm, setGroupForm] = useState({ name: "", description: "", status: "active", characterId: "", role: "member", attributeId: "", customValue: "" });
  const [groupFilters, setGroupFilters] = useState({
    status: "",
    size: "",
    customSize: "",
    missingImages: false,
    hasAttributes: false,
    productionUse: "",
    recent: false,
    characterSearch: "",
    characterStatus: "",
    ageMin: "",
    ageMax: "",
    hasYoung: false,
    hasOld: false,
    notSelected: false
  });
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<CharacterGroupDetail | null>(null);
  const [groupDrawerTab, setGroupDrawerTab] = useState<"overview" | "members" | "attributes" | "history" | "debug">("overview");
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [groupCreateMemberIds, setGroupCreateMemberIds] = useState<string[]>([]);
  const [groupCreateSize, setGroupCreateSize] = useState("5");
  const [groupCreateMode, setGroupCreateMode] = useState<"manual" | "partial-random" | "random">("manual");
  const [draggedGroupMemberId, setDraggedGroupMemberId] = useState("");
  const [batchForm, setBatchForm] = useState({ batchType: "IMAGE_BATCH", status: "NEW", usageStatus: "AVAILABLE", metadata: "{}" });
  const [ruleForm, setRuleForm] = useState({ name: "", triggerBatchType: "IMAGE_BATCH", triggerStatus: "READY", targetStageType: "VIDEO_GENERATE", priority: "100", config: "{}" });
  const [status, setStatus] = useState("Loading studio data");
  const [busy, setBusy] = useState(false);

  const selectedPrimaryGroup = selectedGroups[0] ?? "";
  const t = useCallback((key: string) => translations[language][key] ?? translations.en[key] ?? key, [language]);
  const pageTitle = page === "control-center"
    ? t("app.controlCenter")
    : page === "production-jobs"
      ? t("app.productionJobs")
      : page === "asset-center"
        ? t("app.assetCenter")
        : page === "management"
          ? t("app.management")
          : t("app.productionStudio");
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );
  const jobStatusOptions = useMemo(() => [...new Set(jobs.map((job) => job.status))].sort(), [jobs]);
  const jobStageOptions = useMemo(() => [...new Set(jobs.map((job) => job.targetStageType))].sort(), [jobs]);
  const poolTypeOptions = useMemo(() => {
    const fromJobs = jobs.map((job) => getJobPoolType(job, pools)).filter(Boolean);
    const fromPools = pools.map((pool) => pool.poolType).filter(Boolean);
    return [...new Set([...fromJobs, ...fromPools])].sort();
  }, [jobs, pools]);
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const poolType = getJobPoolType(job, pools);
      return (!statusFilter || job.status === statusFilter)
        && (!stageFilter || job.targetStageType === stageFilter)
        && (!poolFilter || poolType === poolFilter);
    });
  }, [jobs, poolFilter, pools, stageFilter, statusFilter]);
  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / jobsPageSize));
  const paginatedJobs = useMemo(() => {
    const start = (Math.min(jobsPage, totalJobPages) - 1) * jobsPageSize;
    return filteredJobs.slice(start, start + jobsPageSize);
  }, [filteredJobs, jobsPage, jobsPageSize, totalJobPages]);
  const outputBatches = useMemo(
    () => batches.filter((batch) => batchMatchesJob(batch, selectedJob)),
    [batches, selectedJob]
  );
  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  );
  const selectedRuntime = useMemo(
    () => (runtimeSession?.id === selectedRuntimeId ? runtimeSession : null)
      ?? runtimeSessions.find((session) => session.id === selectedRuntimeId)
      ?? null,
    [runtimeSession, runtimeSessions, selectedRuntimeId]
  );
  const selectedInstance = useMemo(
    () => instances.find((instance) => instance.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId]
  );
  const selectedScriptRun = useMemo(
    () => scriptRun ?? scriptRuns.find((run) => run.runtimeSessionId === selectedRuntime?.id) ?? null,
    [scriptRun, scriptRuns, selectedRuntime]
  );
  const selectedScript = useMemo(
    () => scripts.find((script) => script.id === selectedScriptId) ?? null,
    [scripts, selectedScriptId]
  );
  const latestSelectedScriptRuns = useMemo(
    () => scriptRuns.filter((run) => !selectedScriptId || run.scriptId === selectedScriptId).slice(0, 8),
    [scriptRuns, selectedScriptId]
  );
  const selectedHost = useMemo(
    () => hosts.find((host) => host.id === selectedHostId || host.hostId === selectedHostId) ?? hosts[0] ?? null,
    [hosts, selectedHostId]
  );
  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0] ?? null,
    [selectedWorkflowId, workflows]
  );
  const selectedWorkflowRun = useMemo(
    () => workflowRuns.find((run) => run.id === selectedWorkflowRunId) ?? workflowRuns.find((run) => run.workflowId === selectedWorkflow?.id) ?? null,
    [selectedWorkflow, selectedWorkflowRunId, workflowRuns]
  );
  const instanceCapabilityOptions = useMemo(() => {
    return [...new Set(instances.flatMap((instance) => instanceCapabilityLabels(instance)))].sort();
  }, [instances]);
  const instanceRuntimeOptions = useMemo(() => {
    return [...new Set(instances.map((instance) => instance.runtimeStatus).filter(Boolean))].sort();
  }, [instances]);
  const filteredInstances = useMemo(() => {
    const lowerSearch = adminSearch.toLowerCase();
    return instances.filter((instance) => {
      const capabilityLabels = instanceCapabilityLabels(instance);
      return (!selectedHostId || instance.hostId === selectedHostId)
        && (!instancePoolStateFilter || instance.currentPoolType === instancePoolStateFilter)
        && (!instanceCapabilityFilter || capabilityLabels.includes(instanceCapabilityFilter))
        && (!instanceRuntimeFilter || instance.runtimeStatus === instanceRuntimeFilter)
        && compactJson(instance).toLowerCase().includes(lowerSearch);
    });
  }, [adminSearch, instanceCapabilityFilter, instancePoolStateFilter, instanceRuntimeFilter, instances, selectedHostId]);
  const kpis = useMemo(() => ({
    availableInstances: instances.filter((instance) => (instance.currentPoolType ?? "AVAILABLE") === "AVAILABLE").length,
    standbyInstances: instances.filter((instance) => instance.currentPoolType === "STANDBY").length,
    workflowInstances: instances.filter((instance) => instance.currentPoolType === "WORKFLOW").length,
    maintenanceInstances: instances.filter((instance) => instance.currentPoolType === "MAINTENANCE").length,
    disabledInstances: instances.filter((instance) => instance.currentPoolType === "DISABLED").length,
    readyBatches: batches.filter((batch) => batch.status === "READY" && ["AVAILABLE", "REUSABLE"].includes(batch.usageStatus)).length,
    pendingJobs: jobs.filter((job) => job.status === "PENDING").length,
    runningJobs: jobs.filter((job) => job.status === "RUNNING").length,
    failedRecoverableSessions: runtimeSessions.filter((session) => session.status === "FAILED_RECOVERABLE").length,
    finalVideoCount: batches.filter((batch) => batch.batchType === "FINAL_VIDEO").length,
    postContentCount: batches.filter((batch) => batch.batchType === "POST_CONTENT").length
  }), [batches, instances, jobs, runtimeSessions]);
  const pipelineColumns = useMemo(() => productionBatchTypeOptions.map((batchType) => ({
    batchType,
    items: batches.filter((batch) => batch.batchType === batchType)
  })), [batches]);
  const instanceColumns = useMemo(() => instancePoolStateOptions.map((poolType) => ({
    poolType,
    items: instances.filter((instance) => (instance.currentPoolType ?? "AVAILABLE") === poolType)
  })), [instances]);
  const jobColumns = useMemo(() => jobBoardStatusOptions.map((statusName) => ({
    status: statusName,
    items: jobs.filter((job) => job.status === statusName)
  })), [jobs]);
  const selectedBatchJobs = useMemo(
    () => selectedBatch ? jobs.filter((job) => job.sourceBatchId === selectedBatch.id) : [],
    [jobs, selectedBatch]
  );
  const selectedJobRuntime = useMemo(
    () => selectedJob ? runtimeSessions.find((session) => session.jobId === selectedJob.id) ?? null : null,
    [runtimeSessions, selectedJob]
  );
  const selectedRuntimeScriptRuns = useMemo(
    () => selectedRuntime ? scriptRuns.filter((run) => run.runtimeSessionId === selectedRuntime.id) : [],
    [scriptRuns, selectedRuntime]
  );
  const selectedBatchLineage = useMemo(() => {
    if (!selectedBatch) return [];
    const directJobs = jobs.filter((job) => job.sourceBatchId === selectedBatch.id);
    return batches.filter((batch) => directJobs.some((job) => batchMatchesJob(batch, job)));
  }, [batches, jobs, selectedBatch]);
  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );
  const assetTagOptions = useMemo(
    () => [...new Set(assets.flatMap((asset) => asset.tags ?? []))].sort(),
    [assets]
  );
  const assetAttributeOptions = useMemo(
    () => [...new Set(assets.flatMap((asset) => Object.keys(asset.attributes ?? {})))].sort(),
    [assets]
  );
  const filteredAssets = useMemo(() => {
    const search = assetSearch.toLowerCase();
    return assets.filter((asset) => {
      const haystack = compactJson(asset).toLowerCase();
      return (asset.assetCategory ?? asset.assetType) === assetTab
        && (!assetSearch || haystack.includes(search))
        && (!assetTagFilter || (asset.tags ?? []).includes(assetTagFilter))
        && (!assetAttributeFilter || Object.keys(asset.attributes ?? {}).includes(assetAttributeFilter));
    });
  }, [assetAttributeFilter, assetSearch, assetTab, assetTagFilter, assets]);
  const selectedAssetVersions = useMemo(
    () => selectedAsset ? assets.filter((asset) => (asset.versionGroupId ?? asset.id) === (selectedAsset.versionGroupId ?? selectedAsset.id)) : [],
    [assets, selectedAsset]
  );
  const selectedAssetLineage = useMemo(
    () => selectedAsset
      ? assets.filter((asset) => asset.sourceAssetId === selectedAsset.id || asset.id === selectedAsset.sourceAssetId)
      : [],
    [assets, selectedAsset]
  );
  const characterTagOptions = useMemo(
    () => [...new Set(characters.flatMap((character) => character.tags ?? []))].sort(),
    [characters]
  );
  const filteredCharacters = useMemo(() => {
    const search = adminSearch.toLowerCase();
    return characters.filter((character) => {
      const statusValue = String(character.status ?? "").toLowerCase();
      const hasYoung = Boolean(character.sourceImages?.youngOriginalImage);
      const hasOld = Boolean(character.sourceImages?.oldOriginalImage);
      const age = Number(character.age ?? 0);
      return (!adminSearch || compactJson(character).toLowerCase().includes(search))
        && (!characterFilters.status || statusValue === characterFilters.status)
        && (!characterFilters.ageMin || age >= Number(characterFilters.ageMin))
        && (!characterFilters.ageMax || age <= Number(characterFilters.ageMax))
        && (!characterFilters.hasYoung || hasYoung)
        && (!characterFilters.hasOld || hasOld)
        && (!characterFilters.groupState || (characterFilters.groupState === "in-group" ? Number(character.groupCount ?? 0) > 0 : Number(character.groupCount ?? 0) === 0))
        && (!characterFilters.tag || (character.tags ?? []).includes(characterFilters.tag));
    });
  }, [adminSearch, characterFilters, characters]);
  const filteredGroupCards = useMemo(() => {
    const search = adminSearch.toLowerCase();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
    return groups.filter((group) => {
      const size = Number(group.memberCount ?? 0);
      const targetSize = groupFilters.size === "custom" ? Number(groupFilters.customSize || 0) : Number(groupFilters.size || 0);
      const updatedAt = group.updatedAt ? new Date(group.updatedAt).getTime() : 0;
      return (!adminSearch || `${group.name} ${group.description ?? ""} ${group.attributesSummary ?? ""}`.toLowerCase().includes(search))
        && (!groupFilters.status || String(group.status ?? "").toLowerCase() === groupFilters.status)
        && (!targetSize || size === targetSize)
        && (!groupFilters.missingImages || group.readiness?.code === "MISSING_IMAGES")
        && (!groupFilters.hasAttributes || Boolean(group.attributesSummary))
        && (!groupFilters.productionUse || (groupFilters.productionUse === "used" ? Number(group.productionBatchCount ?? 0) > 0 : Number(group.productionBatchCount ?? 0) === 0))
        && (!groupFilters.recent || updatedAt >= recentCutoff);
    });
  }, [adminSearch, groupFilters, groups]);
  const groupKpis = useMemo(() => {
    const totalMembers = groups.reduce((sum, group) => sum + Number(group.memberCount ?? 0), 0);
    return {
      total: groups.length,
      active: groups.filter((group) => String(group.status ?? "").toLowerCase() === "active").length,
      averageSize: groups.length ? Math.round((totalMembers / groups.length) * 10) / 10 : 0,
      ready: groups.filter((group) => group.readiness?.code === "READY").length,
      missingImages: groups.filter((group) => group.readiness?.code === "MISSING_IMAGES").length
    };
  }, [groups]);
  const groupPickerCharacters = useMemo(() => {
    const search = groupFilters.characterSearch.toLowerCase();
    const selected = new Set(groupCreateMemberIds);
    return characters.filter((character) => {
      const statusValue = String(character.status ?? "").toLowerCase();
      const age = Number(character.age ?? 0);
      const hasYoung = Boolean(character.sourceImages?.youngOriginalImage);
      const hasOld = Boolean(character.sourceImages?.oldOriginalImage);
      return (!search || String(character.name ?? "").toLowerCase().includes(search))
        && (!groupFilters.characterStatus || statusValue === groupFilters.characterStatus)
        && (!groupFilters.ageMin || age >= Number(groupFilters.ageMin))
        && (!groupFilters.ageMax || age <= Number(groupFilters.ageMax))
        && (!groupFilters.hasYoung || hasYoung)
        && (!groupFilters.hasOld || hasOld)
        && (!groupFilters.notSelected || !selected.has(character.id));
    });
  }, [characters, groupCreateMemberIds, groupFilters]);
  const promptCards = useMemo(() => templates.map((template) => {
    const versions = template.versions ?? [];
    const activeVersion = template.activeVersion ?? versions.find((version) => version.status === "active") ?? versions[0] ?? null;
    const templateText = activeVersion?.templateText ?? "";
    return {
      ...template,
      normalizedCategory: normalizePromptCategory(template.category),
      versions,
      activeVersion,
      variables: detectPromptVariables(templateText),
      preview: templateText.split(/\r?\n/).slice(0, 3).join("\n")
    };
  }), [templates]);
  const promptCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(promptCategoryOptions.map((category) => [category, 0]));
    for (const card of promptCards) counts[card.normalizedCategory] = (counts[card.normalizedCategory] ?? 0) + 1;
    return counts;
  }, [promptCards]);
  const filteredPromptCards = useMemo(() => {
    const search = adminSearch.toLowerCase();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
    return promptCards.filter((card) => {
      const haystack = `${card.name} ${card.description ?? ""} ${card.preview}`.toLowerCase();
      const updatedAt = card.updatedAt ? new Date(card.updatedAt).getTime() : 0;
      return (!selectedPromptCategory || card.normalizedCategory === selectedPromptCategory)
        && (!adminSearch || haystack.includes(search))
        && (!promptStatusFilter || card.status === promptStatusFilter)
        && (!promptHasVariableFilter || (promptHasVariableFilter === "yes" ? card.variables.length > 0 : card.variables.length === 0))
        && (!promptRecentFilter || updatedAt >= recentCutoff);
    });
  }, [adminSearch, promptCards, promptHasVariableFilter, promptRecentFilter, promptStatusFilter, selectedPromptCategory]);

  const loadData = useCallback(async () => {
    setStatus("Loading studio data");
    const [
      characterData,
      groupData,
      attributeData,
      templateData,
      hostData,
      workflowData,
      workflowRunData,
      instanceData,
      poolData,
      batchData,
      assetData,
      assetCategoryData,
      jobData,
      sessionData,
      scriptRunData,
      scriptData,
      ruleData
    ] = await Promise.all([
      api<CharacterRecord[]>("/characters"),
      api<CharacterGroup[]>("/character-groups"),
      api<GroupAttribute[]>("/group-attributes"),
      api<PromptTemplate[]>("/prompt-templates"),
      api<HostRecord[]>("/hosts"),
      api<WorkflowRecord[]>("/workflows"),
      api<WorkflowRunRecord[]>("/workflow-runs"),
      api<InstanceRecord[]>("/instances"),
      api<InstancePool[]>("/instance-pools"),
      api<ProductionBatch[]>("/production-batches"),
      api<AssetRecord[]>("/assets"),
      api<AssetCategory[]>("/assets/categories"),
      api<OrchestratorJob[]>("/orchestrator/jobs"),
      api<RuntimeSession[]>("/runtime-sessions"),
      api<ScriptRun[]>("/script-runs"),
      api<ScriptRecord[]>("/scripts"),
      api<OrchestratorRule[]>("/orchestrator/rules")
    ]);

    setCharacters(characterData);
    setGroups(groupData);
    setAttributes(attributeData);
    setTemplates(templateData);
    setHosts(hostData);
    setWorkflows(workflowData);
    setWorkflowRuns(workflowRunData);
    setInstances(instanceData);
    const poolDetails = await Promise.all(poolData.map((pool) =>
      api<InstancePool>(`/instance-pools/${pool.id}`).catch(() => pool)
    ));

    setPools(poolDetails);
    setBatches(batchData);
    setAssets(assetData);
    setAssetCategories(assetCategoryData);
    setJobs(jobData);
    setRuntimeSessions(sessionData);
    setScriptRuns(scriptRunData);
    setScripts(scriptData);
    setOrchestratorRules(ruleData);
    setSelectedGroups((current) => current.length ? current : groupData[0] ? [groupData[0].id] : []);
    setSelectedHostId((current) => current || hostData[0]?.id || "");
    setSelectedWorkflowId((current) => current || workflowData[0]?.id || "");
    setSelectedWorkflowRunId((current) => current || workflowRunData[0]?.id || "");
    setSelectedInstanceId((current) => current || instanceData[0]?.id || "");
    setSelectedPoolId((current) => current || poolDetails[0]?.id || "");
    setSelectedScriptId((current) => current || scriptData[0]?.id || "");
    setSelectedTemplateId((current) => current || templateData[0]?.id || "");
    setSelectedGroupId((current) => current || groupData[0]?.id || "");
    setSelectedAssetId((current) => current || assetData[0]?.id || "");
    setSelectedCharacterId((current) => current || characterData[0]?.id || "");

    const nextSelections = { image: "", video: "", music: "" };
    for (const template of templateData) {
      const kind = normalizeCategory(template.category);
      if (!["image", "video", "music"].includes(kind)) continue;
      const promptKind = kind as PromptKind;
      if (!nextSelections[promptKind]) nextSelections[promptKind] = template.id;
    }
    setPromptSelections((current) => ({
      image: current.image || nextSelections.image,
      video: current.video || nextSelections.video,
      music: current.music || nextSelections.music
    }));
    setStatus("Studio ready");
  }, []);

  useEffect(() => {
    loadData().catch((error) => setStatus(error instanceof Error ? error.message : "Could not load studio"));
  }, [loadData]);

  useEffect(() => {
    window.localStorage.setItem("fbcm-language", language);
  }, [language]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      refreshQueue().catch((error) => setStatus(error instanceof Error ? error.message : "Auto refresh failed"));
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoRefresh]);

  useEffect(() => {
    if (!selectedJobId && jobs[0]) {
      loadJobDetail(jobs[0]).catch((error) =>
        setJobDetailError(error instanceof Error ? error.message : "Could not load job detail")
      );
    }
  }, [jobs, selectedJobId]);

  useEffect(() => {
    setJobsPage(1);
  }, [jobsPageSize, poolFilter, stageFilter, statusFilter]);

  useEffect(() => {
    if (jobsPage > totalJobPages) setJobsPage(totalJobPages);
  }, [jobsPage, totalJobPages]);

  useEffect(() => {
    if (!selectedScriptId) {
      setScriptVersions([]);
      setSelectedScriptVersionId("");
      return;
    }
    api<ScriptVersionRecord[]>(`/scripts/${selectedScriptId}/versions`)
      .then((versions) => {
        setScriptVersions(versions);
        setSelectedScriptVersionId((current) => current || versions[0]?.id || "");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load script versions"));
  }, [selectedScriptId]);

  useEffect(() => {
    const config = selectedWorkflowRun?.capacityConfig && Object.values(selectedWorkflowRun.capacityConfig).some((value) => Number(value) > 0)
      ? selectedWorkflowRun.capacityConfig
      : selectedWorkflow?.capacityConfig ?? {};
    setCapacityForm((current) => ({
      ...current,
      ...Object.fromEntries(capacityStageOptions.map((stageType) => [stageType, Number(config[stageType] ?? 0)]))
    }));
  }, [selectedWorkflow, selectedWorkflowRun]);

  useEffect(() => {
    setWorkflowTemplateJson({
      resourceRules: JSON.stringify(selectedWorkflow?.resourceRules ?? [], null, 2),
      scriptMapping: JSON.stringify(selectedWorkflow?.scriptMapping ?? {}, null, 2),
      promptMapping: JSON.stringify(selectedWorkflow?.promptMapping ?? {}, null, 2),
      musicPolicy: JSON.stringify(selectedWorkflow?.musicPolicy ?? {}, null, 2),
      postContentPolicy: JSON.stringify(selectedWorkflow?.postContentPolicy ?? {}, null, 2)
    });
  }, [selectedWorkflow]);

  useEffect(() => {
    if (!selectedAsset) return;
    setAssetForm({
      name: selectedAsset.name ?? "",
      assetCategory: selectedAsset.assetCategory ?? selectedAsset.assetType ?? assetTab,
      assetSubType: selectedAsset.assetSubType ?? "",
      mediaType: selectedAsset.mediaType ?? "unknown",
      groupId: selectedAsset.groupId ?? "",
      characterId: selectedAsset.characterId ?? "",
      publicUrl: selectedAsset.publicUrl ?? selectedAsset.previewUrl ?? "",
      filePath: selectedAsset.filePath ?? "",
      tags: (selectedAsset.tags ?? []).join(", "),
      attributes: JSON.stringify(selectedAsset.attributes ?? {}, null, 2),
      metadata: JSON.stringify(selectedAsset.metadata ?? {}, null, 2),
      sourceAssetId: selectedAsset.sourceAssetId ?? "",
      usageStatus: selectedAsset.usageStatus ?? "available",
      usagePolicy: selectedAsset.usagePolicy ?? "reusable",
      qualityStatus: selectedAsset.qualityStatus ?? "draft"
    });
  }, [assetTab, selectedAsset]);

  useEffect(() => {
    if (!selectedCharacterId) {
      setCharacterDetail(null);
      return;
    }
    api<CharacterDetail>(`/characters/${selectedCharacterId}/detail`)
      .then((detail) => {
        setCharacterDetail(detail);
        setCharacterForm({
          name: detail.character.name ?? "",
          status: String(detail.character.status ?? "alive"),
          age: detail.character.age == null ? "" : String(detail.character.age),
          metadata: JSON.stringify(detail.character.metadata ?? {}, null, 2)
        });
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load character detail"));
  }, [selectedCharacterId]);

  useEffect(() => {
    let cancelled = false;
    async function renderAll() {
      if (!selectedPrimaryGroup) return;
      const next: PromptPreviews = { image: "", video: "", music: "" };

      for (const kind of Object.keys(promptSelections) as PromptKind[]) {
        const templateId = promptSelections[kind];
        if (!templateId) continue;

        try {
          const rendered = await api<{ prompt: string }>("/prompt-builder/render", {
            method: "POST",
            body: JSON.stringify({ templateId, groupId: selectedPrimaryGroup })
          });
          next[kind] = applyWorkingAttributes(rendered.prompt, attributeValues);
        } catch {
          const template = templates.find((item) => item.id === templateId);
          next[kind] = template ? applyWorkingAttributes(`${template.name}: {scene} / {outfit} / {emotion}`, attributeValues) : "";
        }
      }

      if (!cancelled) setPreviews(next);
    }

    renderAll();
    return () => {
      cancelled = true;
    };
  }, [attributeValues, promptSelections, selectedPrimaryGroup, templates]);

  const groupedTemplates = useMemo(() => {
    return {
      image: templates.filter((template) => normalizeCategory(template.category) === "image"),
      video: templates.filter((template) => normalizeCategory(template.category) === "video"),
      music: templates.filter((template) => normalizeCategory(template.category) === "music")
    };
  }, [templates]);

  const studioAttributes = useMemo(() => {
    const wanted = new Set(["scene", "emotion", "outfit"]);
    const fromBackend = attributes.filter((attribute) =>
      wanted.has(attribute.key.toLowerCase()) || wanted.has(attribute.name.toLowerCase())
    );
    const existing = new Set(fromBackend.map((attribute) => attribute.name.toLowerCase()));
    const fallback = ["scene", "emotion", "outfit"]
      .filter((key) => !existing.has(key))
      .map((key) => ({ id: `fallback-${key}`, key, name: key, valueType: "SELECT" }));
    return [...fromBackend, ...fallback];
  }, [attributes]);

  function toggleGroup(groupId: string) {
    setSelectedGroups((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );
  }

  function selectRandomGroup() {
    if (!groups.length) return;
    const group = groups[Math.floor(Math.random() * groups.length)];
    setSelectedGroups([group.id]);
  }

  function toggleMusicMatchAttribute(attribute: string) {
    setMusicMatchAttributes((current) =>
      current.includes(attribute)
        ? current.filter((item) => item !== attribute)
        : [...current, attribute]
    );
  }

  function assetPayload(overrides: Partial<typeof assetForm> = {}) {
    const form = { ...assetForm, ...overrides };
    return {
      name: form.name,
      assetCategory: form.assetCategory,
      assetType: form.assetCategory,
      assetSubType: form.assetSubType || undefined,
      mediaType: form.mediaType,
      groupId: form.assetCategory === "CHARACTER_IMAGE" ? undefined : form.groupId || undefined,
      characterId: form.characterId || undefined,
      publicUrl: form.publicUrl || undefined,
      previewUrl: form.publicUrl || undefined,
      filePath: form.filePath || undefined,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      attributes: parseJsonText(form.attributes, {}),
      metadata: parseJsonText(form.metadata, {}),
      sourceAssetId: form.sourceAssetId || undefined,
      usageStatus: form.usageStatus,
      usagePolicy: form.usagePolicy,
      qualityStatus: form.qualityStatus,
      status: "available"
    };
  }

  async function createAsset() {
    await adminAction("Creating asset", async () => {
      const asset = await api<AssetRecord>("/assets", {
        method: "POST",
        body: JSON.stringify(assetPayload())
      });
      setSelectedAssetId(asset.id);
      return asset;
    });
  }

  async function updateSelectedAsset() {
    if (!selectedAsset) {
      setStatus("Select an asset");
      return;
    }
    await adminAction("Updating asset", () => api<AssetRecord>(`/assets/${selectedAsset.id}`, {
      method: "PATCH",
      body: JSON.stringify(assetPayload())
    }));
  }

  async function createAssetVersion() {
    if (!selectedAsset) {
      setStatus("Select an asset");
      return;
    }
    await adminAction("Creating asset version", async () => {
      const version = await api<AssetRecord>("/assets", {
        method: "POST",
        body: JSON.stringify({
          ...assetPayload({
            name: assetForm.name || `${selectedAsset.name} v${(selectedAssetVersions.length || 1) + 1}`,
            sourceAssetId: selectedAsset.id
          }),
          versionGroupId: selectedAsset.versionGroupId ?? selectedAsset.id,
          versionNo: Math.max(0, ...selectedAssetVersions.map((asset) => Number(asset.versionNo ?? 0))) + 1,
          isBestVersion: false
        })
      });
      setSelectedAssetId(version.id);
      return version;
    });
  }

  async function setBestAsset(assetId = selectedAssetId) {
    if (!assetId) return;
    await adminAction("Setting best version", () => api<AssetRecord>(`/assets/${assetId}/set-best`, { method: "POST" }));
  }

  async function deleteSelectedAsset() {
    if (!selectedAsset) return;
    await adminAction("Deleting asset", () => api(`/assets/${selectedAsset.id}`, { method: "DELETE" }));
    setSelectedAssetId("");
  }

  async function saveSelectedCharacter() {
    if (!selectedCharacterId) return;
    await adminAction("Updating character", async () => {
      const character = await api<CharacterRecord>(`/characters/${selectedCharacterId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: characterForm.name,
          status: characterForm.status,
          age: characterForm.age ? Number(characterForm.age) : undefined,
          metadata: parseJsonText(characterForm.metadata, {})
        })
      });
      const detail = await api<CharacterDetail>(`/characters/${selectedCharacterId}/detail`);
      setCharacterDetail(detail);
      return character;
    });
  }

  async function deleteSelectedCharacter() {
    if (!characterDetail?.character.id) return;
    const confirmed = window.confirm(
      `Delete character ${characterDetail.character.name}?\n\nThis deletes only the character source record, group memberships, metadata, and original young/old source images. Edited assets, videos, post content, jobs, and lineage are preserved.`
    );
    if (!confirmed) return;

    await adminAction("Deleting character source record", async () => {
      const result = await api(`/characters/${characterDetail.character.id}`, { method: "DELETE" });
      setSelectedCharacterId("");
      setCharacterDetail(null);
      await refreshQueue();
      return result;
    });
  }

  async function createCharacterSourceVersion(role: "young" | "old") {
    if (!characterDetail?.character.id) return;
    const current = role === "young" ? characterDetail.sourceImages.youngOriginalImage : characterDetail.sourceImages.oldOriginalImage;
    const url = window.prompt(`Public URL for ${role} original source image`);
    if (!url) return;
    await adminAction("Uploading source image version", async () => {
      const versionSiblings = assets.filter((asset) => (asset.versionGroupId ?? asset.id) === (current?.versionGroupId ?? current?.id));
      const asset = await api<AssetRecord>("/assets", {
        method: "POST",
        body: JSON.stringify({
          name: `${characterDetail.character.name} ${role === "young" ? "Young Original" : "Old Original"}`,
          assetCategory: "CHARACTER_IMAGE",
          assetType: "CHARACTER_IMAGE",
          assetSubType: role === "young" ? "YOUNG_ORIGINAL_IMAGE" : "OLD_ORIGINAL_IMAGE",
          mediaType: "image",
          characterId: characterDetail.character.id,
          publicUrl: url,
          previewUrl: url,
          sourceAssetId: current?.id,
          versionGroupId: current?.versionGroupId ?? current?.id,
          versionNo: current ? Math.max(0, ...versionSiblings.map((assetItem) => Number(assetItem.versionNo ?? 0))) + 1 : 1,
          isBestVersion: false,
          tags: [characterDetail.character.name, role, "original"],
          attributes: { sourceRole: role },
          metadata: { sourceRole: role, replacedFrom: current?.id ?? null },
          status: "available",
          usageStatus: "available",
          usagePolicy: "reusable",
          qualityStatus: "draft"
        })
      });
      setSelectedAssetId(asset.id);
      const detail = await api<CharacterDetail>(`/characters/${characterDetail.character.id}/detail`);
      setCharacterDetail(detail);
      return asset;
    });
  }

  async function markActiveSourceImage(assetId?: string | null) {
    if (!assetId) return;
    await adminAction("Marking active source image", async () => {
      const asset = await api<AssetRecord>(`/assets/${assetId}/set-best`, { method: "POST" });
      if (characterDetail?.character.id) {
        setCharacterDetail(await api<CharacterDetail>(`/characters/${characterDetail.character.id}/detail`));
      }
      return asset;
    });
  }

  async function removeCharacterFromGroup(groupId?: string | null, memberId?: string | null) {
    if (!groupId || !memberId) return;
    await adminAction("Removing character from group", async () => {
      await api(`/character-groups/${groupId}/members/${memberId}`, { method: "DELETE" });
      if (selectedCharacterId) setCharacterDetail(await api<CharacterDetail>(`/characters/${selectedCharacterId}/detail`));
      return { removed: true };
    });
  }

  async function addCharacterToSelectedGroup() {
    if (!selectedCharacterId || !selectedGroupId) return;
    await adminAction("Adding character to group", async () => {
      const result = await api(`/character-groups/${selectedGroupId}/members`, {
        method: "POST",
        body: JSON.stringify({ characterId: selectedCharacterId, role: "member", sortOrder: 0 })
      });
      setCharacterDetail(await api<CharacterDetail>(`/characters/${selectedCharacterId}/detail`));
      return result;
    });
  }

  async function openCharacterGroup(groupId: string, tab: typeof groupDrawerTab = "overview") {
    setSelectedGroupId(groupId);
    setGroupDrawerTab(tab);
    const detail = await api<CharacterGroupDetail>(`/character-groups/${groupId}/detail`);
    setSelectedGroupDetail(detail);
    setGroupForm((current) => ({
      ...current,
      name: detail.group.name ?? "",
      description: detail.group.description ?? "",
      status: detail.group.status ?? "active"
    }));
  }

  function toggleGroupCreateMember(characterId: string) {
    setGroupCreateMemberIds((current) =>
      current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId]
    );
  }

  function randomCharacterIds(count: number, excludedIds: string[] = []) {
    const excluded = new Set(excludedIds);
    return [...characters]
      .filter((character) => character.sourceImages?.youngOriginalImage && character.sourceImages?.oldOriginalImage && !excluded.has(character.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map((character) => character.id);
  }

  async function createCharacterGroupFromBuilder() {
    const targetSize = Math.max(1, Number(groupCreateSize || 0));
    const selectedIds = groupCreateMode === "random"
      ? randomCharacterIds(targetSize)
      : groupCreateMode === "partial-random"
        ? [...groupCreateMemberIds, ...randomCharacterIds(Math.max(0, targetSize - groupCreateMemberIds.length), groupCreateMemberIds)]
        : groupCreateMemberIds;
    const finalIds = [...new Set(selectedIds)].slice(0, targetSize);
    if (!groupForm.name.trim()) {
      setStatus("Group name is required");
      return;
    }
    if (!finalIds.length) {
      setStatus("Cannot save an empty group");
      return;
    }
    const missingSource = finalIds.some((id) => {
      const character = characters.find((item) => item.id === id);
      return !character?.sourceImages?.youngOriginalImage || !character?.sourceImages?.oldOriginalImage;
    });
    if (groupForm.status === "active" && missingSource && !window.confirm("This active group has members missing source images. Save anyway?")) return;
    await adminAction("Creating character group", async () => {
      const group = await api<CharacterGroup>("/character-groups", {
        method: "POST",
        body: JSON.stringify({ name: groupForm.name, description: groupForm.description, status: groupForm.status })
      });
      for (const [index, characterId] of finalIds.entries()) {
        await api(`/character-groups/${group.id}/members`, {
          method: "POST",
          body: JSON.stringify({ characterId, role: "member", sortOrder: index })
        });
      }
      await loadData();
      await openCharacterGroup(group.id, "members");
      setShowGroupCreate(false);
      setGroupCreateMemberIds([]);
      return group;
    });
  }

  async function saveSelectedGroup() {
    if (!selectedGroupDetail?.group.id) return;
    await adminAction("Updating character group", async () => {
      const group = await api<CharacterGroup>(`/character-groups/${selectedGroupDetail.group.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: groupForm.name, description: groupForm.description, status: groupForm.status })
      });
      await loadData();
      await openCharacterGroup(group.id, "overview");
      return group;
    });
  }

  async function duplicateSelectedGroup(groupId: string) {
    await adminAction("Duplicating group", async () => {
      const detail = await api<CharacterGroupDetail>(`/character-groups/${groupId}/duplicate`, { method: "POST" });
      await loadData();
      await openCharacterGroup(detail.group.id, "members");
      return detail;
    });
  }

  async function removeGroupMember(memberId?: string | null) {
    if (!selectedGroupDetail?.group.id || !memberId) return;
    await adminAction("Removing group member", async () => {
      await api(`/character-groups/${selectedGroupDetail.group.id}/members/${memberId}`, { method: "DELETE" });
      await loadData();
      await openCharacterGroup(selectedGroupDetail.group.id, "members");
      return { removed: true };
    });
  }

  async function shuffleSelectedGroupMembers() {
    if (!selectedGroupDetail?.group.id) return;
    await shuffleGroupMembers(selectedGroupDetail.group.id);
  }

  async function shuffleGroupMembers(groupId: string) {
    await adminAction("Shuffling group member order", async () => {
      const detail = await api<CharacterGroupDetail>(`/character-groups/${groupId}/members/shuffle`, { method: "POST" });
      setSelectedGroupDetail(detail);
      setSelectedGroupId(groupId);
      setGroupDrawerTab("members");
      await loadData();
      return detail;
    });
  }

  async function reorderSelectedGroupMembers(targetMemberId?: string | null) {
    if (!selectedGroupDetail?.group.id || !draggedGroupMemberId || !targetMemberId || draggedGroupMemberId === targetMemberId) return;
    const currentIds = selectedGroupDetail.members.map((member) => String(member.memberId));
    const nextIds = currentIds.filter((id) => id !== draggedGroupMemberId);
    const targetIndex = nextIds.indexOf(String(targetMemberId));
    nextIds.splice(targetIndex < 0 ? nextIds.length : targetIndex, 0, draggedGroupMemberId);
    setDraggedGroupMemberId("");
    await adminAction("Saving group member order", async () => {
      const detail = await api<CharacterGroupDetail>(`/character-groups/${selectedGroupDetail.group.id}/members/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ memberIds: nextIds })
      });
      setSelectedGroupDetail(detail);
      await loadData();
      return detail;
    });
  }

  async function assignSelectedGroupAttribute() {
    if (!selectedGroupDetail?.group.id || !groupForm.attributeId) return;
    await adminAction("Assigning group attribute", async () => {
      const result = await api(`/character-groups/${selectedGroupDetail.group.id}/attributes`, {
        method: "POST",
        body: JSON.stringify({ attributeId: groupForm.attributeId, customValue: groupForm.customValue })
      });
      await loadData();
      await openCharacterGroup(selectedGroupDetail.group.id, "attributes");
      return result;
    });
  }

  async function createBatchForGroup(groupId: string, readiness?: GroupReadiness) {
    if (!readiness?.ready && !window.confirm("This group is not fully ready. Create production batch anyway?")) return;
    await adminAction("Creating production batch", async () => {
      const batch = await api<ProductionBatch>(`/character-groups/${groupId}/create-production-batch`, { method: "POST" });
      await refreshQueue();
      await openCharacterGroup(groupId, "history");
      return batch;
    });
  }

  async function deleteCharacterGroup(group: CharacterGroup) {
    if (!window.confirm(`Delete group ${group.name}?\n\nCharacters and source images will not be deleted.`)) return;
    await adminAction("Deleting character group", async () => {
      const result = await api(`/character-groups/${group.id}`, { method: "DELETE" });
      if (selectedGroupId === group.id) {
        setSelectedGroupId("");
        setSelectedGroupDetail(null);
      }
      await loadData();
      return result;
    });
  }

  async function openPromptTemplate(templateId: string, tab: typeof promptDrawerTab = "overview") {
    setSelectedTemplateId(templateId);
    setPromptDrawerTab(tab);
    const detail = await api<PromptTemplate>(`/prompt-templates/${templateId}`);
    setPromptDetail(detail);
    const activeVersion = detail.activeVersion ?? detail.versions?.[0] ?? null;
    setPromptEditorText(activeVersion?.templateText ?? "");
    setTemplateForm({
      name: detail.name ?? "",
      category: normalizePromptCategory(detail.category),
      description: detail.description ?? "",
      status: detail.status ?? "active",
      templateText: activeVersion?.templateText ?? ""
    });
  }

  async function createPromptTemplateFlow() {
    await adminAction("Creating prompt template", async () => {
      const template = await api<PromptTemplate>("/prompt-templates", {
        method: "POST",
        body: JSON.stringify({
          name: templateForm.name,
          category: templateForm.category,
          description: templateForm.description,
          status: templateForm.status
        })
      });
      await api<PromptTemplateVersion>(`/prompt-templates/${template.id}/versions`, {
        method: "POST",
        body: JSON.stringify({ templateText: templateForm.templateText, status: "active" })
      });
      await refreshQueue();
      await openPromptTemplate(template.id, "editor");
      setShowPromptCreateModal(false);
      return template;
    });
  }

  async function savePromptVersion(statusValue: "draft" | "active" = "draft") {
    if (!selectedTemplateId) return;
    await adminAction(statusValue === "active" ? "Saving active prompt version" : "Saving draft prompt version", async () => {
      const version = await api<PromptTemplateVersion>(`/prompt-templates/${selectedTemplateId}/versions`, {
        method: "POST",
        body: JSON.stringify({ templateText: promptEditorText, status: statusValue })
      });
      if (statusValue === "active") await api(`/prompt-template-versions/${version.id}/activate`, { method: "POST" });
      await refreshQueue();
      await openPromptTemplate(selectedTemplateId, "versions");
      return version;
    });
  }

  async function activatePromptVersion(versionId?: string) {
    const targetVersionId = versionId ?? promptDetail?.activeVersion?.id;
    if (!targetVersionId) return;
    await adminAction("Activating prompt version", async () => {
      const version = await api<PromptTemplateVersion>(`/prompt-template-versions/${targetVersionId}/activate`, { method: "POST" });
      await refreshQueue();
      if (selectedTemplateId) await openPromptTemplate(selectedTemplateId, "versions");
      return version;
    });
  }

  async function duplicatePromptTemplate(template: PromptTemplate) {
    await adminAction("Duplicating prompt template", async () => {
      const detail = await api<PromptTemplate>(`/prompt-templates/${template.id}`);
      const activeVersion = detail.activeVersion ?? detail.versions?.[0] ?? null;
      const copy = await api<PromptTemplate>("/prompt-templates", {
        method: "POST",
        body: JSON.stringify({
          name: `${detail.name} Copy`,
          category: normalizePromptCategory(detail.category),
          description: detail.description ?? "",
          status: "active"
        })
      });
      if (activeVersion?.templateText) {
        await api<PromptTemplateVersion>(`/prompt-templates/${copy.id}/versions`, {
          method: "POST",
          body: JSON.stringify({ templateText: activeVersion.templateText, status: "active" })
        });
      }
      await refreshQueue();
      await openPromptTemplate(copy.id, "editor");
      return copy;
    });
  }

  async function deletePromptTemplate(template: PromptTemplate) {
    if (!window.confirm(`Delete prompt template ${template.name}?\n\nAll versions for this template will also be deleted.`)) return;
    await adminAction("Deleting prompt template", async () => {
      const result = await api(`/prompt-templates/${template.id}`, { method: "DELETE" });
      if (selectedTemplateId === template.id) {
        setSelectedTemplateId("");
        setPromptDetail(null);
      }
      await loadData();
      return result;
    });
  }

  function insertPromptVariable(variable: string) {
    setPromptEditorText((current) => `${current}${current.endsWith(" ") || !current ? "" : " "}${variable}`);
  }

  async function renderPromptPreview() {
    const context = parseJsonText(promptPreviewContext, {});
    const local = renderPromptLocally(promptEditorText || (promptDetail?.activeVersion?.templateText ?? ""), context);
    setPromptPreviewResult(local);
    if (selectedTemplateId && selectedGroupId) {
      try {
        const rendered = await api<{ prompt: string; values?: Record<string, string> }>("/prompt-builder/render", {
          method: "POST",
          body: JSON.stringify({ templateId: selectedTemplateId, groupId: selectedGroupId })
        });
        setPromptPreviewResult({
          rendered: rendered.prompt,
          replaced: Object.keys(rendered.values ?? {}),
          missing: local.missing
        });
      } catch {
        setPromptPreviewResult(local);
      }
    }
  }

  async function addCharacterImportFiles(fileList: FileList | File[]) {
    const next = await Promise.all(Array.from(fileList).map(fileToImportFile));
    setCharacterImportFiles((current) => [...current, ...next]);
    setCharacterImportPreview([]);
    setCharacterImportResult(null);
  }

  function clearCharacterImportFiles() {
    setCharacterImportFiles([]);
    setCharacterImportPreview([]);
    setCharacterImportResult(null);
  }

  async function previewCharacterImport() {
    if (!characterImportFiles.length) {
      setStatus("Select character image files");
      return;
    }
    const payload = characterImportMode === "pair"
      ? {
          young: characterImportMetadataOnly(characterImportFiles[0]),
          old: characterImportMetadataOnly(characterImportFiles[1]),
          dryRun: true,
          createGroupCandidates: createCharacterGroupCandidates
        }
      : {
          files: characterImportFiles.map(characterImportMetadataOnly),
          dryRun: true,
          createGroupCandidates: createCharacterGroupCandidates
        };
    if (characterImportMode === "pair" && (!payload.young || !payload.old)) {
      setStatus("Single Pair Upload needs two files");
      return;
    }
    await adminAction("Previewing character import", async () => {
      const result = await api<CharacterImportResult>(characterImportMode === "pair" ? "/character-import/pair" : "/character-import/bulk", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setCharacterImportPreview(result.preview ?? []);
      setCharacterImportResult(result);
      return result;
    });
  }

  async function importCharacters() {
    if (!characterImportFiles.length) {
      setStatus("Select character image files");
      return;
    }
    const payload = characterImportMode === "pair"
      ? {
          young: characterImportUploadPayload(characterImportFiles[0]),
          old: characterImportUploadPayload(characterImportFiles[1]),
          createGroupCandidates: createCharacterGroupCandidates
        }
      : {
          files: characterImportFiles.map(characterImportUploadPayload),
          createGroupCandidates: createCharacterGroupCandidates
        };
    if (characterImportMode === "pair" && (!payload.young || !payload.old)) {
      setStatus("Single Pair Upload needs two files");
      return;
    }
    await adminAction("Importing character images", async () => {
      const result = await api<CharacterImportResult>(characterImportMode === "pair" ? "/character-import/pair" : "/character-import/bulk", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setCharacterImportResult(result);
      setCharacterImportPreview((result.skipped as CharacterImportPairPreview[] | undefined) ?? characterImportPreview);
      await loadData();
      return result;
    });
  }

  async function createProductionBatches() {
    if (!selectedGroups.length) {
      setStatus("Select at least one character group");
      return;
    }

    setBusy(true);
    setStatus("Creating production resources");
    try {
      for (const groupId of selectedGroups) {
        const metadata = {
          studio: "Production Studio",
          attributes: attributeValues,
          promptTemplates: promptSelections,
          promptPreview: previews,
          musicPolicy: {
            mode: musicPolicyMode,
            matchAttributes: musicMatchAttributes
          }
        };
        await api<ProductionBatch>("/production-batches", {
          method: "POST",
          body: JSON.stringify({
            batchType: "CHARACTER_GROUP",
            sourceGroupId: groupId,
            status: "READY",
            usageStatus: "AVAILABLE",
            attributes: attributeValues,
            metadata
          })
        });
        await api<ProductionBatch>("/production-batches", {
          method: "POST",
          body: JSON.stringify({
            batchType: "IMAGE_BATCH",
            sourceGroupId: groupId,
            status: "NEW",
            usageStatus: "AVAILABLE",
            attributes: attributeValues,
            metadata
          })
        });
      }
      const latest = await api<ProductionBatch[]>("/production-batches");
      setBatches(latest.slice(0, 12));
      setStatus("Production batch created");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create production batch");
    } finally {
      setBusy(false);
    }
  }

  async function refreshQueue() {
    const [latestCharacters, latestGroups, latestHosts, latestWorkflows, latestWorkflowRuns, latestInstances, latestPools, latestBatches, latestAssets, latestJobs, latestSessions, latestScriptRuns, latestScripts, latestRules] = await Promise.all([
      api<CharacterRecord[]>("/characters"),
      api<CharacterGroup[]>("/character-groups"),
      api<HostRecord[]>("/hosts"),
      api<WorkflowRecord[]>("/workflows"),
      api<WorkflowRunRecord[]>("/workflow-runs"),
      api<InstanceRecord[]>("/instances"),
      api<InstancePool[]>("/instance-pools"),
      api<ProductionBatch[]>("/production-batches"),
      api<AssetRecord[]>("/assets"),
      api<OrchestratorJob[]>("/orchestrator/jobs"),
      api<RuntimeSession[]>("/runtime-sessions"),
      api<ScriptRun[]>("/script-runs"),
      api<ScriptRecord[]>("/scripts"),
      api<OrchestratorRule[]>("/orchestrator/rules")
    ]);
    setCharacters(latestCharacters);
    setGroups(latestGroups);
    setHosts(latestHosts);
    setWorkflows(latestWorkflows);
    setWorkflowRuns(latestWorkflowRuns);
    setInstances(latestInstances);
    const latestPoolDetails = await Promise.all(latestPools.map((pool) =>
      api<InstancePool>(`/instance-pools/${pool.id}`).catch(() => pool)
    ));

    setPools(latestPoolDetails);
    setBatches(latestBatches);
    setAssets(latestAssets);
    setJobs(latestJobs);
    setRuntimeSessions(latestSessions);
    setScriptRuns(latestScriptRuns);
    setScripts(latestScripts);
    setOrchestratorRules(latestRules);
    return {
      batches: latestBatches,
      assets: latestAssets,
      jobs: latestJobs,
      groups: latestGroups,
      hosts: latestHosts,
      workflows: latestWorkflows,
      workflowRuns: latestWorkflowRuns,
      pools: latestPoolDetails,
      runtimeSessions: latestSessions,
      scriptRuns: latestScriptRuns
    };
  }

  async function loadJobDetail(job: OrchestratorJob) {
    setSelectedJobId(job.id);
    setDrawerOpen(true);
    setJobDetailLoading(true);
    setJobDetailError("");
    setRuntimeSession(null);
    setScriptRun(null);
    setOutputBatch(null);

    try {
      const payload = getRecord(job.payload);
      const output = getRecord(job.output);
      let runtimeSessionId = getString(output.runtimeSessionId) || getString(payload.runtimeSessionId);
      let scriptRunId = getString(output.scriptRunId) || getString(payload.scriptRunId);
      let outputBatchId = getString(output.outputBatchId) || getString(payload.outputBatchId);

      if (!runtimeSessionId) {
        const sessions = runtimeSessions.length ? runtimeSessions : await api<RuntimeSession[]>("/runtime-sessions");
        const related = sessions.find((session) => session.jobId === job.id);
        runtimeSessionId = related?.id ?? "";
      }

      const runtime = runtimeSessionId
        ? await api<RuntimeSession>(`/runtime-sessions/${runtimeSessionId}`)
        : null;
      setRuntimeSession(runtime);

      if (!scriptRunId && runtime) {
        const checkpoint = getRecord(runtime.checkpoint);
        scriptRunId = getString(checkpoint.scriptRunId);
      }

      if (!scriptRunId && runtime) {
        const runs = scriptRuns.length ? scriptRuns : await api<ScriptRun[]>("/script-runs");
        const related = runs.find((run) => run.runtimeSessionId === runtime.id);
        scriptRunId = related?.id ?? "";
      }

      const run = scriptRunId ? await api<ScriptRun>(`/script-runs/${scriptRunId}`) : null;
      setScriptRun(run);

      if (!outputBatchId) {
        const latestBatches = batches.length ? batches : await api<ProductionBatch[]>("/production-batches");
        const relatedBatch = latestBatches.find((batch) => getRecord(batch.metadata).sourceJobId === job.id);
        outputBatchId = relatedBatch?.id ?? "";
      }

      const batch = outputBatchId ? await api<ProductionBatch>(`/production-batches/${outputBatchId}`) : null;
      setOutputBatch(batch);
    } catch (error) {
      setJobDetailError(error instanceof Error ? error.message : "Could not load job detail");
    } finally {
      setJobDetailLoading(false);
    }
  }

  async function launchBatch(batchId: string) {
    setBusy(true);
    setStatus("Starting production");
    try {
      const result = await api<{ createdJobs: OrchestratorJob[] }>(`/production-batches/${batchId}/launch`, {
        method: "POST"
      });
      setLaunchedJobs(result.createdJobs ?? []);
      await refreshQueue();
      setStatus(result.createdJobs?.length ? "Production queued" : "Batch is ready; no matching rule created a job");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not start production");
    } finally {
      setBusy(false);
    }
  }

  async function selectRuntimeSession(session: RuntimeSession) {
    setSelectedRuntimeId(session.id);
    setRuntimeSession(session);
    const related = scriptRuns.find((run) => run.runtimeSessionId === session.id);
    if (related) {
      const detail = await api<ScriptRun>(`/script-runs/${related.id}`);
      setScriptRun(detail);
    } else {
      setScriptRun(null);
    }
  }

  async function runJobAction(
    job: OrchestratorJob,
    action: "allocate" | "execute-mock" | "execute-image-edit" | "start" | "complete" | "fail"
  ) {
    setBusy(true);
    setStatus(`${action} ${job.targetStageType}`);
    try {
      const path = action === "execute-mock"
        ? `/job-executor/jobs/${job.id}/execute-mock`
        : action === "execute-image-edit"
          ? `/job-executor/jobs/${job.id}/execute-image-edit`
          : `/orchestrator/jobs/${job.id}/${action}`;
      const body = action === "fail" ? { errorMessage: "Failed from Factory Control Center" } : undefined;
      await api(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined
      });
      const latest = await refreshQueue();
      const updatedJob = latest.jobs.find((item) => item.id === job.id);
      if (updatedJob) await loadJobDetail(updatedJob);
      setStatus("Queue updated");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Job action failed");
    } finally {
      setBusy(false);
    }
  }

  async function recoverRuntimeSession() {
    if (!runtimeSession) return;

    setBusy(true);
    setStatus("Recovering runtime session");
    try {
      await api(`/runtime-sessions/${runtimeSession.id}/recover`, {
        method: "POST"
      });
      const latest = await refreshQueue();
      const updatedJob = selectedJobId ? latest.jobs.find((item) => item.id === selectedJobId) : null;
      if (updatedJob) await loadJobDetail(updatedJob);
      setStatus("Runtime recovery requested");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not recover runtime session");
    } finally {
      setBusy(false);
    }
  }

  async function runtimeAction(action: "test-screenshot" | "recover" | "mark-unrecoverable", runtimeOverride?: RuntimeSession) {
    const session = runtimeOverride ?? selectedRuntime;
    if (!session) return;

    setBusy(true);
    setStatus(`${action} runtime`);
    try {
      await api(`/runtime-sessions/${session.id}/${action}`, { method: "POST" });
      await refreshQueue();
      const detail = await api<RuntimeSession>(`/runtime-sessions/${session.id}`);
      await selectRuntimeSession(detail);
      setStatus("Runtime updated");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Runtime action failed");
    } finally {
      setBusy(false);
    }
  }

  async function runHostAction(action: "health" | "devices" | "screenshot" | "tap" | "send-text" | "download-latest") {
    if (!selectedHost) {
      setStatus("Select a host");
      return;
    }
    if (!["health", "devices"].includes(action) && !hostAdbId) {
      setHostResult({ error: "ADB_ID_REQUIRED", message: "Select an instance with a known adbId before running this command" });
      setStatus("ADB mapping unknown");
      return;
    }

    setBusy(true);
    setStatus(`${action} host test`);
    try {
      let result: unknown;
      if (action === "health") {
        result = await api(`/hosts/${selectedHost.id}/health`);
      } else if (action === "devices") {
        const data = await hostApi<{ devices: AdbDevice[] }>(selectedHost.baseUrl, "/adb/devices");
        setAdbDevices(data.devices ?? []);
        result = data;
      } else if (action === "screenshot") {
        result = await api(`/hosts/${selectedHost.id}/screenshot`, {
          method: "POST",
          body: JSON.stringify({ instanceId: hostInstanceId, adbId: hostAdbId })
        });
      } else if (action === "tap") {
        result = await api(`/hosts/${selectedHost.id}/tap`, {
          method: "POST",
          body: JSON.stringify({ instanceId: hostInstanceId, adbId: hostAdbId, x: 100, y: 100 })
        });
      } else if (action === "send-text") {
        result = await api(`/hosts/${selectedHost.id}/send-text`, {
          method: "POST",
          body: JSON.stringify({ instanceId: hostInstanceId, adbId: hostAdbId, text: hostSendText })
        });
      } else {
        result = await api(`/hosts/${selectedHost.id}/download-latest`, {
          method: "POST",
          body: JSON.stringify({ instanceId: hostInstanceId, adbId: hostAdbId })
        });
      }
      setHostResult(result);
      setStatus("Host test complete");
    } catch (error) {
      setHostResult({ error: error instanceof Error ? error.message : "Host test failed" });
      setStatus(error instanceof Error ? error.message : "Host test failed");
    } finally {
      setBusy(false);
    }
  }

  async function adminAction(label: string, task: () => Promise<unknown>) {
    setBusy(true);
    setStatus(label);
    try {
      const result = await task();
      setAdminJson(compactJson(result));
      await refreshQueue();
      setStatus("Management updated");
    } catch (error) {
      setAdminJson(compactJson({ error: error instanceof Error ? error.message : "Action failed" }));
      setStatus(error instanceof Error ? error.message : "Management action failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshScriptVersions(scriptId = selectedScriptId) {
    if (!scriptId) return [];
    const versions = await api<ScriptVersionRecord[]>(`/scripts/${scriptId}/versions`);
    setScriptVersions(versions);
    setSelectedScriptVersionId((current) => current || versions[0]?.id || "");
    return versions;
  }

  async function saveScriptMetadata() {
    if (!selectedScriptId) return;
    return adminAction("Updating script", () => api(`/scripts/${selectedScriptId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: scriptForm.name || selectedScript?.name,
        category: scriptForm.category,
        description: scriptForm.description,
        status: scriptForm.status
      })
    }));
  }

  async function createScriptVersion() {
    if (!selectedScriptId) return;
    return adminAction("Creating script version", async () => {
      const parsed = parseJsonText(scriptForm.steps);
      const version = await api<ScriptVersionRecord>(`/scripts/${selectedScriptId}/versions`, {
        method: "POST",
        body: JSON.stringify({
          status: "draft",
          steps: Array.isArray(parsed.steps) ? parsed.steps : [],
          variables: parsed.variables ?? {},
          retryPolicy: parsed.retryPolicy ?? {},
          detectionPolicy: parsed.detectionPolicy ?? {}
        })
      });
      await refreshScriptVersions(selectedScriptId);
      setSelectedScriptVersionId(version.id);
      return version;
    });
  }

  async function updateScriptVersion() {
    if (!selectedScriptVersionId) return;
    return adminAction("Updating script version", async () => {
      const parsed = parseJsonText(scriptForm.steps);
      const version = await api<ScriptVersionRecord>(`/script-versions/${selectedScriptVersionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          steps: Array.isArray(parsed.steps) ? parsed.steps : undefined,
          variables: parsed.variables ?? {},
          retryPolicy: parsed.retryPolicy ?? {},
          detectionPolicy: parsed.detectionPolicy ?? {}
        })
      });
      await refreshScriptVersions(selectedScriptId);
      return version;
    });
  }

  async function activateScriptVersion() {
    if (!selectedScriptVersionId) return;
    return adminAction("Activating script version", async () => {
      const version = await api<ScriptVersionRecord>(`/script-versions/${selectedScriptVersionId}/activate`, { method: "POST" });
      await refreshScriptVersions(selectedScriptId);
      return version;
    });
  }

  async function testRunSelectedScript() {
    if (!selectedScriptId) return;
    const selectedInstance = instances.find((instance) => instance.id === selectedInstanceId)
      ?? instances.find((instance) => instance.id === hostInstanceId)
      ?? null;
    const host = selectedInstance ? hostForInstance(selectedInstance) : selectedHost;
    const instanceId = selectedInstance?.id || hostInstanceId;
    const adbId = selectedInstance?.adbId || hostAdbId;
    if (!host || !instanceId || !adbId) {
      setStatus("Select host, instance, and adbId");
      return;
    }
    return adminAction("Testing script", () => api(`/scripts/${selectedScriptId}/test-run`, {
      method: "POST",
      body: JSON.stringify({
        scriptVersionId: selectedScriptVersionId || undefined,
        hostId: host.id,
        instanceId,
        adbId,
        context: {
          prompt: {
            image: previews.image,
            video: previews.video,
            music: previews.music,
            post: ""
          },
          group: {
            name: groups.find((group) => group.id === selectedPrimaryGroup)?.name ?? ""
          },
          runtime: {
            instanceId
          }
        }
      })
    }));
  }

  async function saveWorkflowCapacity(scope: "workflow" | "run") {
    if (scope === "workflow" && !selectedWorkflow) {
      setStatus("Select a workflow");
      return;
    }
    if (scope === "run" && !selectedWorkflowRun) {
      setStatus("Select a workflow run");
      return;
    }

    await adminAction("Saving capacity", async () => {
      const result = scope === "workflow"
        ? await api<WorkflowRecord>(`/workflows/${selectedWorkflow?.id}/capacity`, {
            method: "PATCH",
            body: JSON.stringify(capacityForm)
          })
        : await api<WorkflowRunRecord>(`/workflow-runs/${selectedWorkflowRun?.id}/capacity`, {
            method: "POST",
            body: JSON.stringify(capacityForm)
          });
      return result;
    });
  }

  async function saveWorkflowTemplateField(
    key: keyof typeof workflowTemplateJson,
    path: string,
    label: string
  ) {
    if (!selectedWorkflow) {
      setStatus("Select a workflow");
      return;
    }

    let body: unknown;
    try {
      body = JSON.parse(workflowTemplateJson[key]);
    } catch {
      setStatus(`${label} must be valid JSON`);
      return;
    }

    await adminAction(`Saving ${label}`, async () => api<WorkflowRecord>(`/workflows/${selectedWorkflow.id}/${path}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }));
  }

  async function loadWorkflowRunCapacity() {
    if (!selectedWorkflowRun) {
      setStatus("Select a workflow run");
      return;
    }
    return adminAction("Loading workflow capacity", async () => {
      const result = await api<WorkflowCapacityResponse>(`/workflow-runs/${selectedWorkflowRun.id}/capacity`);
      setCapacityResult(result);
      return result;
    });
  }

  async function allocateWorkflowCapacity(workflowRunId = selectedWorkflowRun?.id ?? "") {
    if (!workflowRunId) {
      setStatus("Select a workflow run");
      return;
    }
    return adminAction("Allocating workflow capacity", async () => {
      const result = await api<WorkflowCapacityResponse>(`/workflow-runs/${workflowRunId}/allocate-capacity`, {
        method: "POST"
      });
      setCapacityResult(result);
      return result;
    });
  }

  function selectedPool() {
    return pools.find((pool) => pool.id === selectedPoolId) ?? null;
  }

  async function loadPoolDetail(poolId = selectedPoolId) {
    if (!poolId) return null;
    const detail = await api<InstancePool>(`/instance-pools/${poolId}`);
    setPools((current) => current.map((pool) => pool.id === poolId ? detail : pool));
    return detail;
  }

  function hostForInstance(instance: InstanceRecord) {
    return hosts.find((host) => host.hostId === instance.hostId || host.id === instance.hostId) ?? null;
  }

  async function syncHostInstances(host: HostRecord) {
    return adminAction("Syncing host instances", () => api(`/hosts/${host.id}/sync-instances`, { method: "POST" }));
  }

  async function instanceHostAction(instance: InstanceRecord, action: "screenshot" | "start" | "stop" | "restart") {
    const host = hostForInstance(instance);
    if (!host) throw new Error("Host not found for instance");
    if (action === "screenshot") {
      if (!instance.adbId) {
        setStatus("ADB mapping unknown");
        return;
      }
      return adminAction("Testing instance screenshot", () => api(`/hosts/${host.id}/screenshot`, {
        method: "POST",
        body: JSON.stringify({ instanceId: instance.id, adbId: instance.adbId })
      }));
    }
    return adminAction(`${action} instance`, () => api(`/hosts/${host.id}/instances/${instance.localId}/${action}`, { method: "POST" }));
  }

  async function setInstanceCapabilities(instance: InstanceRecord) {
    const initial = compactJson(instance.capabilities ?? {
      canRun: ["IMAGE_EDIT"],
      apps: ["chatgpt"],
      supportsUpload: true,
      supportsDownload: true,
      notes: ""
    });
    const value = window.prompt("Set instance capabilities JSON", initial);
    if (value === null) return;
    const capabilities = parseJsonText(value, instance.capabilities ?? {});
    return adminAction("Updating capabilities", () => api(`/instances/${instance.id}/capabilities`, {
      method: "PATCH",
      body: JSON.stringify(capabilities)
    }));
  }

  async function moveInstance(instance: InstanceRecord, action: "move-available" | "move-standby" | "move-maintenance" | "disable" | "retire") {
    const body = action === "move-maintenance"
      ? { reason: window.prompt("Maintenance reason", instance.maintenanceReason ?? "") ?? "" }
      : undefined;
    return adminAction("Moving instance", () => api(`/instances/${instance.id}/${action}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    }));
  }

  async function addInstanceToPool(instanceId = selectedInstanceId, poolId = selectedPoolId) {
    if (!instanceId || !poolId) throw new Error("Select instance and pool");
    return adminAction("Adding instance to pool", () => api(`/instance-pools/${poolId}/members`, {
      method: "POST",
      body: JSON.stringify({
        instanceId,
        priority: Number(memberForm.priority),
        status: "ACTIVE",
        role: memberForm.status === "ACTIVE" ? "worker" : undefined,
        notes: memberForm.metadata,
        metadata: {}
      })
    }).then(() => loadPoolDetail(poolId)));
  }

  function instancePoolMemberships(instanceId: string) {
    return pools
      .map((pool) => {
        const member = (pool.members ?? []).find((item) => item.instanceId === instanceId);
        return member ? { pool, member } : null;
      })
      .filter(Boolean) as Array<{ pool: InstancePool; member: InstancePoolMember }>;
  }

  async function loadAllPoolDetails() {
    const details = await Promise.all(pools.map((pool) => api<InstancePool>(`/instance-pools/${pool.id}`)));
    setPools(details);
    return details;
  }

  async function openPoolManager(instanceId: string) {
    setSelectedInstanceId(instanceId);
    setPoolModalInstanceId(instanceId);
    const details = await loadAllPoolDetails();
    setSelectedPoolMemberships(
      details
        .filter((pool) => (pool.members ?? []).some((member) => member.instanceId === instanceId))
        .map((pool) => pool.id)
    );
  }

  async function savePoolMemberships() {
    const instanceId = poolModalInstanceId;
    if (!instanceId) return;
    setBusy(true);
    setStatus("Saving pool memberships");
    try {
      const details = await loadAllPoolDetails();
      const desired = new Set(selectedPoolMemberships);
      const existing = new Map<string, InstancePoolMember>();
      for (const pool of details) {
        const member = (pool.members ?? []).find((item) => item.instanceId === instanceId);
        if (member) existing.set(pool.id, member);
      }

      const tasks: Promise<unknown>[] = [];
      for (const pool of details) {
        const hasMember = existing.has(pool.id);
        const wantsMember = desired.has(pool.id);
        if (!hasMember && wantsMember) {
          tasks.push(api(`/instance-pools/${pool.id}/members`, {
            method: "POST",
            body: JSON.stringify({
              instanceId,
              priority: Number(memberForm.priority),
              status: "ACTIVE",
              role: "worker",
              notes: "",
              metadata: {}
            })
          }));
        }
        if (hasMember && !wantsMember) {
          tasks.push(api(`/instance-pools/${pool.id}/members/${existing.get(pool.id)?.id}`, { method: "DELETE" }));
        }
      }

      await Promise.all(tasks);
      await refreshQueue();
      await loadAllPoolDetails();
      setPoolModalInstanceId("");
      setStatus("Pool memberships updated");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save pool memberships");
    } finally {
      setBusy(false);
    }
  }

  function renderPoolBadges(instanceId: string) {
    const memberships = instancePoolMemberships(instanceId);
    if (!memberships.length) return <span className="poolBadge empty">No pools</span>;
    return memberships.map(({ pool }) => <span className="poolBadge" key={pool.id}>{pool.poolType}</span>);
  }

  function renderCapabilityBadges(instance: InstanceRecord) {
    const labels = instanceCapabilityLabels(instance);
    if (!labels.length) return <span className="poolBadge empty">No capabilities</span>;
    return labels.map((label) => <span className="poolBadge capabilityBadge" key={label}>{label}</span>);
  }

  function renderInstanceMovementActions(instance: InstanceRecord) {
    return (
      <>
        <button onClick={(event) => { event.stopPropagation(); setInstanceCapabilities(instance); }}>Set Capabilities</button>
        <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-available"); }}>Move Available</button>
        <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-standby"); }}>Move Standby</button>
        <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-maintenance"); }}>Move Maintenance</button>
        <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "disable"); }}>Disable</button>
        <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "retire"); }}>Retire</button>
      </>
    );
  }

  return (
    <main className="studio">
      <header className="topbar">
        <div>
          <p className="eyebrow">FB-CM Factory</p>
          <h1>{pageTitle}</h1>
        </div>
        <div className="topbarActions">
          <div className="statusLine">
            {busy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
            <span>{status}</span>
            <button className="iconButton" onClick={() => loadData()} title={t("app.refresh")}>
              <RefreshCcw size={16} />
            </button>
          </div>
          <label className="languageSelect" title={t("app.language")}>
            <Languages size={16} />
            <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </label>
        </div>
      </header>

      <nav className="appNav" aria-label="Main navigation">
        <button className={page === "control-center" ? "active" : ""} onClick={() => setPage("control-center")}>
          <Boxes size={16} />
          {t("app.controlCenter")}
        </button>
        <button className={page === "production-jobs" ? "active" : ""} onClick={() => setPage("production-jobs")}>
          <ClipboardList size={16} />
          {t("app.productionJobs")}
        </button>
        <button className={page === "asset-center" ? "active" : ""} onClick={() => setPage("asset-center")}>
          <Image size={16} />
          {t("app.assetCenter")}
        </button>
        <button className={page === "studio" ? "active" : ""} onClick={() => setPage("studio")}>
          <Sparkles size={16} />
          {t("app.productionStudio")}
        </button>
        <button className={page === "management" ? "active" : ""} onClick={() => setPage("management")}>
          <Users size={16} />
          {t("app.management")}
        </button>
      </nav>

      {page === "management" ? (
      <section className="managementPage">
        <aside className="managementMenu panel">
          <strong>{t("app.management")}</strong>
          {managementMenuItems.map(({ id, labelKey }) => (
            <button
              key={id}
              className={managementSection === id ? "active" : ""}
              onClick={() => setManagementSection(id)}
            >
              {t(labelKey)}
            </button>
          ))}
        </aside>
        <section className="managementContent panel">
          <div className="managementHeader">
            <div>
              <h2>{t(managementMenuItems.find((item) => item.id === managementSection)?.labelKey ?? "app.management")}</h2>
              <small>{t("management.subtitle")}</small>
            </div>
            <input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder={t("management.search")} />
            <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}>
              <RefreshCcw size={15} />
              {t("app.refresh")}
            </button>
          </div>

          {managementSection === "hosts" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Host ID<input value={hostForm.hostId} onChange={(event) => setHostForm({ ...hostForm, hostId: event.target.value })} /></label>
                <label>Name<input value={hostForm.name} onChange={(event) => setHostForm({ ...hostForm, name: event.target.value })} /></label>
                <label>Base URL<input value={hostForm.baseUrl} onChange={(event) => setHostForm({ ...hostForm, baseUrl: event.target.value })} /></label>
                <label>API Key<input value={hostForm.apiKey} onChange={(event) => setHostForm({ ...hostForm, apiKey: event.target.value })} /></label>
                <label>Status<input value={hostForm.status} onChange={(event) => setHostForm({ ...hostForm, status: event.target.value })} /></label>
                <button onClick={() => adminAction("Creating host", () => api("/hosts", { method: "POST", body: JSON.stringify(hostForm) }))}>Add Host</button>
              </div>
              <div className="adminTable">
                {hosts.filter((host) => compactJson(host).toLowerCase().includes(adminSearch.toLowerCase())).slice(0, 20).map((host) => (
                  <div className="hostAdminCard" key={host.id}>
                    <div className="hostAdminInfo">
                      <b>{host.name}</b>
                      <span>{host.hostId}</span>
                      <span>{host.baseUrl}</span>
                      <span>{host.status}</span>
                      <span>{instances.filter((instance) => instance.hostId === host.hostId).length} instances</span>
                    </div>
                    <div className="hostAdminActions">
                      <button onClick={() => adminAction("Testing host health", () => api(`/hosts/${host.id}/health`))}>Health</button>
                      <button onClick={() => syncHostInstances(host)}>Sync Instances</button>
                      <button onClick={() => adminAction("Testing ADB devices", () => hostApi(host.baseUrl, "/adb/devices"))}>ADB Devices</button>
                      <button disabled={!hostAdbId} onClick={() => adminAction("Testing screenshot", () => api(`/hosts/${host.id}/screenshot`, { method: "POST", body: JSON.stringify({ instanceId: hostInstanceId, adbId: hostAdbId }) }))}>Screenshot</button>
                      <button onClick={() => setSelectedHostDrawerId(host.id)}>View Instances</button>
                      <button
                        className="dangerButton"
                        onClick={() => {
                          if (window.confirm(`Delete host ${host.name}?`)) {
                            adminAction("Deleting host", () => api(`/hosts/${host.id}`, { method: "DELETE" }));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {selectedHostDrawerId ? (() => {
                const host = hosts.find((item) => item.id === selectedHostDrawerId);
                const hostInstances = host ? instances.filter((instance) => instance.hostId === host.hostId) : [];
                return (
                  <div className="instanceDrawerOverlay">
                    <aside className="instanceDrawer">
                      <div className="drawerHeader">
                        <div>
                          <strong>{host?.name ?? "Host Instances"}</strong>
                          <small>{host?.hostId ?? ""} / {hostInstances.length} instances</small>
                        </div>
                        <button className="iconButton" onClick={() => setSelectedHostDrawerId("")} title="Close instance drawer">x</button>
                      </div>
                      <div className="instanceDrawerTable">
                        <div className="instanceDrawerHeader">
                          <span>Instance ID</span>
                          <span>Local ID</span>
                          <span>Name</span>
                          <span>ADB ID</span>
                          <span>Status</span>
                          <span>Runtime Status</span>
                          <span>Pool State</span>
                          <span>Capabilities</span>
                          <span>Maintenance</span>
                          <span>Pools</span>
                          <span>Actions</span>
                        </div>
                        {hostInstances.map((instance) => (
                          <div className="instanceDrawerRow" key={instance.id}>
                            <span title={instance.id}>{instance.id}</span>
                            <span>{instance.localId}</span>
                            <span>{instance.name ?? "-"}</span>
                            <span>{instance.adbId ?? "-"}</span>
                            <span>{instance.status}</span>
                            <span>{instance.runtimeStatus}</span>
                            <span>{instance.currentPoolType ?? "AVAILABLE"}</span>
                            <span className="poolBadgeList">{renderCapabilityBadges(instance)}</span>
                            {hasUnknownAdbMapping(instance) ? <span className="poolBadge warningBadge">ADB mapping unknown</span> : null}
                            <span>{instance.maintenanceReason ?? "-"}</span>
                            <span className="poolBadgeList">{renderPoolBadges(instance.id)}</span>
                            <div>
                              <button disabled={!instance.adbId} onClick={() => instanceHostAction(instance, "screenshot")}>Screenshot</button>
                              <button onClick={() => instanceHostAction(instance, "start")}>Start</button>
                              <button onClick={() => instanceHostAction(instance, "stop")}>Stop</button>
                              <button onClick={() => instanceHostAction(instance, "restart")}>Restart</button>
                              <button onClick={() => openPoolManager(instance.id)}>Manage Pools</button>
                              {renderInstanceMovementActions(instance)}
                            </div>
                          </div>
                        ))}
                        {!hostInstances.length ? <div className="jobsEmpty">No synced instances yet.</div> : null}
                      </div>
                    </aside>
                  </div>
                );
              })() : null}
            </div>
          ) : null}

          {managementSection === "workflows" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Workflow<select value={selectedWorkflow?.id ?? ""} onChange={(event) => {
                  setSelectedWorkflowId(event.target.value);
                  const nextRun = workflowRuns.find((run) => run.workflowId === event.target.value);
                  setSelectedWorkflowRunId(nextRun?.id ?? "");
                  setCapacityResult(null);
                }}><option value="">Select workflow</option>{workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select></label>
                <label>Workflow Run<select value={selectedWorkflowRun?.id ?? ""} onChange={(event) => { setSelectedWorkflowRunId(event.target.value); setCapacityResult(null); }}><option value="">Select run</option>{workflowRuns.filter((run) => !selectedWorkflow || run.workflowId === selectedWorkflow.id).map((run) => <option key={run.id} value={run.id}>{displayShortId(run.id)} / {run.status}</option>)}</select></label>
                <div className="adminNotice">
                  <strong>Resource-Driven Workflow Template</strong>
                  <span>New workflows default to resource-driven rules. Legacy Sequential Stages are kept only for compatibility.</span>
                </div>
                {capacityStageOptions.map((stageType) => (
                  <label key={stageType}>{stageType}<input type="number" min="0" value={capacityForm[stageType] ?? 0} onChange={(event) => setCapacityForm({ ...capacityForm, [stageType]: Number(event.target.value) })} /></label>
                ))}
                <button disabled={!selectedWorkflow} onClick={() => saveWorkflowCapacity("workflow")}>Save Workflow Capacity</button>
                <button disabled={!selectedWorkflowRun} onClick={() => saveWorkflowCapacity("run")}>Save Run Capacity</button>
                <button disabled={!selectedWorkflowRun} onClick={() => allocateWorkflowCapacity()}>Allocate Capacity</button>
                <button disabled={!selectedWorkflowRun} onClick={loadWorkflowRunCapacity}>Refresh Capacity</button>
                <label>Resource-Driven Rules (Recommended)<textarea rows={10} value={workflowTemplateJson.resourceRules} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, resourceRules: event.target.value })} /></label>
                <button disabled={!selectedWorkflow} onClick={() => saveWorkflowTemplateField("resourceRules", "resource-rules", "Resource-Driven Rules")}>Save Resource-Driven Rules</button>
                <div className="adminNotice muted">
                  <strong>Legacy Sequential Stages</strong>
                  <span>workflow_stages remains available for older workflow runs and APIs, but should not be used for new production templates.</span>
                </div>
                <label>Script Mapping<textarea rows={6} value={workflowTemplateJson.scriptMapping} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, scriptMapping: event.target.value })} /></label>
                <button disabled={!selectedWorkflow} onClick={() => saveWorkflowTemplateField("scriptMapping", "script-mapping", "Script Mapping")}>Save Script Mapping</button>
                <label>Prompt Mapping<textarea rows={6} value={workflowTemplateJson.promptMapping} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, promptMapping: event.target.value })} /></label>
                <button disabled={!selectedWorkflow} onClick={() => saveWorkflowTemplateField("promptMapping", "prompt-mapping", "Prompt Mapping")}>Save Prompt Mapping</button>
                <label>Music Policy<textarea rows={5} value={workflowTemplateJson.musicPolicy} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, musicPolicy: event.target.value })} /></label>
                <button disabled={!selectedWorkflow} onClick={() => saveWorkflowTemplateField("musicPolicy", "music-policy", "Music Policy")}>Save Music Policy</button>
                <label>Post Content Policy<textarea rows={5} value={workflowTemplateJson.postContentPolicy} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, postContentPolicy: event.target.value })} /></label>
                <button disabled={!selectedWorkflow} onClick={() => saveWorkflowTemplateField("postContentPolicy", "post-content-policy", "Post Content Policy")}>Save Post Content Policy</button>
              </div>
              <div className="adminTable">
                {workflows.filter((workflow) => compactJson(workflow).toLowerCase().includes(adminSearch.toLowerCase())).slice(0, 12).map((workflow) => (
                  <div className="adminRow" key={workflow.id} onClick={() => {
                    setSelectedWorkflowId(String(workflow.id));
                    const nextRun = workflowRuns.find((run) => run.workflowId === workflow.id);
                    setSelectedWorkflowRunId(nextRun?.id ?? "");
                    setCapacityResult(null);
                  }}>
                    <b>{workflow.name}</b><span>{workflow.status}</span><span>{displayShortId(workflow.id)}</span><span>{workflow.description ?? "-"}</span>
                    <pre>{compactJson(workflow.capacityConfig ?? {})}</pre>
                    <pre>{compactJson({
                      resourceRules: workflow.resourceRules ?? [],
                      scriptMapping: workflow.scriptMapping ?? {},
                      promptMapping: workflow.promptMapping ?? {},
                      musicPolicy: workflow.musicPolicy ?? {},
                      postContentPolicy: workflow.postContentPolicy ?? {}
                    })}</pre>
                    {workflowRuns.filter((run) => run.workflowId === workflow.id).slice(0, 4).map((run) => (
                      <div className="nestedRow" key={run.id}>
                        <span>{displayShortId(run.id)}</span><span>{run.status}</span><span>{run.currentStageNo ?? 0}</span><small>{displayDateTime(run.createdAt)}</small>
                        <button onClick={(event) => { event.stopPropagation(); setSelectedWorkflowId(String(workflow.id)); setSelectedWorkflowRunId(String(run.id)); setCapacityResult(null); }}>Select Run</button>
                        <button onClick={(event) => { event.stopPropagation(); setSelectedWorkflowId(String(workflow.id)); setSelectedWorkflowRunId(String(run.id)); allocateWorkflowCapacity(String(run.id)); }}>Allocate</button>
                      </div>
                    ))}
                  </div>
                ))}
                {capacityResult ? (
                  <div className="adminResult">
                    <strong>{capacityResult.code ?? "Capacity"}</strong>
                    <pre>{compactJson(capacityResult.details ?? capacityResult.capacityConfig)}</pre>
                    <div className="capacityAllocationList">
                      {capacityResult.allocations.map((allocation) => (
                        <div key={allocation.id}>
                          <b>{allocation.instanceId}</b>
                          <span>{allocation.status}</span>
                          <small>{getString(allocation.metadata?.stageType)} / {allocation.hostId ?? "-"} / {allocation.adbId ?? "-"}</small>
                        </div>
                      ))}
                      {!capacityResult.allocations.length ? <p className="emptyDetail">No capacity allocations yet.</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {managementSection === "instances" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Host Filter<select value={selectedHostId} onChange={(event) => setSelectedHostId(event.target.value)}><option value="">All hosts</option>{hosts.map((host) => <option key={host.id} value={host.hostId}>{host.name}</option>)}</select></label>
                <label>Pool State<select value={instancePoolStateFilter} onChange={(event) => setInstancePoolStateFilter(event.target.value)}><option value="">All states</option>{instancePoolStateOptions.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
                <label>Capability<select value={instanceCapabilityFilter} onChange={(event) => setInstanceCapabilityFilter(event.target.value)}><option value="">All capabilities</option>{instanceCapabilityOptions.map((capability) => <option key={capability} value={capability}>{capability}</option>)}</select></label>
                <label>Runtime Status<select value={instanceRuntimeFilter} onChange={(event) => setInstanceRuntimeFilter(event.target.value)}><option value="">All runtime states</option>{instanceRuntimeOptions.map((runtimeStatus) => <option key={runtimeStatus} value={runtimeStatus}>{runtimeStatus}</option>)}</select></label>
                <label>Priority<input value={memberForm.priority} onChange={(event) => setMemberForm({ ...memberForm, priority: event.target.value })} /></label>
                <button disabled={!selectedInstanceId} onClick={() => openPoolManager(selectedInstanceId)}>Manage Selected Pools</button>
              </div>
              <div className="adminTable">
                {filteredInstances
                  .slice(0, 20)
                  .map((instance) => (
                    <div className="adminRow" key={instance.id} onClick={() => setSelectedInstanceId(instance.id)}>
                      <b>{instance.id}</b><span>{instance.name ?? "-"}</span><span>{instance.adbId ?? "-"}</span><span>{instance.status} / {instance.runtimeStatus}</span><small>{displayDateTime(instance.lastSeenAt ?? undefined)}</small>
                      <span className="statusPill">{instance.currentPoolType ?? "AVAILABLE"}</span>
                      <span className="poolBadgeList">{renderCapabilityBadges(instance)}</span>
                      {hasUnknownAdbMapping(instance) ? <span className="poolBadge warningBadge">ADB mapping unknown</span> : null}
                      <span>{instance.maintenanceReason ?? "-"}</span>
                      <span className="poolBadgeList">{renderPoolBadges(instance.id)}</span>
                      <button disabled={!instance.adbId} onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "screenshot"); }}>Screenshot</button>
                      <button onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "start"); }}>Start</button>
                      <button onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "stop"); }}>Stop</button>
                      <button onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "restart"); }}>Restart</button>
                      <button onClick={(event) => { event.stopPropagation(); openPoolManager(instance.id); }}>Manage Pools</button>
                      {renderInstanceMovementActions(instance)}
                    </div>
                  ))}
                {!filteredInstances.length ? <div className="jobsEmpty">No instances match the current filters.</div> : null}
              </div>
            </div>
          ) : null}

          {managementSection === "instance-pools" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Name<input value={poolForm.name} onChange={(event) => setPoolForm({ ...poolForm, name: event.target.value })} /></label>
                <label>Pool Type<select value={poolForm.poolType} onChange={(event) => setPoolForm({ ...poolForm, poolType: event.target.value })}>{Object.keys(stageTypeToPoolType).map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>Status<input value={poolForm.status} onChange={(event) => setPoolForm({ ...poolForm, status: event.target.value })} /></label>
                <button onClick={() => adminAction("Creating pool", () => api("/instance-pools", { method: "POST", body: JSON.stringify(poolForm) }))}>Create Pool</button>
                <hr />
                <label>Selected Pool<select value={selectedPoolId} onChange={(event) => { setSelectedPoolId(event.target.value); loadPoolDetail(event.target.value); }}>{pools.map((pool) => <option key={pool.id} value={pool.id}>{pool.name}</option>)}</select></label>
                <label>Discovered Instance<select value={selectedInstanceId} onChange={(event) => setSelectedInstanceId(event.target.value)}>{instances.map((instance) => <option key={instance.id} value={instance.id}>{instance.id} / {instance.adbId ?? "no adb"}</option>)}</select></label>
                <label>Priority<input value={memberForm.priority} onChange={(event) => setMemberForm({ ...memberForm, priority: event.target.value })} /></label>
                <label>Status<input value={memberForm.status} onChange={(event) => setMemberForm({ ...memberForm, status: event.target.value })} /></label>
                <label>Notes<input value={memberForm.metadata} onChange={(event) => setMemberForm({ ...memberForm, metadata: event.target.value })} /></label>
                <button disabled={!selectedPoolId || !selectedInstanceId} onClick={() => addInstanceToPool()}>Add Instance</button>
              </div>
              <div className="adminTable">
                {pools.slice(0, 20).map((pool) => (
                  <div className="adminRow" key={pool.id} onClick={() => { setSelectedPoolId(pool.id); loadPoolDetail(pool.id); }}>
                    <b>{pool.name}</b><span>{pool.poolType}</span><span>{pool.status}</span>
                    {(pool.members ?? []).map((member) => (
                      <div className="nestedRow" key={member.id}>
                        <span>{member.instanceId}</span><span>{member.status}</span><span>{member.priority}</span><small>{member.instance?.adbId ?? compactJson(member.metadata)}</small>
                        <button onClick={(event) => { event.stopPropagation(); adminAction("Updating member", () => api(`/instance-pools/${pool.id}/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ status: member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", metadata: member.metadata ?? {} }) }).then(() => loadPoolDetail(pool.id))); }}>Toggle Status</button>
                        <button onClick={(event) => { event.stopPropagation(); adminAction("Mark error", () => api(`/instance-pools/${pool.id}/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ status: "ERROR" }) }).then(() => loadPoolDetail(pool.id))); }}>Mark Error</button>
                        <button onClick={(event) => { event.stopPropagation(); adminAction("Removing member", () => api(`/instance-pools/${pool.id}/members/${member.id}`, { method: "DELETE" }).then(() => loadPoolDetail(pool.id))); }}>Remove</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {managementSection === "scripts" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Name<input value={scriptForm.name} onChange={(event) => setScriptForm({ ...scriptForm, name: event.target.value })} /></label>
                <label>Category<select value={scriptForm.category} onChange={(event) => setScriptForm({ ...scriptForm, category: event.target.value })}>{scriptCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label>Description<input value={scriptForm.description} onChange={(event) => setScriptForm({ ...scriptForm, description: event.target.value })} /></label>
                <label>Status<input value={scriptForm.status} onChange={(event) => setScriptForm({ ...scriptForm, status: event.target.value })} /></label>
                <button onClick={() => adminAction("Creating script", () => api<ScriptRecord>("/scripts", { method: "POST", body: JSON.stringify({ name: scriptForm.name, category: scriptForm.category, description: scriptForm.description, status: scriptForm.status }) }).then((script) => { setSelectedScriptId(script.id); return script; }))}>Create Script</button>
                <button disabled={!selectedScriptId} onClick={saveScriptMetadata}>Save Metadata</button>
                <label>Script<select value={selectedScriptId} onChange={(event) => {
                  const scriptId = event.target.value;
                  const script = scripts.find((item) => item.id === scriptId);
                  setSelectedScriptId(scriptId);
                  if (script) setScriptForm({ ...scriptForm, name: script.name, category: script.category ?? "UTILITY", description: script.description ?? "", status: script.status });
                }}>{scripts.map((script) => <option key={script.id} value={script.id}>{script.name} / {script.category ?? "UTILITY"}</option>)}</select></label>
                <label>Version<select value={selectedScriptVersionId} onChange={(event) => {
                  const versionId = event.target.value;
                  const version = scriptVersions.find((item) => item.id === versionId);
                  setSelectedScriptVersionId(versionId);
                  if (version) setScriptForm({ ...scriptForm, steps: compactJson({ steps: version.steps ?? [], variables: version.variables ?? {}, retryPolicy: version.retryPolicy ?? {}, detectionPolicy: version.detectionPolicy ?? {} }) });
                }}><option value="">Latest active</option>{scriptVersions.map((version) => <option key={version.id} value={version.id}>v{version.versionNo} / {version.status}</option>)}</select></label>
                <label>Steps JSON<textarea value={scriptForm.steps} onChange={(event) => setScriptForm({ ...scriptForm, steps: event.target.value })} /></label>
                <button disabled={!selectedScriptId} onClick={createScriptVersion}>Create Version</button>
                <button disabled={!selectedScriptVersionId} onClick={updateScriptVersion}>Save Version</button>
                <button disabled={!selectedScriptVersionId} onClick={activateScriptVersion}>Activate Version</button>
                <label>Host<select value={selectedHost?.id ?? ""} onChange={(event) => setSelectedHostId(event.target.value)}>{hosts.map((host) => <option key={host.id} value={host.id}>{host.name} / {host.hostId}</option>)}</select></label>
                <label>Instance<select value={selectedInstanceId} onChange={(event) => {
                  const instance = instances.find((item) => item.id === event.target.value);
                  setSelectedInstanceId(event.target.value);
                  setHostInstanceId(event.target.value);
                  setHostAdbId(instance?.adbId ?? "");
                }}><option value="">Select instance</option>{instances.map((instance) => <option key={instance.id} value={instance.id}>{instance.id} / {instance.adbId ?? "no adb"}</option>)}</select></label>
                <label>ADB ID<input value={hostAdbId} onChange={(event) => setHostAdbId(event.target.value)} /></label>
                <button disabled={!selectedScriptId} onClick={testRunSelectedScript}>Test Run</button>
              </div>
              <div className="adminTable">
                {scripts.filter((script) => compactJson(script).toLowerCase().includes(adminSearch.toLowerCase())).slice(0, 12).map((script) => (
                  <div className="adminRow" key={script.id} onClick={() => {
                    setSelectedScriptId(script.id);
                    setScriptForm({ ...scriptForm, name: script.name, category: script.category ?? "UTILITY", description: script.description ?? "", status: script.status });
                  }}>
                    <b>{script.name}</b><span>{script.category ?? "UTILITY"}</span><span>{script.status}</span><small>{displayShortId(script.id)}</small>
                    <span>{script.description ?? "-"}</span>
                  </div>
                ))}
                {latestSelectedScriptRuns.map((run) => (
                  <div className="adminRow" key={run.id}>
                    <b>Run {displayShortId(run.id)}</b><span>{run.status}</span><span>Step {run.currentStepNo}</span><small>{displayShortId(run.runtimeSessionId)}</small>
                    <button onClick={() => selectRuntimeSession(runtimeSessions.find((session) => session.id === run.runtimeSessionId) ?? { id: run.runtimeSessionId, status: run.status, currentStepNo: run.currentStepNo })}>View Timeline</button>
                    {(run.steps ?? []).slice(0, 6).map((step) => (
                      <div className="nestedRow" key={step.id}>
                        <span>{step.stepNo}. {step.stepType}</span><span>{step.status}</span><span>{step.errorMessage ?? "-"}</span><small>{displayDateTime(step.finishedAt ?? undefined)}</small>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {managementSection === "prompt-templates" ? (
            <div className="promptManager">
              <aside className="promptCategorySidebar">
                <button className="primaryButton" onClick={() => setShowPromptCreateModal(true)}>New Prompt Template</button>
                {promptCategoryOptions.map((category) => (
                  <button
                    key={category}
                    className={selectedPromptCategory === category ? "active" : ""}
                    onClick={() => setSelectedPromptCategory(category)}
                  >
                    <span>{category}</span>
                    <b>{promptCategoryCounts[category] ?? 0}</b>
                  </button>
                ))}
              </aside>

              <section className="promptMainPanel">
                <div className="promptFilters">
                  <label>Category<select value={selectedPromptCategory} onChange={(event) => setSelectedPromptCategory(event.target.value)}><option value="">All categories</option>{promptCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                  <label>Status<select value={promptStatusFilter} onChange={(event) => setPromptStatusFilter(event.target.value)}><option value="">All statuses</option><option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option></select></label>
                  <label>Has Variable<select value={promptHasVariableFilter} onChange={(event) => setPromptHasVariableFilter(event.target.value)}><option value="">Any</option><option value="yes">Has variables</option><option value="no">No variables</option></select></label>
                  <label>Updated<select value={promptRecentFilter} onChange={(event) => setPromptRecentFilter(event.target.value)}><option value="">Any time</option><option value="recent">Last 7 days</option></select></label>
                </div>

                <div className="promptCardGrid">
                  {filteredPromptCards.map((template) => (
                    <article className={`promptTemplateCard ${selectedTemplateId === template.id ? "selected" : ""}`} key={template.id}>
                      <div className="promptCardHeader">
                        <strong>{template.name}</strong>
                        <span className="poolBadge capabilityBadge">{template.normalizedCategory}</span>
                      </div>
                      <div className="promptCardMeta">
                        <span className="statusPill">{template.status ?? "active"}</span>
                        <span>v{template.activeVersion?.versionNo ?? "-"}</span>
                        <small>{displayDateTime(template.updatedAt ?? undefined)}</small>
                      </div>
                      <pre>{template.preview || "No version text yet."}</pre>
                      <div className="poolBadgeList">
                        {template.variables.slice(0, 6).map((variable) => <span className="poolBadge" key={variable}>{variable}</span>)}
                        {!template.variables.length ? <span className="poolBadge empty">No variables</span> : null}
                      </div>
                      <div className="promptCardActions">
                        <button className="iconButton" title="View or edit template" aria-label="View or edit template" onClick={() => openPromptTemplate(template.id, "overview")}><Edit3 size={15} /></button>
                        <button className="iconButton" title="Duplicate template" aria-label="Duplicate template" onClick={() => duplicatePromptTemplate(template)}><Copy size={15} /></button>
                        <button className="iconButton" title="Preview template" aria-label="Preview template" onClick={() => openPromptTemplate(template.id, "preview")}><Eye size={15} /></button>
                        <button className="iconButton" title="Activate active version" aria-label="Activate active version" disabled={!template.activeVersion} onClick={() => activatePromptVersion(template.activeVersion?.id)}><Check size={15} /></button>
                        <button className="iconButton" disabled title="Template archive API is not available yet" aria-label="Archive template"><Archive size={15} /></button>
                        <button className="iconButton dangerIconButton" title="Delete template" aria-label="Delete template" onClick={() => deletePromptTemplate(template)}><Trash2 size={15} /></button>
                      </div>
                    </article>
                  ))}
                  {!filteredPromptCards.length ? <p className="emptyDetail">No prompt templates match these filters.</p> : null}
                </div>
              </section>

              {promptDetail ? (
                <aside className="promptDrawer panel">
                  <div className="drawerHeader">
                    <div>
                      <strong>{promptDetail.name}</strong>
                      <small>{normalizePromptCategory(promptDetail.category)} / {displayShortId(promptDetail.id)}</small>
                    </div>
                    <button className="iconButton" onClick={() => setPromptDetail(null)} title="Close prompt drawer">x</button>
                  </div>
                  <div className="promptDrawerTabs">
                    {["overview", "versions", "editor", "preview"].map((tab) => (
                      <button key={tab} className={promptDrawerTab === tab ? "active" : ""} onClick={() => setPromptDrawerTab(tab as typeof promptDrawerTab)}>{tab}</button>
                    ))}
                  </div>

                  {promptDrawerTab === "overview" ? (
                    <section className="drawerSection">
                      <div className="detailList">
                        <span>Name <b>{promptDetail.name}</b></span>
                        <span>Category <b>{normalizePromptCategory(promptDetail.category)}</b></span>
                        <span>Description <b>{promptDetail.description ?? "-"}</b></span>
                        <span>Status <b>{promptDetail.status ?? "active"}</b></span>
                        <span>Active Version <b>v{promptDetail.activeVersion?.versionNo ?? "-"}</b></span>
                        <span>Created <b>{displayDateTime(promptDetail.createdAt ?? undefined)}</b></span>
                        <span>Updated <b>{displayDateTime(promptDetail.updatedAt ?? undefined)}</b></span>
                      </div>
                      <div className="adminNotice muted">
                        <strong>Integration Hints</strong>
                        <span>Workflow prompt mapping and Production Studio selections can use this template category. Usage tracking is not available yet.</span>
                      </div>
                    </section>
                  ) : null}

                  {promptDrawerTab === "versions" ? (
                    <section className="drawerSection">
                      <div className="promptVersionList">
                        {(promptDetail.versions ?? []).map((version) => (
                          <div key={version.id}>
                            <b>v{version.versionNo}</b>
                            <span>{version.status}</span>
                            <small>{displayDateTime(version.createdAt ?? undefined)}</small>
                            <pre>{version.templateText}</pre>
                            <div className="controlActions">
                              <button onClick={() => activatePromptVersion(version.id)}>Activate</button>
                              <button onClick={() => { setPromptEditorText(version.templateText); setPromptDrawerTab("editor"); }}>Duplicate Version</button>
                            </div>
                          </div>
                        ))}
                        {!promptDetail.versions?.length ? <p className="emptyDetail">No versions yet.</p> : null}
                      </div>
                    </section>
                  ) : null}

                  {promptDrawerTab === "editor" ? (
                    <section className="drawerSection promptEditorSection">
                      <textarea value={promptEditorText} onChange={(event) => setPromptEditorText(event.target.value)} />
                      <div className="variableHelperPanel">
                        {promptVariableHelpers.map((group) => (
                          <div key={group.group}>
                            <strong>{group.group}</strong>
                            <div className="poolBadgeList">
                              {group.values.map((variable) => <button key={variable} onClick={() => insertPromptVariable(variable)}>{variable}</button>)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="controlActions">
                        <button onClick={() => savePromptVersion("draft")} disabled={!promptEditorText.trim()}>Save Draft</button>
                        <button onClick={() => savePromptVersion("active")} disabled={!promptEditorText.trim()}>Save as New Version</button>
                      </div>
                    </section>
                  ) : null}

                  {promptDrawerTab === "preview" ? (
                    <section className="drawerSection promptPreviewSection">
                      <label>Character Group<select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}><option value="">Manual sample only</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                      <label>Sample Context JSON<textarea value={promptPreviewContext} onChange={(event) => setPromptPreviewContext(event.target.value)} /></label>
                      <button onClick={renderPromptPreview}>Render</button>
                      <div className="promptRenderedOutput">
                        <strong>Rendered Prompt</strong>
                        <p>{promptPreviewResult.rendered || "Rendered output will appear here."}</p>
                        <small>Variables replaced: {promptPreviewResult.replaced.join(", ") || "-"}</small>
                        <small>Missing variables: {promptPreviewResult.missing.join(", ") || "-"}</small>
                      </div>
                    </section>
                  ) : null}
                </aside>
              ) : null}

              {showPromptCreateModal ? (
                <div className="instanceDrawerOverlay">
                  <aside className="promptCreateModal">
                    <div className="drawerHeader">
                      <div>
                        <strong>New Prompt Template</strong>
                        <small>Create a template and first version</small>
                      </div>
                      <button className="iconButton" onClick={() => setShowPromptCreateModal(false)} title="Close prompt modal">x</button>
                    </div>
                    <div className="adminForm">
                      <label>Name<input value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} /></label>
                      <label>Category<select value={templateForm.category} onChange={(event) => setTemplateForm({ ...templateForm, category: event.target.value })}>{promptCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                      <label>Description<input value={templateForm.description} onChange={(event) => setTemplateForm({ ...templateForm, description: event.target.value })} /></label>
                      <label>Status<select value={templateForm.status} onChange={(event) => setTemplateForm({ ...templateForm, status: event.target.value })}><option value="active">active</option><option value="draft">draft</option></select></label>
                      <label>Initial Template Text<textarea rows={12} value={templateForm.templateText} onChange={(event) => setTemplateForm({ ...templateForm, templateText: event.target.value })} /></label>
                      <div className="controlActions">
                        <button onClick={createPromptTemplateFlow} disabled={busy || !templateForm.name || !templateForm.templateText}>Create</button>
                        <button className="secondaryButton" onClick={() => setShowPromptCreateModal(false)}>Cancel</button>
                      </div>
                    </div>
                  </aside>
                </div>
              ) : null}
            </div>
          ) : null}

          {managementSection === "characters" ? (
            <div className="charactersPage">
              <aside className="adminForm characterFilters">
                <label>Search<input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search by name" /></label>
                <label>Status<select value={characterFilters.status} onChange={(event) => setCharacterFilters({ ...characterFilters, status: event.target.value })}>
                  <option value="">All</option>
                  <option value="alive">Alive</option>
                  <option value="rip">R.I.P</option>
                </select></label>
                <div className="assetMiniGrid">
                  <label>Age Min<input type="number" value={characterFilters.ageMin} onChange={(event) => setCharacterFilters({ ...characterFilters, ageMin: event.target.value })} /></label>
                  <label>Age Max<input type="number" value={characterFilters.ageMax} onChange={(event) => setCharacterFilters({ ...characterFilters, ageMax: event.target.value })} /></label>
                </div>
                <label className="toggleControl"><input type="checkbox" checked={characterFilters.hasYoung} onChange={(event) => setCharacterFilters({ ...characterFilters, hasYoung: event.target.checked })} />Has young image</label>
                <label className="toggleControl"><input type="checkbox" checked={characterFilters.hasOld} onChange={(event) => setCharacterFilters({ ...characterFilters, hasOld: event.target.checked })} />Has old image</label>
                <label>Group<select value={characterFilters.groupState} onChange={(event) => setCharacterFilters({ ...characterFilters, groupState: event.target.value })}>
                  <option value="">Any</option>
                  <option value="in-group">In group</option>
                  <option value="no-group">Not in any group</option>
                </select></label>
                <label>Tag<select value={characterFilters.tag} onChange={(event) => setCharacterFilters({ ...characterFilters, tag: event.target.value })}>
                  <option value="">All tags</option>
                  {characterTagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select></label>
              </aside>

              <section className="characterGrid">
                {filteredCharacters.map((character) => {
                  const young = character.sourceImages?.youngOriginalImage;
                  const old = character.sourceImages?.oldOriginalImage;
                  const youngThumb = listImageUrl(young);
                  const oldThumb = listImageUrl(old);
                  return (
                    <button className={`characterCard ${selectedCharacterId === character.id ? "selected" : ""}`} key={character.id} onClick={() => setSelectedCharacterId(character.id)}>
                      <div className="characterThumbPair">
                        <div>{youngThumb ? <img src={youngThumb} alt={`${character.name} young thumbnail`} /> : <span>Young thumbnail pending</span>}</div>
                        <div>{oldThumb ? <img src={oldThumb} alt={`${character.name} old thumbnail`} /> : <span>Old thumbnail pending</span>}</div>
                      </div>
                      <strong>{character.name}</strong>
                      <span>{String(character.status ?? "unknown").toLowerCase() === "rip" ? "R.I.P" : "Alive"} / {character.age ?? "-"}</span>
                      <small>{character.groupCount ?? 0} groups / {character.relatedAssetCount ?? 0} assets</small>
                      <small>{displayDateTime(character.updatedAt ?? undefined)}</small>
                      {!young || !old ? <em className="warningText">Source image incomplete</em> : null}
                    </button>
                  );
                })}
                {!filteredCharacters.length ? <p className="emptyDetail">No characters match these filters.</p> : null}
              </section>

              {characterDetail ? (
                <aside className="characterDrawer panel">
                  <div className="drawerHeader">
                    <div>
                      <strong>{characterDetail.character.name}</strong>
                      <small>{displayShortId(characterDetail.character.id)} / {characterDetail.groups.length} groups</small>
                    </div>
                    <button className="iconButton" onClick={() => setCharacterDetail(null)} title="Close character detail">x</button>
                  </div>
                  <div className="characterDetailThumbs">
                    <div>{listImageUrl(characterDetail.sourceImages.youngOriginalImage) ? <img src={listImageUrl(characterDetail.sourceImages.youngOriginalImage)} alt="Young thumbnail" /> : <span>Young thumbnail pending</span>}</div>
                    <div>{listImageUrl(characterDetail.sourceImages.oldOriginalImage) ? <img src={listImageUrl(characterDetail.sourceImages.oldOriginalImage)} alt="Old thumbnail" /> : <span>Old thumbnail pending</span>}</div>
                  </div>

                  <section className="drawerSection">
                    <div className="drawerSectionHeader"><strong>Basic Info</strong></div>
                    <div className="characterEditGrid">
                      <label>Name<input value={characterForm.name} onChange={(event) => setCharacterForm({ ...characterForm, name: event.target.value })} /></label>
                      <label>Status<select value={characterForm.status} onChange={(event) => setCharacterForm({ ...characterForm, status: event.target.value })}><option value="alive">Alive</option><option value="rip">R.I.P</option><option value="unknown">Unknown</option></select></label>
                      <label>Age<input type="number" value={characterForm.age} onChange={(event) => setCharacterForm({ ...characterForm, age: event.target.value })} /></label>
                    </div>
                    <label className="jsonLabel">Metadata JSON<textarea rows={5} value={characterForm.metadata} onChange={(event) => setCharacterForm({ ...characterForm, metadata: event.target.value })} /></label>
                    <div className="detailList">
                      <span>Created <b>{displayDateTime(characterDetail.character.createdAt ?? undefined)}</b></span>
                      <span>Updated <b>{displayDateTime(characterDetail.character.updatedAt ?? undefined)}</b></span>
                    </div>
                    <div className="controlActions">
                      <button onClick={saveSelectedCharacter} disabled={busy}>Save Character</button>
                      <button className="dangerButton" onClick={deleteSelectedCharacter} disabled={busy}>Delete Character</button>
                    </div>
                  </section>

                  <section className="drawerSection">
                    <div className="drawerSectionHeader"><strong>Original Source Images</strong><small>Attached to Character only</small></div>
                    <div className="sourceImageGrid">
                      {[
                        ["young", characterDetail.sourceImages.youngOriginalImage, "Young Original Image"],
                        ["old", characterDetail.sourceImages.oldOriginalImage, "Old Original Image"]
                      ].map(([role, asset, label]) => {
                        const sourceAsset = asset as AssetRecord | null | undefined;
                        return (
                          <article className="sourceImageCard" key={String(role)}>
                            <div className="assetPreview">{listImageUrl(sourceAsset) ? <img src={listImageUrl(sourceAsset)} alt={String(label)} /> : <span>{String(label)} thumbnail pending</span>}</div>
                            <strong>{String(label)}</strong>
                            <small>{sourceAsset?.assetSubType ?? "-"}</small>
                            <div className="controlActions">
                              <button disabled={!sourceAsset} onClick={() => sourceAsset && window.open(originalImageUrl(sourceAsset), "_blank")}>View</button>
                              <button onClick={() => createCharacterSourceVersion(role as "young" | "old")}>Upload Version</button>
                              <button disabled={!sourceAsset} onClick={() => markActiveSourceImage(sourceAsset?.id)}>Mark Active</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  <section className="drawerSection">
                    <div className="drawerSectionHeader"><strong>Character Groups</strong></div>
                    <div className="addToGroupRow">
                      <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
                      <button disabled={!selectedGroupId} onClick={addCharacterToSelectedGroup}>Add to Group</button>
                    </div>
                    <div className="characterRelationList">
                      {characterDetail.groups.map((group) => (
                        <div key={`${group.id}-${group.memberId}`}>
                          <b>{group.name}</b>
                          <span>{displayShortId(group.id)} / {group.memberCount ?? 0} members</span>
                          <small>{group.attributesSummary || "No attributes"}</small>
                          <div className="controlActions">
                            <button onClick={() => setSelectedGroupId(group.id)}>Open Group</button>
                            <button onClick={() => removeCharacterFromGroup(group.id, group.memberId)}>Remove</button>
                          </div>
                        </div>
                      ))}
                      {!characterDetail.groups.length ? <p className="emptyDetail">This character is not in any group.</p> : null}
                    </div>
                  </section>

                  <section className="drawerSection">
                    <div className="drawerSectionHeader"><strong>Related Assets</strong></div>
                    {[
                      ["Original Images", characterDetail.relatedAssets.originalImages],
                      ["Edited Images", characterDetail.relatedAssets.editedImages],
                      ["Video Transitions", characterDetail.relatedAssets.videoTransitions],
                      ["Final Videos", characterDetail.relatedAssets.finalVideos],
                      ["Post Content", characterDetail.relatedAssets.postContent]
                    ].map(([label, items]) => (
                      <div className="assetSection" key={String(label)}>
                        <strong>{String(label)}</strong>
                        <div className="relatedAssetGrid">
                          {(items as Array<AssetRecord | ProductionBatch>).slice(0, 12).map((item) => {
                            const record = item as AssetRecord & ProductionBatch;
                            const isAsset = Boolean(record.assetCategory || record.assetType);
                            return (
                              <button key={record.id} onClick={() => isAsset ? setSelectedAssetId(record.id) : setSelectedResourceId(record.id)}>
                                <span>{isAsset && listImageUrl(record) ? <img src={listImageUrl(record)} alt={record.name ?? record.batchType} /> : displayShortId(record.id)}</span>
                                <b>{record.name ?? record.batchType}</b>
                                <small>{record.assetSubType ?? record.status} / {displayDateTime(record.createdAt)}</small>
                                <small>job {displayShortId(getString(getRecord(record.metadata).sourceJobId))}</small>
                              </button>
                            );
                          })}
                          {!(items as unknown[]).length ? <p className="emptyDetail">No records yet.</p> : null}
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="drawerSection">
                    <div className="drawerSectionHeader"><strong>Jobs / Production History</strong></div>
                    {["IMAGE_EDIT", "VIDEO_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT"].map((jobType) => (
                      <div className="assetSection" key={jobType}>
                        <strong>{jobType}</strong>
                        <div className="characterJobList">
                          {(characterDetail.relatedJobs.grouped[jobType] ?? []).map((job) => (
                            <button key={job.id} onClick={() => loadJobDetail(job)}>
                              <b>{displayShortId(job.id)}</b>
                              <span>{job.status}</span>
                              <small>source {displayShortId(job.sourceBatchId)}</small>
                              <small>output {displayShortId(getString(getRecord(job.output).outputBatchId) || getString(getRecord(job.payload).outputBatchId))}</small>
                              <small>{displayDateTime(job.createdAt)}</small>
                            </button>
                          ))}
                          {!(characterDetail.relatedJobs.grouped[jobType] ?? []).length ? <p className="emptyDetail">No jobs yet.</p> : null}
                        </div>
                      </div>
                    ))}
                  </section>
                </aside>
              ) : null}
            </div>
          ) : null}

          {managementSection === "character-groups" ? (
            <div className="groupManager">
              <div className="groupKpis">
                <div><span>Total Groups</span><b>{groupKpis.total}</b></div>
                <div><span>Active Groups</span><b>{groupKpis.active}</b></div>
                <div><span>Average Group Size</span><b>{groupKpis.averageSize}</b></div>
                <div><span>Ready for Production</span><b>{groupKpis.ready}</b></div>
                <div><span>Missing Source Images</span><b>{groupKpis.missingImages}</b></div>
              </div>

              <div className="groupFilters">
                <label>Search<input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search group name" /></label>
                <label>Status<select value={groupFilters.status} onChange={(event) => setGroupFilters({ ...groupFilters, status: event.target.value })}><option value="">All</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
                <label>Group Size<select value={groupFilters.size} onChange={(event) => setGroupFilters({ ...groupFilters, size: event.target.value })}><option value="">All</option><option value="3">3</option><option value="5">5</option><option value="6">6</option><option value="custom">Custom</option></select></label>
                {groupFilters.size === "custom" ? <label>Custom<input type="number" min="1" value={groupFilters.customSize} onChange={(event) => setGroupFilters({ ...groupFilters, customSize: event.target.value })} /></label> : null}
                <label className="toggleControl"><input type="checkbox" checked={groupFilters.missingImages} onChange={(event) => setGroupFilters({ ...groupFilters, missingImages: event.target.checked })} /> Missing images</label>
                <label className="toggleControl"><input type="checkbox" checked={groupFilters.hasAttributes} onChange={(event) => setGroupFilters({ ...groupFilters, hasAttributes: event.target.checked })} /> Has attributes</label>
                <label>Production<select value={groupFilters.productionUse} onChange={(event) => setGroupFilters({ ...groupFilters, productionUse: event.target.value })}><option value="">Any</option><option value="used">Used</option><option value="unused">Not used</option></select></label>
                <label className="toggleControl"><input type="checkbox" checked={groupFilters.recent} onChange={(event) => setGroupFilters({ ...groupFilters, recent: event.target.checked })} /> Created recently</label>
                <button className="primaryButton" onClick={() => { setShowGroupCreate(true); setGroupForm({ ...groupForm, ...defaultGroupDraft() }); setGroupCreateMode("random"); }}>New Group</button>
              </div>

              {showGroupCreate ? (
                <section className="groupBuilder panel">
                  <div className="drawerHeader">
                    <div><strong>New Group</strong><small>Choose characters, then save as Draft or Active.</small></div>
                    <button className="iconButton" onClick={() => setShowGroupCreate(false)}>x</button>
                  </div>
                  <div className="groupBuilderFields">
                    <label>Name<input value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} /></label>
                    <label>Status<select value={groupForm.status} onChange={(event) => setGroupForm({ ...groupForm, status: event.target.value })}><option value="draft">draft</option><option value="active">active</option><option value="archived">archived</option></select></label>
                    <label>Size<select value={groupCreateSize} onChange={(event) => setGroupCreateSize(event.target.value)}><option value="3">3</option><option value="5">5</option><option value="6">6</option><option value="8">8</option></select></label>
                    <label>Mode<select value={groupCreateMode} onChange={(event) => setGroupCreateMode(event.target.value as typeof groupCreateMode)}><option value="random">Full Random</option><option value="partial-random">Partial Manual + Random</option><option value="manual">Full Manual</option></select></label>
                    <label>Description<input value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} /></label>
                    <button className="primaryButton" onClick={createCharacterGroupFromBuilder}>Save Group</button>
                  </div>
                  <div className="groupPickerFilters">
                    <label>Character<input value={groupFilters.characterSearch} onChange={(event) => setGroupFilters({ ...groupFilters, characterSearch: event.target.value })} /></label>
                    <label>Status<select value={groupFilters.characterStatus} onChange={(event) => setGroupFilters({ ...groupFilters, characterStatus: event.target.value })}><option value="">All</option><option value="alive">Alive</option><option value="rip">R.I.P</option></select></label>
                    <label>Age Min<input type="number" value={groupFilters.ageMin} onChange={(event) => setGroupFilters({ ...groupFilters, ageMin: event.target.value })} /></label>
                    <label>Age Max<input type="number" value={groupFilters.ageMax} onChange={(event) => setGroupFilters({ ...groupFilters, ageMax: event.target.value })} /></label>
                    <label className="toggleControl"><input type="checkbox" checked={groupFilters.hasYoung} onChange={(event) => setGroupFilters({ ...groupFilters, hasYoung: event.target.checked })} /> Has young</label>
                    <label className="toggleControl"><input type="checkbox" checked={groupFilters.hasOld} onChange={(event) => setGroupFilters({ ...groupFilters, hasOld: event.target.checked })} /> Has old</label>
                    <label className="toggleControl"><input type="checkbox" checked={groupFilters.notSelected} onChange={(event) => setGroupFilters({ ...groupFilters, notSelected: event.target.checked })} /> Not selected</label>
                  </div>
                  <div className="selectedMemberStrip">
                    <strong>{groupCreateMemberIds.length} selected</strong>
                    {groupCreateMemberIds.map((id) => <span key={id}>{characters.find((character) => character.id === id)?.name ?? displayShortId(id)}</span>)}
                  </div>
                  <div className="groupCharacterPicker">
                    {groupPickerCharacters.slice(0, 80).map((character) => {
                      const selected = groupCreateMemberIds.includes(character.id);
                      return (
                        <button className={selected ? "selected" : ""} key={character.id} onClick={() => toggleGroupCreateMember(character.id)}>
                          <div className="miniThumbPair">
                            <span>{listImageUrl(character.sourceImages?.youngOriginalImage) ? <img src={listImageUrl(character.sourceImages?.youngOriginalImage)} alt={`${character.name} young`} /> : "Young missing"}</span>
                            <span>{listImageUrl(character.sourceImages?.oldOriginalImage) ? <img src={listImageUrl(character.sourceImages?.oldOriginalImage)} alt={`${character.name} old`} /> : "Old missing"}</span>
                          </div>
                          <b>{character.name}</b>
                          <small>{character.status} / {character.age ?? "-"}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <div className="groupWorkspace">
                <div className="groupCardGrid">
                  {filteredGroupCards.map((group) => (
                    <article className={`groupCard ${selectedGroupId === group.id ? "selected" : ""}`} key={group.id} onClick={() => openCharacterGroup(group.id, "overview")}>
                      <div className="groupCardHeader">
                        <div><strong>{group.name}</strong><small>{displayShortId(group.id)} / {displayDateTime(group.createdAt ?? undefined)}</small></div>
                        <span className={`readinessBadge ${groupReadinessClass(group.readiness)}`}>{group.readiness?.label ?? "Empty Group"}</span>
                      </div>
                      <div className="groupMetaRow">
                        <span>{group.status ?? "draft"}</span>
                        <span>{group.memberCount ?? 0} members</span>
                        <span>{group.productionBatchCount ?? 0} batches</span>
                      </div>
                      <p>{group.attributesSummary || "No attributes assigned."}</p>
                      <div className="memberAvatarRow">
                        {(group.membersPreview ?? []).map((member) => (
                          <div key={member.memberId ?? member.character.id} title={member.character.name ?? ""}>
                            <span>{thumbnailPairUrl(member.youngOriginalImage, member.youngThumbnailUrl) ? <img src={thumbnailPairUrl(member.youngOriginalImage, member.youngThumbnailUrl)} alt="young" /> : "!"}</span>
                            <span>{thumbnailPairUrl(member.oldOriginalImage, member.oldThumbnailUrl) ? <img src={thumbnailPairUrl(member.oldOriginalImage, member.oldThumbnailUrl)} alt="old" /> : "!"}</span>
                            <small>{member.character.name}</small>
                          </div>
                        ))}
                        {!(group.membersPreview ?? []).length ? <em>Empty group</em> : null}
                      </div>
                      <div className="controlActions">
                        <button className="iconButton" title="Open detail" aria-label="Open detail" onClick={(event) => { event.stopPropagation(); openCharacterGroup(group.id, "overview"); }}><Eye size={15} /></button>
                        <button className="iconButton" title="Edit group" aria-label="Edit group" onClick={(event) => { event.stopPropagation(); openCharacterGroup(group.id, "overview"); }}><Edit3 size={15} /></button>
                        <button className="iconButton" title="Shuffle positions" aria-label="Shuffle positions" onClick={(event) => { event.stopPropagation(); shuffleGroupMembers(group.id); }}><Shuffle size={15} /></button>
                        <button className="iconButton" title="Duplicate group" aria-label="Duplicate group" onClick={(event) => { event.stopPropagation(); duplicateSelectedGroup(group.id); }}><Copy size={15} /></button>
                        <button className="iconButton" title="Create production batch" aria-label="Create production batch" onClick={(event) => { event.stopPropagation(); createBatchForGroup(group.id, group.readiness); }}><PackagePlus size={15} /></button>
                        <button className="iconButton" title="Archive group" aria-label="Archive group" onClick={(event) => { event.stopPropagation(); api(`/character-groups/${group.id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) }).then(loadData); }}><Archive size={15} /></button>
                        <button className="iconButton dangerIconButton" title="Delete group" aria-label="Delete group" onClick={(event) => { event.stopPropagation(); deleteCharacterGroup(group); }}><Trash2 size={15} /></button>
                      </div>
                    </article>
                  ))}
                  {!filteredGroupCards.length ? <p className="emptyDetail">No groups match the current filters.</p> : null}
                </div>

                {selectedGroupDetail ? (
                  <aside className="groupDrawer panel">
                    <div className="drawerHeader">
                      <div><strong>{selectedGroupDetail.group.name}</strong><small>{selectedGroupDetail.group.memberCount ?? 0} members / {selectedGroupDetail.readiness.label}</small></div>
                      <button className="iconButton" onClick={() => setSelectedGroupDetail(null)}>x</button>
                    </div>
                    <div className="drawerTabs">
                      {(["overview", "members", "attributes", "history", "debug"] as const).map((tab) => <button className={groupDrawerTab === tab ? "active" : ""} key={tab} onClick={() => setGroupDrawerTab(tab)}>{tab}</button>)}
                    </div>
                    {groupDrawerTab === "overview" ? (
                      <section className="drawerSection">
                        <label>Name<input value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} /></label>
                        <label>Status<select value={groupForm.status} onChange={(event) => setGroupForm({ ...groupForm, status: event.target.value })}><option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option></select></label>
                        <label>Description<input value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} /></label>
                        <span className={`readinessBadge ${groupReadinessClass(selectedGroupDetail.readiness)}`}>{selectedGroupDetail.readiness.label}</span>
                        <small>{selectedGroupDetail.group.attributesSummary || "No attributes"}</small>
                        <small>Created {displayDateTime(selectedGroupDetail.group.createdAt ?? undefined)} / Updated {displayDateTime(selectedGroupDetail.group.updatedAt ?? undefined)}</small>
                        <div className="controlActions"><button onClick={saveSelectedGroup}>Save</button><button onClick={() => createBatchForGroup(selectedGroupDetail.group.id, selectedGroupDetail.readiness)}>Create Production Batch</button><button className="dangerButton" onClick={() => deleteCharacterGroup(selectedGroupDetail.group)}>Delete Group</button></div>
                      </section>
                    ) : null}
                    {groupDrawerTab === "members" ? (
                      <section className="drawerSection">
                        <div className="memberToolbar">
                          <button className="secondaryButton" onClick={shuffleSelectedGroupMembers}><Shuffle size={15} /> Shuffle Positions</button>
                          <small>Drag members to manually set video position order. This order is used by group asset and production batch snapshots.</small>
                        </div>
                        <div className="groupMemberList">
                          {selectedGroupDetail.members.map((member) => (
                            <article
                              draggable
                              className={draggedGroupMemberId === member.memberId ? "dragging" : ""}
                              key={member.memberId ?? member.character.id}
                              onDragStart={() => setDraggedGroupMemberId(String(member.memberId ?? ""))}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => reorderSelectedGroupMembers(member.memberId)}
                              onDragEnd={() => setDraggedGroupMemberId("")}
                            >
                              <span className="memberPosition">#{Number(member.sortOrder ?? 0) + 1}</span>
                              <div className="memberSourceThumb">
                                {thumbnailPairUrl(member.youngOriginalImage, member.youngThumbnailUrl) ? <img src={thumbnailPairUrl(member.youngOriginalImage, member.youngThumbnailUrl)} alt={`${member.character.name} young`} /> : <span>Young missing</span>}
                              </div>
                              <div className="memberSourceThumb">
                                {thumbnailPairUrl(member.oldOriginalImage, member.oldThumbnailUrl) ? <img src={thumbnailPairUrl(member.oldOriginalImage, member.oldThumbnailUrl)} alt={`${member.character.name} old`} /> : <span>Old missing</span>}
                              </div>
                              <div className="memberInfoCompact">
                                <b>{member.character.name}</b>
                                <small>{member.character.status} / age {member.character.age ?? "-"}</small>
                                <div className="controlActions">
                                  <button className="iconButton" title="Open character" aria-label="Open character" onClick={() => { setSelectedCharacterId(member.character.id); setManagementSection("characters"); }}><Eye size={15} /></button>
                                  <button className="iconButton dangerIconButton" title="Remove from group" aria-label="Remove from group" onClick={() => removeGroupMember(member.memberId)}><Trash2 size={15} /></button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {groupDrawerTab === "attributes" ? (
                      <section className="drawerSection">
                        <div className="addToGroupRow">
                          <select value={groupForm.attributeId} onChange={(event) => setGroupForm({ ...groupForm, attributeId: event.target.value })}><option value="">Select attribute</option>{attributes.map((attr) => <option key={attr.id} value={attr.id}>{attr.name}</option>)}</select>
                          <input value={groupForm.customValue} onChange={(event) => setGroupForm({ ...groupForm, customValue: event.target.value })} placeholder="Custom value" />
                          <button disabled={!groupForm.attributeId} onClick={assignSelectedGroupAttribute}>Add</button>
                        </div>
                        <div className="characterRelationList">
                          {selectedGroupDetail.attributes.map((attribute) => <div key={attribute.id ?? attribute.attributeId}><b>{attribute.attributeName ?? attribute.attributeKey}</b><span>{attribute.customValue ?? attribute.label ?? attribute.value ?? "-"}</span></div>)}
                        </div>
                      </section>
                    ) : null}
                    {groupDrawerTab === "history" ? (
                      <section className="drawerSection">
                        <strong>Production Batches</strong>
                        <div className="characterRelationList">{selectedGroupDetail.productionHistory.batches.map((batch) => <div key={batch.id}><b>{batch.batchType}</b><span>{batch.status} / {batch.usageStatus}</span><small>{displayShortId(batch.id)}</small></div>)}</div>
                        <strong>Jobs</strong>
                        <div className="characterRelationList">{selectedGroupDetail.productionHistory.jobs.map((job) => <div key={job.id}><b>{job.targetStageType}</b><span>{job.status}</span><small>{displayShortId(job.id)}</small></div>)}</div>
                      </section>
                    ) : null}
                    {groupDrawerTab === "debug" ? <pre className="jsonBlock">{compactJson(selectedGroupDetail)}</pre> : null}
                  </aside>
                ) : null}
              </div>
            </div>
          ) : null}

          {managementSection === "character-import" ? (
            <div className="characterImportPanel">
              <div className="adminForm">
                <div className="adminNotice">
                  <strong>Character Import Center</strong>
                  <span>Young: Merle Oberon.png. Old: Merle Oberon r68.jpg or Audrey Hepburn a95.jpg.</span>
                </div>
                <div className="assetTabs">
                  <button className={characterImportMode === "pair" ? "active" : ""} onClick={() => setCharacterImportMode("pair")}>Single Pair Upload</button>
                  <button className={characterImportMode === "bulk" ? "active" : ""} onClick={() => setCharacterImportMode("bulk")}>Bulk Folder Upload</button>
                </div>
                <label className="toggleControl">
                  <input type="checkbox" checked={createCharacterGroupCandidates} onChange={(event) => setCreateCharacterGroupCandidates(event.target.checked)} />
                  Create Character Group Candidates
                </label>
                <div
                  className="dropZone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addCharacterImportFiles(event.dataTransfer.files);
                  }}
                >
                  <strong>Drag & Drop</strong>
                  <span>{characterImportMode === "pair" ? "Drop exactly two matching files." : "Drop a folder selection or multiple image pairs."}</span>
                  <input type="file" accept="image/*" multiple={characterImportMode === "bulk"} onChange={(event) => event.target.files && addCharacterImportFiles(event.target.files)} />
                </div>
                <div className="controlActions">
                  <button onClick={previewCharacterImport} disabled={busy || !characterImportFiles.length}>Preview Validate</button>
                  <button onClick={importCharacters} disabled={busy || !characterImportFiles.length}>Import Valid Pairs</button>
                  <button onClick={clearCharacterImportFiles} disabled={busy || !characterImportFiles.length}>Clear</button>
                </div>
                <div className="importFileList">
                  {characterImportFiles.map((file) => (
                    <span key={`${file.fileName}-${file.size}`}>{file.fileName}</span>
                  ))}
                  {!characterImportFiles.length ? <span>No files selected.</span> : null}
                </div>
              </div>

              <div className="importPreviewArea">
                <div className="importSummary panel">
                  <strong>Import Result</strong>
                  <span>Imported: {characterImportResult?.importedCount ?? 0}</span>
                  <span>Skipped: {characterImportResult?.skippedCount ?? 0}</span>
                  <pre className="jsonBlock">{compactJson(characterImportResult?.history ?? characterImportResult)}</pre>
                </div>
                <div className="importGrid">
                  {characterImportPreview.map((pair) => (
                    <article className={`importCard ${pair.valid ? "valid" : "invalid"}`} key={`${pair.name}-${pair.young?.fileName}-${pair.old?.fileName}`}>
                      <div className="importThumbs">
                        <div>{pair.young?.publicUrl || pair.young?.dataUrl ? <img src={pair.young.publicUrl ?? pair.young.dataUrl} alt="Young" /> : <span>Young missing</span>}</div>
                        <div>{pair.old?.publicUrl || pair.old?.dataUrl ? <img src={pair.old.publicUrl ?? pair.old.dataUrl} alt="Old" /> : <span>Old missing</span>}</div>
                      </div>
                      <strong>{pair.name}</strong>
                      <span>{pair.status ?? "-"} / {pair.age ?? "-"}</span>
                      <small>{pair.valid ? "Valid" : "Invalid"}</small>
                      {pair.errors.length ? <em>{pair.errors.join(", ")}</em> : null}
                      {pair.warnings.length ? <em className="warningText">{pair.warnings.join(", ")}</em> : null}
                    </article>
                  ))}
                  {!characterImportPreview.length ? <p className="emptyDetail">Preview validation results will appear here.</p> : null}
                </div>
              </div>
            </div>
          ) : null}

          {managementSection === "production-resources" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Batch Type<select value={batchForm.batchType} onChange={(event) => setBatchForm({ ...batchForm, batchType: event.target.value })}>{productionBatchTypeOptions.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>Filter<select value={resourceTypeFilter} onChange={(event) => setResourceTypeFilter(event.target.value)}><option value="">All batch types</option>{productionBatchTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label>Status<input value={batchForm.status} onChange={(event) => setBatchForm({ ...batchForm, status: event.target.value })} /></label>
                <label>Usage Status<input value={batchForm.usageStatus} onChange={(event) => setBatchForm({ ...batchForm, usageStatus: event.target.value })} /></label>
                <label>Metadata JSON<textarea value={batchForm.metadata} onChange={(event) => setBatchForm({ ...batchForm, metadata: event.target.value })} /></label>
                <button onClick={() => adminAction("Creating production batch", () => api("/production-batches", { method: "POST", body: JSON.stringify({ batchType: batchForm.batchType, status: batchForm.status, usageStatus: batchForm.usageStatus, metadata: parseJsonText(batchForm.metadata), attributes: {} }) }))}>Create Batch</button>
                <label>Selected Batch<select value={selectedResourceId} onChange={(event) => setSelectedResourceId(event.target.value)}>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchType} {displayShortId(batch.id)}</option>)}</select></label>
                <div className="controlActions">{["mark-ready", "reserve", "release", "mark-used"].map((action) => <button disabled={!selectedResourceId} key={action} onClick={() => adminAction(action, () => api(`/production-batches/${selectedResourceId}/${action}`, { method: "POST" }))}>{action}</button>)}<button disabled={!selectedResourceId} onClick={() => adminAction("Lineage", () => api(`/production-batches/${selectedResourceId}/lineage`))}>Lineage</button></div>
              </div>
              <div className="adminTable">
                {batches
                  .filter((batch) => (!resourceTypeFilter || batch.batchType === resourceTypeFilter) && compactJson(batch).toLowerCase().includes(adminSearch.toLowerCase()))
                  .slice(0, 20)
                  .map((batch) => {
                    const post = postContentMetadata(batch);
                    const music = musicTrackMetadata(batch);
                    return (
                      <div className="adminRow" key={batch.id} onClick={() => setSelectedResourceId(batch.id)}>
                        <b>{batch.batchType}</b><span>{batch.status}</span><span>{batch.usageStatus}</span><small>{displayShortId(batch.id)}</small>
                        {batch.batchType === "POST_CONTENT" ? (
                          <div className="postPreview">
                            <strong>{post.title || "Untitled post"}</strong>
                            <p>{post.caption || post.postText || "No post text yet."}</p>
                            {post.postText && post.postText !== post.caption ? <p>{post.postText}</p> : null}
                            <small>{post.hashtags.join(" ")} {post.cta ? `/ ${post.cta}` : ""} / {post.platform}</small>
                          </div>
                        ) : batch.batchType === "MUSIC_TRACK" ? (
                          <div className="postPreview">
                            <strong>{[music.mood, music.tempo, music.style].filter(Boolean).join(" / ") || "Music track"}</strong>
                            <p>{[music.scene, music.emotion].filter(Boolean).join(" scene / ") || "No scene or emotion metadata."}</p>
                            <small>{music.tags.join(", ") || "No tags"}</small>
                          </div>
                        ) : (
                          <pre>{compactJson(batch.metadata)}</pre>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}

          {managementSection === "orchestrator-rules" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Name<input value={ruleForm.name} onChange={(event) => setRuleForm({ ...ruleForm, name: event.target.value })} /></label>
                <label>Trigger Batch<input value={ruleForm.triggerBatchType} onChange={(event) => setRuleForm({ ...ruleForm, triggerBatchType: event.target.value })} /></label>
                <label>Trigger Status<input value={ruleForm.triggerStatus} onChange={(event) => setRuleForm({ ...ruleForm, triggerStatus: event.target.value })} /></label>
                <label>Target Stage<input value={ruleForm.targetStageType} onChange={(event) => setRuleForm({ ...ruleForm, targetStageType: event.target.value })} /></label>
                <label>Priority<input value={ruleForm.priority} onChange={(event) => setRuleForm({ ...ruleForm, priority: event.target.value })} /></label>
                <label>Config JSON<textarea value={ruleForm.config} onChange={(event) => setRuleForm({ ...ruleForm, config: event.target.value })} /></label>
                <button onClick={() => adminAction("Creating rule", () => api("/orchestrator/rules", { method: "POST", body: JSON.stringify({ ...ruleForm, priority: Number(ruleForm.priority), config: parseJsonText(ruleForm.config), isActive: true }) }))}>Create Rule</button>
                <button onClick={() => adminAction("Manual scan", () => api("/orchestrator/scan", { method: "POST" }))}>Manual Scan</button>
              </div>
              <div className="adminTable">{orchestratorRules.map((rule) => <div className="adminRow" key={rule.id}><b>{rule.name}</b><span>{rule.triggerBatchType} to {rule.targetStageType}</span><span>{rule.priority}</span><span>{rule.isActive ? "active" : "disabled"}</span><button onClick={() => adminAction("Toggle rule", () => api(`/orchestrator/rules/${rule.id}/${rule.isActive ? "disable" : "enable"}`, { method: "POST" }))}>{rule.isActive ? "Disable" : "Enable"}</button></div>)}</div>
            </div>
          ) : null}

          {managementSection === "jobs" ? <AdminJobsPanel jobs={jobs} pools={pools} busy={busy} runJobAction={runJobAction} search={adminSearch} /> : null}
          {managementSection === "runtime-sessions" ? <AdminRuntimePanel sessions={runtimeSessions} scriptRuns={scriptRuns} busy={busy} selectRuntimeSession={selectRuntimeSession} runtimeAction={runtimeAction} search={adminSearch} /> : null}

          <div className="adminResult">
            <strong>Result JSON</strong>
            <pre>{adminJson}</pre>
          </div>
          {poolModalInstanceId ? (() => {
            const instance = instances.find((item) => item.id === poolModalInstanceId);
            const currentMemberships = instancePoolMemberships(poolModalInstanceId);
            return (
              <div className="instanceDrawerOverlay">
                <aside className="poolManagerModal">
                  <div className="drawerHeader">
                    <div>
                      <strong>Manage Pools</strong>
                      <small>{instance?.id ?? poolModalInstanceId}</small>
                    </div>
                    <button className="iconButton" onClick={() => setPoolModalInstanceId("")} title="Close pool manager">x</button>
                  </div>
                  <div className="poolManagerBody">
                    <section className="poolManagerSection">
                      <h3>Current Pools</h3>
                      <div className="poolBadgeList">
                        {currentMemberships.length
                          ? currentMemberships.map(({ pool }) => <span className="poolBadge" key={pool.id}>{pool.poolType}</span>)
                          : <span className="poolBadge empty">No pools</span>}
                      </div>
                    </section>
                    <section className="poolManagerSection">
                      <h3>Pool Memberships</h3>
                      <div className="poolCheckboxList">
                        {pools.map((pool) => {
                          const checked = selectedPoolMemberships.includes(pool.id);
                          const members = pool.members ?? [];
                          const activeCount = members.filter((member) => String(member.status).toUpperCase() === "ACTIVE").length;
                          return (
                            <label className="poolCheckboxRow" key={pool.id}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  setSelectedPoolMemberships((current) => event.target.checked
                                    ? [...new Set([...current, pool.id])]
                                    : current.filter((id) => id !== pool.id));
                                }}
                              />
                              <span>
                                <b>{pool.poolType}</b>
                                <small>{pool.name}</small>
                              </span>
                              <em>{activeCount}/{members.length} active</em>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                    <div className="controlActions">
                      <button onClick={savePoolMemberships} disabled={busy}>Save</button>
                      <button className="secondaryButton" onClick={() => setPoolModalInstanceId("")}>Cancel</button>
                    </div>
                  </div>
                </aside>
              </div>
            );
          })() : null}
        </section>
      </section>
      ) : page === "control-center" ? (
      <section className="controlCenter">
        <div className="controlToolbar panel">
          <div>
            <strong>Factory Control Center</strong>
            <small>Resource to job to instance to runtime to output visibility</small>
          </div>
          <label className="toggleControl">
            <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
            Auto refresh every 5 seconds
          </label>
          <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}>
            <RefreshCcw size={15} />
            Manual Refresh
          </button>
        </div>

        <div className="kpiBar">
          {[
            ["AVAILABLE instances", kpis.availableInstances],
            ["STANDBY instances", kpis.standbyInstances],
            ["WORKFLOW instances", kpis.workflowInstances],
            ["MAINTENANCE instances", kpis.maintenanceInstances],
            ["DISABLED instances", kpis.disabledInstances],
            ["READY batches", kpis.readyBatches],
            ["PENDING jobs", kpis.pendingJobs],
            ["RUNNING jobs", kpis.runningJobs],
            ["FAILED_RECOVERABLE sessions", kpis.failedRecoverableSessions],
            ["FINAL_VIDEO count", kpis.finalVideoCount],
            ["POST_CONTENT count", kpis.postContentCount]
          ].map(([label, value]) => (
            <div className="kpiCard" key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="boardHeader">
          <h2>Pipeline Board</h2>
          <small>Production resources by batch type</small>
        </div>
        <div className="pipelineBoard">
          {pipelineColumns.map((column) => (
            <section className="pipelineColumn" key={column.batchType}>
              <h2>{column.batchType}</h2>
              <div className="pipelineCards">
                {column.items.slice(0, 12).map((batch) => (
                  <button
                    className={`pipelineCard ${selectedBatchId === batch.id ? "selected" : ""}`}
                    key={batch.id}
                    onClick={() => setSelectedBatchId(batch.id)}
                  >
                    <strong>{displayShortId(batch.id)}</strong>
                    <span>{batch.status}</span>
                    <small>{batch.usageStatus}</small>
                    <small>workflow {displayShortId(batch.workflowId)}</small>
                    <small>{displayDateTime(batch.createdAt)}</small>
                  </button>
                ))}
                {!column.items.length ? <p>No items</p> : null}
              </div>
            </section>
          ))}
        </div>

        <div className="boardHeader">
          <h2>Instance Board</h2>
          <small>Dynamic pool state and capability matching surface</small>
        </div>
        <div className="instanceBoard">
          {instanceColumns.map((column) => (
            <section className="pipelineColumn" key={column.poolType}>
              <h2>{column.poolType}</h2>
              <div className="pipelineCards">
                {column.items.slice(0, 16).map((instance) => (
                  <button
                    className={`instanceBoardCard ${selectedInstanceId === instance.id ? "selected" : ""}`}
                    key={instance.id}
                    onClick={() => {
                      setSelectedInstanceId(instance.id);
                      setHostInstanceId(instance.id);
                      setHostAdbId(instance.adbId ?? "");
                      const host = hostForInstance(instance);
                      if (host) setSelectedHostId(host.id);
                    }}
                  >
                    <strong title={instance.id}>{instance.id}</strong>
                    <small>{instance.hostId}</small>
                    <small>{instance.adbId ?? "-"}</small>
                    <span className="poolBadgeList">{renderCapabilityBadges(instance)}</span>
                    {hasUnknownAdbMapping(instance) ? <span className="poolBadge warningBadge">ADB mapping unknown</span> : null}
                    <small>{instance.runtimeStatus ?? "-"}</small>
                    <span className="miniActions">
                      <span onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-standby"); }}>standby</span>
                      <span onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-maintenance"); }}>maintenance</span>
                      <span onClick={(event) => { event.stopPropagation(); moveInstance(instance, "disable"); }}>disable</span>
                    </span>
                  </button>
                ))}
                {!column.items.length ? <p>No instances</p> : null}
              </div>
            </section>
          ))}
        </div>

        <div className="boardHeader">
          <h2>Job Board</h2>
          <small>Allocation and execution controls</small>
        </div>
        <div className="jobBoard">
          {jobColumns.map((column) => (
            <section className="pipelineColumn" key={column.status}>
              <h2>{column.status}</h2>
              <div className="pipelineCards">
                {column.items.slice(0, 16).map((job) => (
                  <article className={`jobBoardCard ${selectedJobId === job.id ? "selected" : ""}`} key={job.id} onClick={() => loadJobDetail(job)}>
                    <strong>{displayShortId(job.id)}</strong>
                    <span>{job.targetStageType}</span>
                    <small>source {displayShortId(job.sourceBatchId)}</small>
                    <small>instance {displayJobInstance(job)}</small>
                    <small>{displayJobAllocationMode(job)}</small>
                    <div className="miniActions">
                      <button disabled={busy || job.status !== "PENDING"} onClick={(event) => { event.stopPropagation(); runJobAction(job, "allocate"); }}>Allocate</button>
                      <button disabled={busy} onClick={(event) => { event.stopPropagation(); runJobAction(job, "execute-mock"); }}>Execute Mock</button>
                      <button disabled={busy || job.targetStageType !== "IMAGE_EDIT"} onClick={(event) => { event.stopPropagation(); runJobAction(job, "execute-image-edit"); }}>Execute IMAGE_EDIT</button>
                      <button disabled={busy || ["COMPLETED", "FAILED"].includes(job.status)} onClick={(event) => { event.stopPropagation(); runJobAction(job, "fail"); }}>Fail</button>
                      <button disabled={busy} onClick={(event) => { event.stopPropagation(); refreshQueue(); }}>Refresh</button>
                    </div>
                  </article>
                ))}
                {!column.items.length ? <p>No jobs</p> : null}
              </div>
            </section>
          ))}
        </div>

        <div className="controlDetails">
          <section className="panel controlPanel">
            <div className="panelHeader">
              <Play size={18} />
              <h2>Runtime Board</h2>
            </div>
            <div className="runtimeBoard">
              {runtimeSessions.slice(0, 24).map((session) => (
                <button
                  className={`runtimeCard ${selectedRuntime?.id === session.id ? "selected" : ""}`}
                  key={session.id}
                  onClick={() => selectRuntimeSession(session)}
                >
                  <strong>{displayShortId(session.id)}</strong>
                  <span>{session.status}</span>
                  <small>step {session.currentStepNo ?? 0}</small>
                  <small>{session.hostId ?? "-"}</small>
                  <small>{session.instanceId ?? "-"}</small>
                  {session.status === "FAILED_RECOVERABLE" ? <em onClick={(event) => { event.stopPropagation(); runtimeAction("recover", session); }}>recover</em> : null}
                </button>
              ))}
              {!runtimeSessions.length ? <p className="emptyDetail">No runtime sessions yet.</p> : null}
            </div>
          </section>

          <section className="panel controlPanel">
            <div className="panelHeader">
              <Users size={18} />
              <h2>Host Test Panel</h2>
            </div>
            <div className="hostForm">
              <label>
                <span>Host</span>
                <select value={selectedHost?.id ?? ""} onChange={(event) => setSelectedHostId(event.target.value)}>
                  {hosts.map((host) => <option key={host.id} value={host.id}>{host.name} / {host.hostId}</option>)}
                </select>
              </label>
              <label><span>Instance ID</span><input value={hostInstanceId} onChange={(event) => setHostInstanceId(event.target.value)} placeholder="host-01-75-ld-2" /></label>
              <label><span>ADB ID</span><input value={hostAdbId} onChange={(event) => setHostAdbId(event.target.value)} placeholder="emulator-5558" /></label>
              <label><span>Text</span><input value={hostSendText} onChange={(event) => setHostSendText(event.target.value)} /></label>
            </div>
            <div className="controlActions">
              <button onClick={() => runHostAction("health")} disabled={busy}>Health</button>
              <button onClick={() => runHostAction("devices")} disabled={busy || !selectedHost}>ADB Devices</button>
              <button onClick={() => runHostAction("screenshot")} disabled={busy || !hostAdbId}>Screenshot</button>
              <button onClick={() => runHostAction("send-text")} disabled={busy || !hostAdbId}>Send Text</button>
              <button onClick={() => runHostAction("download-latest")} disabled={busy || !hostAdbId}>Download Latest</button>
            </div>
            {adbDevices.length ? (
              <div className="deviceList">
                {adbDevices.map((device) => <button key={device.adbId} onClick={() => setHostAdbId(device.adbId)}>{device.adbId} / {device.state}</button>)}
              </div>
            ) : null}
            <pre className="jsonBlock">{compactJson(hostResult)}</pre>
          </section>
        </div>

        <div className="panel debugPanel">
          <div className="drawerSectionHeader">
            <strong>Debug Drawer</strong>
            <button className="secondaryButton" onClick={() => setDebugOpen((current) => !current)}>
              {debugOpen ? "Hide" : "Show"}
            </button>
          </div>
          {debugOpen ? (
            <>
              <div className="relationshipList">
                {selectedBatch ? <span>batch to jobs: {selectedBatchJobs.length}</span> : null}
                {selectedJob ? <span>job to runtime: {selectedJobRuntime?.id ? displayShortId(selectedJobRuntime.id) : "-"}</span> : null}
                {selectedRuntime ? <span>runtime to script runs: {selectedRuntimeScriptRuns.length}</span> : null}
                {selectedBatchLineage.map((batch) => <span key={batch.id}>lineage output {batch.batchType} / {displayShortId(batch.id)}</span>)}
                {outputBatches.map((batch) => <span key={batch.id}>job output {batch.batchType} / {displayShortId(batch.id)}</span>)}
                {selectedInstance ? <span>instance {selectedInstance.currentPoolType ?? "AVAILABLE"} / {selectedInstance.runtimeStatus}</span> : null}
              </div>
              <div className="debugGrid">
                <section><b>Batch</b><pre>{compactJson({ selectedBatch, relatedJobs: selectedBatchJobs, lineage: selectedBatchLineage })}</pre></section>
                <section><b>Job</b><pre>{compactJson({ selectedJob, runtime: selectedJobRuntime, outputBatches })}</pre></section>
                <section><b>Runtime</b><pre>{compactJson({ selectedRuntime, scriptRuns: selectedRuntimeScriptRuns, selectedScriptRun })}</pre></section>
                <section><b>Instance</b><pre>{compactJson(selectedInstance)}</pre></section>
              </div>
            </>
          ) : null}
        </div>
      </section>
      ) : page === "asset-center" ? (
      <section className="assetCenter">
        <div className="assetToolbar panel">
          <div>
            <strong>Production Asset Center</strong>
            <small>Catalog source images, prompts, music, templates, versions, and lineage</small>
          </div>
          <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}>
            <RefreshCcw size={15} />
            Refresh
          </button>
        </div>

        <div className="assetTabs">
          {assetCategoryTabs.map((tab) => (
            <button
              key={tab.id}
              className={assetTab === tab.id ? "active" : ""}
              onClick={() => {
                setAssetTab(tab.id);
                setAssetForm((current) => ({
                  ...current,
                  assetCategory: tab.id,
                  assetSubType: assetCategories.find((category) => category.id === tab.id)?.subTypes?.[0] ?? ""
                }));
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="assetLayout">
          <aside className="panel assetFormPanel">
            <div className="panelHeader compact">
              <Image size={18} />
              <h2>{selectedAsset ? "Edit Asset" : "Register Asset"}</h2>
            </div>
            <label>Name<input value={assetForm.name} onChange={(event) => setAssetForm({ ...assetForm, name: event.target.value })} /></label>
            <label>Subtype<select value={assetForm.assetSubType} onChange={(event) => setAssetForm({ ...assetForm, assetSubType: event.target.value })}>
              <option value="">No subtype</option>
              {(assetCategories.find((category) => category.id === assetForm.assetCategory)?.subTypes ?? []).map((subType) => <option key={subType} value={subType}>{subType}</option>)}
            </select></label>
            <label>Media Type<input value={assetForm.mediaType} onChange={(event) => setAssetForm({ ...assetForm, mediaType: event.target.value })} /></label>
            <label>Character Group<select disabled={assetForm.assetCategory === "CHARACTER_IMAGE"} value={assetForm.groupId} onChange={(event) => setAssetForm({ ...assetForm, groupId: event.target.value })}><option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
            {assetForm.assetCategory === "CHARACTER_IMAGE" ? <small className="emptyDetail">Character source images attach to Character, not Character Group.</small> : null}
            <label>Character ID<input value={assetForm.characterId} onChange={(event) => setAssetForm({ ...assetForm, characterId: event.target.value })} /></label>
            <label>Public or Preview URL<input value={assetForm.publicUrl} onChange={(event) => setAssetForm({ ...assetForm, publicUrl: event.target.value })} /></label>
            <label>File Path<input value={assetForm.filePath} onChange={(event) => setAssetForm({ ...assetForm, filePath: event.target.value })} /></label>
            <label>Tags<input value={assetForm.tags} onChange={(event) => setAssetForm({ ...assetForm, tags: event.target.value })} placeholder="portrait, young, reusable" /></label>
            <label>Attributes JSON<textarea rows={5} value={assetForm.attributes} onChange={(event) => setAssetForm({ ...assetForm, attributes: event.target.value })} /></label>
            <label>Metadata JSON<textarea rows={5} value={assetForm.metadata} onChange={(event) => setAssetForm({ ...assetForm, metadata: event.target.value })} /></label>
            <label>Source Asset<select value={assetForm.sourceAssetId} onChange={(event) => setAssetForm({ ...assetForm, sourceAssetId: event.target.value })}><option value="">No source asset</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} / {displayShortId(asset.id)}</option>)}</select></label>
            <div className="assetMiniGrid">
              <label>Usage Status<input value={assetForm.usageStatus} onChange={(event) => setAssetForm({ ...assetForm, usageStatus: event.target.value })} /></label>
              <label>Usage Policy<input value={assetForm.usagePolicy} onChange={(event) => setAssetForm({ ...assetForm, usagePolicy: event.target.value })} /></label>
              <label>Quality<input value={assetForm.qualityStatus} onChange={(event) => setAssetForm({ ...assetForm, qualityStatus: event.target.value })} /></label>
            </div>
            <div className="controlActions">
              <button onClick={createAsset} disabled={busy || !assetForm.name}>Upload/Register</button>
              <button onClick={updateSelectedAsset} disabled={busy || !selectedAsset}>Save</button>
              <button onClick={createAssetVersion} disabled={busy || !selectedAsset}>Create Version</button>
              <button onClick={() => setBestAsset()} disabled={busy || !selectedAsset}>Set Best Version</button>
              <button className="dangerButton" onClick={deleteSelectedAsset} disabled={busy || !selectedAsset}>Delete</button>
            </div>
          </aside>

          <section className="panel assetMainPanel">
            <div className="assetFilters">
              <label>Search<input value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} placeholder="Search names, tags, metadata" /></label>
              <label>Tag<select value={assetTagFilter} onChange={(event) => setAssetTagFilter(event.target.value)}><option value="">All tags</option>{assetTagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label>
              <label>Attribute<select value={assetAttributeFilter} onChange={(event) => setAssetAttributeFilter(event.target.value)}><option value="">All attributes</option>{assetAttributeOptions.map((attribute) => <option key={attribute} value={attribute}>{attribute}</option>)}</select></label>
            </div>

            <div className="assetWorkspace">
              <div className="assetList">
                {filteredAssets.slice(0, 80).map((asset) => {
                  const group = groups.find((item) => item.id === asset.groupId);
                  const thumbUrl = listImageUrl(asset);
                  return (
                    <button className={`assetCard ${selectedAssetId === asset.id ? "selected" : ""}`} key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
                      <div className="assetPreview">
                        {thumbUrl ? <img src={thumbUrl} alt={asset.name} /> : <span>{asset.thumbnailStatus === "FAILED" ? "Thumbnail failed" : asset.assetCategory ?? asset.assetType}</span>}
                      </div>
                      <strong>{asset.name}</strong>
                      <small>{group?.name ?? asset.characterId ?? "Ungrouped"}</small>
                      <span>{asset.assetSubType ?? asset.mediaType}</span>
                      <small>v{asset.versionNo ?? 1} {asset.isBestVersion ? "/ Best" : ""}</small>
                      <span className="poolBadgeList">{(asset.tags ?? []).slice(0, 4).map((tag) => <span className="poolBadge" key={tag}>{tag}</span>)}</span>
                    </button>
                  );
                })}
                {!filteredAssets.length ? <p className="emptyDetail">No assets in this tab yet.</p> : null}
              </div>

              <aside className="assetInspector">
                <div className="panelHeader compact">
                  <Search size={18} />
                  <h2>Preview</h2>
                </div>
                {selectedAsset ? (
                  <>
                    <div className="assetHeroPreview">
                      {originalImageUrl(selectedAsset) ? <img src={originalImageUrl(selectedAsset)} alt={selectedAsset.name} /> : <pre>{compactJson(selectedAsset.metadata)}</pre>}
                    </div>
                    <div className="detailList">
                      <span>ID <b>{displayShortId(selectedAsset.id)}</b></span>
                      <span>Category <b>{selectedAsset.assetCategory ?? selectedAsset.assetType}</b></span>
                      <span>Subtype <b>{selectedAsset.assetSubType ?? "-"}</b></span>
                      <span>Version <b>{selectedAsset.versionNo ?? 1}</b></span>
                      <span>Status <b>{selectedAsset.status ?? "-"}</b></span>
                    </div>
                    <div className="assetSection">
                      <strong>Version History</strong>
                      {selectedAssetVersions.map((asset) => (
                        <button key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
                          v{asset.versionNo ?? 1} / {asset.name} {asset.isBestVersion ? "/ Best" : ""}
                        </button>
                      ))}
                    </div>
                    <div className="assetSection">
                      <strong>Lineage</strong>
                      {selectedAsset.sourceAssetId ? <span>Source: {displayShortId(selectedAsset.sourceAssetId)}</span> : null}
                      {selectedAssetLineage.map((asset) => <button key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>{asset.name} / {displayShortId(asset.id)}</button>)}
                      {!selectedAssetLineage.length && !selectedAsset.sourceAssetId ? <span>No lineage yet.</span> : null}
                    </div>
                    <div className="assetSection">
                      <strong>Raw JSON</strong>
                      <pre className="jsonBlock">{compactJson(selectedAsset)}</pre>
                    </div>
                  </>
                ) : <p className="emptyDetail">Select an asset to inspect.</p>}
              </aside>
            </div>
          </section>
        </div>
      </section>
      ) : page === "studio" ? (
      <section className="studioGrid">
        <aside className="panel leftPanel">
          <div className="panelHeader">
            <Users size={18} />
            <h2>Character Groups</h2>
            <button className="iconButton" onClick={selectRandomGroup} title="Random group selection">
              <Dices size={16} />
            </button>
          </div>
          <div className="groupList">
            {groups.map((group) => (
              <button
                key={group.id}
                className={`groupRow ${selectedGroups.includes(group.id) ? "selected" : ""}`}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="check">{selectedGroups.includes(group.id) ? <Check size={14} /> : null}</span>
                <span>
                  <strong>{group.name}</strong>
                  <small>{group.memberCount ?? 0} members</small>
                  <em>{group.attributesSummary ?? "Attributes loaded in center panel"}</em>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel centerPanel">
          <div className="panelHeader">
            <Sparkles size={18} />
            <h2>Attributes</h2>
          </div>
          <div className="attributeGrid">
            {studioAttributes.map((attribute) => {
              const key = ["scene", "emotion", "outfit"].includes(attribute.key) ? attribute.key : attribute.name.toLowerCase();
              const options = attributePresets[key] ?? ["default", "variant", "custom"];
              return (
                <div className="attributeBlock" key={attribute.id}>
                  <label>{attribute.name}</label>
                  <div className="choiceRow">
                    {options.map((option) => (
                      <button
                        className={attributeValues[key] === option ? "choice active" : "choice"}
                        key={option}
                        onClick={() => setAttributeValues((current) => ({ ...current, [key]: option }))}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="musicPolicyPanel">
            <div className="panelHeader compact">
              <Music size={18} />
              <h2>Music Policy</h2>
            </div>
            <label className="templateSelect">
              <span>Mode</span>
              <select value={musicPolicyMode} onChange={(event) => setMusicPolicyMode(event.target.value)}>
                {musicPolicyModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>
            <div className="choiceRow">
              {musicMatchAttributeOptions.map((attribute) => (
                <button
                  className={musicMatchAttributes.includes(attribute) ? "choice active" : "choice"}
                  key={attribute}
                  onClick={() => toggleMusicMatchAttribute(attribute)}
                >
                  {attribute}
                </button>
              ))}
            </div>
          </div>

          <div className="panelHeader promptHeader">
            <ClipboardList size={18} />
            <h2>Prompt Templates</h2>
          </div>
          <div className="templateGrid">
            {(["image", "video", "music"] as PromptKind[]).map((kind) => (
              <label className="templateSelect" key={kind}>
                <span>{kind} prompt template</span>
                <select
                  value={promptSelections[kind]}
                  onChange={(event) => setPromptSelections((current) => ({ ...current, [kind]: event.target.value }))}
                >
                  <option value="">No template</option>
                  {groupedTemplates[kind].map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="panelHeader promptHeader">
            <Image size={18} />
            <h2>Prompt Preview</h2>
          </div>
          <div className="previewStack">
            {(["image", "video", "music"] as PromptKind[]).map((kind) => (
              <article className="promptPreview" key={kind}>
                <span>{kind} prompt</span>
                <p>{previews[kind] || "Select a group and template to preview."}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel rightPanel">
          <div className="panelHeader">
            <Boxes size={18} />
            <h2>Workflow Preview</h2>
          </div>
          <div className="stageList">
            {workflowStages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div className="stageRow" key={stage.type}>
                  <Icon size={18} />
                  <span>
                    <strong>{stage.type}</strong>
                    <small>{stage.resource}</small>
                  </span>
                  <b>{index + 1}</b>
                </div>
              );
            })}
          </div>

          <div className="queueBox">
            <div className="panelHeader compact">
              <ClipboardList size={18} />
              <h2>Queue Builder</h2>
            </div>
            <p>{selectedGroups.length} group selections will create character-group and image-batch resources.</p>
            <button className="primaryButton" onClick={createProductionBatches} disabled={busy || !selectedGroups.length}>
              {busy ? <Loader2 className="spin" size={16} /> : <Boxes size={16} />}
              Create Production Batch
            </button>
          </div>

          <div className="panelHeader batchHeader">
            <Boxes size={18} />
            <h2>Production Batches</h2>
          </div>
          <div className="batchList">
            {batches.map((batch) => (
              <div className="batchRow" key={batch.id}>
                <strong>{batch.batchType}</strong>
                <span>{batchReadyLabel(batch)}</span>
                <small>{batch.usageStatus}</small>
                {isLaunchable(batch) ? (
                  <button className="miniButton" onClick={() => launchBatch(String(batch.id))} disabled={busy}>
                    <Rocket size={13} />
                    Start Production
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="panelHeader batchHeader">
            <ClipboardList size={18} />
            <h2>Production Jobs</h2>
            <button className="iconButton" onClick={() => refreshQueue()} title="Refresh production jobs" disabled={busy}>
              <RefreshCcw size={16} />
            </button>
          </div>
          {launchedJobs.length ? (
            <div className="launchResult">
              <strong>Created jobs</strong>
              {launchedJobs.map((job) => (
                <span key={job.id}>{job.targetStageType} - {job.status}</span>
              ))}
            </div>
          ) : null}
          <div className="productionJobsPanel">
            <div className="jobsTable" role="table" aria-label="Production jobs">
              <div className="jobsTableHeader" role="row">
                <span>Job ID</span>
                <span>Source Batch</span>
                <span>Target Stage</span>
                <span>Status</span>
                <span>Instance</span>
                <span>Allocation</span>
                <span>Created At</span>
                <span>Actions</span>
              </div>
              {jobs.map((job) => (
                <div
                  className={`jobsTableRow ${selectedJobId === job.id ? "selected" : ""}`}
                  role="row"
                  key={job.id}
                  onClick={() => loadJobDetail(job)}
                >
                  <span title={job.id}>{displayShortId(job.id)}</span>
                  <span title={job.sourceBatchId}>{displayShortId(job.sourceBatchId)}</span>
                  <strong>{job.targetStageType}</strong>
                  <span className="statusPill">{job.status}</span>
                  <span title={displayJobInstance(job)}>{displayShortId(displayJobInstance(job))}</span>
                  <span title={displayJobAllocationMode(job)}>{displayJobAllocationMode(job)}</span>
                  <span>{displayDateTime(job.createdAt)}</span>
                  <div className="jobActions">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        runJobAction(job, "allocate");
                      }}
                      disabled={busy || job.status !== "PENDING"}
                    >
                      Allocate
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        runJobAction(job, "execute-mock");
                      }}
                      disabled={busy || job.status !== "ALLOCATED"}
                    >
                      Execute Mock
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        runJobAction(job, "execute-image-edit");
                      }}
                      disabled={busy || job.status !== "ALLOCATED" || job.targetStageType !== "IMAGE_EDIT"}
                    >
                      Execute IMAGE_EDIT
                    </button>
                  </div>
                </div>
              ))}
              {!jobs.length ? (
                <div className="jobsEmpty">No production jobs yet.</div>
              ) : null}
            </div>
          </div>
          <div className="jobDetailPanel">
            <div className="detailHeader">
              <div>
                <strong>Job Detail</strong>
                <small>{selectedJob ? `${selectedJob.targetStageType} / ${displayShortId(selectedJob.id)}` : "Select a job"}</small>
              </div>
              {runtimeSession?.status === "FAILED_RECOVERABLE" ? (
                <button className="recoverButton" onClick={recoverRuntimeSession} disabled={busy}>
                  Recover
                </button>
              ) : null}
            </div>
            {jobDetailLoading ? (
              <div className="detailLoading">
                <Loader2 className="spin" size={15} />
                Loading job detail
              </div>
            ) : null}
            {jobDetailError ? <div className="detailError">{jobDetailError}</div> : null}
            {selectedJob ? (
              <div className="detailGrid">
                <section className="detailCard">
                  <span>Runtime Session</span>
                  {runtimeSession ? (
                    <>
                      <strong>{runtimeSession.status}</strong>
                      <small>ID {runtimeSession.id}</small>
                      <small>Host {runtimeSession.hostId ?? "-"}</small>
                      <small>Instance {runtimeSession.instanceId ?? "-"}</small>
                      <small>Step {runtimeSession.currentStepNo}</small>
                      <div className="stepList">
                        {(runtimeSession.steps ?? []).slice(0, 5).map((step) => (
                          <small key={step.id}>{step.stepNo}. {step.stepType} / {step.status}</small>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>No runtime session yet.</p>
                  )}
                </section>

                <section className="detailCard">
                  <span>Script Run</span>
                  {scriptRun ? (
                    <>
                      <strong>{scriptRun.status}</strong>
                      <small>ID {scriptRun.id}</small>
                      <small>Script {displayShortId(scriptRun.scriptId)}</small>
                      <small>Step {scriptRun.currentStepNo}</small>
                      <div className="stepList">
                        {(scriptRun.steps ?? []).slice(0, 6).map((step) => (
                          <small key={step.id}>{step.stepNo}. {step.stepType} / {step.status}</small>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>No script run yet.</p>
                  )}
                </section>

                <section className="detailCard">
                  <span>Output Batch</span>
                  {outputBatch ? (
                    <>
                      <strong>{outputBatch.batchType}</strong>
                      <small>ID {outputBatch.id}</small>
                      <small>Status {outputBatch.status}</small>
                      <small>Usage {outputBatch.usageStatus}</small>
                    </>
                  ) : (
                    <p>No output batch yet.</p>
                  )}
                </section>

                <section className="detailCard">
                  <span>Error</span>
                  <p>{findJobError(selectedJob, runtimeSession, scriptRun) || "No error reported."}</p>
                </section>
              </div>
            ) : (
              <div className="jobsEmpty">Select a production job to inspect runtime and script progress.</div>
            )}
          </div>
        </aside>
      </section>
      ) : (
      <section className="jobsPage">
        <div className="jobsToolbar panel">
          <div className="jobsToolbarTitle">
            <ClipboardList size={18} />
            <div>
              <strong>Production Jobs</strong>
              <small>{filteredJobs.length} jobs loaded from orchestrator</small>
            </div>
          </div>
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {jobStatusOptions.map((option) => (
                <option value={option} key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Target Stage</span>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="">All stages</option>
              {jobStageOptions.map((option) => (
                <option value={option} key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Pool Type</span>
            <select value={poolFilter} onChange={(event) => setPoolFilter(event.target.value)}>
              <option value="">All pools</option>
              {poolTypeOptions.map((option) => (
                <option value={option} key={option}>{option}</option>
              ))}
            </select>
          </label>
          <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}>
            <RefreshCcw size={15} />
            Refresh
          </button>
        </div>

        <div className="jobsWorkspace">
          <section className="panel operationsPanel">
            <div className="operationsHeader">
              <div className="searchLabel">
                <Search size={16} />
                <span>Operational queue</span>
              </div>
              <div className="paginationControls">
                <span>Page {Math.min(jobsPage, totalJobPages)} / {totalJobPages}</span>
                <select
                  value={jobsPageSize}
                  onChange={(event) => setJobsPageSize(Number(event.target.value))}
                  title="Rows per page"
                >
                  {pageSizeOptions.map((option) => (
                    <option value={option} key={option}>{option} rows</option>
                  ))}
                </select>
                <button onClick={() => setJobsPage((current) => Math.max(1, current - 1))} disabled={jobsPage <= 1}>
                  Prev
                </button>
                <button onClick={() => setJobsPage((current) => Math.min(totalJobPages, current + 1))} disabled={jobsPage >= totalJobPages}>
                  Next
                </button>
              </div>
            </div>

            <div className="productionJobsPanel full">
              <div className="jobsTable operationsTable" role="table" aria-label="Production jobs">
                <div className="jobsTableHeader" role="row">
                  <span>Job ID</span>
                  <span>Source Batch</span>
                  <span>Target Stage</span>
                  <span>Status</span>
                  <span>Pool</span>
                  <span>Instance</span>
                  <span>Allocation</span>
                  <span>Created At</span>
                  <span>Actions</span>
                </div>
                {paginatedJobs.map((job) => (
                  <div
                    className={`jobsTableRow ${selectedJobId === job.id ? "selected" : ""}`}
                    role="row"
                    key={job.id}
                    onClick={() => loadJobDetail(job)}
                  >
                    <span title={job.id}>{displayShortId(job.id)}</span>
                    <span title={job.sourceBatchId}>{displayShortId(job.sourceBatchId)}</span>
                    <strong>{job.targetStageType}</strong>
                    <span className="statusPill">{job.status}</span>
                    <span title={displayJobPool(job, pools)}>{displayJobPool(job, pools)}</span>
                    <span title={displayJobInstance(job)}>{displayShortId(displayJobInstance(job))}</span>
                    <span title={displayJobAllocationMode(job)}>{displayJobAllocationMode(job)}</span>
                    <span>{displayDateTime(job.createdAt)}</span>
                    <div className="jobActions">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          runJobAction(job, "allocate");
                        }}
                        disabled={busy || job.status !== "PENDING"}
                      >
                        Allocate
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          runJobAction(job, "execute-mock");
                        }}
                        disabled={busy || job.status !== "ALLOCATED"}
                      >
                        Execute Mock
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          runJobAction(job, "execute-image-edit");
                        }}
                        disabled={busy || job.status !== "ALLOCATED" || job.targetStageType !== "IMAGE_EDIT"}
                      >
                        Execute IMAGE_EDIT
                      </button>
                    </div>
                  </div>
                ))}
                {!paginatedJobs.length ? (
                  <div className="jobsEmpty">No jobs match the current filters.</div>
                ) : null}
              </div>
            </div>
          </section>

          {drawerOpen ? (
            <aside className="jobDrawer panel">
              <div className="drawerHeader">
                <div>
                  <strong>Job Detail</strong>
                  <small>{selectedJob ? `${selectedJob.targetStageType} / ${selectedJob.id}` : "No job selected"}</small>
                </div>
                <button className="iconButton" onClick={() => setDrawerOpen(false)} title="Close job detail">x</button>
              </div>
              {jobDetailLoading ? (
                <div className="detailLoading">
                  <Loader2 className="spin" size={15} />
                  Loading job detail
                </div>
              ) : null}
              {jobDetailError ? <div className="detailError">{jobDetailError}</div> : null}

              <section className="drawerSection">
                <div className="drawerSectionHeader">
                  <strong>Runtime Session</strong>
                  {runtimeSession?.status === "FAILED_RECOVERABLE" ? (
                    <button className="recoverButton" onClick={recoverRuntimeSession} disabled={busy}>
                      Recover
                    </button>
                  ) : null}
                </div>
                {runtimeSession ? (
                  <div className="detailList">
                    <span>Status <b>{runtimeSession.status}</b></span>
                    <span>Current step <b>{runtimeSession.currentStepNo}</b></span>
                    <span>Host <b>{runtimeSession.hostId ?? "-"}</b></span>
                    <span>Instance <b>{runtimeSession.instanceId ?? "-"}</b></span>
                    <span>Checkpoint</span>
                    <pre>{JSON.stringify(runtimeSession.checkpoint ?? {}, null, 2)}</pre>
                  </div>
                ) : (
                  <p className="emptyDetail">No runtime session yet.</p>
                )}
              </section>

              <section className="drawerSection">
                <div className="drawerSectionHeader">
                  <strong>Script Run</strong>
                  <small>{scriptRun?.status ?? "No run"}</small>
                </div>
                {scriptRun ? (
                  <>
                    <div className="detailList compactList">
                      <span>Status <b>{scriptRun.status}</b></span>
                      <span>Error <b>{findJobError(selectedJob, runtimeSession, scriptRun) || "-"}</b></span>
                    </div>
                    <div className="scriptStepTable">
                      {(scriptRun.steps ?? []).map((step) => (
                        <div key={step.id}>
                          <span>{step.stepNo}</span>
                          <span>{step.stepType}</span>
                          <b>{step.status}</b>
                          <small>{step.errorMessage ?? ""}</small>
                        </div>
                      ))}
                      {!(scriptRun.steps ?? []).length ? <p className="emptyDetail">No script steps recorded.</p> : null}
                    </div>
                  </>
                ) : (
                  <p className="emptyDetail">No script run yet.</p>
                )}
              </section>

              <section className="drawerSection">
                <div className="drawerSectionHeader">
                  <strong>Output Batches</strong>
                  <small>{outputBatches.length}</small>
                </div>
                <div className="outputBatchList">
                  {outputBatches.map((batch) => (
                    <div key={batch.id}>
                      <strong>{batch.batchType}</strong>
                      <small>{batch.id}</small>
                      <span>{batch.status} / {batch.usageStatus}</span>
                    </div>
                  ))}
                  {!outputBatches.length ? <p className="emptyDetail">No output batches found for this job.</p> : null}
                </div>
              </section>

              <section className="drawerSection">
                <div className="drawerSectionHeader">
                  <strong>Recovery</strong>
                </div>
                <p className="emptyDetail">
                  {runtimeSession?.status === "FAILED_RECOVERABLE"
                    ? "This runtime can be recovered from its latest checkpoint."
                    : "Recovery is available when runtime status is FAILED_RECOVERABLE."}
                </p>
              </section>
            </aside>
          ) : null}
        </div>
      </section>
      )}
    </main>
  );
}
