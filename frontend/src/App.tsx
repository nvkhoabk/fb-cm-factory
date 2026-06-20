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
  attributeSuggestions?: Array<{
    key?: string | null;
    name?: string | null;
    value?: string | null;
    usageCount?: number;
  }>;
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
  apiKey?: string | null;
  metadata?: Record<string, unknown>;
  lastHealthCheckAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  createdAt?: string | null;
  updatedAt?: string | null;
};

type WorkflowStageRecord = {
  id: string;
  workflowId: string;
  stageNo: number;
  stageType: string;
  name: string;
  scriptId?: string | null;
  poolType?: string | null;
  promptTemplateId?: string | null;
  config?: Record<string, unknown>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type WorkflowDetailRecord = {
  workflow: WorkflowRecord;
  resourceRules: Array<Record<string, unknown>>;
  promptMapping: Record<string, unknown>;
  scriptMapping: Record<string, unknown>;
  capacity: CapacityConfig;
  musicPolicy: Record<string, unknown>;
  postContentPolicy: Record<string, unknown>;
  legacyStages: WorkflowStageRecord[];
  runs: WorkflowRunRecord[];
  warnings: string[];
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

type InstanceAllocationRecord = CapacityAllocation & {
  poolId?: string | null;
  orchestratorJobId?: string | null;
  workflowRunId?: string | null;
  workflowStageRunId?: string | null;
  allocationMode?: string | null;
  allocatedAt?: string | null;
  releasedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  adbMappingConfidence?: string | null;
  adbMappingSource?: string | null;
  adbMappingUpdatedAt?: string | null;
  manualAdbId?: string | null;
  metadata?: Record<string, unknown>;
  lastSeenAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type InstanceScreenshotPreview = {
  url?: string;
  capturedAt?: number;
  loading?: boolean;
  error?: string;
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
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ScriptVersionRecord = {
  id: string;
  scriptId: string;
  versionNo: number;
  status: string;
  definition?: Record<string, unknown>;
  steps?: Array<Record<string, unknown>>;
  variables?: Record<string, unknown>;
  retryPolicy?: Record<string, unknown>;
  detectionPolicy?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
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
  resourceKind?: "productionBatch" | "characterGroup";
  characterGroupId?: string | null;
  sourceGroupId?: string | null;
  workflowId?: string | null;
  workflowRunId?: string | null;
  status: string;
  usageStatus: string;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string | null;
};

type ProductionResourceTab = "CHARACTER_GROUP" | "IMAGE_BATCH" | "VIDEO_BATCH" | "MUSIC_TRACK" | "FINAL_VIDEO" | "POST_CONTENT" | "ALL";

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

type AssetCenterItem = {
  id: string;
  itemType: string;
  title: string;
  subtitle?: string | null;
  category?: string | null;
  status?: string | null;
  thumbnailUrl?: string | null;
  previewText?: string | null;
  tags: string[];
  attributes: Record<string, unknown>;
  sourceModule: string;
  sourceId: string;
  updatedAt?: string | null;
  metadata: Record<string, unknown>;
};

type AssetCenterItemsResponse = {
  items: AssetCenterItem[];
  total: number;
  page: number;
  pageSize: number;
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
  input?: Record<string, unknown>;
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
  createdAt?: string;
  startedAt?: string | null;
  updatedAt?: string;
  finishedAt?: string | null;
  steps?: RuntimeStep[];
};

type ScriptRunStep = {
  id: string;
  stepNo: number;
  stepType: string;
  status: string;
  input?: Record<string, unknown>;
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

type PromptKind = "image" | "video" | "music" | "post";
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
type CapacityPoolsTab = "operational" | "capabilities" | "workflow" | "legacy";
type CapacityDrawerTab = "overview" | "capabilities" | "allocation" | "history" | "host" | "json";
type ProductionControlView = "group" | "job";

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
const runtimeStatusBoardOptions = ["PENDING", "RUNNING", "PAUSED", "FAILED_RECOVERABLE", "FAILED", "COMPLETED", "CANCELLED"];
const instancePoolStateOptions = ["AVAILABLE", "STANDBY", "WORKFLOW", "MAINTENANCE", "DISABLED", "RETIRED"];
const capacityStageOptions = ["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT"];
const productionBatchTypeOptions = ["CHARACTER_GROUP", "IMAGE_BATCH", "VIDEO_BATCH", "MUSIC_TRACK", "FINAL_VIDEO", "POST_CONTENT"];
const assetCategoryTabs = [
  { id: "CHARACTER_IMAGE", label: "Character Images" },
  { id: "PROMPT_TEMPLATE", label: "Prompt Templates" },
  { id: "MUSIC_TRACK", label: "Music Library" },
  { id: "VIDEO_TEMPLATE", label: "Video Templates" },
  { id: "POST_TEMPLATE", label: "Post Templates" },
  { id: "PRODUCTION_RESOURCE", label: "Production Resources" }
];
const jobBoardStatusOptions = ["PENDING", "ALLOCATED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];
const productionQueueStatusOptions = ["PENDING", "ALLOCATED", "RUNNING", "WAITING_RESOURCE", "WAITING_MUSIC", "FAILED_RECOVERABLE", "FAILED", "COMPLETED"];
const productionPipelineStages = ["CHARACTER_GROUP", "IMAGE_EDIT", "VIDEO_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT"];
const promptCategoryOptions = ["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT", "UTILITY"];
const scriptStepTemplates: Record<string, { label: string; fields: Array<{ key: string; label: string; type?: "number" | "json" | "text"; required?: boolean }> }> = {
  wait: { label: "wait", fields: [{ key: "ms", label: "ms", type: "number", required: true }] },
  screenshot: { label: "screenshot", fields: [{ key: "label", label: "label" }] },
  tap: { label: "tap", fields: [{ key: "x", label: "x", type: "number", required: true }, { key: "y", label: "y", type: "number", required: true }] },
  swipe: { label: "swipe", fields: [{ key: "x1", label: "x1", type: "number", required: true }, { key: "y1", label: "y1", type: "number", required: true }, { key: "x2", label: "x2", type: "number", required: true }, { key: "y2", label: "y2", type: "number", required: true }, { key: "duration", label: "duration", type: "number" }] },
  "send-text": { label: "send-text", fields: [{ key: "text", label: "text", required: true }] },
  "send-key": { label: "send-key", fields: [{ key: "key", label: "key", required: true }] },
  "download-latest": { label: "download-latest", fields: [{ key: "sourceDir", label: "sourceDir" }, { key: "extensions", label: "extensions", type: "json" }, { key: "targetFolder", label: "targetFolder" }] },
  "check-screen": { label: "check-screen", fields: [{ key: "templateId", label: "templateId", required: true }, { key: "timeoutMs", label: "timeoutMs", type: "number" }, { key: "matchType", label: "matchType" }] },
  "wait-screen": { label: "wait-screen", fields: [{ key: "templateId", label: "templateId", required: true }, { key: "timeoutMs", label: "timeoutMs", type: "number" }, { key: "intervalMs", label: "intervalMs", type: "number" }] },
  "upload-file": { label: "upload-file", fields: [{ key: "fileAssetId", label: "fileAssetId", required: true }, { key: "target", label: "target" }] },
  retry: { label: "retry", fields: [{ key: "maxRetries", label: "maxRetries", type: "number", required: true }, { key: "retryDelayMs", label: "retryDelayMs", type: "number" }] },
  if: { label: "if", fields: [{ key: "condition", label: "condition", required: true }, { key: "thenSteps", label: "thenSteps", type: "json" }, { key: "elseSteps", label: "elseSteps", type: "json" }] },
  "run-sub-script": { label: "run-sub-script", fields: [{ key: "scriptId", label: "scriptId", required: true }, { key: "versionId", label: "versionId" }] }
};
const scriptRuntimeVariables = ["{{prompt.image}}", "{{prompt.video}}", "{{prompt.music}}", "{{prompt.post}}", "{{group.name}}", "{{group.size}}", "{{batch.id}}", "{{asset.publicUrl}}", "{{runtime.instanceId}}", "{{runtime.adbId}}"];
const standardGroupAttributeKeys = ["background", "outfit", "emotion", "scene"];
const workflowJobTypes = ["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT"];
const defaultFullPipelineRules = [
  { trigger: "CHARACTER_GROUP.READY", targetJobType: "IMAGE_EDIT", outputBatchType: "IMAGE_BATCH", scriptCategory: "IMAGE_EDIT", promptCategory: "IMAGE" },
  { trigger: "IMAGE_BATCH.READY", targetJobType: "VIDEO_GENERATE", outputBatchType: "VIDEO_BATCH", scriptCategory: "VIDEO_GENERATE", promptCategory: "VIDEO" },
  { trigger: "VIDEO_BATCH.READY", targetJobType: "VIDEO_COMPOSE", outputBatchType: "FINAL_VIDEO", requires: ["MUSIC_TRACK"], scriptCategory: "VIDEO_COMPOSE" },
  { trigger: "FINAL_VIDEO.READY", targetJobType: "POST_CONTENT", outputBatchType: "POST_CONTENT", scriptCategory: "POST_CONTENT", promptCategory: "POST_CONTENT" }
];
const workflowTemplateOptions = ["Full AI Content Pipeline", "Image Only", "Video Pipeline", "Post Content Only", "Blank Resource-Driven Workflow"];
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
    "app.productionJobs": "Production Control Center",
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
    "management.instancePools": "Capacity Pools",
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
    "management.instancePools": "Capacity Pools",
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

function jobPayloadString(job: OrchestratorJob, key: string) {
  const payload = getRecord(job.payload);
  const output = getRecord(job.output);
  return getString(payload[key]) || getString(output[key]);
}

function adbMappingConfidence(instance?: InstanceRecord | null) {
  const confidence = instance?.adbMappingConfidence ?? instance?.metadata?.adbMappingConfidence;
  return typeof confidence === "string" ? confidence : "";
}

function adbMappingSource(instance?: InstanceRecord | null) {
  const source = instance?.adbMappingSource ?? instance?.metadata?.mappingSource;
  return typeof source === "string" ? source : "";
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

function displayDuration(start?: string | null, end?: string | null) {
  if (!start) return "-";
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return "-";
  const seconds = Math.round((endTime - startTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 1) return `${remaining}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m ${remaining}s`;
}

function runtimeProgress(session?: RuntimeSession | null, run?: ScriptRun | null) {
  const steps = run?.steps?.length ? run.steps : session?.steps ?? [];
  const completed = steps.filter((step) => ["COMPLETED", "SKIPPED"].includes(step.status)).length;
  return { completed, total: steps.length };
}

function groupTimestampParts(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return {
    date: `${yy}${mm}${dd}`,
    displayDate: `${dd}/${mm}/${yyyy}`,
    time: `${hh}${mi}`,
    displayTime: `${hh}:${mi}`
  };
}

function defaultGroupDraft() {
  const stamp = groupTimestampParts();
  return {
    name: `Nhóm ${stamp.date} ${stamp.time}`,
    description: `Nhóm nhân vật tạo ngày ${stamp.displayDate}, vào lúc ${stamp.displayTime}`,
    status: "draft"
  };
}

function normalizeAttributeKey(key?: string | null) {
  return String(key ?? "").trim().toLowerCase().replace(/\s+/g, "_");
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
  if (batch.resourceKind === "characterGroup") return false;
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

function batchGroupId(batch?: ProductionBatch | null) {
  const metadata = getRecord(batch?.metadata);
  return batch?.characterGroupId
    || batch?.sourceGroupId
    || getString(metadata.groupId)
    || getString(metadata.characterGroupId)
    || getString(getRecord(metadata.characterGroupBatch).groupId);
}

function batchDisplayName(batch: ProductionBatch, group?: CharacterGroup | null) {
  const metadata = getRecord(batch.metadata);
  const post = postContentMetadata(batch);
  return getString(metadata.title)
    || post.title
    || getString(metadata.name)
    || group?.name
    || `${batch.batchType} ${displayShortId(batch.id)}`;
}

function characterGroupProductionResource(group: CharacterGroup): ProductionBatch {
  const timestamp = group.createdAt || group.updatedAt || "";
  return {
    id: `character-group:${group.id}`,
    resourceKind: "characterGroup",
    characterGroupId: group.id,
    batchType: "CHARACTER_GROUP",
    sourceGroupId: group.id,
    status: group.status || "ACTIVE",
    usageStatus: "AVAILABLE",
    attributes: {},
    metadata: {
      groupId: group.id,
      characterGroupId: group.id,
      name: group.name,
      description: group.description,
      sourceModule: "character_groups"
    },
    createdAt: timestamp,
    updatedAt: group.updatedAt
  };
}

function productionResourceType(batch: ProductionBatch) {
  return batch.resourceKind === "characterGroup" ? "CHARACTER_GROUP" : batch.batchType;
}

function productionResourceIsCharacterGroup(batch: ProductionBatch) {
  return batch.resourceKind === "characterGroup";
}

function resourceTabLabel(tab: ProductionResourceTab) {
  return ({
    CHARACTER_GROUP: "Character Groups",
    IMAGE_BATCH: "Images",
    VIDEO_BATCH: "Videos",
    MUSIC_TRACK: "Music",
    FINAL_VIDEO: "Final Videos",
    POST_CONTENT: "Post Contents",
    ALL: "All Resources"
  } as Record<ProductionResourceTab, string>)[tab];
}

function resourceTypeForTab(tab: ProductionResourceTab) {
  return tab === "ALL" ? "" : tab;
}

function isRecentDate(value?: string | null) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= Date.now() - 1000 * 60 * 60 * 24 * 7;
}

function lineageOrder(batchType: string) {
  const order = ["CHARACTER_GROUP", "IMAGE_BATCH", "VIDEO_BATCH", "FINAL_VIDEO", "POST_CONTENT"];
  const index = order.indexOf(batchType);
  return index < 0 ? 99 : index;
}

function workflowModeLabel(workflow: WorkflowRecord, legacyStages: WorkflowStageRecord[] = []) {
  const hasRules = Boolean((workflow.resourceRules ?? []).length);
  const hasLegacy = legacyStages.length > 0;
  if (hasRules && hasLegacy) return "Mixed";
  if (hasRules) return "Resource-Driven";
  return "Legacy";
}

function workflowCapacitySummary(config?: CapacityConfig) {
  const entries = Object.entries(config ?? {}).filter(([, value]) => Number(value) > 0);
  return entries.length ? entries.map(([key, value]) => `${key}:${value}`).join(" / ") : "No capacity";
}

function workflowRulesForTemplate(templateType: string) {
  if (templateType === "Image Only") return [defaultFullPipelineRules[0]];
  if (templateType === "Video Pipeline") return defaultFullPipelineRules.slice(1, 3);
  if (templateType === "Post Content Only") return [defaultFullPipelineRules[3]];
  if (templateType === "Blank Resource-Driven Workflow") return [];
  return defaultFullPipelineRules;
}

function normalizeScriptStep(step: Record<string, unknown>, index = 0) {
  const config = getRecord(step.config);
  const input = getRecord(step.input);
  return {
    ...step,
    type: getString(step.type) || getString(step.stepType) || "wait",
    stepNo: Number(step.stepNo ?? index + 1),
    config: { ...input, ...config }
  };
}

function scriptStepType(step: Record<string, unknown>) {
  return getString(step.type) || getString(step.stepType) || "";
}

function scriptStepConfig(step: Record<string, unknown>) {
  return { ...getRecord(step.input), ...getRecord(step.config) };
}

function scriptStepSummary(step: Record<string, unknown>) {
  const config = scriptStepConfig(step);
  const entries = Object.entries(config)
    .filter(([, value]) => value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
  return entries.join(" / ") || "No config";
}

function parseScriptDefinitionJson(value: string) {
  const parsed = parseJsonText(value, { steps: [] });
  return {
    steps: Array.isArray(parsed.steps) ? parsed.steps.map((step, index) => normalizeScriptStep(getRecord(step), index)) : [],
    variables: getRecord(parsed.variables),
    retryPolicy: getRecord(parsed.retryPolicy),
    detectionPolicy: getRecord(parsed.detectionPolicy)
  };
}

function validateScriptSteps(steps: Array<Record<string, unknown>>) {
  const messages: Array<{ index: number; level: "ok" | "warning" | "error"; message: string }> = [];
  steps.forEach((step, index) => {
    const type = scriptStepType(step);
    const config = scriptStepConfig(step);
    const template = scriptStepTemplates[type];
    if (!type) {
      messages.push({ index, level: "error", message: "Step type is required" });
      return;
    }
    if (!template) {
      messages.push({ index, level: "warning", message: `Unknown step type: ${type}` });
      return;
    }
    for (const field of template.fields.filter((item) => item.required)) {
      if (config[field.key] === undefined || config[field.key] === "") {
        messages.push({ index, level: "error", message: `${type} needs ${field.key}` });
      }
    }
  });
  if (!steps.length) messages.push({ index: 0, level: "error", message: "At least one step is required" });
  return messages;
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

function normalizeInstanceCapabilities(capabilities?: InstanceCapabilities): InstanceCapabilities {
  return {
    ...capabilities,
    canRun: Array.isArray(capabilities?.canRun) ? capabilities.canRun.filter((item): item is string => typeof item === "string") : [],
    apps: Array.isArray(capabilities?.apps) ? capabilities.apps.filter((item): item is string => typeof item === "string") : [],
    supportsUpload: Boolean(capabilities?.supportsUpload),
    supportsDownload: Boolean(capabilities?.supportsDownload),
    notes: typeof capabilities?.notes === "string" ? capabilities.notes : ""
  };
}

function instanceCanRun(instance: InstanceRecord, stageType: string) {
  const canRun = normalizeInstanceCapabilities(instance.capabilities).canRun ?? [];
  return canRun.includes(stageType);
}

function isRuntimeIdle(runtimeStatus?: string | null) {
  const value = String(runtimeStatus ?? "").trim();
  return !value || value === "IDLE";
}

function allocationMetadata(allocation?: InstanceAllocationRecord | null) {
  return getRecord(allocation?.metadata);
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
  const [allocations, setAllocations] = useState<InstanceAllocationRecord[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [assetCenterItems, setAssetCenterItems] = useState<AssetCenterItem[]>([]);
  const [assetCenterTotal, setAssetCenterTotal] = useState(0);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [jobs, setJobs] = useState<OrchestratorJob[]>([]);
  const [runtimeSessions, setRuntimeSessions] = useState<RuntimeSession[]>([]);
  const [scriptRuns, setScriptRuns] = useState<ScriptRun[]>([]);
  const [scriptVersions, setScriptVersions] = useState<ScriptVersionRecord[]>([]);
  const [scriptVersionIndex, setScriptVersionIndex] = useState<Record<string, ScriptVersionRecord[]>>({});
  const [launchedJobs, setLaunchedJobs] = useState<OrchestratorJob[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({
    scene: "street",
    emotion: "happy",
    outfit: "sport"
  });
  const [musicPolicyMode, setMusicPolicyMode] = useState("RANDOM_LIBRARY");
  const [musicMatchAttributes, setMusicMatchAttributes] = useState<string[]>(["mood", "tempo", "emotion"]);
  const [postPolicyEnabled, setPostPolicyEnabled] = useState(true);
  const [postPolicyPlatform, setPostPolicyPlatform] = useState("facebook");
  const [postHashtagPolicy, setPostHashtagPolicy] = useState("template");
  const [postCtaPolicy, setPostCtaPolicy] = useState("template");
  const [studioGroupFilters, setStudioGroupFilters] = useState({
    search: "",
    readyOnly: false,
    groupSize: "",
    missingImages: false,
    recentlyCreated: false
  });
  const [studioDrafts, setStudioDrafts] = useState<Array<Record<string, unknown>>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem("fbcm-studio-drafts") ?? "[]") as Array<Record<string, unknown>>;
    } catch {
      return [];
    }
  });
  const [promptSelections, setPromptSelections] = useState<PromptSelections>({
    image: "",
    video: "",
    music: "",
    post: ""
  });
  const [previews, setPreviews] = useState<PromptPreviews>({
    image: "",
    video: "",
    music: "",
    post: ""
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
  const [jobsViewMode, setJobsViewMode] = useState<"kanban" | "table">("kanban");
  const [jobsWorkflowFilter, setJobsWorkflowFilter] = useState("");
  const [jobsGroupFilter, setJobsGroupFilter] = useState("");
  const [jobsInstanceFilter, setJobsInstanceFilter] = useState("");
  const [jobsAllocationModeFilter, setJobsAllocationModeFilter] = useState("");
  const [jobsCreatedDateFilter, setJobsCreatedDateFilter] = useState("");
  const [jobsFailedOnly, setJobsFailedOnly] = useState(false);
  const [jobsRecoverableOnly, setJobsRecoverableOnly] = useState(false);
  const [productionControlView, setProductionControlView] = useState<ProductionControlView>("group");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [jobDrawerTab, setJobDrawerTab] = useState<"overview" | "source" | "allocation" | "runtime" | "script" | "output" | "lineage" | "json">("overview");
  const [lastJobsRefreshAt, setLastJobsRefreshAt] = useState("");
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState(10);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedRuntimeId, setSelectedRuntimeId] = useState("");
  const [runtimeViewMode, setRuntimeViewMode] = useState<"board" | "table">("board");
  const [runtimeStatusFilter, setRuntimeStatusFilter] = useState("");
  const [runtimeHostFilter, setRuntimeHostFilter] = useState("");
  const [runtimeInstanceFilter, setRuntimeInstanceFilter] = useState("");
  const [runtimeJobTypeFilter, setRuntimeJobTypeFilter] = useState("");
  const [runtimeScriptCategoryFilter, setRuntimeScriptCategoryFilter] = useState("");
  const [runtimeCreatedDateFilter, setRuntimeCreatedDateFilter] = useState("");
  const [runtimeRecoverableOnly, setRuntimeRecoverableOnly] = useState(false);
  const [runtimeFailedOnly, setRuntimeFailedOnly] = useState(false);
  const [runtimeRunningOnly, setRuntimeRunningOnly] = useState(false);
  const [runtimeDrawerTab, setRuntimeDrawerTab] = useState<"overview" | "checkpoint" | "timeline" | "host" | "job" | "output" | "recovery" | "json">("overview");
  const [lastRuntimeRefreshAt, setLastRuntimeRefreshAt] = useState("");
  const [selectedHostId, setSelectedHostId] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [debugOpen, setDebugOpen] = useState(true);
  const [hostAdbId, setHostAdbId] = useState("");
  const [hostInstanceId, setHostInstanceId] = useState("");
  const [hostSendText, setHostSendText] = useState("hello");
  const [hostResult, setHostResult] = useState<unknown>(null);
  const [adbDevices, setAdbDevices] = useState<AdbDevice[]>([]);
  const [instanceScreenshotPreviews, setInstanceScreenshotPreviews] = useState<Record<string, InstanceScreenshotPreview>>({});
  const [managementSection, setManagementSection] = useState<ManagementSection>("characters");
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [orchestratorRules, setOrchestratorRules] = useState<OrchestratorRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [selectedHostDrawerId, setSelectedHostDrawerId] = useState("");
  const [hostDrawerTab, setHostDrawerTab] = useState<"overview" | "instances" | "adb" | "tests" | "storage" | "json">("overview");
  const [instanceViewMode, setInstanceViewMode] = useState<"board" | "table">("board");
  const [instanceStatusFilter, setInstanceStatusFilter] = useState("");
  const [instanceAdbFilter, setInstanceAdbFilter] = useState("");
  const [instanceAdbConfidenceFilter, setInstanceAdbConfidenceFilter] = useState("");
  const [instanceMaintenanceFilter, setInstanceMaintenanceFilter] = useState(false);
  const [instanceLastSeenFilter, setInstanceLastSeenFilter] = useState("");
  const [instanceDrawerId, setInstanceDrawerId] = useState("");
  const [instanceDrawerTab, setInstanceDrawerTab] = useState<"overview" | "capabilities" | "runtime" | "health" | "history" | "json">("overview");
  const [instanceCopySourceId, setInstanceCopySourceId] = useState("");
  const [instanceBulkCapability, setInstanceBulkCapability] = useState("IMAGE_EDIT");
  const [adbMappingInstanceId, setAdbMappingInstanceId] = useState("");
  const [selectedManualAdbId, setSelectedManualAdbId] = useState("");
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
  const [workflowViewMode, setWorkflowViewMode] = useState<"card" | "table">("card");
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState("");
  const [workflowModeFilter, setWorkflowModeFilter] = useState("");
  const [workflowHasCapacityFilter, setWorkflowHasCapacityFilter] = useState(false);
  const [workflowHasMusicFilter, setWorkflowHasMusicFilter] = useState(false);
  const [workflowHasPostFilter, setWorkflowHasPostFilter] = useState(false);
  const [workflowRecentFilter, setWorkflowRecentFilter] = useState(false);
  const [workflowDrawerTab, setWorkflowDrawerTab] = useState<"overview" | "rules" | "prompts" | "scripts" | "capacity" | "music" | "post" | "legacy" | "runs" | "json">("overview");
  const [workflowDetail, setWorkflowDetail] = useState<WorkflowDetailRecord | null>(null);
  const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);
  const [workflowWizardStep, setWorkflowWizardStep] = useState(1);
  const [workflowWizard, setWorkflowWizard] = useState({
    name: "",
    description: "",
    status: "draft",
    templateType: "Full AI Content Pipeline",
    resourceRules: JSON.stringify(defaultFullPipelineRules, null, 2),
    promptMapping: "{}",
    scriptMapping: "{}",
    capacity: JSON.stringify({ IMAGE_EDIT: 1, VIDEO_GENERATE: 1, MUSIC_GENERATE: 0, VIDEO_COMPOSE: 1, POST_CONTENT: 1 }, null, 2),
    musicPolicy: JSON.stringify({ mode: "RANDOM_LIBRARY", matchAttributes: ["mood", "tempo", "emotion"] }, null, 2),
    postContentPolicy: JSON.stringify({ enabled: true, platform: "facebook", hashtagPolicy: "template", ctaPolicy: "template" }, null, 2)
  });
  const [capacityResult, setCapacityResult] = useState<WorkflowCapacityResponse | null>(null);
  const [instancePoolStateFilter, setInstancePoolStateFilter] = useState("");
  const [instanceCapabilityFilter, setInstanceCapabilityFilter] = useState("");
  const [instanceRuntimeFilter, setInstanceRuntimeFilter] = useState("");
  const [capacityPoolsTab, setCapacityPoolsTab] = useState<CapacityPoolsTab>("operational");
  const [selectedCapacityInstanceIds, setSelectedCapacityInstanceIds] = useState<string[]>([]);
  const [capacityDrawerInstanceId, setCapacityDrawerInstanceId] = useState("");
  const [capacityDrawerTab, setCapacityDrawerTab] = useState<CapacityDrawerTab>("overview");
  const [capacityCopySourceInstanceId, setCapacityCopySourceInstanceId] = useState("");
  const [capacityBulkCapability, setCapacityBulkCapability] = useState("IMAGE_EDIT");
  const [capacityCapabilityDraft, setCapacityCapabilityDraft] = useState<InstanceCapabilities>({
    canRun: [],
    apps: [],
    supportsUpload: false,
    supportsDownload: false,
    notes: ""
  });
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [selectedScriptVersionId, setSelectedScriptVersionId] = useState("");
  const [scriptCategoryFilter, setScriptCategoryFilter] = useState("");
  const [scriptStatusFilter, setScriptStatusFilter] = useState("");
  const [scriptHasActiveFilter, setScriptHasActiveFilter] = useState(false);
  const [scriptLastTestFilter, setScriptLastTestFilter] = useState("");
  const [scriptRecentFilter, setScriptRecentFilter] = useState(false);
  const [scriptDrawerTab, setScriptDrawerTab] = useState<"overview" | "versions" | "steps" | "variables" | "test" | "runs" | "json">("overview");
  const [selectedScriptStepIndex, setSelectedScriptStepIndex] = useState(0);
  const [scriptTestContext, setScriptTestContext] = useState(JSON.stringify({
    prompt: { image: "Sample image prompt", video: "", music: "", post: "" },
    group: { name: "Sample Group", size: 5 },
    batch: { id: "pb_sample" },
    asset: { publicUrl: "/storage/sample.png" },
    runtime: { instanceId: "", adbId: "" }
  }, null, 2));
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
  const [productionResourceTab, setProductionResourceTab] = useState<ProductionResourceTab>("IMAGE_BATCH");
  const [productionResourceFilters, setProductionResourceFilters] = useState({
    search: "",
    type: "",
    status: "",
    usageStatus: "",
    workflowId: "",
    groupId: "",
    createdDate: "",
    hasLineage: false,
    readyOnly: false,
    reusableOnly: false,
    includeArchived: false
  });
  const [productionGrouped, setProductionGrouped] = useState(false);
  const [resourceDrawerTab, setResourceDrawerTab] = useState<"overview" | "group" | "lineage" | "jobs" | "runtime" | "json">("overview");
  const [assetTab, setAssetTab] = useState("CHARACTER_IMAGE");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetTagFilter, setAssetTagFilter] = useState("");
  const [assetAttributeFilter, setAssetAttributeFilter] = useState("");
  const [assetLibraryCategoryFilter, setAssetLibraryCategoryFilter] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState("");
  const [assetSourceFilter, setAssetSourceFilter] = useState("");
  const [assetUpdatedDateFilter, setAssetUpdatedDateFilter] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedAssetCenterItemId, setSelectedAssetCenterItemId] = useState("");
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
  const [groupAttributeDrafts, setGroupAttributeDrafts] = useState<Record<string, string>>({});
  const [customGroupAttributes, setCustomGroupAttributes] = useState<Array<{ key: string; value: string }>>([]);
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
      return (!statusFilter || job.status === statusFilter || productionJobStatus(job) === statusFilter)
        && (!stageFilter || job.targetStageType === stageFilter)
        && (!poolFilter || poolType === poolFilter);
    });
  }, [jobs, poolFilter, pools, stageFilter, statusFilter]);
  const managementFilteredJobs = useMemo(() => {
    const search = adminSearch.toLowerCase();
    return jobs.filter((job) => {
      const sourceBatch = batches.find((batch) => batch.id === job.sourceBatchId) ?? null;
      const groupId = batchGroupId(sourceBatch);
      const group = groupId ? groups.find((item) => item.id === groupId) ?? null : null;
      const workflowId = sourceBatch?.workflowId || jobPayloadString(job, "workflowId");
      const allocation = allocations.find((item) => item.id === jobPayloadString(job, "allocationId") || item.orchestratorJobId === job.id) ?? null;
      const instanceId = displayJobInstance(job) !== "-" ? displayJobInstance(job) : allocation?.instanceId ?? "";
      const allocationMode = displayJobAllocationMode(job) !== "-" ? displayJobAllocationMode(job) : allocation?.allocationMode ?? "";
      const runtime = runtimeSessions.find((session) => session.jobId === job.id);
      const haystack = `${job.id} ${job.sourceBatchId} ${job.targetStageType} ${job.status} ${group?.name ?? ""} ${workflowId ?? ""} ${instanceId} ${allocationMode}`.toLowerCase();
      return (!adminSearch || haystack.includes(search))
        && (!statusFilter || job.status === statusFilter || productionJobStatus(job) === statusFilter)
        && (!stageFilter || job.targetStageType === stageFilter)
        && (!jobsWorkflowFilter || workflowId === jobsWorkflowFilter)
        && (!jobsGroupFilter || groupId === jobsGroupFilter)
        && (!jobsInstanceFilter || instanceId === jobsInstanceFilter)
        && (!jobsAllocationModeFilter || allocationMode === jobsAllocationModeFilter)
        && (!jobsCreatedDateFilter || String(job.createdAt).slice(0, 10) === jobsCreatedDateFilter)
        && (!jobsFailedOnly || job.status === "FAILED")
        && (!jobsRecoverableOnly || runtime?.status === "FAILED_RECOVERABLE");
    });
  }, [adminSearch, allocations, batches, groups, jobs, jobsAllocationModeFilter, jobsCreatedDateFilter, jobsFailedOnly, jobsGroupFilter, jobsInstanceFilter, jobsRecoverableOnly, jobsWorkflowFilter, runtimeSessions, stageFilter, statusFilter]);
  const managementJobColumns = useMemo(() => jobBoardStatusOptions.map((statusName) => ({
    status: statusName,
    items: managementFilteredJobs.filter((job) => job.status === statusName)
  })), [managementFilteredJobs]);
  const managementJobKpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const waitingCapacity = jobs.filter((job) => job.status === "PENDING" && !instances.some((instance) => (instance.currentPoolType ?? "") === "STANDBY" && instanceCanRun(instance, job.targetStageType))).length;
    const waitingMusic = jobs.filter((job) => job.status === "PENDING" && job.targetStageType === "VIDEO_COMPOSE" && !batches.some((batch) => batch.batchType === "MUSIC_TRACK" && batch.status === "READY" && ["AVAILABLE", "REUSABLE"].includes(batch.usageStatus))).length;
    return {
      pending: jobs.filter((job) => job.status === "PENDING").length,
      allocated: jobs.filter((job) => job.status === "ALLOCATED").length,
      running: jobs.filter((job) => job.status === "RUNNING").length,
      completedToday: jobs.filter((job) => job.status === "COMPLETED" && String(job.updatedAt ?? job.createdAt).slice(0, 10) === today).length,
      failed: jobs.filter((job) => job.status === "FAILED").length,
      recoverable: runtimeSessions.filter((session) => session.status === "FAILED_RECOVERABLE").length,
      waitingInstance: waitingCapacity,
      waitingMusic,
      waitingResource: jobs.filter((job) => job.status === "PENDING" && !batches.some((batch) => batch.id === job.sourceBatchId)).length,
      finalOutputsToday: batches.filter((batch) => batch.batchType === "FINAL_VIDEO" && String(batch.createdAt).slice(0, 10) === today).length,
      postContentsToday: batches.filter((batch) => batch.batchType === "POST_CONTENT" && String(batch.createdAt).slice(0, 10) === today).length
    };
  }, [batches, instances, jobs, runtimeSessions]);
  const productionControlColumns = useMemo(() => productionQueueStatusOptions.map((statusName) => ({
    status: statusName,
    items: managementFilteredJobs.filter((job) => productionJobStatus(job) === statusName)
  })), [managementFilteredJobs, batches, instances, runtimeSessions]);
  const productionPipelineStats = useMemo(() => productionPipelineStages.map((stage) => {
    if (stage === "CHARACTER_GROUP") {
      return {
        stage,
        pending: batches.filter((batch) => batch.batchType === "CHARACTER_GROUP" && batch.status === "NEW").length,
        running: 0,
        completed: batches.filter((batch) => batch.batchType === "CHARACTER_GROUP" && batch.status === "READY").length,
        failed: batches.filter((batch) => batch.batchType === "CHARACTER_GROUP" && batch.status === "FAILED").length
      };
    }
    const stageJobs = jobs.filter((job) => job.targetStageType === stage);
    return {
      stage,
      pending: stageJobs.filter((job) => productionJobStatus(job) === "PENDING").length,
      running: stageJobs.filter((job) => ["ALLOCATED", "RUNNING"].includes(productionJobStatus(job))).length,
      completed: stageJobs.filter((job) => job.status === "COMPLETED").length,
      failed: stageJobs.filter((job) => ["FAILED", "FAILED_RECOVERABLE"].includes(productionJobStatus(job))).length
    };
  }), [batches, jobs, instances, runtimeSessions]);
  const productionGroupTimelines = useMemo(() => {
    const map = new Map<string, { group: CharacterGroup | null; jobs: OrchestratorJob[]; batches: ProductionBatch[] }>();
    for (const batch of batches) {
      const groupId = batchGroupId(batch) || batch.sourceGroupId || "ungrouped";
      const group = groups.find((item) => item.id === groupId) ?? null;
      const entry = map.get(groupId) ?? { group, jobs: [], batches: [] };
      entry.batches.push(batch);
      map.set(groupId, entry);
    }
    for (const job of managementFilteredJobs) {
      const sourceBatch = batches.find((batch) => batch.id === job.sourceBatchId) ?? null;
      const groupId = batchGroupId(sourceBatch) || sourceBatch?.sourceGroupId || "ungrouped";
      const group = groups.find((item) => item.id === groupId) ?? null;
      const entry = map.get(groupId) ?? { group, jobs: [], batches: [] };
      entry.jobs.push(job);
      map.set(groupId, entry);
    }
    return [...map.entries()].map(([groupId, value]) => ({ groupId, ...value })).filter((entry) => entry.jobs.length || entry.batches.length);
  }, [batches, groups, managementFilteredJobs]);
  const productionRecoveryJobs = useMemo(() => (
    jobs.filter((job) => runtimeSessions.some((session) => session.jobId === job.id && session.status === "FAILED_RECOVERABLE"))
  ), [jobs, runtimeSessions]);
  const productionOutputCenter = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return batches.filter((batch) => ["IMAGE_BATCH", "VIDEO_BATCH", "FINAL_VIDEO", "POST_CONTENT"].includes(batch.batchType) && String(batch.createdAt).slice(0, 10) === today);
  }, [batches]);
  const productionCapacityRows = useMemo(() => capacityStageOptions.map((stageType) => {
    const required = jobs.filter((job) => ["PENDING", "ALLOCATED", "RUNNING"].includes(job.status) && job.targetStageType === stageType).length;
    const allocated = instances.filter((instance) => instance.currentPoolType === "WORKFLOW" && instanceCanRun(instance, stageType)).length;
    const available = instances.filter((instance) => instance.currentPoolType === "STANDBY" && instanceCanRun(instance, stageType) && isRuntimeIdle(instance.runtimeStatus)).length;
    return { stageType, required, allocated, available, shortage: Math.max(0, required - allocated - available) };
  }), [instances, jobs]);
  const productionRecommendations = useMemo(() => {
    const recommendations = [];
    if (managementJobKpis.waitingInstance) recommendations.push(`${managementJobKpis.waitingInstance} IMAGE/production jobs waiting for capacity.`);
    if (managementJobKpis.waitingMusic) recommendations.push(`${managementJobKpis.waitingMusic} VIDEO_COMPOSE jobs waiting for matching music.`);
    if (managementJobKpis.waitingResource) recommendations.push(`${managementJobKpis.waitingResource} jobs waiting for source resources.`);
    for (const row of productionCapacityRows.filter((item) => item.shortage > 0)) recommendations.push(`${row.stageType} shortage: need ${row.required}, allocated ${row.allocated}, standby ${row.available}.`);
    return recommendations.length ? recommendations : ["Production queue is healthy. No immediate recommendations."];
  }, [managementJobKpis.waitingInstance, managementJobKpis.waitingMusic, managementJobKpis.waitingResource, productionCapacityRows]);
  const allocationModeOptions = useMemo(() => {
    const fromJobs = jobs.map((job) => displayJobAllocationMode(job)).filter((value) => value && value !== "-");
    const fromAllocations = allocations.map((allocation) => allocation.allocationMode ?? "").filter(Boolean);
    return [...new Set([...fromJobs, ...fromAllocations])].sort();
  }, [allocations, jobs]);
  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / jobsPageSize));
  const paginatedJobs = useMemo(() => {
    const start = (Math.min(jobsPage, totalJobPages) - 1) * jobsPageSize;
    return filteredJobs.slice(start, start + jobsPageSize);
  }, [filteredJobs, jobsPage, jobsPageSize, totalJobPages]);
  const outputBatches = useMemo(
    () => batches.filter((batch) => batchMatchesJob(batch, selectedJob)),
    [batches, selectedJob]
  );
  const selectedJobSourceBatch = useMemo(
    () => selectedJob ? batches.find((batch) => batch.id === selectedJob.sourceBatchId) ?? null : null,
    [batches, selectedJob]
  );
  const selectedJobGroup = useMemo(() => {
    const groupId = batchGroupId(selectedJobSourceBatch);
    return groupId ? groups.find((group) => group.id === groupId) ?? null : null;
  }, [groups, selectedJobSourceBatch]);
  const selectedJobWorkflow = useMemo(() => {
    const workflowId = selectedJobSourceBatch?.workflowId || jobPayloadString(selectedJob ?? { id: "", sourceBatchId: "", targetStageType: "", status: "", createdAt: "" }, "workflowId");
    return workflowId ? workflows.find((workflow) => workflow.id === workflowId) ?? null : null;
  }, [selectedJob, selectedJobSourceBatch, workflows]);
  const selectedJobAllocation = useMemo(() => {
    if (!selectedJob) return null;
    const allocationId = jobPayloadString(selectedJob, "allocationId");
    return allocations.find((allocation) => allocation.id === allocationId || allocation.orchestratorJobId === selectedJob.id) ?? null;
  }, [allocations, selectedJob]);
  const selectedJobOutputAssets = useMemo(() => {
    const ids = new Set(outputBatches.map((batch) => batch.id));
    return assets.filter((asset) => {
      const text = compactJson(asset);
      return [...ids].some((id) => text.includes(id));
    });
  }, [assets, outputBatches]);
  const selectedJobLineage = useMemo(() => {
    if (!selectedJob) return [];
    return [
      selectedJobSourceBatch ? { type: "Source Batch", id: selectedJobSourceBatch.id, label: selectedJobSourceBatch.batchType, status: selectedJobSourceBatch.status } : null,
      { type: "Job", id: selectedJob.id, label: selectedJob.targetStageType, status: selectedJob.status },
      runtimeSession ? { type: "Runtime Session", id: runtimeSession.id, label: `Step ${runtimeSession.currentStepNo}`, status: runtimeSession.status } : null,
      scriptRun ? { type: "Script Run", id: scriptRun.id, label: displayShortId(scriptRun.scriptVersionId), status: scriptRun.status } : null,
      ...outputBatches.map((batch) => ({ type: "Output Batch", id: batch.id, label: batch.batchType, status: batch.status }))
    ].filter(Boolean) as Array<{ type: string; id: string; label: string; status: string }>;
  }, [outputBatches, runtimeSession, scriptRun, selectedJob, selectedJobSourceBatch]);
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
  const selectedInstanceDrawer = useMemo(
    () => instances.find((instance) => instance.id === instanceDrawerId) ?? null,
    [instanceDrawerId, instances]
  );
  const selectedInstanceDrawerAllocation = useMemo(
    () => selectedInstanceDrawer
      ? allocations.find((allocation) => allocation.instanceId === selectedInstanceDrawer.id && !["RELEASED", "FAILED"].includes(allocation.status)) ?? null
      : null,
    [allocations, selectedInstanceDrawer]
  );
  const selectedInstanceDrawerJobs = useMemo(() => {
    if (!selectedInstanceDrawer) return [];
    return jobs.filter((job) => {
      const payload = getRecord(job.payload);
      return getString(payload.instanceId) === selectedInstanceDrawer.id
        || getString(payload.hostId) === selectedInstanceDrawer.hostId
        || allocations.some((allocation) => allocation.orchestratorJobId === job.id && allocation.instanceId === selectedInstanceDrawer.id);
    });
  }, [allocations, jobs, selectedInstanceDrawer]);
  const selectedInstanceDrawerRuntime = useMemo(() => {
    if (!selectedInstanceDrawer) return null;
    const jobIds = new Set(selectedInstanceDrawerJobs.map((job) => job.id));
    return runtimeSessions.find((session) => session.instanceId === selectedInstanceDrawer.id || (session.jobId && jobIds.has(session.jobId))) ?? null;
  }, [runtimeSessions, selectedInstanceDrawer, selectedInstanceDrawerJobs]);
  const selectedInstanceDrawerAllocations = useMemo(
    () => selectedInstanceDrawer ? allocations.filter((allocation) => allocation.instanceId === selectedInstanceDrawer.id).slice(0, 12) : [],
    [allocations, selectedInstanceDrawer]
  );
  const selectedScriptRun = useMemo(
    () => scriptRun ?? scriptRuns.find((run) => run.runtimeSessionId === selectedRuntime?.id) ?? null,
    [scriptRun, scriptRuns, selectedRuntime]
  );
  const selectedScript = useMemo(
    () => scripts.find((script) => script.id === selectedScriptId) ?? null,
    [scripts, selectedScriptId]
  );
  const selectedRule = useMemo(
    () => orchestratorRules.find((rule) => rule.id === selectedRuleId) ?? null,
    [orchestratorRules, selectedRuleId]
  );
  const selectedScriptVersion = useMemo(
    () => scriptVersions.find((version) => version.id === selectedScriptVersionId)
      ?? scriptVersions.find((version) => String(version.status).toLowerCase() === "active")
      ?? scriptVersions[0]
      ?? null,
    [scriptVersions, selectedScriptVersionId]
  );
  const scriptDraft = useMemo(() => parseScriptDefinitionJson(scriptForm.steps), [scriptForm.steps]);
  const scriptValidationMessages = useMemo(() => validateScriptSteps(scriptDraft.steps), [scriptDraft.steps]);
  const latestSelectedScriptRuns = useMemo(
    () => scriptRuns.filter((run) => !selectedScriptId || run.scriptId === selectedScriptId).slice(0, 8),
    [scriptRuns, selectedScriptId]
  );
  const scriptCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const category of scriptCategoryOptions) counts[category] = 0;
    for (const script of scripts) counts[script.category ?? "UTILITY"] = (counts[script.category ?? "UTILITY"] ?? 0) + 1;
    return counts;
  }, [scripts]);
  const scriptKpis = useMemo(() => ({
    total: scripts.length,
    active: scripts.filter((script) => String(script.status).toLowerCase() === "active").length,
    draft: scripts.filter((script) => String(script.status).toLowerCase() === "draft").length,
    failedRuns: scriptRuns.filter((run) => ["FAILED", "FAILED_RECOVERABLE"].includes(run.status)).length,
    recentRuns: scriptRuns.filter((run) => isRecentDate(run.startedAt)).length
  }), [scriptRuns, scripts]);
  const filteredScripts = useMemo(() => {
    const search = adminSearch.toLowerCase();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
    return scripts.filter((script) => {
      const versions = scriptVersionIndex[script.id] ?? [];
      const activeVersion = versions.find((version) => String(version.status).toLowerCase() === "active");
      const lastRun = scriptRuns.find((run) => run.scriptId === script.id);
      const updatedAt = script.updatedAt ? new Date(script.updatedAt).getTime() : 0;
      const testState = !lastRun ? "not-tested" : ["COMPLETED"].includes(lastRun.status) ? "success" : ["FAILED", "FAILED_RECOVERABLE"].includes(lastRun.status) ? "failed" : "running";
      const haystack = `${script.name} ${script.category ?? ""} ${script.status} ${script.description ?? ""}`.toLowerCase();
      return (!adminSearch || haystack.includes(search))
        && (!scriptCategoryFilter || script.category === scriptCategoryFilter)
        && (!scriptStatusFilter || String(script.status).toLowerCase() === scriptStatusFilter)
        && (!scriptHasActiveFilter || Boolean(activeVersion))
        && (!scriptLastTestFilter || testState === scriptLastTestFilter)
        && (!scriptRecentFilter || updatedAt >= recentCutoff);
    });
  }, [adminSearch, scriptCategoryFilter, scriptHasActiveFilter, scriptLastTestFilter, scriptRecentFilter, scriptRuns, scriptStatusFilter, scriptVersionIndex, scripts]);
  const selectedHost = useMemo(
    () => hosts.find((host) => host.id === selectedHostId || host.hostId === selectedHostId) ?? hosts[0] ?? null,
    [hosts, selectedHostId]
  );
  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0] ?? null,
    [selectedWorkflowId, workflows]
  );
  const filteredWorkflows = useMemo(() => {
    const search = adminSearch.toLowerCase();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
    return workflows.filter((workflow) => {
      const mode = workflowModeLabel(workflow);
      const updatedAt = workflow.updatedAt ? new Date(workflow.updatedAt).getTime() : 0;
      return (!adminSearch || `${workflow.name} ${workflow.description ?? ""}`.toLowerCase().includes(search))
        && (!workflowStatusFilter || String(workflow.status ?? "").toLowerCase() === workflowStatusFilter)
        && (!workflowModeFilter || mode === workflowModeFilter)
        && (!workflowHasCapacityFilter || Object.values(workflow.capacityConfig ?? {}).some((value) => Number(value) > 0))
        && (!workflowHasMusicFilter || Object.keys(workflow.musicPolicy ?? {}).length > 0)
        && (!workflowHasPostFilter || Object.keys(workflow.postContentPolicy ?? {}).length > 0)
        && (!workflowRecentFilter || updatedAt >= recentCutoff);
    });
  }, [adminSearch, workflowHasCapacityFilter, workflowHasMusicFilter, workflowHasPostFilter, workflowModeFilter, workflowRecentFilter, workflowStatusFilter, workflows]);
  const workflowKpis = useMemo(() => ({
    total: workflows.length,
    active: workflows.filter((workflow) => String(workflow.status).toLowerCase() === "active").length,
    draft: workflows.filter((workflow) => String(workflow.status).toLowerCase() === "draft").length,
    resourceDriven: workflows.filter((workflow) => (workflow.resourceRules ?? []).length > 0).length,
    legacy: workflows.filter((workflow) => !(workflow.resourceRules ?? []).length).length,
    capacity: workflows.filter((workflow) => Object.values(workflow.capacityConfig ?? {}).some((value) => Number(value) > 0)).length,
    music: workflows.filter((workflow) => Object.keys(workflow.musicPolicy ?? {}).length > 0).length,
    post: workflows.filter((workflow) => Object.keys(workflow.postContentPolicy ?? {}).length > 0).length
  }), [workflows]);
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
  const selectedHostDrawer = useMemo(
    () => hosts.find((host) => host.id === selectedHostDrawerId) ?? null,
    [hosts, selectedHostDrawerId]
  );
  const selectedHostDrawerInstances = useMemo(
    () => selectedHostDrawer ? instances.filter((instance) => instance.hostId === selectedHostDrawer.hostId || instance.hostId === selectedHostDrawer.id) : [],
    [instances, selectedHostDrawer]
  );
  const hostManagementRows = useMemo(() => {
    const search = adminSearch.toLowerCase();
    return hosts
      .filter((host) => !adminSearch || compactJson(host).toLowerCase().includes(search))
      .map((host) => {
        const hostInstances = instances.filter((instance) => instance.hostId === host.hostId || instance.hostId === host.id);
        return {
          host,
          instances: hostInstances,
          total: hostInstances.length,
          standby: hostInstances.filter((instance) => instance.currentPoolType === "STANDBY").length,
          workflow: hostInstances.filter((instance) => instance.currentPoolType === "WORKFLOW").length,
          maintenance: hostInstances.filter((instance) => instance.currentPoolType === "MAINTENANCE").length,
          adbCount: hostInstances.filter((instance) => Boolean(instance.adbId)).length,
          direct: hostInstances.filter((instance) => adbMappingConfidence(instance) === "direct").length,
          preserved: hostInstances.filter((instance) => adbMappingConfidence(instance) === "preserved").length,
          unknown: hostInstances.filter((instance) => hasUnknownAdbMapping(instance)).length
        };
      });
  }, [adminSearch, hosts, instances]);
  const hostKpis = useMemo(() => ({
    total: hosts.length,
    online: hosts.filter((host) => ["online", "active", "healthy"].includes(String(host.status ?? "").toLowerCase())).length,
    offline: hosts.filter((host) => ["offline", "inactive", "disabled"].includes(String(host.status ?? "").toLowerCase())).length,
    errors: hosts.filter((host) => compactJson(host).toLowerCase().includes("error")).length,
    instances: instances.length,
    standby: instances.filter((instance) => instance.currentPoolType === "STANDBY").length,
    workflow: instances.filter((instance) => instance.currentPoolType === "WORKFLOW").length,
    maintenance: instances.filter((instance) => instance.currentPoolType === "MAINTENANCE").length
  }), [hosts, instances]);
  const filteredOperationalInstances = useMemo(() => {
    const lowerSearch = adminSearch.toLowerCase();
    return instances.filter((instance) => {
      const capabilityLabels = instanceCapabilityLabels(instance);
      const lastSeenTime = instance.lastSeenAt ? new Date(instance.lastSeenAt).getTime() : 0;
      const minLastSeen = instanceLastSeenFilter ? new Date(instanceLastSeenFilter).getTime() : 0;
      return (!selectedHostId || instance.hostId === selectedHostId)
        && (!instancePoolStateFilter || (instance.currentPoolType ?? "AVAILABLE") === instancePoolStateFilter)
        && (!instanceCapabilityFilter || capabilityLabels.includes(instanceCapabilityFilter))
        && (!instanceRuntimeFilter || instance.runtimeStatus === instanceRuntimeFilter)
        && (!instanceStatusFilter || instance.status === instanceStatusFilter)
        && (!instanceAdbFilter || (instanceAdbFilter === "has" ? Boolean(instance.adbId) : hasUnknownAdbMapping(instance)))
        && (!instanceAdbConfidenceFilter || adbMappingConfidence(instance) === instanceAdbConfidenceFilter)
        && (!instanceMaintenanceFilter || Boolean(instance.maintenanceReason))
        && (!instanceLastSeenFilter || (Number.isFinite(lastSeenTime) && lastSeenTime >= minLastSeen))
        && compactJson(instance).toLowerCase().includes(lowerSearch);
    });
  }, [adminSearch, instanceAdbConfidenceFilter, instanceAdbFilter, instanceCapabilityFilter, instanceLastSeenFilter, instanceMaintenanceFilter, instancePoolStateFilter, instanceRuntimeFilter, instanceStatusFilter, instances, selectedHostId]);
  const instanceStatusOptions = useMemo(() => [...new Set(instances.map((instance) => instance.status).filter(Boolean))].sort(), [instances]);
  const instanceAdbConfidenceOptions = useMemo(() => [...new Set(instances.map((instance) => adbMappingConfidence(instance)).filter(Boolean))].sort(), [instances]);
  const instanceManagementKpis = useMemo(() => ({
    total: instances.length,
    available: instances.filter((instance) => (instance.currentPoolType ?? "AVAILABLE") === "AVAILABLE").length,
    standby: instances.filter((instance) => instance.currentPoolType === "STANDBY").length,
    workflow: instances.filter((instance) => instance.currentPoolType === "WORKFLOW").length,
    maintenance: instances.filter((instance) => instance.currentPoolType === "MAINTENANCE").length,
    disabled: instances.filter((instance) => instance.currentPoolType === "DISABLED").length,
    retired: instances.filter((instance) => instance.currentPoolType === "RETIRED").length,
    missingAdb: instances.filter((instance) => hasUnknownAdbMapping(instance)).length,
    imageEdit: instances.filter((instance) => instanceCanRun(instance, "IMAGE_EDIT")).length,
    videoGenerate: instances.filter((instance) => instanceCanRun(instance, "VIDEO_GENERATE")).length,
    musicGenerate: instances.filter((instance) => instanceCanRun(instance, "MUSIC_GENERATE")).length,
    videoCompose: instances.filter((instance) => instanceCanRun(instance, "VIDEO_COMPOSE")).length,
    postContent: instances.filter((instance) => instanceCanRun(instance, "POST_CONTENT")).length
  }), [instances]);
  const operationalInstanceColumns = useMemo(() => instancePoolStateOptions.map((poolType) => ({
    poolType,
    items: filteredOperationalInstances.filter((instance) => (instance.currentPoolType ?? "AVAILABLE") === poolType)
  })), [filteredOperationalInstances]);
  const adbMappingInstance = useMemo(
    () => instances.find((instance) => instance.id === adbMappingInstanceId) ?? null,
    [adbMappingInstanceId, instances]
  );
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
  const capacityPoolKpis = useMemo(() => ({
    total: instances.length,
    available: instances.filter((instance) => (instance.currentPoolType ?? "AVAILABLE") === "AVAILABLE").length,
    standby: instances.filter((instance) => instance.currentPoolType === "STANDBY").length,
    workflow: instances.filter((instance) => instance.currentPoolType === "WORKFLOW").length,
    maintenance: instances.filter((instance) => instance.currentPoolType === "MAINTENANCE").length,
    disabled: instances.filter((instance) => instance.currentPoolType === "DISABLED").length,
    retired: instances.filter((instance) => instance.currentPoolType === "RETIRED").length
  }), [instances]);
  const capacityPoolHints = useMemo(() => {
    const noCapabilityStandby = instances.filter((instance) => instance.currentPoolType === "STANDBY" && !(normalizeInstanceCapabilities(instance.capabilities).canRun ?? []).length).length;
    const staleMaintenance = instances.filter((instance) => {
      if (instance.currentPoolType !== "MAINTENANCE") return false;
      const time = new Date(instance.lastErrorAt ?? instance.updatedAt ?? "").getTime();
      return Number.isFinite(time) && time < Date.now() - 1000 * 60 * 60 * 24;
    }).length;
    const queueWithoutCapacity = capacityStageOptions.filter((stageType) => (
      jobs.some((job) => job.targetStageType === stageType && ["PENDING", "ALLOCATED"].includes(job.status))
      && !instances.some((instance) => instance.currentPoolType === "STANDBY" && instanceCanRun(instance, stageType) && isRuntimeIdle(instance.runtimeStatus))
    ));
    return [
      `${capacityPoolKpis.available} instances are AVAILABLE but not in STANDBY.`,
      `${noCapabilityStandby} STANDBY instances have no capabilities.`,
      `${staleMaintenance} MAINTENANCE instances have been stuck for more than 24 hours.`,
      ...queueWithoutCapacity.map((stageType) => `${stageType} queue has jobs but no standby capable instance.`)
    ];
  }, [capacityPoolKpis.available, instances, jobs]);
  const capacityInstanceColumns = useMemo(() => instancePoolStateOptions.map((poolType) => ({
    poolType,
    items: filteredInstances.filter((instance) => (instance.currentPoolType ?? "AVAILABLE") === poolType)
  })), [filteredInstances]);
  const visibleInstanceCards = useMemo(() => {
    let candidates: InstanceRecord[] = [];
    if (page === "control-center") {
      candidates = instanceColumns.flatMap((column) => column.items.slice(0, 16));
    } else if (page === "management" && managementSection === "hosts" && hostDrawerTab === "instances") {
      candidates = selectedHostDrawerInstances;
    } else if (page === "management" && managementSection === "instances" && instanceViewMode === "board") {
      candidates = operationalInstanceColumns.flatMap((column) => column.items);
    } else if (page === "management" && managementSection === "instance-pools" && capacityPoolsTab === "operational") {
      candidates = capacityInstanceColumns.flatMap((column) => column.items);
    }

    const unique = new Map<string, InstanceRecord>();
    for (const instance of candidates) {
      if (!instance.adbId || hasUnknownAdbMapping(instance)) continue;
      unique.set(instance.id, instance);
    }
    return [...unique.values()].slice(0, 24);
  }, [capacityInstanceColumns, capacityPoolsTab, hostDrawerTab, instanceColumns, instanceViewMode, managementSection, operationalInstanceColumns, page, selectedHostDrawerInstances]);
  const selectedCapacityInstance = useMemo(
    () => instances.find((instance) => instance.id === capacityDrawerInstanceId) ?? null,
    [capacityDrawerInstanceId, instances]
  );
  useEffect(() => {
    if (!visibleInstanceCards.length) return;
    let cancelled = false;

    const refreshDueScreenshots = () => {
      const nowMs = Date.now();
      for (const instance of visibleInstanceCards) {
        const cached = instanceScreenshotPreviews[instance.id];
        const isFresh = cached?.capturedAt && nowMs - cached.capturedAt < 10_000;
        if (cached?.loading || isFresh) continue;
        requestInstanceScreenshotPreview(instance);
      }
    };

    refreshDueScreenshots();
    const timer = window.setInterval(() => {
      if (!cancelled) refreshDueScreenshots();
    }, 2_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [instanceScreenshotPreviews, visibleInstanceCards]);
  const selectedCapacityAllocation = useMemo(
    () => selectedCapacityInstance ? allocations.find((allocation) => allocation.instanceId === selectedCapacityInstance.id && !["RELEASED", "FAILED"].includes(allocation.status)) ?? null : null,
    [allocations, selectedCapacityInstance]
  );
  const capacityWorkflowRows = useMemo(() => {
    return workflows
      .filter((workflow) => String(workflow.status ?? "").toLowerCase() !== "archived")
      .map((workflow) => ({
        workflow,
        stages: capacityStageOptions.map((stageType) => {
          const required = Number(workflow.capacityConfig?.[stageType] ?? 0);
          const standbyCapable = instances.filter((instance) => (
            instance.currentPoolType === "STANDBY"
            && ["ACTIVE", "ONLINE"].includes(String(instance.status ?? ""))
            && isRuntimeIdle(instance.runtimeStatus)
            && instanceCanRun(instance, stageType)
          )).length;
          const allocated = allocations.filter((allocation) => {
            const metadata = allocationMetadata(allocation);
            return allocation.status !== "RELEASED"
              && (allocation.workflowRunId === workflow.id || getString(metadata.workflowId) === workflow.id)
              && (getString(metadata.stageType) === stageType || getString(metadata.targetStageType) === stageType);
          }).length;
          return { stageType, required, standbyCapable, allocated, shortage: Math.max(0, required - standbyCapable) };
        })
      }));
  }, [allocations, instances, workflows]);
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
  const selectedRuntimeJob = useMemo(
    () => selectedRuntime?.jobId ? jobs.find((job) => job.id === selectedRuntime.jobId) ?? null : null,
    [jobs, selectedRuntime]
  );
  const selectedRuntimeInstance = useMemo(
    () => selectedRuntime?.instanceId ? instances.find((instance) => instance.id === selectedRuntime.instanceId) ?? null : null,
    [instances, selectedRuntime]
  );
  const selectedRuntimeHost = useMemo(
    () => selectedRuntime ? hosts.find((host) => host.id === selectedRuntime.hostId || host.hostId === selectedRuntime.hostId || host.hostId === selectedRuntimeInstance?.hostId) ?? null : null,
    [hosts, selectedRuntime, selectedRuntimeInstance]
  );
  const selectedRuntimeSourceBatch = useMemo(
    () => selectedRuntimeJob ? batches.find((batch) => batch.id === selectedRuntimeJob.sourceBatchId) ?? null : null,
    [batches, selectedRuntimeJob]
  );
  const selectedRuntimeOutputBatches = useMemo(
    () => selectedRuntimeJob ? batches.filter((batch) => batchMatchesJob(batch, selectedRuntimeJob)) : [],
    [batches, selectedRuntimeJob]
  );
  const selectedRuntimeOutputAssets = useMemo(() => {
    const ids = new Set(selectedRuntimeOutputBatches.map((batch) => batch.id));
    return assets.filter((asset) => [...ids].some((id) => compactJson(asset).includes(id)));
  }, [assets, selectedRuntimeOutputBatches]);
  const runtimeKpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const completed = runtimeSessions.filter((session) => session.status === "COMPLETED" && String(session.finishedAt ?? session.updatedAt ?? "").slice(0, 10) === today);
    const durations = runtimeSessions
      .map((session) => {
        const start = session.startedAt ? new Date(session.startedAt).getTime() : NaN;
        const end = session.finishedAt ? new Date(session.finishedAt).getTime() : NaN;
        return Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : 0;
      })
      .filter(Boolean);
    const avgMs = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
    return {
      running: runtimeSessions.filter((session) => session.status === "RUNNING").length,
      completedToday: completed.length,
      failed: runtimeSessions.filter((session) => session.status === "FAILED").length,
      recoverable: runtimeSessions.filter((session) => session.status === "FAILED_RECOVERABLE").length,
      paused: runtimeSessions.filter((session) => session.status === "PAUSED").length,
      averageDuration: avgMs ? displayDuration(new Date(Date.now() - avgMs).toISOString(), new Date().toISOString()) : "-",
      waitingHost: runtimeSessions.filter((session) => !session.hostId && ["PENDING", "RUNNING"].includes(session.status)).length,
      waitingRecovery: runtimeSessions.filter((session) => session.status === "FAILED_RECOVERABLE").length
    };
  }, [runtimeSessions]);
  const filteredRuntimeSessions = useMemo(() => {
    const search = adminSearch.toLowerCase();
    return runtimeSessions.filter((session) => {
      const job = session.jobId ? jobs.find((item) => item.id === session.jobId) : null;
      const script = session.scriptId ? scripts.find((item) => item.id === session.scriptId) : null;
      const instance = session.instanceId ? instances.find((item) => item.id === session.instanceId) : null;
      const host = hosts.find((item) => item.id === session.hostId || item.hostId === session.hostId || item.hostId === instance?.hostId) ?? null;
      const haystack = `${session.id} ${session.jobId ?? ""} ${session.scriptId ?? ""} ${session.instanceId ?? ""} ${session.hostId ?? ""} ${job?.targetStageType ?? ""} ${script?.category ?? ""}`.toLowerCase();
      return (!adminSearch || haystack.includes(search))
        && (!runtimeStatusFilter || session.status === runtimeStatusFilter)
        && (!runtimeHostFilter || session.hostId === runtimeHostFilter || host?.id === runtimeHostFilter || host?.hostId === runtimeHostFilter)
        && (!runtimeInstanceFilter || session.instanceId === runtimeInstanceFilter)
        && (!runtimeJobTypeFilter || job?.targetStageType === runtimeJobTypeFilter)
        && (!runtimeScriptCategoryFilter || script?.category === runtimeScriptCategoryFilter)
        && (!runtimeCreatedDateFilter || String(session.startedAt ?? session.updatedAt ?? "").slice(0, 10) === runtimeCreatedDateFilter)
        && (!runtimeRecoverableOnly || session.status === "FAILED_RECOVERABLE")
        && (!runtimeFailedOnly || ["FAILED", "FAILED_RECOVERABLE"].includes(session.status))
        && (!runtimeRunningOnly || session.status === "RUNNING");
    });
  }, [adminSearch, hosts, instances, jobs, runtimeCreatedDateFilter, runtimeFailedOnly, runtimeHostFilter, runtimeInstanceFilter, runtimeJobTypeFilter, runtimeRecoverableOnly, runtimeRunningOnly, runtimeScriptCategoryFilter, runtimeSessions, runtimeStatusFilter, scripts]);
  const runtimeColumns = useMemo(() => runtimeStatusBoardOptions.map((statusName) => ({
    status: statusName,
    items: filteredRuntimeSessions.filter((session) => session.status === statusName)
  })), [filteredRuntimeSessions]);
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
  const selectedAssetCenterItem = useMemo(
    () => assetCenterItems.find((item) => item.id === selectedAssetCenterItemId) ?? assetCenterItems[0] ?? null,
    [assetCenterItems, selectedAssetCenterItemId]
  );
  const assetCenterTagOptions = useMemo(
    () => [...new Set(assetCenterItems.flatMap((item) => item.tags ?? []))].sort(),
    [assetCenterItems]
  );
  const assetCenterAttributeOptions = useMemo(
    () => [...new Set(assetCenterItems.flatMap((item) => Object.keys(item.attributes ?? {})))].sort(),
    [assetCenterItems]
  );
  const assetCenterStatusOptions = useMemo(
    () => [...new Set(assetCenterItems.map((item) => item.status).filter(Boolean) as string[])].sort(),
    [assetCenterItems]
  );
  const assetCenterCategoryOptions = useMemo(
    () => [...new Set(assetCenterItems.map((item) => item.category).filter(Boolean) as string[])].sort(),
    [assetCenterItems]
  );
  const assetCenterSourceOptions = useMemo(
    () => [...new Set(assetCenterItems.map((item) => item.sourceModule).filter(Boolean))].sort(),
    [assetCenterItems]
  );
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
  const characterGroupProductionResources = useMemo(
    () => groups.map((group) => characterGroupProductionResource(group)),
    [groups]
  );
  const productionResourceSource = useMemo(() => {
    const orphanCharacterGroupBatches = batches.filter((batch) => batch.batchType === "CHARACTER_GROUP" && !batchGroupId(batch));
    if (productionResourceTab === "CHARACTER_GROUP") {
      return [...characterGroupProductionResources, ...orphanCharacterGroupBatches];
    }
    if (productionResourceTab === "ALL") {
      return [
        ...characterGroupProductionResources,
        ...batches.filter((batch) => batch.batchType !== "CHARACTER_GROUP" || !batchGroupId(batch))
      ];
    }
    return batches;
  }, [batches, characterGroupProductionResources, productionResourceTab]);
  const selectedProductionResource = useMemo(
    () => batches.find((batch) => batch.id === selectedResourceId)
      ?? characterGroupProductionResources.find((batch) => batch.id === selectedResourceId)
      ?? null,
    [batches, characterGroupProductionResources, selectedResourceId]
  );
  const productionResourceJobs = useMemo(() => {
    if (!selectedProductionResource) return [];
    const selectedGroupId = batchGroupId(selectedProductionResource);
    return jobs.filter((job) => {
      const sourceBatch = batches.find((batch) => batch.id === job.sourceBatchId) ?? null;
      const payload = getRecord(job.payload);
      const output = getRecord(job.output);
      const text = compactJson({ payload, output });
      return job.sourceBatchId === selectedProductionResource.id
        || getString(output.outputBatchId) === selectedProductionResource.id
        || getString(payload.outputBatchId) === selectedProductionResource.id
        || Boolean(selectedGroupId && sourceBatch && batchGroupId(sourceBatch) === selectedGroupId)
        || Boolean(selectedGroupId && text.includes(selectedGroupId))
        || text.includes(selectedProductionResource.id);
    });
  }, [batches, jobs, selectedProductionResource]);
  const productionResourceRuntimeSessions = useMemo(() => {
    const jobIds = new Set(productionResourceJobs.map((job) => job.id));
    return runtimeSessions.filter((session) => session.jobId && jobIds.has(session.jobId));
  }, [productionResourceJobs, runtimeSessions]);
  const productionResourceLineage = useMemo(() => {
    if (!selectedProductionResource) return [];
    const groupId = batchGroupId(selectedProductionResource);
    const related = batches.filter((batch) => {
      const text = compactJson(batch.metadata);
      return batch.id === selectedProductionResource.id
        || (groupId && batchGroupId(batch) === groupId)
        || text.includes(selectedProductionResource.id);
    });
    const withSelected = productionResourceIsCharacterGroup(selectedProductionResource)
      ? [selectedProductionResource, ...related]
      : related;
    return withSelected
      .filter((batch, index, list) => list.findIndex((item) => item.id === batch.id) === index)
      .sort((a, b) => lineageOrder(a.batchType) - lineageOrder(b.batchType) || a.createdAt.localeCompare(b.createdAt));
  }, [batches, selectedProductionResource]);
  const productionResourceStatusOptions = useMemo(
    () => [...new Set([...batches.map((batch) => batch.status), ...characterGroupProductionResources.map((batch) => batch.status)])].sort(),
    [batches, characterGroupProductionResources]
  );
  const productionResourceUsageOptions = useMemo(
    () => [...new Set([...batches.map((batch) => batch.usageStatus), ...characterGroupProductionResources.map((batch) => batch.usageStatus)])].sort(),
    [batches, characterGroupProductionResources]
  );
  const productionResourceCards = useMemo(() => {
    const activeTabType = resourceTypeForTab(productionResourceTab);
    const search = productionResourceFilters.search.toLowerCase();
    return productionResourceSource.filter((batch) => {
      const resourceType = productionResourceType(batch);
      const groupId = batchGroupId(batch);
      const group = groups.find((item) => item.id === groupId);
      const lineageCount = groupId ? batches.filter((item) => batchGroupId(item) === groupId).length : 0;
      const haystack = `${batchDisplayName(batch, group)} ${resourceType} ${batch.status} ${batch.usageStatus} ${group?.name ?? ""} ${compactJson(batch.metadata)}`.toLowerCase();
      return (!activeTabType || resourceType === activeTabType)
        && (!productionResourceFilters.type || resourceType === productionResourceFilters.type)
        && (!productionResourceFilters.status || batch.status === productionResourceFilters.status)
        && (!productionResourceFilters.usageStatus || batch.usageStatus === productionResourceFilters.usageStatus)
        && (!productionResourceFilters.workflowId || batch.workflowId === productionResourceFilters.workflowId)
        && (!productionResourceFilters.groupId || groupId === productionResourceFilters.groupId)
        && (!productionResourceFilters.createdDate || String(batch.createdAt).slice(0, 10) === productionResourceFilters.createdDate)
        && (!productionResourceFilters.hasLineage || lineageCount > 1)
        && (!productionResourceFilters.readyOnly || batch.status === "READY")
        && (!productionResourceFilters.reusableOnly || batch.usageStatus === "REUSABLE")
        && (productionResourceFilters.includeArchived || batch.status !== "ARCHIVED")
        && (!search || haystack.includes(search));
    });
  }, [batches, groups, productionResourceFilters, productionResourceSource, productionResourceTab]);
  const productionResourceGroups = useMemo(() => {
    const map = new Map<string, { group: CharacterGroup | null; resources: ProductionBatch[] }>();
    for (const batch of productionResourceCards) {
      const groupId = batchGroupId(batch) || "ungrouped";
      const group = groups.find((item) => item.id === groupId) ?? null;
      const current = map.get(groupId) ?? { group, resources: [] };
      current.resources.push(batch);
      map.set(groupId, current);
    }
    return [...map.entries()].map(([groupId, value]) => ({
      groupId,
      group: value.group,
      resources: value.resources.sort((a, b) => lineageOrder(a.batchType) - lineageOrder(b.batchType) || b.createdAt.localeCompare(a.createdAt))
    }));
  }, [groups, productionResourceCards]);
  const productionResourceKpis = useMemo(() => ({
    characterGroups: groups.length,
    imageBatches: batches.filter((batch) => batch.batchType === "IMAGE_BATCH").length,
    videoBatches: batches.filter((batch) => batch.batchType === "VIDEO_BATCH").length,
    musicTracks: batches.filter((batch) => batch.batchType === "MUSIC_TRACK").length,
    finalVideos: batches.filter((batch) => batch.batchType === "FINAL_VIDEO").length,
    postContents: batches.filter((batch) => batch.batchType === "POST_CONTENT").length,
    readyResources: batches.filter((batch) => batch.status === "READY").length,
    failedResources: batches.filter((batch) => batch.status === "FAILED").length,
    recentlyCreated: batches.filter((batch) => isRecentDate(batch.createdAt)).length + groups.filter((group) => isRecentDate(group.createdAt)).length
  }), [batches, groups]);
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

  async function loadScriptVersionIndex(scriptData: ScriptRecord[]) {
    const entries = await Promise.all(scriptData.map(async (script) => {
      const versions = await api<ScriptVersionRecord[]>(`/scripts/${script.id}/versions`).catch(() => []);
      return [script.id, versions] as const;
    }));
    const next = Object.fromEntries(entries);
    setScriptVersionIndex(next);
    return next;
  }

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
      allocationData,
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
      api<InstanceAllocationRecord[]>("/instance-allocations"),
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
    setAllocations(allocationData);
    setRuntimeSessions(sessionData);
    setScriptRuns(scriptRunData);
    setScripts(scriptData);
    await loadScriptVersionIndex(scriptData);
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
    setLastJobsRefreshAt(new Date().toISOString());
    setLastRuntimeRefreshAt(new Date().toISOString());

    const nextSelections: PromptSelections = { image: "", video: "", music: "", post: "" };
    for (const template of templateData) {
      const kind = normalizeCategory(template.category);
      if (!["image", "video", "music", "post"].includes(kind)) continue;
      const promptKind = kind as PromptKind;
      if (!nextSelections[promptKind]) nextSelections[promptKind] = template.id;
    }
    setPromptSelections((current) => ({
      image: current.image || nextSelections.image,
      video: current.video || nextSelections.video,
      music: current.music || nextSelections.music,
      post: current.post || nextSelections.post
    }));
    setStatus("Studio ready");
  }, []);

  const loadAssetCenterItems = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("itemType", assetTab);
    params.set("pageSize", "200");
    if (assetSearch) params.set("search", assetSearch);
    if (assetTagFilter) params.set("tag", assetTagFilter);
    if (assetLibraryCategoryFilter) params.set("category", assetLibraryCategoryFilter);
    if (assetStatusFilter) params.set("status", assetStatusFilter);
    if (assetSourceFilter) params.set("sourceModule", assetSourceFilter);
    if (assetUpdatedDateFilter) params.set("updatedDate", assetUpdatedDateFilter);
    const response = await api<AssetCenterItemsResponse>(`/asset-center/items?${params.toString()}`);
    const items = assetAttributeFilter
      ? response.items.filter((item) => Object.keys(item.attributes ?? {}).includes(assetAttributeFilter))
      : response.items;
    setAssetCenterItems(items);
    setAssetCenterTotal(response.total);
    setSelectedAssetCenterItemId((current) => current && items.some((item) => item.id === current) ? current : items[0]?.id ?? "");
  }, [assetAttributeFilter, assetLibraryCategoryFilter, assetSearch, assetSourceFilter, assetStatusFilter, assetTab, assetTagFilter, assetUpdatedDateFilter]);

  useEffect(() => {
    loadData().catch((error) => setStatus(error instanceof Error ? error.message : "Could not load studio"));
  }, [loadData]);

  useEffect(() => {
    if (page !== "asset-center") return;
    loadAssetCenterItems().catch((error) => setStatus(error instanceof Error ? error.message : "Could not load Asset Center"));
  }, [loadAssetCenterItems, page]);

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
    if (!selectedWorkflow?.id) {
      setWorkflowDetail(null);
      return;
    }
    api<WorkflowDetailRecord>(`/workflows/${selectedWorkflow.id}/detail`)
      .then(setWorkflowDetail)
      .catch(() => setWorkflowDetail(null));
  }, [selectedWorkflow?.id]);

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
      const next: PromptPreviews = { image: "", video: "", music: "", post: "" };

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
      music: templates.filter((template) => normalizeCategory(template.category) === "music"),
      post: templates.filter((template) => normalizeCategory(template.category) === "post" || normalizePromptCategory(template.category) === "POST_CONTENT")
    };
  }, [templates]);

  const studioAttributes = useMemo(() => {
    const fromBackend = attributes;
    const existing = new Set(fromBackend.map((attribute) => attribute.key.toLowerCase()));
    const fallback = ["background", "outfit", "emotion", "scene", "mood", "style", "tempo"]
      .filter((key) => !existing.has(key))
      .map((key) => ({ id: `fallback-${key}`, key, name: key, valueType: "SELECT" }));
    return [...fromBackend, ...fallback];
  }, [attributes]);
  const selectedStudioGroup = useMemo(
    () => groups.find((group) => group.id === selectedPrimaryGroup) ?? null,
    [groups, selectedPrimaryGroup]
  );
  const selectedStudioMembers = useMemo(() => {
    if (selectedGroupDetail?.group.id === selectedPrimaryGroup) return selectedGroupDetail.members;
    return selectedStudioGroup?.membersPreview ?? [];
  }, [selectedGroupDetail, selectedPrimaryGroup, selectedStudioGroup]);
  const filteredStudioGroups = useMemo(() => {
    const search = studioGroupFilters.search.toLowerCase();
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
    return groups.filter((group) => {
      const readinessCode = group.readiness?.code ?? "";
      const size = Number(group.memberCount ?? 0);
      const createdAt = group.createdAt ? new Date(group.createdAt).getTime() : 0;
      return (!search || `${group.name} ${group.attributesSummary ?? ""}`.toLowerCase().includes(search))
        && (!studioGroupFilters.readyOnly || readinessCode === "READY")
        && (!studioGroupFilters.groupSize || size === Number(studioGroupFilters.groupSize))
        && (!studioGroupFilters.missingImages || readinessCode === "MISSING_IMAGES")
        && (!studioGroupFilters.recentlyCreated || createdAt >= recentCutoff);
    });
  }, [groups, studioGroupFilters]);
  const studioWorkflowCards = useMemo(() => workflows.filter((workflow) => String(workflow.status ?? "").toLowerCase() !== "archived"), [workflows]);
  const studioPromptScriptRows = useMemo(() => {
    const promptMapping = getRecord(selectedWorkflow?.promptMapping);
    const scriptMapping = getRecord(selectedWorkflow?.scriptMapping);
    return workflowJobTypes.map((jobType) => {
      const promptId = getString(promptMapping[jobType]) || promptSelections[
        jobType === "IMAGE_EDIT" ? "image" : jobType === "VIDEO_GENERATE" ? "video" : jobType === "MUSIC_GENERATE" ? "music" : jobType === "POST_CONTENT" ? "post" : "video"
      ];
      const scriptId = getString(scriptMapping[jobType]);
      return {
        jobType,
        prompt: promptId ? templates.find((template) => template.id === promptId) ?? null : null,
        script: scriptId ? scripts.find((script) => script.id === scriptId) ?? null : null
      };
    });
  }, [promptSelections, scripts, selectedWorkflow, templates]);
  const studioCapacityRows = useMemo(() => capacityStageOptions.map((stageType) => {
    const required = Number(selectedWorkflow?.capacityConfig?.[stageType] ?? (stageType === "MUSIC_GENERATE" ? 0 : 1));
    const available = instances.filter((instance) => instance.currentPoolType === "STANDBY" && instanceCanRun(instance, stageType) && isRuntimeIdle(instance.runtimeStatus)).length;
    return { stageType, required, available, shortage: Math.max(0, required - available) };
  }), [instances, selectedWorkflow]);
  const studioSourceAssetsSnapshot = useMemo(() => selectedStudioMembers.map((member) => ({
    characterId: member.character.id,
    youngOriginalImage: member.youngOriginalImage ?? member.character.sourceImages?.youngOriginalImage ?? null,
    oldOriginalImage: member.oldOriginalImage ?? member.character.sourceImages?.oldOriginalImage ?? null
  })), [selectedStudioMembers]);
  const studioReadinessWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!selectedStudioGroup) warnings.push("Select a Character Group.");
    const missingImages = studioSourceAssetsSnapshot.filter((item) => !item.youngOriginalImage || !item.oldOriginalImage).length;
    if (missingImages) warnings.push(`${missingImages} characters are missing young/old original source images.`);
    for (const row of studioPromptScriptRows) {
      if (["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "POST_CONTENT"].includes(row.jobType) && !row.prompt) warnings.push(`${row.jobType} is missing prompt template.`);
      if (!row.script) warnings.push(`${row.jobType} is missing script mapping.`);
    }
    for (const row of studioCapacityRows.filter((item) => item.shortage > 0)) warnings.push(`${row.stageType} has no enough eligible STANDBY capacity.`);
    if (musicPolicyMode === "REQUIRE_MATCHED" && !batches.some((batch) => batch.batchType === "MUSIC_TRACK" && batch.status === "READY" && ["AVAILABLE", "REUSABLE"].includes(batch.usageStatus))) warnings.push("No matching READY reusable MUSIC_TRACK is visible.");
    return warnings;
  }, [batches, musicPolicyMode, selectedStudioGroup, studioCapacityRows, studioPromptScriptRows, studioSourceAssetsSnapshot]);
  const studioExpectedOutputs = useMemo(() => [
    "IMAGE_BATCH",
    "VIDEO_BATCH",
    ...(musicPolicyMode === "CREATE_DEDICATED" ? ["MUSIC_TRACK"] : []),
    "FINAL_VIDEO",
    ...(postPolicyEnabled ? ["POST_CONTENT"] : [])
  ], [musicPolicyMode, postPolicyEnabled]);

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

  function assetCenterEmptyState(itemType = assetTab) {
    if (itemType === "PROMPT_TEMPLATE") return "No prompt templates found. Create one in Management -> Prompt Templates.";
    if (itemType === "POST_TEMPLATE") return "No post templates found. Create a POST_CONTENT template in Management -> Prompt Templates.";
    if (itemType === "MUSIC_TRACK") return "No music tracks found. Upload or generate music tracks.";
    if (itemType === "VIDEO_TEMPLATE") return "No video templates yet.";
    if (itemType === "CHARACTER_IMAGE") return "No character images found. Import characters or upload source images.";
    return "No production resources found.";
  }

  function openAssetCenterItem(item: AssetCenterItem) {
    if (item.sourceModule === "prompt_templates") {
      setPage("management");
      setManagementSection("prompt-templates");
      openPromptTemplate(item.sourceId, "overview");
      return;
    }
    if (item.sourceModule === "assets") {
      setSelectedAssetId(item.sourceId);
      setSelectedAssetCenterItemId(item.id);
      return;
    }
    if (item.sourceModule === "production_batches") {
      setPage("management");
      setManagementSection("production-resources");
      setSelectedResourceId(item.sourceId);
    }
  }

  function duplicateAssetCenterPrompt(item: AssetCenterItem) {
    const template = templates.find((candidate) => candidate.id === item.sourceId);
    if (!template) {
      setStatus("Prompt template source is not loaded yet");
      return;
    }
    duplicatePromptTemplate(template);
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
    const nextDrafts: Record<string, string> = {};
    const nextCustom: Array<{ key: string; value: string }> = [];
    for (const attribute of detail.attributes ?? []) {
      const key = normalizeAttributeKey(attribute.attributeKey ?? attribute.attributeName ?? attribute.attributeId);
      const value = attribute.customValue ?? attribute.label ?? attribute.value ?? "";
      if (!key || !value) continue;
      if (standardGroupAttributeKeys.includes(key)) nextDrafts[key] = value;
      else nextCustom.push({ key, value });
    }
    setGroupAttributeDrafts(nextDrafts);
    setCustomGroupAttributes(nextCustom);
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

  async function saveSelectedGroupAttributes() {
    if (!selectedGroupDetail?.group.id) return;
    const attributesPayload = [
      ...standardGroupAttributeKeys.map((key) => ({
        key,
        name: key,
        value: groupAttributeDrafts[key] ?? ""
      })),
      ...customGroupAttributes.map((attribute) => ({
        key: normalizeAttributeKey(attribute.key),
        name: normalizeAttributeKey(attribute.key),
        value: attribute.value
      }))
    ].filter((attribute) => attribute.key && attribute.value.trim());
    await adminAction("Saving group attributes", async () => {
      const detail = await api<CharacterGroupDetail>(`/character-groups/${selectedGroupDetail.group.id}/attributes`, {
        method: "PUT",
        body: JSON.stringify({ attributes: attributesPayload })
      });
      setSelectedGroupDetail(detail);
      await loadData();
      await openCharacterGroup(selectedGroupDetail.group.id, "attributes");
      return detail;
    });
  }

  function applyGroupAttributeSuggestion(key?: string | null, value?: string | null) {
    const normalizedKey = normalizeAttributeKey(key);
    if (!normalizedKey || !value) return;
    if (standardGroupAttributeKeys.includes(normalizedKey)) {
      setGroupAttributeDrafts((current) => ({ ...current, [normalizedKey]: value }));
      return;
    }
    setCustomGroupAttributes((current) => {
      const existing = current.findIndex((attribute) => normalizeAttributeKey(attribute.key) === normalizedKey);
      if (existing >= 0) {
        return current.map((attribute, index) => index === existing ? { key: normalizedKey, value } : attribute);
      }
      return [...current, { key: normalizedKey, value }];
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
    const [latestCharacters, latestGroups, latestHosts, latestWorkflows, latestWorkflowRuns, latestInstances, latestPools, latestBatches, latestAssets, latestJobs, latestAllocations, latestSessions, latestScriptRuns, latestScripts, latestRules] = await Promise.all([
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
      api<InstanceAllocationRecord[]>("/instance-allocations"),
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
    setAllocations(latestAllocations);
    setRuntimeSessions(latestSessions);
    setScriptRuns(latestScriptRuns);
    setScripts(latestScripts);
    await loadScriptVersionIndex(latestScripts);
    setOrchestratorRules(latestRules);
    setLastJobsRefreshAt(new Date().toISOString());
    setLastRuntimeRefreshAt(new Date().toISOString());
    return {
      batches: latestBatches,
      assets: latestAssets,
      jobs: latestJobs,
      allocations: latestAllocations,
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
    const detail = await api<RuntimeSession>(`/runtime-sessions/${session.id}`).catch(() => session);
    setRuntimeSession(detail);
    const related = scriptRuns.find((run) => run.runtimeSessionId === session.id);
    if (related) {
      const runDetail = await api<ScriptRun>(`/script-runs/${related.id}`);
      setScriptRun(runDetail);
    } else {
      setScriptRun(null);
    }
    const relatedJob = detail.jobId ? jobs.find((job) => job.id === detail.jobId) : null;
    if (relatedJob) {
      setSelectedJobId(relatedJob.id);
      const batch = batches.find((item) => batchMatchesJob(item, relatedJob)) ?? null;
      setOutputBatch(batch);
    }
  }

  function currentStudioDraft() {
    return {
      id: `draft-${Date.now()}`,
      name: `${selectedStudioGroup?.name ?? "Studio Draft"} ${new Date().toLocaleString()}`,
      groupId: selectedPrimaryGroup,
      workflowId: selectedWorkflow?.id ?? "",
      attributes: attributeValues,
      promptOverrides: promptSelections,
      scriptOverrides: Object.fromEntries(studioPromptScriptRows.map((row) => [row.jobType, row.script?.id ?? ""])),
      musicPolicy: { mode: musicPolicyMode, matchAttributes: musicMatchAttributes },
      postContentPolicy: { enabled: postPolicyEnabled, platform: postPolicyPlatform, hashtagPolicy: postHashtagPolicy, ctaPolicy: postCtaPolicy },
      createdAt: new Date().toISOString()
    };
  }

  function saveStudioDraft() {
    const draft = currentStudioDraft();
    const next = [draft, ...studioDrafts].slice(0, 12);
    setStudioDrafts(next);
    window.localStorage.setItem("fbcm-studio-drafts", JSON.stringify(next));
    setStatus("Production Studio draft saved");
  }

  function loadStudioDraft(draft: Record<string, unknown>) {
    const groupId = getString(draft.groupId);
    const workflowId = getString(draft.workflowId);
    if (groupId) setSelectedGroups([groupId]);
    if (workflowId) setSelectedWorkflowId(workflowId);
    setAttributeValues(Object.fromEntries(Object.entries(getRecord(draft.attributes)).map(([key, value]) => [key, String(value ?? "")])));
    setPromptSelections((current) => ({ ...current, ...getRecord(draft.promptOverrides) } as PromptSelections));
    const musicPolicy = getRecord(draft.musicPolicy);
    if (getString(musicPolicy.mode)) setMusicPolicyMode(getString(musicPolicy.mode));
    if (Array.isArray(musicPolicy.matchAttributes)) setMusicMatchAttributes(musicPolicy.matchAttributes.map(String));
    const postPolicy = getRecord(draft.postContentPolicy);
    if (typeof postPolicy.enabled === "boolean") setPostPolicyEnabled(postPolicy.enabled);
    if (getString(postPolicy.platform)) setPostPolicyPlatform(getString(postPolicy.platform));
    if (getString(postPolicy.hashtagPolicy)) setPostHashtagPolicy(getString(postPolicy.hashtagPolicy));
    if (getString(postPolicy.ctaPolicy)) setPostCtaPolicy(getString(postPolicy.ctaPolicy));
    setStatus("Production Studio draft loaded");
  }

  async function launchStudioProduction() {
    if (!selectedPrimaryGroup || !selectedWorkflow) {
      setStatus("Select a Character Group and Workflow Template first");
      return;
    }
    if (studioReadinessWarnings.some((warning) => warning.includes("missing young/old original"))) {
      setStatus("Cannot launch while source images are missing");
      return;
    }
    setBusy(true);
    setStatus("Launching production setup");
    try {
      const metadata = {
        studio: "Production Studio",
        groupId: selectedPrimaryGroup,
        characterIds: selectedStudioMembers.map((member) => member.character.id),
        sourceAssetsSnapshot: studioSourceAssetsSnapshot,
        attributesSnapshot: attributeValues,
        workflowId: selectedWorkflow.id,
        promptOverrides: promptSelections,
        scriptOverrides: Object.fromEntries(studioPromptScriptRows.map((row) => [row.jobType, row.script?.id ?? ""])),
        musicPolicy: { mode: musicPolicyMode, matchAttributes: musicMatchAttributes },
        postContentPolicy: { enabled: postPolicyEnabled, platform: postPolicyPlatform, hashtagPolicy: postHashtagPolicy, ctaPolicy: postCtaPolicy },
        promptPreview: previews
      };
      const batch = await api<ProductionBatch>("/production-batches", {
        method: "POST",
        body: JSON.stringify({
          batchType: "CHARACTER_GROUP",
          sourceGroupId: selectedPrimaryGroup,
          workflowId: selectedWorkflow.id,
          status: "READY",
          usageStatus: "AVAILABLE",
          attributes: attributeValues,
          metadata
        })
      });
      const result = await api<{ createdJobs: OrchestratorJob[] }>(`/production-batches/${batch.id}/launch`, { method: "POST" });
      setOutputBatch(batch);
      setLaunchedJobs(result.createdJobs ?? []);
      await refreshQueue();
      setStatus(result.createdJobs?.length ? "Production launched and jobs created" : "Production batch created; no matching rule created a job");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not launch production");
    } finally {
      setBusy(false);
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

  function toggleSelectedJob(jobId: string) {
    setSelectedJobIds((current) => current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId]);
  }

  async function releaseJobAllocation(job: OrchestratorJob) {
    const allocationId = jobPayloadString(job, "allocationId")
      || allocations.find((allocation) => allocation.orchestratorJobId === job.id && allocation.status === "ALLOCATED")?.id
      || "";
    if (!allocationId) {
      setStatus("No active allocation found for this job");
      return;
    }
    return adminAction("Releasing allocation", () => api(`/instance-allocations/${allocationId}/release`, { method: "POST" }));
  }

  async function bulkJobsAction(action: "allocate" | "execute-mock" | "fail") {
    const selected = jobs.filter((job) => selectedJobIds.includes(job.id));
    if (!selected.length) {
      setStatus("Select at least one job");
      return;
    }
    if (!window.confirm(`Run ${action} for ${selected.length} selected jobs?`)) return;
    setBusy(true);
    setStatus(`Running ${action} for selected jobs`);
    const results: Array<Record<string, unknown>> = [];
    try {
      for (const job of selected) {
        try {
          const path = action === "execute-mock"
            ? `/job-executor/jobs/${job.id}/execute-mock`
            : `/orchestrator/jobs/${job.id}/${action}`;
          const body = action === "fail" ? { errorMessage: "Bulk failed from Management Jobs" } : undefined;
          const result = await api(path, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined
          });
          results.push({ jobId: job.id, ok: true, result });
        } catch (error) {
          results.push({ jobId: job.id, ok: false, error: error instanceof Error ? error.message : "Action failed" });
        }
      }
      setAdminJson(compactJson({ action, results }));
      await refreshQueue();
      setSelectedJobIds([]);
      setStatus("Bulk job action complete");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedJob(job = selectedJob) {
    if (!job) return;
    if (!window.confirm(`Delete job ${displayShortId(job.id)}? This cannot be undone.`)) return;
    return adminAction("Deleting job", async () => {
      const result = await api(`/orchestrator/jobs/${job.id}`, { method: "DELETE" });
      setSelectedJobId("");
      setDrawerOpen(false);
      await refreshQueue();
      return result;
    });
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
        const data = await api<{ devices?: { devices?: AdbDevice[] } | AdbDevice[] }>(`/hosts/${selectedHost.id}/adb-devices`);
        const devices = Array.isArray(data.devices) ? data.devices : data.devices?.devices ?? [];
        setAdbDevices(devices);
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

  async function deleteSelectedRule(rule = selectedRule) {
    if (!rule) return;
    if (!window.confirm(`Delete orchestrator rule "${rule.name}"? This cannot be undone.`)) return;
    return adminAction("Deleting orchestrator rule", async () => {
      const result = await api(`/orchestrator/rules/${rule.id}`, { method: "DELETE" });
      setSelectedRuleId("");
      await refreshQueue();
      return result;
    });
  }

  async function refreshScriptVersions(scriptId = selectedScriptId) {
    if (!scriptId) return [];
    const versions = await api<ScriptVersionRecord[]>(`/scripts/${scriptId}/versions`);
    setScriptVersions(versions);
    setScriptVersionIndex((current) => ({ ...current, [scriptId]: versions }));
    setSelectedScriptVersionId((current) => current || versions[0]?.id || "");
    return versions;
  }

  async function openScript(script: ScriptRecord, tab: typeof scriptDrawerTab = "overview") {
    setSelectedScriptId(script.id);
    setScriptDrawerTab(tab);
    setScriptForm((current) => ({
      ...current,
      name: script.name,
      category: script.category ?? "UTILITY",
      description: script.description ?? "",
      status: script.status
    }));
    const versions = await refreshScriptVersions(script.id);
    const activeVersion = versions.find((version) => String(version.status).toLowerCase() === "active") ?? versions[0];
    setSelectedScriptVersionId(activeVersion?.id ?? "");
    if (activeVersion) {
      setScriptForm((current) => ({
        ...current,
        steps: compactJson({
          steps: activeVersion.steps ?? [],
          variables: activeVersion.variables ?? {},
          retryPolicy: activeVersion.retryPolicy ?? {},
          detectionPolicy: activeVersion.detectionPolicy ?? {}
        })
      }));
    }
  }

  async function deleteSelectedRuntime(session = selectedRuntime) {
    if (!session) return;
    if (!window.confirm(`Delete runtime session ${displayShortId(session.id)}? This cannot be undone.`)) return;
    return adminAction("Deleting runtime session", async () => {
      const result = await api(`/runtime-sessions/${session.id}`, { method: "DELETE" });
      setSelectedRuntimeId("");
      await refreshQueue();
      return result;
    });
  }

  async function runRuntimeHostAction(session: RuntimeSession, action: "send-text" | "download-latest") {
    const instance = session.instanceId ? instances.find((item) => item.id === session.instanceId) ?? null : null;
    const host = hosts.find((item) => item.id === session.hostId || item.hostId === session.hostId || item.hostId === instance?.hostId) ?? null;
    const adbId = instance?.adbId ?? "";
    if (!host || !session.instanceId || !adbId) {
      setHostResult({ error: "ADB_ID_REQUIRED", message: "Runtime host, instance, or adbId is missing" });
      setStatus("ADB mapping unknown");
      return;
    }

    setBusy(true);
    setStatus(`${action} runtime host`);
    try {
      const result = await api(`/hosts/${host.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(action === "send-text"
          ? { instanceId: session.instanceId, adbId, text: hostSendText }
          : { instanceId: session.instanceId, adbId })
      });
      setHostResult(result);
      setStatus("Runtime host action complete");
    } catch (error) {
      setHostResult({ error: error instanceof Error ? error.message : "Runtime host action failed" });
      setStatus(error instanceof Error ? error.message : "Runtime host action failed");
    } finally {
      setBusy(false);
    }
  }

  function setScriptDraftDefinition(next: Partial<{ steps: Array<Record<string, unknown>>; variables: Record<string, unknown>; retryPolicy: Record<string, unknown>; detectionPolicy: Record<string, unknown> }>) {
    const current = parseScriptDefinitionJson(scriptForm.steps);
    setScriptForm((form) => ({
      ...form,
      steps: compactJson({
        steps: next.steps ?? current.steps,
        variables: next.variables ?? current.variables,
        retryPolicy: next.retryPolicy ?? current.retryPolicy,
        detectionPolicy: next.detectionPolicy ?? current.detectionPolicy
      })
    }));
  }

  function updateScriptStep(index: number, step: Record<string, unknown>) {
    const steps = [...scriptDraft.steps];
    steps[index] = normalizeScriptStep(step, index);
    setScriptDraftDefinition({ steps });
  }

  function updateScriptStepConfig(index: number, key: string, value: unknown) {
    const step = scriptDraft.steps[index];
    if (!step) return;
    updateScriptStep(index, {
      ...step,
      config: {
        ...scriptStepConfig(step),
        [key]: value
      }
    });
  }

  function addScriptStep(type = "wait") {
    const template = scriptStepTemplates[type];
    const config = Object.fromEntries((template?.fields ?? []).map((field) => [field.key, field.type === "number" ? 0 : field.type === "json" ? [] : ""]));
    const next = [...scriptDraft.steps, normalizeScriptStep({ type, config }, scriptDraft.steps.length)];
    setSelectedScriptStepIndex(next.length - 1);
    setScriptDraftDefinition({ steps: next });
  }

  function removeScriptStep(index: number) {
    const next = scriptDraft.steps.filter((_, itemIndex) => itemIndex !== index).map((step, itemIndex) => normalizeScriptStep(step, itemIndex));
    setSelectedScriptStepIndex(Math.max(0, Math.min(index, next.length - 1)));
    setScriptDraftDefinition({ steps: next });
  }

  function moveScriptStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= scriptDraft.steps.length) return;
    const next = [...scriptDraft.steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSelectedScriptStepIndex(target);
    setScriptDraftDefinition({ steps: next.map((step, itemIndex) => normalizeScriptStep(step, itemIndex)) });
  }

  function duplicateScriptStep(index: number) {
    const step = scriptDraft.steps[index];
    if (!step) return;
    const next = [...scriptDraft.steps];
    next.splice(index + 1, 0, normalizeScriptStep({ ...step, config: { ...scriptStepConfig(step) } }, index + 1));
    setSelectedScriptStepIndex(index + 1);
    setScriptDraftDefinition({ steps: next.map((item, itemIndex) => normalizeScriptStep(item, itemIndex)) });
  }

  function insertScriptVariable(variable: string) {
    const step = scriptDraft.steps[selectedScriptStepIndex];
    if (!step) return;
    const config = scriptStepConfig(step);
    const template = scriptStepTemplates[scriptStepType(step)];
    const textField = template?.fields.find((field) => field.type !== "number" && field.type !== "json")?.key ?? "text";
    updateScriptStepConfig(selectedScriptStepIndex, textField, `${getString(config[textField])}${variable}`);
  }

  function validateScriptDraftBeforeSave() {
    const errors = validateScriptSteps(scriptDraft.steps).filter((message) => message.level === "error");
    if (errors.length) {
      setStatus(errors.map((error) => `Step ${error.index + 1}: ${error.message}`).join("; "));
      return false;
    }
    return true;
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
    if (!validateScriptDraftBeforeSave()) return;
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
    if (!validateScriptDraftBeforeSave()) return;
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

  async function duplicateSelectedScript(source = selectedScript) {
    if (!source) return;
    return adminAction("Duplicating script", async () => {
      const clone = await api<ScriptRecord>("/scripts", {
        method: "POST",
        body: JSON.stringify({
          name: `${source.name} Copy`,
          category: source.category ?? "UTILITY",
          description: source.description ?? "",
          status: "draft"
        })
      });
      const sourceVersions = scriptVersionIndex[source.id] ?? await api<ScriptVersionRecord[]>(`/scripts/${source.id}/versions`);
      const activeVersion = sourceVersions.find((version) => String(version.status).toLowerCase() === "active") ?? sourceVersions[0];
      if (activeVersion) {
        await api<ScriptVersionRecord>(`/scripts/${clone.id}/versions`, {
          method: "POST",
          body: JSON.stringify({
            status: "draft",
            steps: activeVersion.steps ?? [],
            variables: activeVersion.variables ?? {},
            retryPolicy: activeVersion.retryPolicy ?? {},
            detectionPolicy: activeVersion.detectionPolicy ?? {}
          })
        });
      }
      setSelectedScriptId(clone.id);
      await loadScriptVersionIndex([clone, ...scripts]);
      return clone;
    });
  }

  async function duplicateSelectedScriptVersion(version = selectedScriptVersion) {
    if (!selectedScriptId || !version) return;
    return adminAction("Duplicating script version", async () => {
      const clone = await api<ScriptVersionRecord>(`/scripts/${selectedScriptId}/versions`, {
        method: "POST",
        body: JSON.stringify({
          status: "draft",
          steps: version.steps ?? [],
          variables: version.variables ?? {},
          retryPolicy: version.retryPolicy ?? {},
          detectionPolicy: version.detectionPolicy ?? {}
        })
      });
      await refreshScriptVersions(selectedScriptId);
      setSelectedScriptVersionId(clone.id);
      return clone;
    });
  }

  async function archiveSelectedScript() {
    if (!selectedScriptId) return;
    return adminAction("Archiving script", () => api(`/scripts/${selectedScriptId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" })
    }));
  }

  async function deleteSelectedScript() {
    if (!selectedScript) return;
    if (!window.confirm(`Delete script "${selectedScript.name}"? This cannot be undone.`)) return;
    return adminAction("Deleting script", async () => {
      const result = await api(`/scripts/${selectedScript.id}`, { method: "DELETE" });
      setSelectedScriptId("");
      setSelectedScriptVersionId("");
      await refreshQueue();
      return result;
    });
  }

  async function archiveScriptVersion(versionId: string) {
    return adminAction("Archiving script version", async () => {
      const version = await api<ScriptVersionRecord>(`/script-versions/${versionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" })
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
    const context = parseJsonText(scriptTestContext, {});
    const runtimeContext = getRecord(context.runtime);
    return adminAction("Testing script", () => api(`/scripts/${selectedScriptId}/test-run`, {
      method: "POST",
      body: JSON.stringify({
        scriptVersionId: selectedScriptVersionId || undefined,
        hostId: host.id,
        instanceId,
        adbId,
        context: {
          ...context,
          runtime: {
            ...runtimeContext,
            instanceId,
            adbId
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

  function openWorkflow(workflow: WorkflowRecord, tab: typeof workflowDrawerTab = "overview") {
    setSelectedWorkflowId(workflow.id);
    const nextRun = workflowRuns.find((run) => run.workflowId === workflow.id);
    setSelectedWorkflowRunId(nextRun?.id ?? "");
    setWorkflowDrawerTab(tab);
    setCapacityResult(null);
  }

  async function saveWorkflowMetadata() {
    if (!selectedWorkflow) return;
    return adminAction("Saving workflow", () => api(`/workflows/${selectedWorkflow.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: selectedWorkflow.name,
        description: selectedWorkflow.description ?? "",
        status: selectedWorkflow.status
      })
    }));
  }

  async function duplicateWorkflow(workflow = selectedWorkflow) {
    if (!workflow) return;
    return adminAction("Duplicating workflow", async () => {
      const duplicated = await api<WorkflowRecord>(`/workflows/${workflow.id}/duplicate`, { method: "POST" });
      setSelectedWorkflowId(duplicated.id);
      await refreshQueue();
      return duplicated;
    });
  }

  async function deleteWorkflow(workflow = selectedWorkflow) {
    if (!workflow) return;
    if (!window.confirm(`Delete workflow "${workflow.name}"? This cannot be undone.`)) return;
    return adminAction("Deleting workflow", async () => {
      const result = await api(`/workflows/${workflow.id}`, { method: "DELETE" });
      setSelectedWorkflowId("");
      setSelectedWorkflowRunId("");
      setWorkflowDetail(null);
      await refreshQueue();
      return result;
    });
  }

  function updateWorkflowWizardTemplate(templateType: string) {
    setWorkflowWizard((current) => ({
      ...current,
      templateType,
      resourceRules: JSON.stringify(workflowRulesForTemplate(templateType), null, 2)
    }));
  }

  async function createWorkflowFromWizard() {
    return adminAction("Creating workflow", async () => {
      const workflow = await api<WorkflowRecord>("/workflows", {
        method: "POST",
        body: JSON.stringify({
          name: workflowWizard.name || `${workflowWizard.templateType} Workflow`,
          description: workflowWizard.description,
          status: workflowWizard.status,
          resourceRules: JSON.parse(workflowWizard.resourceRules || "[]"),
          promptMapping: JSON.parse(workflowWizard.promptMapping || "{}"),
          scriptMapping: JSON.parse(workflowWizard.scriptMapping || "{}"),
          musicPolicy: JSON.parse(workflowWizard.musicPolicy || "{}"),
          postContentPolicy: JSON.parse(workflowWizard.postContentPolicy || "{}")
        })
      });
      await api(`/workflows/${workflow.id}/capacity`, {
        method: "PATCH",
        body: workflowWizard.capacity
      });
      setSelectedWorkflowId(workflow.id);
      setShowWorkflowWizard(false);
      await refreshQueue();
      return workflow;
    });
  }

  async function launchWorkflow(workflow = selectedWorkflow) {
    if (!workflow) return;
    return adminAction("Launching workflow run", async () => {
      const run = await api<WorkflowRunRecord>(`/workflows/${workflow.id}/run`, {
        method: "POST",
        body: JSON.stringify({ input: { launchedFrom: "Management Workflows" } })
      });
      setSelectedWorkflowId(workflow.id);
      setSelectedWorkflowRunId(run.id);
      return run;
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

  function openHostOperations(host: HostRecord, tab: typeof hostDrawerTab = "overview") {
    setSelectedHostDrawerId(host.id);
    setHostDrawerTab(tab);
    setSelectedHostId(host.hostId);
  }

  function openInstanceOperations(instance: InstanceRecord, tab: typeof instanceDrawerTab = "overview") {
    setSelectedInstanceId(instance.id);
    setInstanceDrawerId(instance.id);
    setInstanceDrawerTab(tab);
    setHostInstanceId(instance.id);
    setHostAdbId(instance.adbId ?? "");
    setCapacityCapabilityDraft(normalizeInstanceCapabilities(instance.capabilities));
    const host = hostForInstance(instance);
    if (host) setSelectedHostId(host.hostId);
  }

  async function runHostDrawerAction(host: HostRecord, action: "health" | "devices" | "screenshot" | "send-text" | "download-latest", instance?: InstanceRecord | null) {
    const adbId = instance?.adbId ?? hostAdbId;
    const instanceId = instance?.id ?? hostInstanceId;
    if (!["health", "devices"].includes(action) && !adbId) {
      setHostResult({ error: "ADB_ID_REQUIRED", message: "ADB mapping unknown. Runtime commands require adbId." });
      setStatus("ADB mapping unknown");
      return;
    }
    return adminAction(`${action} host test`, async () => {
      if (action === "health") return api(`/hosts/${host.id}/health`);
      if (action === "devices") {
        const data = await api<{ devices?: { devices?: AdbDevice[] } | AdbDevice[] }>(`/hosts/${host.id}/adb-devices`);
        const devices = Array.isArray(data.devices) ? data.devices : data.devices?.devices ?? [];
        setAdbDevices(devices);
        setHostResult(data);
        return data;
      }
      const path = action === "screenshot" ? "screenshot" : action === "send-text" ? "send-text" : "download-latest";
      const result = await api(`/hosts/${host.id}/${path}`, {
        method: "POST",
        body: JSON.stringify(action === "send-text" ? { instanceId, adbId, text: hostSendText } : { instanceId, adbId })
      });
      setHostResult(result);
      return result;
    });
  }

  async function openAdbMapping(instance: InstanceRecord) {
    const host = hostForInstance(instance);
    setAdbMappingInstanceId(instance.id);
    setSelectedManualAdbId(instance.adbId ?? "");
    if (host) {
      setSelectedHostDrawerId(host.id);
      setHostDrawerTab("instances");
      await runHostDrawerAction(host, "devices");
    }
  }

  async function assignManualAdbMapping() {
    if (!adbMappingInstance || !selectedManualAdbId) return;
    return adminAction("Saving manual ADB mapping", () => api(`/instances/${adbMappingInstance.id}/manual-adb-mapping`, {
      method: "POST",
      body: JSON.stringify({ adbId: selectedManualAdbId })
    }).then((result) => {
      setAdbMappingInstanceId("");
      setSelectedManualAdbId("");
      return result;
    }));
  }

  async function clearManualAdbMapping(instance = adbMappingInstance) {
    if (!instance) return;
    return adminAction("Clearing ADB mapping", () => api(`/instances/${instance.id}/clear-adb-mapping`, { method: "POST" }).then((result) => {
      setAdbMappingInstanceId("");
      setSelectedManualAdbId("");
      return result;
    }));
  }

  async function requestInstanceScreenshotPreview(instance: InstanceRecord) {
    const host = hostForInstance(instance);
    if (!host || !instance.adbId || hasUnknownAdbMapping(instance)) return;

    setInstanceScreenshotPreviews((current) => ({
      ...current,
      [instance.id]: {
        ...current[instance.id],
        loading: true,
        error: undefined
      }
    }));

    try {
      const result = await api(`/hosts/${host.id}/screenshot`, {
        method: "POST",
        body: JSON.stringify({ instanceId: instance.id, adbId: instance.adbId })
      });
      const url = findUrl(result);
      setInstanceScreenshotPreviews((current) => ({
        ...current,
        [instance.id]: {
          url: url || current[instance.id]?.url,
          capturedAt: Date.now(),
          loading: false,
          error: url ? undefined : "NO_SCREENSHOT_URL"
        }
      }));
    } catch (error) {
      setInstanceScreenshotPreviews((current) => ({
        ...current,
        [instance.id]: {
          ...current[instance.id],
          capturedAt: Date.now(),
          loading: false,
          error: error instanceof Error ? error.message : "Screenshot failed"
        }
      }));
    }
  }

  async function instanceHostAction(instance: InstanceRecord, action: "screenshot" | "start" | "stop" | "restart") {
    const host = hostForInstance(instance);
    if (!host) throw new Error("Host not found for instance");
    if (action === "screenshot") {
      if (!instance.adbId) {
        setStatus("ADB mapping unknown");
        return;
      }
      return adminAction("Testing instance screenshot", async () => {
        const result = await api(`/hosts/${host.id}/screenshot`, {
        method: "POST",
        body: JSON.stringify({ instanceId: instance.id, adbId: instance.adbId })
        });
        const url = findUrl(result);
        if (url) {
          setInstanceScreenshotPreviews((current) => ({
            ...current,
            [instance.id]: { url, capturedAt: Date.now(), loading: false }
          }));
        }
        return result;
      });
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

  function renderInstanceScreenshotPreview(instance: InstanceRecord) {
    const preview = instanceScreenshotPreviews[instance.id];
    const url = mediaUrl(preview?.url || getString(instance.metadata?.latestScreenshotUrl) || getString(instance.metadata?.screenshotUrl));
    return (
      <div className={`instancePreviewSlot ${url ? "hasImage" : ""}`}>
        {url ? <img src={url} alt={`${instance.id} screenshot preview`} /> : <Image size={22} />}
        <small>
          {preview?.loading
            ? "Loading screenshot..."
            : preview?.error
              ? "Screenshot unavailable"
              : url
                ? `Screenshot ${preview?.capturedAt ? displayDateTime(new Date(preview.capturedAt).toISOString()) : "preview"}`
                : hasUnknownAdbMapping(instance)
                  ? "ADB mapping unknown"
                  : "No screenshot preview"}
        </small>
      </div>
    );
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

  function selectCapacityInstance(instance: InstanceRecord, tab: CapacityDrawerTab = "overview") {
    setSelectedInstanceId(instance.id);
    setCapacityDrawerInstanceId(instance.id);
    setCapacityDrawerTab(tab);
    setCapacityCapabilityDraft(normalizeInstanceCapabilities(instance.capabilities));
  }

  function toggleCapacitySelectedInstance(instanceId: string) {
    setSelectedCapacityInstanceIds((current) => (
      current.includes(instanceId) ? current.filter((id) => id !== instanceId) : [...current, instanceId]
    ));
  }

  function updateCapacityCanRun(stageType: string, checked: boolean) {
    setCapacityCapabilityDraft((current) => {
      const normalized = normalizeInstanceCapabilities(current);
      const canRun = new Set(normalized.canRun ?? []);
      if (checked) canRun.add(stageType);
      else canRun.delete(stageType);
      return { ...normalized, canRun: [...canRun] };
    });
  }

  async function saveCapacityCapabilities(instance = selectedCapacityInstance) {
    if (!instance) return;
    return adminAction("Saving capabilities", () => api(`/instances/${instance.id}/capabilities`, {
      method: "PATCH",
      body: JSON.stringify(normalizeInstanceCapabilities(capacityCapabilityDraft))
    }));
  }

  async function copyCapacityCapabilities() {
    const source = instances.find((instance) => instance.id === capacityCopySourceInstanceId);
    if (!source || !selectedCapacityInstance) return;
    const capabilities = normalizeInstanceCapabilities(source.capabilities);
    setCapacityCapabilityDraft(capabilities);
    return adminAction("Copying capabilities", () => api(`/instances/${selectedCapacityInstance.id}/capabilities`, {
      method: "PATCH",
      body: JSON.stringify(capabilities)
    }));
  }

  async function saveInstanceDrawerCapabilities() {
    if (!selectedInstanceDrawer) return;
    return adminAction("Saving capabilities", () => api(`/instances/${selectedInstanceDrawer.id}/capabilities`, {
      method: "PATCH",
      body: JSON.stringify(normalizeInstanceCapabilities(capacityCapabilityDraft))
    }));
  }

  async function copyInstanceDrawerCapabilities() {
    const source = instances.find((instance) => instance.id === instanceCopySourceId);
    if (!source || !selectedInstanceDrawer) return;
    const capabilities = normalizeInstanceCapabilities(source.capabilities);
    setCapacityCapabilityDraft(capabilities);
    return adminAction("Copying capabilities", () => api(`/instances/${selectedInstanceDrawer.id}/capabilities`, {
      method: "PATCH",
      body: JSON.stringify(capabilities)
    }));
  }

  async function bulkMoveOperationalInstances(action: "move-available" | "move-standby" | "move-maintenance" | "disable" | "retire") {
    if (!selectedCapacityInstanceIds.length) return;
    if (!window.confirm(`Apply ${action} to ${selectedCapacityInstanceIds.length} selected instances?`)) return;
    const selected = instances.filter((instance) => selectedCapacityInstanceIds.includes(instance.id));
    return adminAction("Moving selected instances", async () => {
      await Promise.all(selected.map((instance) => {
        const body = action === "move-maintenance" ? { reason: "Bulk moved from Instances" } : undefined;
        return api(`/instances/${instance.id}/${action}`, {
          method: "POST",
          body: body ? JSON.stringify(body) : undefined
        });
      }));
    });
  }

  async function bulkApplyOperationalCapability(mode: "add" | "remove") {
    if (!selectedCapacityInstanceIds.length) return;
    if (!window.confirm(`${mode === "add" ? "Set" : "Remove"} ${instanceBulkCapability} for ${selectedCapacityInstanceIds.length} selected instances?`)) return;
    const selected = instances.filter((instance) => selectedCapacityInstanceIds.includes(instance.id));
    return adminAction("Updating selected capabilities", async () => {
      await Promise.all(selected.map((instance) => {
        const capabilities = normalizeInstanceCapabilities(instance.capabilities);
        const canRun = new Set(capabilities.canRun ?? []);
        if (mode === "add") canRun.add(instanceBulkCapability);
        else canRun.delete(instanceBulkCapability);
        return api(`/instances/${instance.id}/capabilities`, {
          method: "PATCH",
          body: JSON.stringify({ ...capabilities, canRun: [...canRun] })
        });
      }));
    });
  }

  async function bulkApplyCapacityCapability(mode: "add" | "remove") {
    if (!selectedCapacityInstanceIds.length) return;
    const selected = instances.filter((instance) => selectedCapacityInstanceIds.includes(instance.id));
    return adminAction("Updating selected capabilities", async () => {
      await Promise.all(selected.map((instance) => {
        const capabilities = normalizeInstanceCapabilities(instance.capabilities);
        const canRun = new Set(capabilities.canRun ?? []);
        if (mode === "add") canRun.add(capacityBulkCapability);
        else canRun.delete(capacityBulkCapability);
        return api(`/instances/${instance.id}/capabilities`, {
          method: "PATCH",
          body: JSON.stringify({ ...capabilities, canRun: [...canRun] })
        });
      }));
    });
  }

  async function bulkMoveCapacityInstances(action: "move-standby" | "move-maintenance") {
    if (!selectedCapacityInstanceIds.length) return;
    const selected = instances.filter((instance) => selectedCapacityInstanceIds.includes(instance.id));
    return adminAction("Moving selected instances", async () => {
      await Promise.all(selected.map((instance) => {
        const body = action === "move-maintenance" ? { reason: "Bulk moved from Capacity Pools" } : undefined;
        return api(`/instances/${instance.id}/${action}`, {
          method: "POST",
          body: body ? JSON.stringify(body) : undefined
        });
      }));
    });
  }

  function getProductionResourceGroup(batch?: ProductionBatch | null) {
    const groupId = batchGroupId(batch);
    return groupId ? groups.find((group) => group.id === groupId) ?? null : null;
  }

  function getProductionResourceLineageCount(batch: ProductionBatch) {
    const groupId = batchGroupId(batch);
    if (!groupId) return productionResourceLineage.filter((item) => item.id === batch.id).length || 1;
    return batches.filter((item) => batchGroupId(item) === groupId).length || 1;
  }

  function getProductionResourcePreviewAssets(batch: ProductionBatch) {
    const groupId = batchGroupId(batch);
    const batchText = batch.id.toLowerCase();
    return assets
      .filter((asset) => {
        const assetText = compactJson(asset).toLowerCase();
        return assetText.includes(batchText)
          || Boolean(groupId && (asset.groupId === groupId || assetText.includes(groupId.toLowerCase())));
      })
      .filter((asset) => Boolean(asset.thumbnailPublicUrl))
      .slice(0, 6);
  }

  function openProductionResource(batch: ProductionBatch, tab: typeof resourceDrawerTab = "overview") {
    setSelectedResourceId(batch.id);
    setResourceDrawerTab(tab);
  }

  async function updateProductionResourceStatus(batch: ProductionBatch, statusValue: string) {
    if (productionResourceIsCharacterGroup(batch)) {
      setStatus("Character Groups are managed from Management > Character Groups");
      return;
    }
    await adminAction(statusValue === "ARCHIVED" ? "Archiving resource" : "Restoring resource", () =>
      api(`/production-batches/${batch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusValue })
      })
    );
    setSelectedResourceId(batch.id);
  }

  async function deleteProductionResource(batch = selectedProductionResource) {
    if (!batch) return;
    if (!window.confirm(`Delete production resource ${batchDisplayName(batch, getProductionResourceGroup(batch))}? This cannot be undone.`)) return;
    return adminAction("Deleting production resource", async () => {
      const groupId = batchGroupId(batch);
      const endpoint = productionResourceIsCharacterGroup(batch) && groupId
        ? `/character-groups/${groupId}`
        : `/production-batches/${batch.id}`;
      const result = await api(endpoint, { method: "DELETE" });
      setSelectedResourceId("");
      await refreshQueue();
      return result;
    });
  }

  async function copyProductionPostContent(batch: ProductionBatch) {
    const post = postContentMetadata(batch);
    const content = [
      post.title,
      post.caption,
      post.postText && post.postText !== post.caption ? post.postText : "",
      post.hashtags.join(" "),
      post.cta
    ].filter(Boolean).join("\n\n");
    await navigator.clipboard.writeText(content || compactJson(batch.metadata));
    setStatus("Post content copied");
  }

  function renderResourcePreview(batch: ProductionBatch) {
    const previewAssets = getProductionResourcePreviewAssets(batch);
    const group = getProductionResourceGroup(batch);
    const groupThumbs = (group?.membersPreview ?? [])
      .flatMap((member) => [member.youngThumbnailUrl, member.oldThumbnailUrl])
      .filter(Boolean)
      .slice(0, 6) as string[];

    if (batch.batchType === "POST_CONTENT") {
      const post = postContentMetadata(batch);
      return (
        <div className="resourcePostPreview">
          <strong>{post.title || "Post content"}</strong>
          <p>{post.caption || post.postText || "No caption yet."}</p>
          <small>{post.hashtags.join(" ") || post.platform}</small>
        </div>
      );
    }

    if (batch.batchType === "MUSIC_TRACK") {
      const music = musicTrackMetadata(batch);
      return (
        <div className="resourceMusicPreview">
          <Music size={22} />
          <strong>{[music.mood, music.tempo, music.style].filter(Boolean).join(" / ") || "Music track"}</strong>
          <small>{music.tags.join(", ") || [music.scene, music.emotion].filter(Boolean).join(" / ") || "No music attributes"}</small>
        </div>
      );
    }

    const urls = previewAssets.map((asset) => listImageUrl(asset)).filter(Boolean);
    const fallbackUrls = urls.length ? urls : groupThumbs.map(mediaUrl).filter(Boolean);
    return (
      <div className="resourceThumbGrid">
        {fallbackUrls.slice(0, 6).map((url, index) => (
          <img src={url} alt={`${batch.batchType} thumbnail ${index + 1}`} key={`${batch.id}-${url}-${index}`} />
        ))}
        {!fallbackUrls.length ? (
          <span className="resourcePreviewPlaceholder">
            {batch.batchType === "VIDEO_BATCH" || batch.batchType === "FINAL_VIDEO" ? <Video size={22} /> : <Image size={22} />}
            Thumbnail pending
          </span>
        ) : null}
      </div>
    );
  }

  function renderProductionResourceCard(batch: ProductionBatch) {
    const group = getProductionResourceGroup(batch);
    const post = postContentMetadata(batch);
    const music = musicTrackMetadata(batch);
    const lineageCount = getProductionResourceLineageCount(batch);
    const groupId = batchGroupId(batch);
    const relatedJobs = jobs.filter((job) => {
      const sourceBatch = batches.find((item) => item.id === job.sourceBatchId) ?? null;
      const jobText = compactJson({ payload: job.payload, output: job.output });
      return job.sourceBatchId === batch.id
        || batchMatchesJob(batch, job)
        || Boolean(groupId && sourceBatch && batchGroupId(sourceBatch) === groupId)
        || Boolean(groupId && jobText.includes(groupId));
    });
    return (
      <article className={`resourceLibraryCard ${selectedResourceId === batch.id ? "selected" : ""}`} key={batch.id} onClick={() => openProductionResource(batch)}>
        <div className="resourcePreviewFrame">{renderResourcePreview(batch)}</div>
        <div className="resourceCardHeader">
          <strong>{batchDisplayName(batch, group)}</strong>
          <span className="resourceTypeBadge">{productionResourceType(batch)}</span>
        </div>
        <div className="resourceBadgeRow">
          <span className={`statusPill ${batch.status === "READY" ? "ready" : batch.status === "FAILED" ? "danger" : ""}`}>{batch.status}</span>
          <span className="statusPill">{batch.usageStatus}</span>
        </div>
        <div className="resourceMetaGrid">
          <span>Workflow</span><strong>{batch.workflowId ? displayShortId(batch.workflowId) : "-"}</strong>
          <span>Group</span><strong>{group?.name ?? "-"}</strong>
          <span>Created</span><strong>{displayDateTime(batch.createdAt)}</strong>
          <span>Lineage</span><strong>{lineageCount}</strong>
        </div>
        {batch.batchType === "POST_CONTENT" ? <p className="resourceCaption">{post.caption || post.postText || "No post content."}</p> : null}
        {batch.batchType === "MUSIC_TRACK" ? <p className="resourceCaption">{[music.mood, music.tempo, music.style].filter(Boolean).join(" / ") || "No music metadata."}</p> : null}
        <div className="resourceActions">
          <button onClick={(event) => { event.stopPropagation(); openProductionResource(batch); }} title="Open"><Eye size={15} /> Open</button>
          <button onClick={(event) => { event.stopPropagation(); openProductionResource(batch, "lineage"); }} title="View Lineage"><Boxes size={15} /> Lineage</button>
          <button onClick={(event) => { event.stopPropagation(); openProductionResource(batch, "jobs"); }} title="View Jobs"><ClipboardList size={15} /> Jobs {relatedJobs.length ? `(${relatedJobs.length})` : ""}</button>
          {batch.batchType === "POST_CONTENT" ? (
            <button onClick={(event) => { event.stopPropagation(); copyProductionPostContent(batch); }} title="Copy Content"><Copy size={15} /> Copy</button>
          ) : null}
          {!productionResourceIsCharacterGroup(batch) ? (
            batch.status === "ARCHIVED" ? (
              <button onClick={(event) => { event.stopPropagation(); updateProductionResourceStatus(batch, "READY"); }} title="Restore"><RefreshCcw size={15} /> Restore</button>
            ) : (
              <button onClick={(event) => { event.stopPropagation(); updateProductionResourceStatus(batch, "ARCHIVED"); }} title="Archive"><Archive size={15} /> Archive</button>
            )
          ) : null}
        </div>
      </article>
    );
  }

  function jobRelationship(job: OrchestratorJob) {
    const sourceBatch = batches.find((batch) => batch.id === job.sourceBatchId) ?? null;
    const groupId = batchGroupId(sourceBatch);
    const group = groupId ? groups.find((item) => item.id === groupId) ?? null : null;
    const workflowId = sourceBatch?.workflowId || jobPayloadString(job, "workflowId");
    const workflow = workflowId ? workflows.find((item) => item.id === workflowId) ?? null : null;
    const allocation = allocations.find((item) => item.id === jobPayloadString(job, "allocationId") || item.orchestratorJobId === job.id) ?? null;
    const runtime = runtimeSessions.find((session) => session.jobId === job.id) ?? null;
    return { sourceBatch, group, workflow, allocation, runtime };
  }

  function productionJobStatus(job: OrchestratorJob) {
    const { sourceBatch, runtime } = jobRelationship(job);
    if (runtime?.status === "FAILED_RECOVERABLE") return "FAILED_RECOVERABLE";
    if (job.status === "PENDING" && !sourceBatch) return "WAITING_RESOURCE";
    if (job.status === "PENDING" && job.targetStageType === "VIDEO_COMPOSE") {
      const hasMusic = batches.some((batch) => batch.batchType === "MUSIC_TRACK" && batch.status === "READY" && ["AVAILABLE", "REUSABLE"].includes(batch.usageStatus));
      if (!hasMusic) return "WAITING_MUSIC";
    }
    if (productionQueueStatusOptions.includes(job.status)) return job.status;
    return job.status === "FAILED" ? "FAILED" : "PENDING";
  }

  function renderJobStatusActions(job: OrchestratorJob) {
    const { allocation, runtime } = jobRelationship(job);
    if (job.status === "PENDING") {
      return (
        <>
          <button disabled={busy} onClick={(event) => { event.stopPropagation(); runJobAction(job, "allocate"); }}>Allocate</button>
          <button disabled title="Cancel endpoint is not available yet">Cancel</button>
        </>
      );
    }
    if (job.status === "ALLOCATED") {
      return (
        <>
          <button disabled={busy} onClick={(event) => { event.stopPropagation(); runJobAction(job, "start"); }}>Start</button>
          <button disabled={busy} onClick={(event) => { event.stopPropagation(); runJobAction(job, "execute-mock"); }}>Execute Mock</button>
          <button disabled={busy || job.targetStageType !== "IMAGE_EDIT"} onClick={(event) => { event.stopPropagation(); runJobAction(job, "execute-image-edit"); }}>Execute IMAGE_EDIT</button>
          <button disabled={busy || !allocation} onClick={(event) => { event.stopPropagation(); releaseJobAllocation(job); }}>Release Allocation</button>
          <button disabled={busy} onClick={(event) => { event.stopPropagation(); runJobAction(job, "fail"); }}>Fail</button>
        </>
      );
    }
    if (job.status === "RUNNING") {
      return (
        <>
          <button disabled={!runtime} onClick={(event) => { event.stopPropagation(); if (runtime) selectRuntimeSession(runtime); setJobDrawerTab("runtime"); }}>View Runtime</button>
          <button disabled={busy} onClick={(event) => { event.stopPropagation(); runJobAction(job, "fail"); }}>Mark Failed</button>
          <button disabled={busy} onClick={(event) => { event.stopPropagation(); refreshQueue(); }}>Refresh</button>
        </>
      );
    }
    if (job.status === "FAILED") {
      return (
        <>
          <button onClick={(event) => { event.stopPropagation(); loadJobDetail(job); setJobDrawerTab("overview"); }}>View Error</button>
          <button disabled={busy || runtime?.status !== "FAILED_RECOVERABLE"} onClick={(event) => { event.stopPropagation(); if (runtime) runtimeAction("recover", runtime); }}>Recover</button>
          <button disabled title="Retry endpoint is not available yet">Retry</button>
          <button disabled={busy || runtime?.status !== "FAILED_RECOVERABLE"} onClick={(event) => { event.stopPropagation(); if (runtime) runtimeAction("mark-unrecoverable", runtime); }}>Mark Unrecoverable</button>
        </>
      );
    }
    if (job.status === "COMPLETED") {
      return (
        <>
          <button onClick={(event) => { event.stopPropagation(); loadJobDetail(job); setJobDrawerTab("output"); }}>View Output</button>
          <button onClick={(event) => { event.stopPropagation(); loadJobDetail(job); setJobDrawerTab("lineage"); }}>View Lineage</button>
        </>
      );
    }
    return <button disabled>Refresh</button>;
  }

  function renderManagementJobCard(job: OrchestratorJob) {
    const { sourceBatch, group, workflow, allocation, runtime } = jobRelationship(job);
    const hasError = job.status === "FAILED" || Boolean(findJobError(job, runtime, scriptRuns.find((run) => run.runtimeSessionId === runtime?.id) ?? null));
    return (
      <article className={`managementJobCard ${selectedJobId === job.id ? "selected" : ""}`} key={job.id} onClick={() => loadJobDetail(job)}>
        <header>
          <label onClick={(event) => event.stopPropagation()}>
            <input type="checkbox" checked={selectedJobIds.includes(job.id)} onChange={() => toggleSelectedJob(job.id)} />
          </label>
          <strong>{displayShortId(job.id)}</strong>
          <span className="resourceTypeBadge">{job.targetStageType}</span>
          <span className={`statusPill ${job.status === "FAILED" ? "danger" : job.status === "COMPLETED" ? "ready" : ""}`}>{job.status}</span>
        </header>
        <div className="resourceMetaGrid">
          <span>Source</span><strong>{sourceBatch?.batchType ?? "-"} / {displayShortId(job.sourceBatchId)}</strong>
          <span>Group</span><strong>{group?.name ?? "-"}</strong>
          <span>Workflow</span><strong>{workflow?.name ?? "-"}</strong>
          <span>Created</span><strong>{displayDateTime(job.createdAt)}</strong>
          <span>Instance</span><strong>{displayShortId(displayJobInstance(job) !== "-" ? displayJobInstance(job) : allocation?.instanceId)}</strong>
          <span>Allocation</span><strong>{displayJobAllocationMode(job) !== "-" ? displayJobAllocationMode(job) : allocation?.allocationMode ?? "-"}</strong>
        </div>
        {hasError ? <span className="jobErrorBadge">{findJobError(job, runtime, scriptRuns.find((run) => run.runtimeSessionId === runtime?.id) ?? null) || "Failed"}</span> : null}
        {job.status === "PENDING" && !instances.some((instance) => (instance.currentPoolType ?? "") === "STANDBY" && instanceCapabilityLabels(instance).includes(job.targetStageType)) ? <small className="warningText">Reason: No eligible STANDBY instance with required capability.</small> : null}
        <div className="jobCardActions">{renderJobStatusActions(job)}</div>
      </article>
    );
  }

  function runtimeRelationship(session: RuntimeSession) {
    const job = session.jobId ? jobs.find((item) => item.id === session.jobId) ?? null : null;
    const run = scriptRuns.find((item) => item.runtimeSessionId === session.id) ?? null;
    const script = run ? scripts.find((item) => item.id === run.scriptId) ?? null : session.scriptId ? scripts.find((item) => item.id === session.scriptId) ?? null : null;
    const instance = session.instanceId ? instances.find((item) => item.id === session.instanceId) ?? null : null;
    const host = hosts.find((item) => item.id === session.hostId || item.hostId === session.hostId || item.hostId === instance?.hostId) ?? null;
    const sourceBatch = job ? batches.find((batch) => batch.id === job.sourceBatchId) ?? null : null;
    const output = job ? batches.find((batch) => batchMatchesJob(batch, job)) ?? null : null;
    return { job, run, script, instance, host, sourceBatch, output };
  }

  function renderRuntimeActions(session: RuntimeSession) {
    if (session.status === "PENDING") {
      return (
        <>
          <button disabled title="Start is not exposed for runtime sessions yet">Start</button>
          <button onClick={(event) => { event.stopPropagation(); selectRuntimeSession(session); }}>Open Detail</button>
        </>
      );
    }
    if (session.status === "RUNNING") {
      return (
        <>
          <button onClick={(event) => { event.stopPropagation(); selectRuntimeSession(session); }}>Open Detail</button>
          <button onClick={(event) => { event.stopPropagation(); runtimeAction("test-screenshot", session); }}>Test Screenshot</button>
          <button onClick={(event) => { event.stopPropagation(); api(`/runtime-sessions/${session.id}/pause`, { method: "POST" }).then(refreshQueue); }}>Pause</button>
          <button disabled title="Use related job fail action from Jobs page">Mark Failed</button>
        </>
      );
    }
    if (session.status === "FAILED_RECOVERABLE") {
      return (
        <>
          <button onClick={(event) => { event.stopPropagation(); runtimeAction("recover", session); }}>Recover</button>
          <button onClick={(event) => { event.stopPropagation(); runtimeAction("mark-unrecoverable", session); }}>Mark Unrecoverable</button>
          <button onClick={(event) => { event.stopPropagation(); selectRuntimeSession(session); }}>Open Detail</button>
        </>
      );
    }
    if (session.status === "FAILED") {
      return (
        <>
          <button onClick={(event) => { event.stopPropagation(); selectRuntimeSession(session); setRuntimeDrawerTab("recovery"); }}>View Error</button>
          <button disabled title="Retry is not exposed for runtime sessions yet">Retry</button>
          <button onClick={(event) => { event.stopPropagation(); selectRuntimeSession(session); }}>Open Detail</button>
        </>
      );
    }
    if (session.status === "COMPLETED") {
      return (
        <>
          <button onClick={(event) => { event.stopPropagation(); selectRuntimeSession(session); setRuntimeDrawerTab("output"); }}>View Output</button>
          <button onClick={(event) => { event.stopPropagation(); selectRuntimeSession(session); }}>Open Detail</button>
        </>
      );
    }
    return <button onClick={(event) => { event.stopPropagation(); selectRuntimeSession(session); }}>Open Detail</button>;
  }

  function renderRuntimeSessionCard(session: RuntimeSession) {
    const { job, run, script, instance } = runtimeRelationship(session);
    const progress = runtimeProgress(session, run);
    const error = findJobError(job, session, run);
    return (
      <article className={`managementJobCard runtimeSessionCard ${selectedRuntimeId === session.id ? "selected" : ""}`} key={session.id} onClick={() => selectRuntimeSession(session)}>
        <header>
          <strong>{displayShortId(session.id)}</strong>
          <span className={`statusPill ${session.status === "FAILED" || session.status === "FAILED_RECOVERABLE" ? "danger" : session.status === "COMPLETED" ? "ready" : ""}`}>{session.status}</span>
        </header>
        <div className="resourceMetaGrid">
          <span>Job Type</span><strong>{job?.targetStageType ?? "-"}</strong>
          <span>Script</span><strong>{script?.name ?? displayShortId(run?.scriptVersionId)}</strong>
          <span>Step</span><strong>{session.currentStepNo}</strong>
          <span>Progress</span><strong>{progress.completed}/{progress.total || "-"}</strong>
          <span>Host</span><strong>{session.hostId ?? "-"}</strong>
          <span>Instance</span><strong>{displayShortId(session.instanceId)}</strong>
          <span>ADB</span><strong>{instance?.adbId ?? "-"}</strong>
          <span>Started</span><strong>{displayDateTime(session.startedAt ?? session.updatedAt)}</strong>
          <span>Duration</span><strong>{displayDuration(session.startedAt ?? session.updatedAt, session.finishedAt)}</strong>
        </div>
        {error ? <span className="jobErrorBadge">{error}</span> : null}
        <div className="jobCardActions">{renderRuntimeActions(session)}</div>
      </article>
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
            <div className="hostOpsPage">
              <div className="resourceKpiBar">
                {[
                  { label: "Total Hosts", value: hostKpis.total, Icon: Boxes },
                  { label: "Online Hosts", value: hostKpis.online, Icon: Check },
                  { label: "Offline Hosts", value: hostKpis.offline, Icon: Archive },
                  { label: "Hosts With Errors", value: hostKpis.errors, Icon: ClipboardList },
                  { label: "Total Instances", value: hostKpis.instances, Icon: Users },
                  { label: "Standby Instances", value: hostKpis.standby, Icon: Play },
                  { label: "Workflow Instances", value: hostKpis.workflow, Icon: Rocket },
                  { label: "Maintenance Instances", value: hostKpis.maintenance, Icon: Edit3 }
                ].map(({ label, value, Icon }) => (
                  <div className="resourceKpiCard" key={label}>
                    <Icon size={17} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <details className="resourceCreatePanel">
                <summary>Add Host Agent</summary>
                <div className="resourceCreateGrid">
                  <label>Host ID<input value={hostForm.hostId} onChange={(event) => setHostForm({ ...hostForm, hostId: event.target.value })} /></label>
                  <label>Name<input value={hostForm.name} onChange={(event) => setHostForm({ ...hostForm, name: event.target.value })} /></label>
                  <label>Base URL<input value={hostForm.baseUrl} onChange={(event) => setHostForm({ ...hostForm, baseUrl: event.target.value })} /></label>
                  <label>API Key<input value={hostForm.apiKey} onChange={(event) => setHostForm({ ...hostForm, apiKey: event.target.value })} /></label>
                  <label>Status<input value={hostForm.status} onChange={(event) => setHostForm({ ...hostForm, status: event.target.value })} /></label>
                  <button className="primaryButton" onClick={() => adminAction("Creating host", () => api("/hosts", { method: "POST", body: JSON.stringify(hostForm) }))}>Add Host</button>
                </div>
              </details>

              <div className="hostOpsGrid">
                {hostManagementRows.map((row) => (
                  <article className={`hostOpsCard ${selectedHostDrawerId === row.host.id ? "selected" : ""}`} key={row.host.id} onClick={() => openHostOperations(row.host)}>
                    <header>
                      <div>
                        <strong>{row.host.name}</strong>
                        <small>{row.host.hostId}</small>
                      </div>
                      <span className="statusPill">{row.host.status}</span>
                    </header>
                    <div className="resourceMetaGrid">
                      <span>Base URL</span><strong title={row.host.baseUrl}>{row.host.baseUrl}</strong>
                      <span>Agent health</span><strong>{row.host.metadata?.health ? String(row.host.metadata.health) : row.host.status}</strong>
                      <span>Last check</span><strong>{displayDateTime(row.host.lastHealthCheckAt ?? row.host.updatedAt ?? undefined)}</strong>
                      <span>Instances</span><strong>{row.total}</strong>
                      <span>Standby</span><strong>{row.standby}</strong>
                      <span>Workflow</span><strong>{row.workflow}</strong>
                      <span>Maintenance</span><strong>{row.maintenance}</strong>
                      <span>ADB devices</span><strong>{row.adbCount}</strong>
                      <span>Storage</span><strong>{getString(row.host.metadata?.storageStatus) || "-"}</strong>
                    </div>
                    <div className="resourceBadgeRow">
                      <span className="poolBadge capabilityBadge">direct {row.direct}</span>
                      <span className="poolBadge">preserved {row.preserved}</span>
                      {row.unknown ? <span className="poolBadge warningBadge">unknown {row.unknown}</span> : null}
                    </div>
                    <div className="resourceActions">
                      <button title="Health Check" onClick={(event) => { event.stopPropagation(); runHostDrawerAction(row.host, "health"); }}><Check size={15} /></button>
                      <button title="Sync Instances" onClick={(event) => { event.stopPropagation(); syncHostInstances(row.host); }}><RefreshCcw size={15} /></button>
                      <button title="ADB Devices" onClick={(event) => { event.stopPropagation(); openHostOperations(row.host, "adb"); runHostDrawerAction(row.host, "devices"); }}><Boxes size={15} /></button>
                      <button title="Open Instances" onClick={(event) => { event.stopPropagation(); openHostOperations(row.host, "instances"); }}><Eye size={15} /></button>
                      <button title="Edit Host" onClick={(event) => { event.stopPropagation(); setHostForm({ hostId: row.host.hostId, name: row.host.name, baseUrl: row.host.baseUrl, apiKey: row.host.apiKey ?? "", status: row.host.status }); openHostOperations(row.host, "overview"); }}><Edit3 size={15} /></button>
                      <button title="Disable Host" onClick={(event) => { event.stopPropagation(); adminAction("Disabling host", () => api(`/hosts/${row.host.id}`, { method: "PATCH", body: JSON.stringify({ status: "disabled" }) })); }}><Archive size={15} /></button>
                    </div>
                  </article>
                ))}
                {!hostManagementRows.length ? <div className="jobsEmpty">No Host Agent registered yet.</div> : null}
              </div>

              {selectedHostDrawer ? (
                <aside className="hostOpsDrawer">
                  <div className="drawerHeader">
                    <div>
                      <strong>{selectedHostDrawer.name}</strong>
                      <small>{selectedHostDrawer.hostId} / {selectedHostDrawerInstances.length} instances</small>
                    </div>
                    <button className="iconButton" onClick={() => setSelectedHostDrawerId("")} title="Close host drawer">x</button>
                  </div>
                  <div className="resourceDrawerTabs">
                    {([
                      ["overview", "Overview"],
                      ["instances", "Instances"],
                      ["adb", "ADB Devices"],
                      ["tests", "Host Agent Tests"],
                      ["storage", "Storage"],
                      ["json", "Debug JSON"]
                    ] as Array<[typeof hostDrawerTab, string]>).map(([tab, label]) => (
                      <button key={tab} className={hostDrawerTab === tab ? "active" : ""} onClick={() => setHostDrawerTab(tab)}>{label}</button>
                    ))}
                  </div>

                  {hostDrawerTab === "overview" ? (
                    <div className="resourceDrawerBody">
                      <div className="resourceMetaGrid detail">
                        <span>Name</span><strong>{selectedHostDrawer.name}</strong>
                        <span>Host ID</span><strong>{selectedHostDrawer.hostId}</strong>
                        <span>Base URL</span><strong>{selectedHostDrawer.baseUrl}</strong>
                        <span>Status</span><strong>{selectedHostDrawer.status}</strong>
                        <span>Last health</span><strong>{displayDateTime(selectedHostDrawer.lastHealthCheckAt ?? selectedHostDrawer.updatedAt ?? undefined)}</strong>
                        <span>Instances</span><strong>{selectedHostDrawerInstances.length}</strong>
                      </div>
                    </div>
                  ) : null}

                  {hostDrawerTab === "instances" ? (
                    <div className="hostChildInstanceList">
                      {selectedHostDrawerInstances.map((instance) => (
                        <article className="hostChildInstanceCard" key={instance.id} onClick={() => openInstanceOperations(instance)}>
                          <header><strong>{instance.id}</strong><span className="statusPill">{instance.currentPoolType ?? "AVAILABLE"}</span></header>
                          {renderInstanceScreenshotPreview(instance)}
                          <div className="resourceMetaGrid">
                            <span>Local</span><strong>{instance.localId}</strong>
                            <span>Name</span><strong>{instance.name ?? "-"}</strong>
                            <span>ADB</span><strong>{instance.adbId ?? "Unknown"}</strong>
                            <span>Status</span><strong>{instance.status}</strong>
                            <span>Runtime</span><strong>{instance.runtimeStatus || "-"}</strong>
                            <span>LD status</span><strong>{getString(getRecord(instance.metadata?.raw).ldStatus) || "-"}</strong>
                            <span>Mapping</span><strong>{adbMappingConfidence(instance) || "unknown"}</strong>
                            <span>Source</span><strong>{adbMappingSource(instance) || "none"}</strong>
                            <span>Last Seen</span><strong>{displayDateTime(instance.lastSeenAt ?? undefined)}</strong>
                          </div>
                          <div className="resourceBadgeRow">{renderCapabilityBadges(instance)}</div>
                          {hasUnknownAdbMapping(instance) ? <span className="poolBadge warningBadge">ADB mapping unknown. Runtime commands require adbId.</span> : null}
                          {instance.maintenanceReason ? <small className="jobErrorBadge">{instance.maintenanceReason}</small> : null}
                          <div className="resourceActions">
                            <button title="Test Screenshot" disabled={!instance.adbId} onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "screenshot"); }}><Image size={15} /></button>
                            <button title="Send Test Text" disabled={!instance.adbId} onClick={(event) => { event.stopPropagation(); runHostDrawerAction(selectedHostDrawer, "send-text", instance); }}><Edit3 size={15} /></button>
                            <button title="Move Standby" onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-standby"); }}><Play size={15} /></button>
                            <button title="Move Maintenance" onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-maintenance"); }}><Archive size={15} /></button>
                            <button title="Disable" onClick={(event) => { event.stopPropagation(); moveInstance(instance, "disable"); }}><Trash2 size={15} /></button>
                            <button title="Set Capabilities" onClick={(event) => { event.stopPropagation(); openInstanceOperations(instance, "capabilities"); }}><ClipboardList size={15} /></button>
                            <button title="Map ADB" onClick={(event) => { event.stopPropagation(); openAdbMapping(instance); }}><Boxes size={15} /></button>
                            <button title="Open Instance Detail" onClick={(event) => { event.stopPropagation(); openInstanceOperations(instance); }}><Eye size={15} /></button>
                          </div>
                        </article>
                      ))}
                      {!selectedHostDrawerInstances.length ? <p className="emptyDetail">No synced instances yet.</p> : null}
                    </div>
                  ) : null}

                  {hostDrawerTab === "adb" ? (
                    <div className="resourceDrawerBody">
                      <div className="resourceActions"><button onClick={() => runHostDrawerAction(selectedHostDrawer, "devices")}><RefreshCcw size={15} /> Refresh ADB Devices</button></div>
                      <div className="deviceList">
                        {adbDevices.map((device) => {
                          const mapped = selectedHostDrawerInstances.find((instance) => instance.adbId === device.adbId);
                          return <button key={device.adbId} onClick={() => setHostAdbId(device.adbId)}>{device.adbId} / {device.state} / {mapped ? mapped.id : "unmapped"}</button>;
                        })}
                      </div>
                      {!adbDevices.length ? <p className="emptyDetail">Run ADB Devices to load device state from this Host Agent.</p> : null}
                    </div>
                  ) : null}

                  {hostDrawerTab === "tests" ? (
                    <div className="resourceDrawerBody">
                      <div className="resourceCreateGrid">
                        <label>Instance<select value={hostInstanceId} onChange={(event) => {
                          const instance = selectedHostDrawerInstances.find((item) => item.id === event.target.value);
                          setHostInstanceId(event.target.value);
                          setHostAdbId(instance?.adbId ?? "");
                        }}><option value="">Select instance</option>{selectedHostDrawerInstances.map((instance) => <option key={instance.id} value={instance.id}>{instance.id} / {instance.adbId ?? "ADB unknown"}</option>)}</select></label>
                        <label>ADB ID<input value={hostAdbId} onChange={(event) => setHostAdbId(event.target.value)} /></label>
                        <label>Text<input value={hostSendText} onChange={(event) => setHostSendText(event.target.value)} /></label>
                      </div>
                      {!hostAdbId ? <span className="poolBadge warningBadge">ADB mapping unknown. Runtime commands require adbId.</span> : null}
                      <div className="resourceActions">
                        <button onClick={() => runHostDrawerAction(selectedHostDrawer, "health")}>Health</button>
                        <button onClick={() => runHostDrawerAction(selectedHostDrawer, "devices")}>ADB Devices</button>
                        <button disabled={!hostAdbId} onClick={() => runHostDrawerAction(selectedHostDrawer, "screenshot")}>Screenshot</button>
                        <button disabled={!hostAdbId} onClick={() => runHostDrawerAction(selectedHostDrawer, "send-text")}>Send Test Text</button>
                        <button disabled={!hostAdbId} onClick={() => runHostDrawerAction(selectedHostDrawer, "download-latest")}>Download Latest</button>
                      </div>
                      <pre className="jsonBlock">{compactJson(hostResult)}</pre>
                    </div>
                  ) : null}

                  {hostDrawerTab === "storage" ? (
                    <div className="resourceDrawerBody">
                      <div className="resourceMetaGrid detail">
                        <span>Storage status</span><strong>{getString(selectedHostDrawer.metadata?.storageStatus) || "-"}</strong>
                        <span>Storage root</span><strong>{getString(selectedHostDrawer.metadata?.storageRoot) || "-"}</strong>
                        <span>Downloads</span><strong>{getString(selectedHostDrawer.metadata?.downloadPath) || "-"}</strong>
                      </div>
                    </div>
                  ) : null}

                  {hostDrawerTab === "json" ? <pre className="jsonBlock">{compactJson({ host: selectedHostDrawer, instances: selectedHostDrawerInstances, adbDevices, hostResult })}</pre> : null}
                </aside>
              ) : null}

              {adbMappingInstance && managementSection === "hosts" ? (
                <aside className="adbMappingPanel">
                  <div className="drawerHeader">
                    <div>
                      <strong>Map ADB</strong>
                      <small>{adbMappingInstance.id} / local {adbMappingInstance.localId}</small>
                    </div>
                    <button className="iconButton" onClick={() => setAdbMappingInstanceId("")}>x</button>
                  </div>
                  <div className="resourceMetaGrid detail">
                    <span>Name</span><strong>{adbMappingInstance.name ?? "-"}</strong>
                    <span>LD status</span><strong>{getString(getRecord(adbMappingInstance.metadata?.raw).ldStatus) || "-"}</strong>
                    <span>Current ADB</span><strong>{adbMappingInstance.adbId ?? "Unknown"}</strong>
                    <span>Confidence</span><strong>{adbMappingConfidence(adbMappingInstance) || "unknown"}</strong>
                    <span>Source</span><strong>{adbMappingSource(adbMappingInstance) || "none"}</strong>
                  </div>
                  <div className="adbDevicePicker">
                    {adbDevices.map((device) => {
                      const mapped = instances.find((instance) => instance.hostId === adbMappingInstance.hostId && instance.adbId === device.adbId);
                      return (
                        <button key={device.adbId} className={selectedManualAdbId === device.adbId ? "selected" : ""} onClick={() => setSelectedManualAdbId(device.adbId)}>
                          <strong>{device.adbId}</strong>
                          <span>{device.state}</span>
                          <small>{mapped ? `mapped: ${mapped.id}` : "unmapped"}</small>
                        </button>
                      );
                    })}
                    {!adbDevices.length ? <p className="emptyDetail">Click Validate/Refresh to load ADB devices from this host.</p> : null}
                  </div>
                  <div className="resourceActions">
                    <button onClick={() => { const host = hostForInstance(adbMappingInstance); if (host) runHostDrawerAction(host, "devices"); }}>Validate/Refresh</button>
                    <button disabled={!selectedManualAdbId} onClick={assignManualAdbMapping}>Assign selected adbId</button>
                    <button onClick={() => clearManualAdbMapping(adbMappingInstance)}>Clear mapping</button>
                  </div>
                </aside>
              ) : null}
            </div>
          ) : null}

          {managementSection === "workflows" ? (
            <div className="workflowManager">
              <div className="resourceKpiBar">
                {[
                  { label: "Total Workflows", value: workflowKpis.total, Icon: Boxes },
                  { label: "Active Workflows", value: workflowKpis.active, Icon: Check },
                  { label: "Draft Workflows", value: workflowKpis.draft, Icon: Edit3 },
                  { label: "Resource-Driven", value: workflowKpis.resourceDriven, Icon: Rocket },
                  { label: "Legacy Sequential", value: workflowKpis.legacy, Icon: Archive },
                  { label: "With Capacity", value: workflowKpis.capacity, Icon: Users },
                  { label: "With Music Policy", value: workflowKpis.music, Icon: Music },
                  { label: "With Post Content", value: workflowKpis.post, Icon: ClipboardList }
                ].map(({ label, value, Icon }) => (
                  <div className="resourceKpiCard" key={label}>
                    <Icon size={17} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="jobsOpsToolbar">
                <button className="primaryButton compact" onClick={() => setShowWorkflowWizard(true)}>New Workflow</button>
                <div className="segmentedControl">
                  <button className={workflowViewMode === "card" ? "active" : ""} onClick={() => setWorkflowViewMode("card")}>Card View</button>
                  <button className={workflowViewMode === "table" ? "active" : ""} onClick={() => setWorkflowViewMode("table")}>Table View</button>
                </div>
              </div>

              <div className="resourceFiltersPanel">
                <label>Search<input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="workflow name..." /></label>
                <label>Status<select value={workflowStatusFilter} onChange={(event) => setWorkflowStatusFilter(event.target.value)}><option value="">All</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
                <label>Mode<select value={workflowModeFilter} onChange={(event) => setWorkflowModeFilter(event.target.value)}><option value="">All</option><option value="Resource-Driven">Resource-Driven</option><option value="Legacy">Legacy</option><option value="Mixed">Mixed</option></select></label>
                <div className="resourceFilterChecks">
                  <label><input type="checkbox" checked={workflowHasCapacityFilter} onChange={(event) => setWorkflowHasCapacityFilter(event.target.checked)} /> Has capacity</label>
                  <label><input type="checkbox" checked={workflowHasMusicFilter} onChange={(event) => setWorkflowHasMusicFilter(event.target.checked)} /> Has music policy</label>
                  <label><input type="checkbox" checked={workflowHasPostFilter} onChange={(event) => setWorkflowHasPostFilter(event.target.checked)} /> Has post content</label>
                  <label><input type="checkbox" checked={workflowRecentFilter} onChange={(event) => setWorkflowRecentFilter(event.target.checked)} /> Updated recently</label>
                </div>
              </div>

              <div className="workflowLayout">
                <section className="workflowMain">
                  {workflowViewMode === "card" ? (
                    <div className="workflowCardGrid">
                      {filteredWorkflows.map((workflow) => {
                        const mode = workflowModeLabel(workflow);
                        const musicMode = getString(getRecord(workflow.musicPolicy).mode) || "-";
                        return (
                          <article className={`workflowCard ${selectedWorkflow?.id === workflow.id ? "selected" : ""}`} key={workflow.id} onClick={() => openWorkflow(workflow)}>
                            <header>
                              <strong>{workflow.name}</strong>
                              <span className="resourceTypeBadge">{mode}</span>
                            </header>
                            <div className="resourceBadgeRow"><span className="statusPill">{workflow.status}</span><span className="statusPill">{(workflow.resourceRules ?? []).length} rules</span></div>
                            <p>{workflow.description || "No description."}</p>
                            <div className="resourceMetaGrid">
                              <span>Capacity</span><strong>{workflowCapacitySummary(workflow.capacityConfig)}</strong>
                              <span>Music</span><strong>{musicMode}</strong>
                              <span>Post Content</span><strong>{Object.keys(workflow.postContentPolicy ?? {}).length ? "enabled" : "-"}</strong>
                              <span>Updated</span><strong>{displayDateTime(workflow.updatedAt ?? undefined)}</strong>
                            </div>
                            <div className="resourceActions">
                              <button onClick={(event) => { event.stopPropagation(); openWorkflow(workflow); }}><Eye size={15} /> Open</button>
                              <button onClick={(event) => { event.stopPropagation(); duplicateWorkflow(workflow); }}><Copy size={15} /> Duplicate</button>
                              <button onClick={(event) => { event.stopPropagation(); launchWorkflow(workflow); }}><Rocket size={15} /> Launch</button>
                              <button onClick={(event) => { event.stopPropagation(); adminAction("Archiving workflow", () => api(`/workflows/${workflow.id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) })); }}><Archive size={15} /> Archive</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="jobsTable operationsTable">
                      <div className="jobsTableHeader"><span>Name</span><span>Status</span><span>Mode</span><span>Rules</span><span>Capacity</span><span>Music</span><span>Updated</span><span>Actions</span></div>
                      {filteredWorkflows.map((workflow) => (
                        <div className={`jobsTableRow ${selectedWorkflow?.id === workflow.id ? "selected" : ""}`} key={workflow.id} onClick={() => openWorkflow(workflow)}>
                          <strong>{workflow.name}</strong><span>{workflow.status}</span><span>{workflowModeLabel(workflow)}</span><span>{workflow.resourceRules?.length ?? 0}</span><span>{workflowCapacitySummary(workflow.capacityConfig)}</span><span>{getString(getRecord(workflow.musicPolicy).mode) || "-"}</span><span>{displayDateTime(workflow.updatedAt ?? undefined)}</span>
                          <div className="jobActions"><button onClick={(event) => { event.stopPropagation(); openWorkflow(workflow); }}>Open</button><button onClick={(event) => { event.stopPropagation(); duplicateWorkflow(workflow); }}>Duplicate</button></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!filteredWorkflows.length ? <p className="emptyDetail">No workflows match current filters.</p> : null}
                </section>

                <aside className="workflowDrawer">
                  {selectedWorkflow ? (
                    <>
                      <div className="drawerHeader">
                        <div><strong>{selectedWorkflow.name}</strong><small>{workflowModeLabel(selectedWorkflow, workflowDetail?.legacyStages ?? [])} / {displayShortId(selectedWorkflow.id)}</small></div>
                        <button className="iconButton" onClick={() => setSelectedWorkflowId("")}>x</button>
                      </div>
                      <div className="resourceDrawerTabs">
                        {[
                          ["overview", "Overview"], ["rules", "Resource Rules"], ["prompts", "Prompt Mapping"], ["scripts", "Script Mapping"], ["capacity", "Capacity"], ["music", "Music Policy"], ["post", "Post Content"], ["legacy", "Legacy Stages"], ["runs", "Runs"], ["json", "Debug JSON"]
                        ].map(([tab, label]) => <button key={tab} className={workflowDrawerTab === tab ? "active" : ""} onClick={() => setWorkflowDrawerTab(tab as typeof workflowDrawerTab)}>{label}</button>)}
                      </div>

                      {workflowDrawerTab === "overview" ? (
                        <div className="resourceDrawerBody">
                          <div className="workflowPipelinePreview">
                            <span>CHARACTER_GROUP</span><b>IMAGE_EDIT</b><span>IMAGE_BATCH</span><b>VIDEO_GENERATE</b><span>VIDEO_BATCH</span><b>VIDEO_COMPOSE</b><span>FINAL_VIDEO</span><b>POST_CONTENT</b><span>POST_CONTENT</span>
                          </div>
                          <div className="resourceMetaGrid detail">
                            <span>Name</span><strong>{selectedWorkflow.name}</strong>
                            <span>Status</span><strong>{selectedWorkflow.status}</strong>
                            <span>Mode</span><strong>{workflowModeLabel(selectedWorkflow, workflowDetail?.legacyStages ?? [])}</strong>
                            <span>Created</span><strong>{displayDateTime(selectedWorkflow.createdAt ?? undefined)}</strong>
                            <span>Updated</span><strong>{displayDateTime(selectedWorkflow.updatedAt ?? undefined)}</strong>
                            <span>Production Summary</span><strong>{workflowRuns.filter((run) => run.workflowId === selectedWorkflow.id).length} runs / {batches.filter((batch) => batch.workflowId === selectedWorkflow.id).length} batches</strong>
                          </div>
                          {(workflowDetail?.warnings ?? []).map((warning) => <span className="jobErrorBadge" key={warning}>{warning}</span>)}
                          <div className="resourceActions">
                            <button className="dangerButton" onClick={() => deleteWorkflow(selectedWorkflow)}><Trash2 size={15} /> Delete Workflow</button>
                          </div>
                        </div>
                      ) : null}

                      {workflowDrawerTab === "rules" ? (
                        <div className="resourceDrawerBody">
                          {(JSON.parse(workflowTemplateJson.resourceRules || "[]") as Array<Record<string, unknown>>).map((rule, index) => (
                            <article className="workflowRuleCard" key={index}>
                              <strong>{String(rule.trigger)} → {String(rule.targetJobType)} → {String(rule.outputBatchType ?? "-")}</strong>
                              <small>requires {(Array.isArray(rule.requires) ? rule.requires : []).join(", ") || "-"} / script {String(rule.scriptCategory ?? "-")} / prompt {String(rule.promptCategory ?? "-")}</small>
                              <div className="resourceActions"><button onClick={() => {
                                const rules = JSON.parse(workflowTemplateJson.resourceRules || "[]") as Array<Record<string, unknown>>;
                                rules.splice(index + 1, 0, { ...rule });
                                setWorkflowTemplateJson({ ...workflowTemplateJson, resourceRules: JSON.stringify(rules, null, 2) });
                              }}>Duplicate</button><button onClick={() => {
                                const rules = JSON.parse(workflowTemplateJson.resourceRules || "[]") as Array<Record<string, unknown>>;
                                rules[index] = { ...rule, enabled: rule.enabled === false };
                                setWorkflowTemplateJson({ ...workflowTemplateJson, resourceRules: JSON.stringify(rules, null, 2) });
                              }}>Enable/Disable</button><button onClick={() => {
                                const rules = JSON.parse(workflowTemplateJson.resourceRules || "[]") as Array<Record<string, unknown>>;
                                rules.splice(index, 1);
                                setWorkflowTemplateJson({ ...workflowTemplateJson, resourceRules: JSON.stringify(rules, null, 2) });
                              }}>Delete</button></div>
                            </article>
                          ))}
                          <button onClick={() => setWorkflowTemplateJson({ ...workflowTemplateJson, resourceRules: JSON.stringify([...JSON.parse(workflowTemplateJson.resourceRules || "[]"), { trigger: "CHARACTER_GROUP.READY", targetJobType: "IMAGE_EDIT", outputBatchType: "IMAGE_BATCH" }], null, 2) })}>Add Rule</button>
                          <label>Resource-Driven Rules (Recommended)<textarea rows={10} value={workflowTemplateJson.resourceRules} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, resourceRules: event.target.value })} /></label>
                          <button onClick={() => saveWorkflowTemplateField("resourceRules", "resource-rules", "Resource-Driven Rules")}>Save Resource Rules</button>
                        </div>
                      ) : null}

                      {workflowDrawerTab === "prompts" ? (
                        <div className="resourceDrawerBody">{workflowJobTypes.map((jobType) => {
                          const mapping = getRecord(JSON.parse(workflowTemplateJson.promptMapping || "{}"));
                          const selectedId = getString(mapping[jobType]);
                          return <label key={jobType}>{jobType} → Prompt Template<select value={selectedId} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, promptMapping: JSON.stringify({ ...mapping, [jobType]: event.target.value }, null, 2) })}><option value="">Select template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>;
                        })}<button onClick={() => saveWorkflowTemplateField("promptMapping", "prompt-mapping", "Prompt Mapping")}>Save Prompt Mapping</button></div>
                      ) : null}

                      {workflowDrawerTab === "scripts" ? (
                        <div className="resourceDrawerBody">{workflowJobTypes.map((jobType) => {
                          const mapping = getRecord(JSON.parse(workflowTemplateJson.scriptMapping || "{}"));
                          const selectedId = getString(mapping[jobType]);
                          return <label key={jobType}>{jobType} → Script<select value={selectedId} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, scriptMapping: JSON.stringify({ ...mapping, [jobType]: event.target.value }, null, 2) })}><option value="">Select script</option>{scripts.filter((script) => !script.category || script.category === jobType || script.category === "UTILITY").map((script) => <option key={script.id} value={script.id}>{script.name}</option>)}</select></label>;
                        })}<button onClick={() => saveWorkflowTemplateField("scriptMapping", "script-mapping", "Script Mapping")}>Save Script Mapping</button></div>
                      ) : null}

                      {workflowDrawerTab === "capacity" ? (
                        <div className="resourceDrawerBody">
                          {capacityStageOptions.map((stageType) => <label key={stageType}>{stageType}<input type="number" min="0" value={capacityForm[stageType] ?? 0} onChange={(event) => setCapacityForm({ ...capacityForm, [stageType]: Number(event.target.value) })} /></label>)}
                          <div className="resourceActions"><button onClick={() => saveWorkflowCapacity("workflow")}>Save Capacity</button><button disabled={!selectedWorkflowRun} onClick={() => allocateWorkflowCapacity()}>Allocate Capacity</button></div>
                          {capacityResult ? <pre className="jsonBlock">{compactJson(capacityResult)}</pre> : null}
                        </div>
                      ) : null}

                      {workflowDrawerTab === "music" ? (
                        <div className="resourceDrawerBody">
                          <div className="adminNotice"><strong>Music Policy</strong><span>RANDOM_LIBRARY selects reusable music randomly. REQUIRE_MATCHED waits for suitable music. CREATE_DEDICATED generates suitable music first.</span></div>
                          <label>Music Policy JSON<textarea rows={6} value={workflowTemplateJson.musicPolicy} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, musicPolicy: event.target.value })} /></label>
                          <button onClick={() => saveWorkflowTemplateField("musicPolicy", "music-policy", "Music Policy")}>Save Music Policy</button>
                        </div>
                      ) : null}

                      {workflowDrawerTab === "post" ? (
                        <div className="resourceDrawerBody"><label>Post Content Policy JSON<textarea rows={6} value={workflowTemplateJson.postContentPolicy} onChange={(event) => setWorkflowTemplateJson({ ...workflowTemplateJson, postContentPolicy: event.target.value })} /></label><button onClick={() => saveWorkflowTemplateField("postContentPolicy", "post-content-policy", "Post Content Policy")}>Save Post Content Policy</button></div>
                      ) : null}

                      {workflowDrawerTab === "legacy" ? (
                        <div className="resourceDrawerBody"><div className="adminNotice muted"><strong>Legacy Sequential Stages - Compatibility Only</strong><span>workflow_stages remains available for old APIs and runs. New templates should use Resource-Driven Rules.</span></div>{(workflowDetail?.legacyStages ?? []).map((stage) => <div className="resourceRelatedRow" key={stage.id}><strong>{stage.stageNo}. {stage.name}</strong><span>{stage.stageType}</span><small>{stage.poolType ?? "-"}</small></div>)}</div>
                      ) : null}

                      {workflowDrawerTab === "runs" ? (
                        <div className="resourceDrawerBody">{(workflowDetail?.runs ?? workflowRuns.filter((run) => run.workflowId === selectedWorkflow.id)).map((run) => <button className="resourceRelatedRow" key={run.id} onClick={() => setSelectedWorkflowRunId(run.id)}><strong>{displayShortId(run.id)}</strong><span>{run.status}</span><small>{displayDateTime(run.createdAt)}</small></button>)}<button onClick={() => launchWorkflow()}>Launch Workflow Run</button></div>
                      ) : null}

                      {workflowDrawerTab === "json" ? <div className="resourceDrawerBody"><pre className="jsonBlock">{compactJson(workflowDetail ?? selectedWorkflow)}</pre></div> : null}
                    </>
                  ) : <p className="emptyDetail">Select a workflow.</p>}
                </aside>
              </div>

              {showWorkflowWizard ? (
                <div className="instanceDrawerOverlay">
                  <aside className="workflowWizard">
                    <div className="drawerHeader"><div><strong>New Workflow</strong><small>Step {workflowWizardStep} / 8</small></div><button className="iconButton" onClick={() => setShowWorkflowWizard(false)}>x</button></div>
                    <div className="scriptDrawerBody">
                      {workflowWizardStep === 1 ? <><label>Name<input value={workflowWizard.name} onChange={(event) => setWorkflowWizard({ ...workflowWizard, name: event.target.value })} /></label><label>Description<textarea value={workflowWizard.description} onChange={(event) => setWorkflowWizard({ ...workflowWizard, description: event.target.value })} /></label><label>Status<select value={workflowWizard.status} onChange={(event) => setWorkflowWizard({ ...workflowWizard, status: event.target.value })}><option value="draft">draft</option><option value="active">active</option></select></label></> : null}
                      {workflowWizardStep === 2 ? <label>Template Type<select value={workflowWizard.templateType} onChange={(event) => updateWorkflowWizardTemplate(event.target.value)}>{workflowTemplateOptions.map((option) => <option key={option}>{option}</option>)}</select></label> : null}
                      {workflowWizardStep === 3 ? <label>Resource Rules<textarea rows={10} value={workflowWizard.resourceRules} onChange={(event) => setWorkflowWizard({ ...workflowWizard, resourceRules: event.target.value })} /></label> : null}
                      {workflowWizardStep === 4 ? <label>Prompt Mapping<textarea rows={8} value={workflowWizard.promptMapping} onChange={(event) => setWorkflowWizard({ ...workflowWizard, promptMapping: event.target.value })} /></label> : null}
                      {workflowWizardStep === 5 ? <label>Script Mapping<textarea rows={8} value={workflowWizard.scriptMapping} onChange={(event) => setWorkflowWizard({ ...workflowWizard, scriptMapping: event.target.value })} /></label> : null}
                      {workflowWizardStep === 6 ? <label>Capacity<textarea rows={8} value={workflowWizard.capacity} onChange={(event) => setWorkflowWizard({ ...workflowWizard, capacity: event.target.value })} /></label> : null}
                      {workflowWizardStep === 7 ? <><label>Music Policy<textarea rows={6} value={workflowWizard.musicPolicy} onChange={(event) => setWorkflowWizard({ ...workflowWizard, musicPolicy: event.target.value })} /></label><label>Post Content Policy<textarea rows={6} value={workflowWizard.postContentPolicy} onChange={(event) => setWorkflowWizard({ ...workflowWizard, postContentPolicy: event.target.value })} /></label></> : null}
                      {workflowWizardStep === 8 ? <pre className="jsonBlock">{compactJson(workflowWizard)}</pre> : null}
                      <div className="resourceActions"><button disabled={workflowWizardStep <= 1} onClick={() => setWorkflowWizardStep((step) => Math.max(1, step - 1))}>Back</button><button disabled={workflowWizardStep >= 8} onClick={() => setWorkflowWizardStep((step) => Math.min(8, step + 1))}>Next</button><button onClick={createWorkflowFromWizard}>Create Workflow</button></div>
                    </div>
                  </aside>
                </div>
              ) : null}
            </div>
          ) : null}

          {managementSection === "instances" ? (
            <div className="instanceOpsPage">
              <div className="resourceKpiBar">
                {[
                  ["Total", instanceManagementKpis.total],
                  ["AVAILABLE", instanceManagementKpis.available],
                  ["STANDBY", instanceManagementKpis.standby],
                  ["WORKFLOW", instanceManagementKpis.workflow],
                  ["MAINTENANCE", instanceManagementKpis.maintenance],
                  ["DISABLED", instanceManagementKpis.disabled],
                  ["RETIRED", instanceManagementKpis.retired],
                  ["Missing adbId", instanceManagementKpis.missingAdb],
                  ["IMAGE_EDIT", instanceManagementKpis.imageEdit],
                  ["VIDEO_GENERATE", instanceManagementKpis.videoGenerate],
                  ["MUSIC_GENERATE", instanceManagementKpis.musicGenerate],
                  ["VIDEO_COMPOSE", instanceManagementKpis.videoCompose],
                  ["POST_CONTENT", instanceManagementKpis.postContent]
                ].map(([label, value]) => (
                  <div className="resourceKpiCard compactKpi" key={String(label)}>
                    <Boxes size={16} />
                    <span>{String(label)}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
              </div>

              <div className="resourceFiltersPanel">
                <label>Search<input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="instanceId, name, host, adb..." /></label>
                <label>Host<select value={selectedHostId} onChange={(event) => setSelectedHostId(event.target.value)}><option value="">All hosts</option>{hosts.map((host) => <option key={host.id} value={host.hostId}>{host.name}</option>)}</select></label>
                <label>Current Pool<select value={instancePoolStateFilter} onChange={(event) => setInstancePoolStateFilter(event.target.value)}><option value="">All states</option>{instancePoolStateOptions.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
                <label>Runtime<select value={instanceRuntimeFilter} onChange={(event) => setInstanceRuntimeFilter(event.target.value)}><option value="">All runtime states</option>{instanceRuntimeOptions.map((runtimeStatus) => <option key={runtimeStatus} value={runtimeStatus}>{runtimeStatus}</option>)}</select></label>
                <label>Status<select value={instanceStatusFilter} onChange={(event) => setInstanceStatusFilter(event.target.value)}><option value="">All statuses</option>{instanceStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                <label>Capability<select value={instanceCapabilityFilter} onChange={(event) => setInstanceCapabilityFilter(event.target.value)}><option value="">All capabilities</option>{instanceCapabilityOptions.map((capability) => <option key={capability} value={capability}>{capability}</option>)}</select></label>
                <label>ADB Mapping<select value={instanceAdbFilter} onChange={(event) => setInstanceAdbFilter(event.target.value)}><option value="">All</option><option value="has">Has adbId</option><option value="missing">Missing adbId</option></select></label>
                <label>ADB Confidence<select value={instanceAdbConfidenceFilter} onChange={(event) => setInstanceAdbConfidenceFilter(event.target.value)}><option value="">All</option>{instanceAdbConfidenceOptions.map((confidence) => <option key={confidence} value={confidence}>{confidence}</option>)}<option value="manual">Manual mapping</option></select></label>
                <label>Last seen after<input type="date" value={instanceLastSeenFilter} onChange={(event) => setInstanceLastSeenFilter(event.target.value)} /></label>
                <div className="resourceFilterChecks">
                  <label><input type="checkbox" checked={instanceMaintenanceFilter} onChange={(event) => setInstanceMaintenanceFilter(event.target.checked)} /> Maintenance reason</label>
                </div>
              </div>

              <div className="jobsOpsToolbar">
                <div className="segmentedControl">
                  <button className={instanceViewMode === "board" ? "active" : ""} onClick={() => setInstanceViewMode("board")}>Board</button>
                  <button className={instanceViewMode === "table" ? "active" : ""} onClick={() => setInstanceViewMode("table")}>Table</button>
                </div>
                <button onClick={() => refreshQueue()}><RefreshCcw size={15} /> Refresh</button>
              </div>

              <div className="bulkJobBar">
                <strong>{selectedCapacityInstanceIds.length} selected</strong>
                <label>Capability<select value={instanceBulkCapability} onChange={(event) => setInstanceBulkCapability(event.target.value)}>{capacityStageOptions.map((stageType) => <option key={stageType}>{stageType}</option>)}</select></label>
                <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkMoveOperationalInstances("move-available")}>Move Available</button>
                <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkMoveOperationalInstances("move-standby")}>Move Standby</button>
                <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkMoveOperationalInstances("move-maintenance")}>Move Maintenance</button>
                <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkMoveOperationalInstances("disable")}>Disable</button>
                <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkMoveOperationalInstances("retire")}>Retire</button>
                <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkApplyOperationalCapability("add")}>Set capability</button>
                <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkApplyOperationalCapability("remove")}>Remove capability</button>
              </div>

              {instanceViewMode === "board" ? (
                <div className="instanceOpsBoard">
                  {operationalInstanceColumns.map((column) => (
                    <section className="managementJobColumn" key={column.poolType}>
                      <header><strong>{column.poolType}</strong><span>{column.items.length}</span></header>
                      <div className="managementJobCards">
                        {column.items.map((instance) => (
                          <article className={`instanceOpsCard ${instanceDrawerId === instance.id ? "selected" : ""}`} key={instance.id} onClick={() => openInstanceOperations(instance)}>
                            <header>
                              <input type="checkbox" checked={selectedCapacityInstanceIds.includes(instance.id)} onChange={(event) => { event.stopPropagation(); toggleCapacitySelectedInstance(instance.id); }} onClick={(event) => event.stopPropagation()} />
                              <strong title={instance.id}>{instance.id}</strong>
                              <span className="statusPill">{instance.status}</span>
                            </header>
                            {renderInstanceScreenshotPreview(instance)}
                            <div className="resourceMetaGrid">
                              <span>Host</span><strong>{instance.hostId}</strong>
                              <span>Local</span><strong>{instance.localId ?? "-"}</strong>
                              <span>ADB</span><strong>{instance.adbId ?? "Unknown"}</strong>
                              <span>Mapping</span><strong>{adbMappingConfidence(instance) || "unknown"}</strong>
                              <span>Runtime</span><strong>{instance.runtimeStatus || "-"}</strong>
                              <span>Workflow</span><strong>{displayShortId(instance.currentWorkflowRunId)}</strong>
                              <span>Last Seen</span><strong>{displayDateTime(instance.lastSeenAt ?? undefined)}</strong>
                            </div>
                            <div className="resourceBadgeRow">{renderCapabilityBadges(instance)}</div>
                            <div className="resourceBadgeRow">
                              <span className={`poolBadge ${hasUnknownAdbMapping(instance) ? "warningBadge" : "capabilityBadge"}`}>{adbMappingConfidence(instance) || "unknown"}</span>
                              <span className="poolBadge">{adbMappingSource(instance) || "none"}</span>
                            </div>
                            {hasUnknownAdbMapping(instance) ? <span className="poolBadge warningBadge">ADB mapping unknown. Runtime commands require adbId.</span> : null}
                            {instance.currentPoolType === "STANDBY" && !(normalizeInstanceCapabilities(instance.capabilities).canRun ?? []).length ? <span className="poolBadge warningBadge">STANDBY without capabilities</span> : null}
                            {instance.maintenanceReason ? <small className="jobErrorBadge">{instance.maintenanceReason}</small> : null}
                            <div className="resourceActions">
                              <button title="Open" onClick={(event) => { event.stopPropagation(); openInstanceOperations(instance); }}><Eye size={15} /></button>
                              <button title="Test Screenshot" disabled={!instance.adbId} onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "screenshot"); }}><Image size={15} /></button>
                              <button title="Send Text" disabled={!instance.adbId} onClick={(event) => { event.stopPropagation(); const host = hostForInstance(instance); if (host) runHostDrawerAction(host, "send-text", instance); }}><Edit3 size={15} /></button>
                              <button title="Map ADB" onClick={(event) => { event.stopPropagation(); openAdbMapping(instance); }}><Boxes size={15} /></button>
                              <button title="Move Available" onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-available"); }}>A</button>
                              <button title="Move Standby" onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-standby"); }}>S</button>
                              <button title="Move Maintenance" onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-maintenance"); }}>M</button>
                              <button title="Disable" onClick={(event) => { event.stopPropagation(); moveInstance(instance, "disable"); }}><Archive size={15} /></button>
                              <button title="Retire" onClick={(event) => { event.stopPropagation(); moveInstance(instance, "retire"); }}><Trash2 size={15} /></button>
                            </div>
                          </article>
                        ))}
                        {!column.items.length ? <p className="emptyDetail">No instances.</p> : null}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="instanceOpsTable">
                  <div className="instanceOpsTableHeader"><span></span><span>Instance</span><span>Host</span><span>ADB</span><span>Status</span><span>Pool</span><span>Capabilities</span><span>Last Seen</span><span>Actions</span></div>
                  {filteredOperationalInstances.map((instance) => (
                    <div className="instanceOpsTableRow" key={instance.id} onClick={() => openInstanceOperations(instance)}>
                      <input type="checkbox" checked={selectedCapacityInstanceIds.includes(instance.id)} onChange={(event) => { event.stopPropagation(); toggleCapacitySelectedInstance(instance.id); }} onClick={(event) => event.stopPropagation()} />
                      <strong>{instance.id}</strong>
                      <span>{instance.hostId}</span>
                      <span>{instance.adbId ?? "Unknown"}</span>
                      <span>{instance.status} / {instance.runtimeStatus || "-"}</span>
                      <span><span className="statusPill">{instance.currentPoolType ?? "AVAILABLE"}</span><span className="poolBadge">{adbMappingConfidence(instance) || "unknown"}</span></span>
                      <span className="poolBadgeList">{renderCapabilityBadges(instance)}</span>
                      <span>{displayDateTime(instance.lastSeenAt ?? undefined)}</span>
                      <div className="resourceActions"><button onClick={(event) => { event.stopPropagation(); openInstanceOperations(instance); }}><Eye size={15} /></button><button disabled={!instance.adbId} onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "screenshot"); }}><Image size={15} /></button><button title="Map ADB" onClick={(event) => { event.stopPropagation(); openAdbMapping(instance); }}><Boxes size={15} /></button>{renderInstanceMovementActions(instance)}</div>
                    </div>
                  ))}
                  {!filteredOperationalInstances.length ? <div className="jobsEmpty">No instances match the current filters.</div> : null}
                </div>
              )}

              {selectedInstanceDrawer ? (
                <aside className="instanceOpsDrawer">
                  <div className="drawerHeader">
                    <div>
                      <strong>{selectedInstanceDrawer.id}</strong>
                      <small>{selectedInstanceDrawer.hostId} / {selectedInstanceDrawer.adbId ?? "ADB unknown"}</small>
                    </div>
                    <button className="iconButton" onClick={() => setInstanceDrawerId("")} title="Close instance drawer">x</button>
                  </div>
                  <div className="resourceDrawerTabs">
                    {([
                      ["overview", "Overview"],
                      ["capabilities", "Capabilities"],
                      ["runtime", "Runtime/Allocation"],
                      ["health", "Health/Test"],
                      ["history", "History"],
                      ["json", "Debug JSON"]
                    ] as Array<[typeof instanceDrawerTab, string]>).map(([tab, label]) => (
                      <button key={tab} className={instanceDrawerTab === tab ? "active" : ""} onClick={() => setInstanceDrawerTab(tab)}>{label}</button>
                    ))}
                  </div>

                  {instanceDrawerTab === "overview" ? (
                    <div className="resourceDrawerBody">
                      <div className="resourceMetaGrid detail">
                        <span>Name</span><strong>{selectedInstanceDrawer.name ?? "-"}</strong>
                        <span>Pool</span><strong>{selectedInstanceDrawer.currentPoolType ?? "AVAILABLE"}</strong>
                        <span>Status</span><strong>{selectedInstanceDrawer.status}</strong>
                        <span>Runtime</span><strong>{selectedInstanceDrawer.runtimeStatus || "-"}</strong>
                        <span>Host</span><strong>{selectedInstanceDrawer.hostId}</strong>
                        <span>Local ID</span><strong>{selectedInstanceDrawer.localId}</strong>
                        <span>ADB ID</span><strong>{selectedInstanceDrawer.adbId ?? "Unknown"}</strong>
                        <span>ADB confidence</span><strong>{adbMappingConfidence(selectedInstanceDrawer) || "unknown"}</strong>
                        <span>Mapping source</span><strong>{adbMappingSource(selectedInstanceDrawer) || "none"}</strong>
                        <span>Manual ADB</span><strong>{selectedInstanceDrawer.manualAdbId ?? "-"}</strong>
                        <span>Workflow Run</span><strong>{displayShortId(selectedInstanceDrawer.currentWorkflowRunId)}</strong>
                        <span>Last Seen</span><strong>{displayDateTime(selectedInstanceDrawer.lastSeenAt ?? undefined)}</strong>
                      </div>
                      {hasUnknownAdbMapping(selectedInstanceDrawer) ? <span className="poolBadge warningBadge">ADB mapping unknown. Runtime commands require adbId.</span> : null}
                      {selectedInstanceDrawer.maintenanceReason ? <span className="jobErrorBadge">{selectedInstanceDrawer.maintenanceReason}</span> : null}
                      <div className="resourceBadgeRow">{renderCapabilityBadges(selectedInstanceDrawer)}</div>
                    </div>
                  ) : null}

                  {instanceDrawerTab === "capabilities" ? (
                    <div className="resourceDrawerBody">
                      <div className="capacityCheckboxGrid">
                        {capacityStageOptions.map((stageType) => (
                          <label key={stageType}><input type="checkbox" checked={(capacityCapabilityDraft.canRun ?? []).includes(stageType)} onChange={(event) => updateCapacityCanRun(stageType, event.target.checked)} /> {stageType}</label>
                        ))}
                      </div>
                      <label>Apps<input value={(capacityCapabilityDraft.apps ?? []).join(", ")} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, apps: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="chatgpt, pixverse" /></label>
                      <label>Browser Profile<input value={String(capacityCapabilityDraft.browserProfile ?? "")} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, browserProfile: event.target.value })} /></label>
                      <div className="resourceFilterChecks">
                        <label><input type="checkbox" checked={Boolean(capacityCapabilityDraft.supportsUpload)} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, supportsUpload: event.target.checked })} /> Supports Upload</label>
                        <label><input type="checkbox" checked={Boolean(capacityCapabilityDraft.supportsDownload)} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, supportsDownload: event.target.checked })} /> Supports Download</label>
                      </div>
                      <label>Notes<textarea rows={4} value={String(capacityCapabilityDraft.notes ?? "")} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, notes: event.target.value })} /></label>
                      <div className="resourceActions">
                        <button onClick={saveInstanceDrawerCapabilities}>Save Capabilities</button>
                        <label>Copy From<select value={instanceCopySourceId} onChange={(event) => setInstanceCopySourceId(event.target.value)}><option value="">Select instance</option>{instances.filter((instance) => instance.id !== selectedInstanceDrawer.id).map((instance) => <option key={instance.id} value={instance.id}>{instance.id}</option>)}</select></label>
                        <button disabled={!instanceCopySourceId} onClick={copyInstanceDrawerCapabilities}>Copy</button>
                        <button onClick={() => setInstanceCapabilities(selectedInstanceDrawer)}>JSON</button>
                      </div>
                    </div>
                  ) : null}

                  {instanceDrawerTab === "runtime" ? (
                    <div className="resourceDrawerBody">
                      <div className="resourceMetaGrid detail">
                        <span>Active allocation</span><strong>{displayShortId(selectedInstanceDrawerAllocation?.id)}</strong>
                        <span>Allocation mode</span><strong>{selectedInstanceDrawerAllocation?.allocationMode ?? getString(selectedInstanceDrawerAllocation?.metadata?.allocationMode) ?? "-"}</strong>
                        <span>Allocation status</span><strong>{selectedInstanceDrawerAllocation?.status ?? "-"}</strong>
                        <span>Runtime session</span><strong>{displayShortId(selectedInstanceDrawerRuntime?.id)}</strong>
                        <span>Current step</span><strong>{selectedInstanceDrawerRuntime?.currentStepNo ?? "-"}</strong>
                      </div>
                      <div className="relationshipList">{selectedInstanceDrawerJobs.slice(0, 8).map((job) => <span key={job.id}>{job.targetStageType} / {job.status} / {displayShortId(job.id)}</span>)}</div>
                    </div>
                  ) : null}

                  {instanceDrawerTab === "health" ? (
                    <div className="resourceDrawerBody">
                      {!selectedInstanceDrawer.adbId ? <span className="poolBadge warningBadge">ADB mapping unknown. Runtime commands require adbId.</span> : null}
                      <label>Text<input value={hostSendText} onChange={(event) => setHostSendText(event.target.value)} /></label>
                      <div className="resourceActions">
                        <button disabled={!selectedInstanceDrawer.adbId} onClick={() => instanceHostAction(selectedInstanceDrawer, "screenshot")}>Screenshot</button>
                        <button disabled={!selectedInstanceDrawer.adbId} onClick={() => { const host = hostForInstance(selectedInstanceDrawer); if (host) runHostDrawerAction(host, "send-text", selectedInstanceDrawer); }}>Send Text</button>
                        <button disabled={!selectedInstanceDrawer.adbId} onClick={() => { const host = hostForInstance(selectedInstanceDrawer); if (host) runHostDrawerAction(host, "download-latest", selectedInstanceDrawer); }}>Download Latest</button>
                        <button onClick={() => instanceHostAction(selectedInstanceDrawer, "restart")}>Reconnect/Restart</button>
                      </div>
                      <pre className="jsonBlock">{compactJson(hostResult)}</pre>
                    </div>
                  ) : null}

                  {instanceDrawerTab === "history" ? (
                    <div className="resourceDrawerBody">
                      <h4>Recent Jobs</h4>
                      <div className="relationshipList">{selectedInstanceDrawerJobs.slice(0, 12).map((job) => <span key={job.id}>{job.targetStageType} / {job.status} / {displayShortId(job.id)}</span>)}</div>
                      <h4>Allocations</h4>
                      <div className="relationshipList">{selectedInstanceDrawerAllocations.map((allocation) => <span key={allocation.id}>{allocation.status} / {allocation.allocationMode ?? getString(allocation.metadata?.allocationMode) ?? "-"} / {displayShortId(allocation.id)}</span>)}</div>
                      <h4>Runtime</h4>
                      <div className="relationshipList">{runtimeSessions.filter((session) => session.instanceId === selectedInstanceDrawer.id).slice(0, 10).map((session) => <span key={session.id}>{session.status} / step {session.currentStepNo ?? 0} / {displayShortId(session.id)}</span>)}</div>
                    </div>
                  ) : null}

                  {instanceDrawerTab === "json" ? <pre className="jsonBlock">{compactJson({ instance: selectedInstanceDrawer, allocation: selectedInstanceDrawerAllocation, jobs: selectedInstanceDrawerJobs, runtime: selectedInstanceDrawerRuntime })}</pre> : null}
                </aside>
              ) : null}

              {adbMappingInstance && managementSection === "instances" ? (
                <aside className="adbMappingPanel">
                  <div className="drawerHeader">
                    <div>
                      <strong>Map ADB</strong>
                      <small>{adbMappingInstance.id} / local {adbMappingInstance.localId}</small>
                    </div>
                    <button className="iconButton" onClick={() => setAdbMappingInstanceId("")}>x</button>
                  </div>
                  <div className="resourceMetaGrid detail">
                    <span>Name</span><strong>{adbMappingInstance.name ?? "-"}</strong>
                    <span>LD status</span><strong>{getString(getRecord(adbMappingInstance.metadata?.raw).ldStatus) || "-"}</strong>
                    <span>Current ADB</span><strong>{adbMappingInstance.adbId ?? "Unknown"}</strong>
                    <span>Confidence</span><strong>{adbMappingConfidence(adbMappingInstance) || "unknown"}</strong>
                    <span>Source</span><strong>{adbMappingSource(adbMappingInstance) || "none"}</strong>
                  </div>
                  <div className="adbDevicePicker">
                    {adbDevices.map((device) => {
                      const mapped = instances.find((instance) => instance.hostId === adbMappingInstance.hostId && instance.adbId === device.adbId);
                      return (
                        <button key={device.adbId} className={selectedManualAdbId === device.adbId ? "selected" : ""} onClick={() => setSelectedManualAdbId(device.adbId)}>
                          <strong>{device.adbId}</strong>
                          <span>{device.state}</span>
                          <small>{mapped ? `mapped: ${mapped.id}` : "unmapped"}</small>
                        </button>
                      );
                    })}
                    {!adbDevices.length ? <p className="emptyDetail">Click Validate/Refresh to load ADB devices from this host.</p> : null}
                  </div>
                  <div className="resourceActions">
                    <button onClick={() => { const host = hostForInstance(adbMappingInstance); if (host) runHostDrawerAction(host, "devices"); }}>Validate/Refresh</button>
                    <button disabled={!selectedManualAdbId} onClick={assignManualAdbMapping}>Assign selected adbId</button>
                    <button onClick={() => clearManualAdbMapping(adbMappingInstance)}>Clear mapping</button>
                  </div>
                </aside>
              ) : null}
            </div>
          ) : null}

          {managementSection === "instance-pools" ? (
            <div className="capacityPoolsPage">
              <div className="sectionIntro">
                <div>
                  <h3>Capacity Pools</h3>
                  <p>Manage instance availability, capabilities, and production capacity.</p>
                </div>
                <span className="statusPill">Dynamic Standby + Capability Matching</span>
              </div>

              <div className="resourceKpiBar">
                {[
                  ["Total", capacityPoolKpis.total],
                  ["AVAILABLE", capacityPoolKpis.available],
                  ["STANDBY", capacityPoolKpis.standby],
                  ["WORKFLOW", capacityPoolKpis.workflow],
                  ["MAINTENANCE", capacityPoolKpis.maintenance],
                  ["DISABLED", capacityPoolKpis.disabled],
                  ["RETIRED", capacityPoolKpis.retired]
                ].map(([label, value]) => (
                  <div className="resourceKpiCard" key={label}>
                    <Boxes size={17} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="resourceTabs">
                {([
                  ["operational", "Operational Pools"],
                  ["capabilities", "Capabilities"],
                  ["workflow", "Workflow Capacity"],
                  ["legacy", "Legacy Pools"]
                ] as Array<[CapacityPoolsTab, string]>).map(([tab, label]) => (
                  <button key={tab} className={capacityPoolsTab === tab ? "active" : ""} onClick={() => setCapacityPoolsTab(tab)}>{label}</button>
                ))}
              </div>

              <div className="capacityHints">
                {capacityPoolHints.map((hint) => <span key={hint}>{hint}</span>)}
              </div>

              <div className="resourceFiltersPanel">
                <label>Search<input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="instanceId, hostId, adbId..." /></label>
                <label>Host<select value={selectedHostId} onChange={(event) => setSelectedHostId(event.target.value)}><option value="">All hosts</option>{hosts.map((host) => <option key={host.id} value={host.hostId}>{host.name}</option>)}</select></label>
                <label>Current Pool State<select value={instancePoolStateFilter} onChange={(event) => setInstancePoolStateFilter(event.target.value)}><option value="">All states</option>{instancePoolStateOptions.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
                <label>Capability<select value={instanceCapabilityFilter} onChange={(event) => setInstanceCapabilityFilter(event.target.value)}><option value="">All capabilities</option>{instanceCapabilityOptions.map((capability) => <option key={capability} value={capability}>{capability}</option>)}</select></label>
                <label>Runtime<select value={instanceRuntimeFilter} onChange={(event) => setInstanceRuntimeFilter(event.target.value)}><option value="">All runtime states</option>{instanceRuntimeOptions.map((runtimeStatus) => <option key={runtimeStatus} value={runtimeStatus}>{runtimeStatus}</option>)}</select></label>
              </div>

              {capacityPoolsTab === "operational" ? (
                <div className="capacityBoard">
                  {capacityInstanceColumns.map((column) => (
                    <section className="managementJobColumn" key={column.poolType}>
                      <header><strong>{column.poolType}</strong><span>{column.items.length}</span></header>
                      <div className="managementJobCards">
                        {column.items.map((instance) => (
                          <article className={`capacityInstanceCard ${capacityDrawerInstanceId === instance.id ? "selected" : ""}`} key={instance.id} onClick={() => selectCapacityInstance(instance)}>
                            <header>
                              <strong>{instance.id}</strong>
                              <span className="statusPill">{instance.status}</span>
                            </header>
                            {renderInstanceScreenshotPreview(instance)}
                            <div className="resourceMetaGrid">
                              <span>Host</span><strong>{instance.hostId}</strong>
                              <span>Local</span><strong>{instance.localId ?? "-"}</strong>
                              <span>ADB</span><strong>{instance.adbId ?? "Unknown"}</strong>
                              <span>Runtime</span><strong>{instance.runtimeStatus || "-"}</strong>
                              <span>Last Seen</span><strong>{displayDateTime(instance.lastSeenAt ?? undefined)}</strong>
                            </div>
                            {hasUnknownAdbMapping(instance) ? <span className="poolBadge warningBadge">ADB mapping unknown</span> : null}
                            <div className="resourceBadgeRow">{renderCapabilityBadges(instance)}</div>
                            {instance.currentWorkflowRunId ? <small>Workflow run: {displayShortId(instance.currentWorkflowRunId)}</small> : null}
                            {instance.maintenanceReason ? <small className="jobErrorBadge">{instance.maintenanceReason}</small> : null}
                            <div className="jobCardActions">
                              <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-available"); }}>Available</button>
                              <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-standby"); }}>Standby</button>
                              <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "move-maintenance"); }}>Maintenance</button>
                              <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "disable"); }}>Disable</button>
                              <button onClick={(event) => { event.stopPropagation(); moveInstance(instance, "retire"); }}>Retire</button>
                              <button disabled={!instance.adbId} onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "screenshot"); }}>Screenshot</button>
                              <button onClick={(event) => { event.stopPropagation(); selectCapacityInstance(instance); }}>Detail</button>
                            </div>
                          </article>
                        ))}
                        {!column.items.length ? <p className="emptyDetail">No instances.</p> : null}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}

              {capacityPoolsTab === "capabilities" ? (
                <div className="capacityCapabilityLayout">
                  <section className="capacityInstanceList">
                    <div className="bulkJobBar">
                      <strong>{selectedCapacityInstanceIds.length} selected</strong>
                      <label>Capability<select value={capacityBulkCapability} onChange={(event) => setCapacityBulkCapability(event.target.value)}>{capacityStageOptions.map((stageType) => <option key={stageType}>{stageType}</option>)}</select></label>
                      <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkApplyCapacityCapability("add")}>Set capability</button>
                      <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkApplyCapacityCapability("remove")}>Remove capability</button>
                      <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkMoveCapacityInstances("move-standby")}>Move selected to Standby</button>
                      <button disabled={!selectedCapacityInstanceIds.length} onClick={() => bulkMoveCapacityInstances("move-maintenance")}>Move selected to Maintenance</button>
                    </div>
                    {filteredInstances.map((instance) => (
                      <div className={`capacityListRow ${selectedCapacityInstance?.id === instance.id ? "active" : ""}`} key={instance.id} role="button" tabIndex={0} onClick={() => selectCapacityInstance(instance, "capabilities")} onKeyDown={(event) => { if (event.key === "Enter") selectCapacityInstance(instance, "capabilities"); }}>
                        <input type="checkbox" checked={selectedCapacityInstanceIds.includes(instance.id)} onChange={(event) => { event.stopPropagation(); toggleCapacitySelectedInstance(instance.id); }} onClick={(event) => event.stopPropagation()} />
                        <span>{instance.id}</span>
                        <small>{instance.hostId} / {instance.adbId ?? "no adb"}</small>
                        <span className="statusPill">{instance.currentPoolType ?? "AVAILABLE"}</span>
                        <span className="poolBadgeList">{renderCapabilityBadges(instance)}</span>
                      </div>
                    ))}
                  </section>
                  <aside className="capacityEditor">
                    {selectedCapacityInstance ? (
                      <>
                        <div className="drawerHeader">
                          <div>
                            <strong>{selectedCapacityInstance.id}</strong>
                            <small>{selectedCapacityInstance.hostId} / {selectedCapacityInstance.adbId ?? "ADB unknown"}</small>
                          </div>
                          <button onClick={() => setInstanceCapabilities(selectedCapacityInstance)}>JSON</button>
                        </div>
                        <div className="capacityCheckboxGrid">
                          {capacityStageOptions.map((stageType) => (
                            <label key={stageType}><input type="checkbox" checked={(capacityCapabilityDraft.canRun ?? []).includes(stageType)} onChange={(event) => updateCapacityCanRun(stageType, event.target.checked)} /> {stageType}</label>
                          ))}
                        </div>
                        <label>Apps<input value={(capacityCapabilityDraft.apps ?? []).join(", ")} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, apps: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="chatgpt, pixverse" /></label>
                        <label>Browser Profile<input value={String(capacityCapabilityDraft.browserProfile ?? "")} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, browserProfile: event.target.value })} /></label>
                        <div className="resourceFilterChecks">
                          <label><input type="checkbox" checked={Boolean(capacityCapabilityDraft.supportsUpload)} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, supportsUpload: event.target.checked })} /> Supports Upload</label>
                          <label><input type="checkbox" checked={Boolean(capacityCapabilityDraft.supportsDownload)} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, supportsDownload: event.target.checked })} /> Supports Download</label>
                        </div>
                        <label>Notes<textarea rows={4} value={String(capacityCapabilityDraft.notes ?? "")} onChange={(event) => setCapacityCapabilityDraft({ ...capacityCapabilityDraft, notes: event.target.value })} /></label>
                        <div className="resourceActions">
                          <button onClick={() => saveCapacityCapabilities()}>Save Capabilities</button>
                          <label>Copy From<select value={capacityCopySourceInstanceId} onChange={(event) => setCapacityCopySourceInstanceId(event.target.value)}><option value="">Select instance</option>{instances.filter((instance) => instance.id !== selectedCapacityInstance.id).map((instance) => <option key={instance.id} value={instance.id}>{instance.id}</option>)}</select></label>
                          <button disabled={!capacityCopySourceInstanceId} onClick={copyCapacityCapabilities}>Copy Capabilities</button>
                        </div>
                      </>
                    ) : <p className="emptyDetail">Select an instance to edit capabilities.</p>}
                  </aside>
                </div>
              ) : null}

              {capacityPoolsTab === "workflow" ? (
                <div className="capacityWorkflowGrid">
                  {capacityWorkflowRows.map(({ workflow, stages }) => (
                    <article className="workflowCard" key={workflow.id}>
                      <div className="scriptCardHeader">
                        <strong>{workflow.name}</strong>
                        <span className="resourceTypeBadge">{workflow.status}</span>
                      </div>
                      <small>{workflowCapacitySummary(workflow.capacityConfig)}</small>
                      <div className="capacityStageRows">
                        {stages.map((stage) => (
                          <div className={`capacityStageRow ${stage.shortage ? "warning" : ""}`} key={stage.stageType}>
                            <strong>{stage.stageType}</strong>
                            <span>Required {stage.required}</span>
                            <span>Standby capable {stage.standbyCapable}</span>
                            <span>Allocated {stage.allocated}</span>
                            {stage.shortage ? <b>Shortage {stage.shortage}</b> : <b>OK</b>}
                          </div>
                        ))}
                      </div>
                      <div className="resourceActions">
                        <button onClick={() => { setSelectedWorkflowId(workflow.id); setManagementSection("workflows"); }}>Open Workflow</button>
                        <button onClick={() => { setJobsWorkflowFilter(workflow.id); setManagementSection("jobs"); }}>Open Jobs</button>
                        <button onClick={() => setStatus("Allocate Capacity is available from Workflow detail when a workflow run is selected.")}>Allocate Capacity</button>
                        <button onClick={() => setStatus("Release Capacity remains managed by allocation/job completion APIs.")}>Release Capacity</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {capacityPoolsTab === "legacy" ? (
                <div className="adminGrid">
                  <div className="adminForm">
                    <div className="adminNotice muted"><strong>Legacy Static Instance Pools - Compatibility Only</strong><span>New scheduling prefers Dynamic Standby + Capability matching.</span></div>
                    <label>Name<input value={poolForm.name} onChange={(event) => setPoolForm({ ...poolForm, name: event.target.value })} /></label>
                    <label>Pool Type<select value={poolForm.poolType} onChange={(event) => setPoolForm({ ...poolForm, poolType: event.target.value })}>{Object.keys(stageTypeToPoolType).map((type) => <option key={type}>{type}</option>)}</select></label>
                    <label>Status<input value={poolForm.status} onChange={(event) => setPoolForm({ ...poolForm, status: event.target.value })} /></label>
                    <button onClick={() => adminAction("Creating pool", () => api("/instance-pools", { method: "POST", body: JSON.stringify(poolForm) }))}>Create Legacy Pool</button>
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

              {selectedCapacityInstance && capacityPoolsTab !== "capabilities" ? (
                <aside className="capacityDrawer">
                  <div className="drawerHeader">
                    <div>
                      <strong>{selectedCapacityInstance.id}</strong>
                      <small>{selectedCapacityInstance.currentPoolType ?? "AVAILABLE"} / {selectedCapacityInstance.runtimeStatus || "-"}</small>
                    </div>
                    <button className="iconButton" onClick={() => setCapacityDrawerInstanceId("")}>x</button>
                  </div>
                  <div className="resourceDrawerTabs">
                    {([
                      ["overview", "Overview"],
                      ["capabilities", "Capabilities"],
                      ["allocation", "Current Allocation"],
                      ["history", "History"],
                      ["host", "Host Test"],
                      ["json", "Debug JSON"]
                    ] as Array<[CapacityDrawerTab, string]>).map(([tab, label]) => (
                      <button key={tab} className={capacityDrawerTab === tab ? "active" : ""} onClick={() => setCapacityDrawerTab(tab)}>{label}</button>
                    ))}
                  </div>
                  <div className="resourceDrawerBody">
                    {capacityDrawerTab === "overview" ? <div className="resourceMetaGrid detail"><span>Host</span><strong>{selectedCapacityInstance.hostId}</strong><span>Local ID</span><strong>{selectedCapacityInstance.localId ?? "-"}</strong><span>ADB ID</span><strong>{selectedCapacityInstance.adbId ?? "Unknown"}</strong><span>Status</span><strong>{selectedCapacityInstance.status}</strong><span>Last Seen</span><strong>{displayDateTime(selectedCapacityInstance.lastSeenAt ?? undefined)}</strong><span>Workflow Run</span><strong>{selectedCapacityInstance.currentWorkflowRunId ?? "-"}</strong></div> : null}
                    {capacityDrawerTab === "capabilities" ? <><div className="resourceBadgeRow">{renderCapabilityBadges(selectedCapacityInstance)}</div><pre className="jsonBlock">{compactJson(selectedCapacityInstance.capabilities)}</pre><button onClick={() => { setCapacityPoolsTab("capabilities"); selectCapacityInstance(selectedCapacityInstance, "capabilities"); }}>Edit in Capabilities tab</button></> : null}
                    {capacityDrawerTab === "allocation" ? <pre className="jsonBlock">{compactJson(selectedCapacityAllocation ?? { message: "No active allocation" })}</pre> : null}
                    {capacityDrawerTab === "history" ? <div>{allocations.filter((allocation) => allocation.instanceId === selectedCapacityInstance.id).slice(0, 10).map((allocation) => <div className="resourceRelatedRow" key={allocation.id}><strong>{allocation.status}</strong><span>{allocation.allocationMode ?? getString(allocationMetadata(allocation).allocationMode) ?? "-"}</span><small>{displayDateTime(allocation.createdAt ?? undefined)}</small></div>)}</div> : null}
                    {capacityDrawerTab === "host" ? <div className="resourceActions"><button disabled={!selectedCapacityInstance.adbId} onClick={() => instanceHostAction(selectedCapacityInstance, "screenshot")}>Test Screenshot</button><button onClick={() => instanceHostAction(selectedCapacityInstance, "start")}>Start</button><button onClick={() => instanceHostAction(selectedCapacityInstance, "stop")}>Stop</button><button onClick={() => instanceHostAction(selectedCapacityInstance, "restart")}>Restart</button></div> : null}
                    {capacityDrawerTab === "json" ? <pre className="jsonBlock">{compactJson(selectedCapacityInstance)}</pre> : null}
                  </div>
                </aside>
              ) : null}
            </div>
          ) : null}

          {managementSection === "scripts" ? (
            <div className="scriptManager">
              <aside className="scriptCategorySidebar">
                <button className="primaryButton" onClick={() => adminAction("Creating script", () => api<ScriptRecord>("/scripts", { method: "POST", body: JSON.stringify({ name: scriptForm.name || `New ${scriptForm.category} Script`, category: scriptForm.category, description: scriptForm.description, status: "draft" }) }).then((script) => { setSelectedScriptId(script.id); openScript(script, "steps"); return script; }))}>New Script</button>
                <button className={!scriptCategoryFilter ? "active" : ""} onClick={() => setScriptCategoryFilter("")}>
                  <span>All Categories</span>
                  <b>{scripts.length}</b>
                </button>
                {scriptCategoryOptions.map((category) => (
                  <button key={category} className={scriptCategoryFilter === category ? "active" : ""} onClick={() => setScriptCategoryFilter(category)}>
                    <span>{category}</span>
                    <b>{scriptCategoryCounts[category] ?? 0}</b>
                  </button>
                ))}
              </aside>

              <section className="scriptMainPanel">
                <div className="resourceKpiBar">
                  {[
                    { label: "Total Scripts", value: scriptKpis.total, Icon: ClipboardList },
                    { label: "Active Scripts", value: scriptKpis.active, Icon: Check },
                    { label: "Draft Scripts", value: scriptKpis.draft, Icon: Edit3 },
                    { label: "Failed Test Runs", value: scriptKpis.failedRuns, Icon: Archive },
                    { label: "Recent Script Runs", value: scriptKpis.recentRuns, Icon: Play }
                  ].map(({ label, value, Icon }) => (
                    <div className="resourceKpiCard" key={label}>
                      <Icon size={17} />
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                <div className="scriptFilters">
                  <label>Search<input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search script name..." /></label>
                  <label>Category<select value={scriptCategoryFilter} onChange={(event) => setScriptCategoryFilter(event.target.value)}><option value="">All</option>{scriptCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                  <label>Status<select value={scriptStatusFilter} onChange={(event) => setScriptStatusFilter(event.target.value)}><option value="">All</option><option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option></select></label>
                  <label>Last Test<select value={scriptLastTestFilter} onChange={(event) => setScriptLastTestFilter(event.target.value)}><option value="">All</option><option value="success">Success</option><option value="failed">Failed</option><option value="not-tested">Not tested</option><option value="running">Running</option></select></label>
                  <div className="resourceFilterChecks">
                    <label><input type="checkbox" checked={scriptHasActiveFilter} onChange={(event) => setScriptHasActiveFilter(event.target.checked)} /> Has active version</label>
                    <label><input type="checkbox" checked={scriptRecentFilter} onChange={(event) => setScriptRecentFilter(event.target.checked)} /> Updated recently</label>
                  </div>
                </div>

                <div className="scriptWorkspace">
                  <div className="scriptCardGrid">
                    {filteredScripts.map((script) => {
                      const versions = scriptVersionIndex[script.id] ?? [];
                      const activeVersion = versions.find((version) => String(version.status).toLowerCase() === "active") ?? null;
                      const latestVersion = activeVersion ?? versions[0] ?? null;
                      const lastRun = scriptRuns.find((run) => run.scriptId === script.id);
                      return (
                        <article className={`scriptCard ${selectedScriptId === script.id ? "selected" : ""}`} key={script.id} onClick={() => openScript(script)}>
                          <div className="scriptCardHeader">
                            <strong>{script.name}</strong>
                            <span className="resourceTypeBadge">{script.category ?? "UTILITY"}</span>
                          </div>
                          <div className="resourceBadgeRow">
                            <span className="statusPill">{script.status}</span>
                            <span className="statusPill">v{activeVersion?.versionNo ?? latestVersion?.versionNo ?? "-"}</span>
                          </div>
                          <p>{script.description || "No description."}</p>
                          <div className="resourceMetaGrid">
                            <span>Steps</span><strong>{latestVersion?.steps?.length ?? 0}</strong>
                            <span>Last test</span><strong>{lastRun?.status ?? "Not tested"}</strong>
                            <span>Updated</span><strong>{displayDateTime(script.updatedAt ?? undefined)}</strong>
                          </div>
                          <div className="resourceActions">
                            <button onClick={(event) => { event.stopPropagation(); openScript(script); }} title="Open"><Eye size={15} /> Open</button>
                            <button onClick={(event) => { event.stopPropagation(); duplicateSelectedScript(script); }} title="Duplicate"><Copy size={15} /> Duplicate</button>
                            <button onClick={(event) => {
                              event.stopPropagation();
                              adminAction("Creating script version", async () => {
                                const source = latestVersion;
                                const version = await api<ScriptVersionRecord>(`/scripts/${script.id}/versions`, {
                                  method: "POST",
                                  body: JSON.stringify({
                                    status: "draft",
                                    steps: source?.steps?.length ? source.steps : [{ type: "wait", config: { ms: 500 } }],
                                    variables: source?.variables ?? {},
                                    retryPolicy: source?.retryPolicy ?? {},
                                    detectionPolicy: source?.detectionPolicy ?? {}
                                  })
                                });
                                setSelectedScriptId(script.id);
                                setSelectedScriptVersionId(version.id);
                                setScriptDrawerTab("steps");
                                await refreshScriptVersions(script.id);
                                return version;
                              });
                            }} title="New Version"><PackagePlus size={15} /> Version</button>
                            <button onClick={(event) => { event.stopPropagation(); openScript(script, "test"); }} title="Test Run"><Play size={15} /> Test</button>
                            <button onClick={(event) => { event.stopPropagation(); adminAction("Archiving script", () => api(`/scripts/${script.id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) })); }} title="Archive"><Archive size={15} /> Archive</button>
                          </div>
                        </article>
                      );
                    })}
                    {!filteredScripts.length ? <p className="emptyDetail">No scripts match current filters.</p> : null}
                  </div>

                  <aside className="scriptDetailDrawer">
                    {selectedScript ? (
                      <>
                        <div className="drawerHeader">
                          <div>
                            <strong>{selectedScript.name}</strong>
                            <small>{selectedScript.category ?? "UTILITY"} / {displayShortId(selectedScript.id)}</small>
                          </div>
                          <button className="iconButton" onClick={() => setSelectedScriptId("")} title="Close">x</button>
                        </div>
                        <div className="resourceDrawerTabs">
                          {[
                            ["overview", "Overview"],
                            ["versions", "Versions"],
                            ["steps", "Step Editor"],
                            ["variables", "Variables"],
                            ["test", "Test Run"],
                            ["runs", "Runs"],
                            ["json", "Debug JSON"]
                          ].map(([tab, label]) => (
                            <button key={tab} className={scriptDrawerTab === tab ? "active" : ""} onClick={() => setScriptDrawerTab(tab as typeof scriptDrawerTab)}>{label}</button>
                          ))}
                        </div>

                        {scriptDrawerTab === "overview" ? (
                          <div className="scriptDrawerBody">
                            <label>Name<input value={scriptForm.name} onChange={(event) => setScriptForm({ ...scriptForm, name: event.target.value })} /></label>
                            <label>Category<select value={scriptForm.category} onChange={(event) => setScriptForm({ ...scriptForm, category: event.target.value })}>{scriptCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                            <label>Status<select value={scriptForm.status} onChange={(event) => setScriptForm({ ...scriptForm, status: event.target.value })}><option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option></select></label>
                            <label>Description<textarea value={scriptForm.description} onChange={(event) => setScriptForm({ ...scriptForm, description: event.target.value })} /></label>
                            <div className="resourceMetaGrid detail">
                              <span>Active Version</span><strong>{selectedScriptVersion?.versionNo ? `v${selectedScriptVersion.versionNo}` : "-"}</strong>
                              <span>Created</span><strong>{displayDateTime(selectedScript.createdAt ?? undefined)}</strong>
                              <span>Updated</span><strong>{displayDateTime(selectedScript.updatedAt ?? undefined)}</strong>
                              <span>Latest Test</span><strong>{latestSelectedScriptRuns[0]?.status ?? "Not tested"}</strong>
                            </div>
                            <div className="resourceActions">
                              <button onClick={saveScriptMetadata}><Check size={15} /> Save Metadata</button>
                              <button onClick={() => duplicateSelectedScript()}><Copy size={15} /> Duplicate</button>
                              <button onClick={archiveSelectedScript}><Archive size={15} /> Archive</button>
                              <button className="dangerButton" onClick={deleteSelectedScript}><Trash2 size={15} /> Delete Script</button>
                            </div>
                          </div>
                        ) : null}

                        {scriptDrawerTab === "versions" ? (
                          <div className="scriptDrawerBody">
                            <div className="resourceActions">
                              <button onClick={createScriptVersion}><PackagePlus size={15} /> New Version</button>
                              <button disabled={!selectedScriptVersion} onClick={() => duplicateSelectedScriptVersion()}><Copy size={15} /> Duplicate Version</button>
                            </div>
                            {scriptVersions.map((version) => (
                              <button className={`scriptVersionRow ${selectedScriptVersionId === version.id ? "selected" : ""}`} key={version.id} onClick={() => {
                                setSelectedScriptVersionId(version.id);
                                setScriptForm({ ...scriptForm, steps: compactJson({ steps: version.steps ?? [], variables: version.variables ?? {}, retryPolicy: version.retryPolicy ?? {}, detectionPolicy: version.detectionPolicy ?? {} }) });
                              }}>
                                <strong>v{version.versionNo}</strong>
                                <span>{version.status}</span>
                                <span>{version.steps?.length ?? 0} steps</span>
                                <small>{displayDateTime(version.createdAt)}</small>
                                <em onClick={(event) => { event.stopPropagation(); adminAction("Activating script version", async () => { const result = await api<ScriptVersionRecord>(`/script-versions/${version.id}/activate`, { method: "POST" }); await refreshScriptVersions(selectedScriptId); return result; }); }}>activate</em>
                                <em onClick={(event) => { event.stopPropagation(); duplicateSelectedScriptVersion(version); }}>duplicate</em>
                                <em onClick={(event) => { event.stopPropagation(); archiveScriptVersion(version.id); }}>archive</em>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {scriptDrawerTab === "steps" ? (
                          <div className="scriptDrawerBody">
                            <div className="stepEditorToolbar">
                              <select onChange={(event) => { if (event.target.value) addScriptStep(event.target.value); event.currentTarget.value = ""; }} defaultValue="">
                                <option value="">Add step...</option>
                                {Object.keys(scriptStepTemplates).map((type) => <option key={type} value={type}>{type}</option>)}
                              </select>
                              <button onClick={createScriptVersion}><PackagePlus size={15} /> Save as New Version</button>
                              <button disabled={!selectedScriptVersionId} onClick={updateScriptVersion}><Check size={15} /> Save Draft</button>
                              <button disabled={!selectedScriptVersionId} onClick={activateScriptVersion}><Rocket size={15} /> Activate</button>
                            </div>
                            <div className="scriptValidationPanel">
                              <strong>Validation</strong>
                              {scriptValidationMessages.length ? scriptValidationMessages.map((message) => <span className={message.level} key={`${message.index}-${message.message}`}>Step {message.index + 1}: {message.message}</span>) : <span className="ok">All steps look valid.</span>}
                            </div>
                            <div className="scriptStepList">
                              {scriptDraft.steps.map((step, index) => {
                                const type = scriptStepType(step);
                                const template = scriptStepTemplates[type];
                                const config = scriptStepConfig(step);
                                return (
                                  <article className={`scriptStepCard ${selectedScriptStepIndex === index ? "selected" : ""}`} key={`${index}-${type}`} onClick={() => setSelectedScriptStepIndex(index)}>
                                    <header>
                                      <span>#{index + 1}</span>
                                      <select value={type} onChange={(event) => updateScriptStep(index, { ...step, type: event.target.value, config: {} })}>
                                        {Object.keys(scriptStepTemplates).map((option) => <option key={option} value={option}>{option}</option>)}
                                      </select>
                                      <small>{scriptStepSummary(step)}</small>
                                    </header>
                                    <div className="scriptStepFields">
                                      {(template?.fields ?? []).map((field) => (
                                        <label key={field.key}>{field.label}
                                          {field.type === "json" ? (
                                            <textarea value={compactJson(config[field.key] ?? [])} onChange={(event) => updateScriptStepConfig(index, field.key, parseJsonText(event.target.value, [] as unknown as Record<string, unknown>))} />
                                          ) : (
                                            <input
                                              type={field.type === "number" ? "number" : "text"}
                                              value={String(config[field.key] ?? "")}
                                              onChange={(event) => updateScriptStepConfig(index, field.key, field.type === "number" ? Number(event.target.value) : event.target.value)}
                                            />
                                          )}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="resourceActions">
                                      <button onClick={(event) => { event.stopPropagation(); moveScriptStep(index, -1); }} title="Move up">↑</button>
                                      <button onClick={(event) => { event.stopPropagation(); moveScriptStep(index, 1); }} title="Move down">↓</button>
                                      <button onClick={(event) => { event.stopPropagation(); duplicateScriptStep(index); }} title="Duplicate"><Copy size={14} /></button>
                                      <button onClick={(event) => { event.stopPropagation(); removeScriptStep(index); }} title="Delete"><Trash2 size={14} /></button>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                            <details className="resourceCreatePanel">
                              <summary>JSON Editor Fallback</summary>
                              <textarea className="scriptJsonEditor" value={scriptForm.steps} onChange={(event) => setScriptForm({ ...scriptForm, steps: event.target.value })} />
                            </details>
                          </div>
                        ) : null}

                        {scriptDrawerTab === "variables" ? (
                          <div className="scriptDrawerBody">
                            <strong>Runtime Variables</strong>
                            <div className="variableChipGrid">
                              {scriptRuntimeVariables.map((variable) => <button key={variable} onClick={() => insertScriptVariable(variable)}>{variable}</button>)}
                            </div>
                            <small>Click inserts into the selected step config text field.</small>
                          </div>
                        ) : null}

                        {scriptDrawerTab === "test" ? (
                          <div className="scriptDrawerBody">
                            <label>Host<select value={selectedHost?.id ?? ""} onChange={(event) => setSelectedHostId(event.target.value)}>{hosts.map((host) => <option key={host.id} value={host.id}>{host.name} / {host.hostId}</option>)}</select></label>
                            <label>Instance<select value={selectedInstanceId} onChange={(event) => {
                              const instance = instances.find((item) => item.id === event.target.value);
                              setSelectedInstanceId(event.target.value);
                              setHostInstanceId(event.target.value);
                              setHostAdbId(instance?.adbId ?? "");
                            }}><option value="">Select instance</option>{instances.map((instance) => <option key={instance.id} value={instance.id}>{instance.id} / {instance.adbId ?? "no adb"}</option>)}</select></label>
                            <label>ADB ID<input value={hostAdbId} onChange={(event) => setHostAdbId(event.target.value)} /></label>
                            <label>Script Version<select value={selectedScriptVersionId} onChange={(event) => setSelectedScriptVersionId(event.target.value)}>{scriptVersions.map((version) => <option key={version.id} value={version.id}>v{version.versionNo} / {version.status}</option>)}</select></label>
                            <label>Context JSON<textarea value={scriptTestContext} onChange={(event) => setScriptTestContext(event.target.value)} /></label>
                            <div className="resourceActions">
                              <button disabled={!selectedScriptId} onClick={testRunSelectedScript}><Play size={15} /> Run Test</button>
                              <button disabled={!hostAdbId} onClick={() => runHostAction("screenshot")}><Image size={15} /> Screenshot</button>
                              <button disabled={!hostAdbId} onClick={() => runHostAction("send-text")}><Edit3 size={15} /> Send Text</button>
                            </div>
                            {findUrl(hostResult) ? (
                              <div className="liveCapturePreview">
                                <img src={mediaUrl(findUrl(hostResult))} alt="Live capture screenshot" onClick={(event) => {
                                  const rect = event.currentTarget.getBoundingClientRect();
                                  const x = Math.round(event.clientX - rect.left);
                                  const y = Math.round(event.clientY - rect.top);
                                  const next = [...scriptDraft.steps, normalizeScriptStep({ type: "tap", config: { x, y } }, scriptDraft.steps.length)];
                                  setScriptDraftDefinition({ steps: next });
                                  setSelectedScriptStepIndex(next.length - 1);
                                  setScriptDrawerTab("steps");
                                }} />
                                <small>Click screenshot to add a tap step.</small>
                              </div>
                            ) : null}
                            <pre className="jsonBlock">{compactJson(hostResult)}</pre>
                          </div>
                        ) : null}

                        {scriptDrawerTab === "runs" ? (
                          <div className="scriptDrawerBody">
                            {latestSelectedScriptRuns.map((run) => (
                              <div className="scriptRunCard" key={run.id}>
                                <div className="scriptCardHeader">
                                  <strong>{run.status}</strong>
                                  <span className="resourceTypeBadge">Step {run.currentStepNo}</span>
                                </div>
                                <small>Runtime {displayShortId(run.runtimeSessionId)} / {displayDateTime(run.startedAt ?? undefined)}</small>
                                <button onClick={() => selectRuntimeSession(runtimeSessions.find((session) => session.id === run.runtimeSessionId) ?? { id: run.runtimeSessionId, status: run.status, currentStepNo: run.currentStepNo })}>Open run detail</button>
                                {(run.steps ?? []).map((step) => (
                                  <div className="nestedRow" key={step.id}>
                                    <span>{step.stepNo}. {step.stepType}</span><span>{step.status}</span><span>{step.errorMessage ?? "-"}</span><small>{displayDateTime(step.finishedAt ?? undefined)}</small>
                                  </div>
                                ))}
                              </div>
                            ))}
                            {!latestSelectedScriptRuns.length ? <p className="emptyDetail">No script runs yet.</p> : null}
                          </div>
                        ) : null}

                        {scriptDrawerTab === "json" ? (
                          <div className="scriptDrawerBody">
                            <pre className="jsonBlock">{compactJson({ script: selectedScript, version: selectedScriptVersion, steps: scriptDraft.steps, runs: latestSelectedScriptRuns })}</pre>
                          </div>
                        ) : null}
                      </>
                    ) : <p className="emptyDetail">Select a script to view details.</p>}
                  </aside>
                </div>
              </section>
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
                        <div className="groupAttributeEditor">
                          {standardGroupAttributeKeys.map((key) => (
                            <label key={key}>{key}<input value={groupAttributeDrafts[key] ?? ""} onChange={(event) => setGroupAttributeDrafts({ ...groupAttributeDrafts, [key]: event.target.value })} placeholder={`Enter ${key}`} /></label>
                          ))}
                        </div>
                        <div className="customAttributeList">
                          <div className="drawerSectionHeader">
                            <strong>Custom Attributes</strong>
                            <button onClick={() => setCustomGroupAttributes((current) => [...current, { key: "", value: "" }])}>Add Custom</button>
                          </div>
                          {customGroupAttributes.map((attribute, index) => (
                            <div className="customAttributeRow" key={`${attribute.key}-${index}`}>
                              <input value={attribute.key} onChange={(event) => setCustomGroupAttributes((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item))} placeholder="attribute key" />
                              <input value={attribute.value} onChange={(event) => setCustomGroupAttributes((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} placeholder="value" />
                              <button className="iconButton dangerIconButton" title="Remove custom attribute" aria-label="Remove custom attribute" onClick={() => setCustomGroupAttributes((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
                            </div>
                          ))}
                          {!customGroupAttributes.length ? <p className="emptyDetail">No custom attributes.</p> : null}
                        </div>
                        <div className="controlActions">
                          <button className="primaryButton" onClick={saveSelectedGroupAttributes}>Save Attributes</button>
                        </div>
                        <div className="attributeSuggestionPanel">
                          <strong>Quick values used by other groups</strong>
                          {standardGroupAttributeKeys.map((key) => {
                            const suggestions = (selectedGroupDetail.attributeSuggestions ?? []).filter((item) => normalizeAttributeKey(item.key) === key && item.value);
                            return (
                              <div className="attributeSuggestionGroup" key={key}>
                                <span>{key}</span>
                                <div>
                                  {suggestions.slice(0, 10).map((item) => (
                                    <button key={`${key}-${item.value}`} onClick={() => applyGroupAttributeSuggestion(item.key, item.value)}>{item.value}</button>
                                  ))}
                                  {!suggestions.length ? <small>No suggestions yet.</small> : null}
                                </div>
                              </div>
                            );
                          })}
                          <div className="attributeSuggestionGroup">
                            <span>custom</span>
                            <div>
                              {(selectedGroupDetail.attributeSuggestions ?? [])
                                .filter((item) => item.value && !standardGroupAttributeKeys.includes(normalizeAttributeKey(item.key)))
                                .slice(0, 16)
                                .map((item) => <button key={`${item.key}-${item.value}`} onClick={() => applyGroupAttributeSuggestion(item.key, item.value)}>{item.key}: {item.value}</button>)}
                            </div>
                          </div>
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
            <div className="productionResourceLibrary">
              <div className="resourceKpiBar">
                {[
                  { label: "Character Groups", value: productionResourceKpis.characterGroups, Icon: Users },
                  { label: "Image Batches", value: productionResourceKpis.imageBatches, Icon: Image },
                  { label: "Video Batches", value: productionResourceKpis.videoBatches, Icon: Video },
                  { label: "Music Tracks", value: productionResourceKpis.musicTracks, Icon: Music },
                  { label: "Final Videos", value: productionResourceKpis.finalVideos, Icon: Rocket },
                  { label: "Post Contents", value: productionResourceKpis.postContents, Icon: ClipboardList },
                  { label: "Ready Resources", value: productionResourceKpis.readyResources, Icon: Check },
                  { label: "Failed Resources", value: productionResourceKpis.failedResources, Icon: Archive },
                  { label: "Recently Created", value: productionResourceKpis.recentlyCreated, Icon: Sparkles }
                ].map(({ label, value, Icon }) => (
                  <div className="resourceKpiCard" key={label}>
                    <Icon size={17} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="resourceTabs">
                {(["CHARACTER_GROUP", "IMAGE_BATCH", "VIDEO_BATCH", "MUSIC_TRACK", "FINAL_VIDEO", "POST_CONTENT", "ALL"] as ProductionResourceTab[]).map((tab) => (
                  <button
                    key={tab}
                    className={productionResourceTab === tab ? "active" : ""}
                    onClick={() => {
                      setProductionResourceTab(tab);
                      setProductionResourceFilters((current) => ({ ...current, type: "" }));
                    }}
                  >
                    {resourceTabLabel(tab)}
                  </button>
                ))}
              </div>

              <div className="resourceFiltersPanel">
                <label>Search<input value={productionResourceFilters.search} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, search: event.target.value })} placeholder="Name, group, metadata..." /></label>
                <label>Resource Type<select value={productionResourceFilters.type} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, type: event.target.value })}><option value="">Tab default</option>{productionBatchTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label>Status<select value={productionResourceFilters.status} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, status: event.target.value })}><option value="">All</option>{productionResourceStatusOptions.map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption}</option>)}</select></label>
                <label>Usage Status<select value={productionResourceFilters.usageStatus} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, usageStatus: event.target.value })}><option value="">All</option>{productionResourceUsageOptions.map((usageOption) => <option key={usageOption} value={usageOption}>{usageOption}</option>)}</select></label>
                <label>Workflow<select value={productionResourceFilters.workflowId} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, workflowId: event.target.value })}><option value="">All</option>{workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select></label>
                <label>Character Group<select value={productionResourceFilters.groupId} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, groupId: event.target.value })}><option value="">All</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <label>Created Date<input type="date" value={productionResourceFilters.createdDate} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, createdDate: event.target.value })} /></label>
                <div className="resourceFilterChecks">
                  <label><input type="checkbox" checked={productionResourceFilters.hasLineage} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, hasLineage: event.target.checked })} /> Has Lineage</label>
                  <label><input type="checkbox" checked={productionResourceFilters.readyOnly} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, readyOnly: event.target.checked })} /> Ready Only</label>
                  <label><input type="checkbox" checked={productionResourceFilters.reusableOnly} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, reusableOnly: event.target.checked })} /> Reusable Only</label>
                  <label><input type="checkbox" checked={productionResourceFilters.includeArchived} onChange={(event) => setProductionResourceFilters({ ...productionResourceFilters, includeArchived: event.target.checked })} /> Show Archived</label>
                  <label><input type="checkbox" checked={productionGrouped} onChange={(event) => setProductionGrouped(event.target.checked)} /> Grouped by Character Group</label>
                </div>
              </div>

              <details className="resourceCreatePanel">
                <summary>Technical Create Batch</summary>
                <div className="resourceCreateGrid">
                  <label>Batch Type<select value={batchForm.batchType} onChange={(event) => setBatchForm({ ...batchForm, batchType: event.target.value })}>{productionBatchTypeOptions.map((type) => <option key={type}>{type}</option>)}</select></label>
                  <label>Status<input value={batchForm.status} onChange={(event) => setBatchForm({ ...batchForm, status: event.target.value })} /></label>
                  <label>Usage Status<input value={batchForm.usageStatus} onChange={(event) => setBatchForm({ ...batchForm, usageStatus: event.target.value })} /></label>
                  <label>Metadata JSON<textarea value={batchForm.metadata} onChange={(event) => setBatchForm({ ...batchForm, metadata: event.target.value })} /></label>
                  <button onClick={() => adminAction("Creating production batch", () => api("/production-batches", { method: "POST", body: JSON.stringify({ batchType: batchForm.batchType, status: batchForm.status, usageStatus: batchForm.usageStatus, metadata: parseJsonText(batchForm.metadata), attributes: {} }) }))}>Create Batch</button>
                </div>
              </details>

              <div className="resourceLibraryLayout">
                <section className="resourceLibraryMain">
                  <div className="resourceLibraryHeader">
                    <div>
                      <strong>{resourceTabLabel(productionResourceTab)}</strong>
                      <small>{productionResourceCards.length} resources</small>
                    </div>
                    <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}><RefreshCcw size={15} /> Refresh</button>
                  </div>

                  {productionGrouped ? (
                    <div className="groupedResourceList">
                      {productionResourceGroups.map((entry) => (
                        <section className="groupedResourceSection" key={entry.groupId}>
                          <header>
                            <div>
                              <strong>{entry.group?.name ?? "Ungrouped Resources"}</strong>
                              <small>{entry.resources.length} resources</small>
                            </div>
                            {entry.group ? <span>{entry.group.attributesSummary || "No attributes"}</span> : null}
                          </header>
                          <div className="groupedResourceRows">
                            {entry.resources.map((batch) => (
                              <button className={selectedResourceId === batch.id ? "groupedResourceRow selected" : "groupedResourceRow"} key={batch.id} onClick={() => openProductionResource(batch)}>
                                <span className="resourceTypeBadge">{productionResourceType(batch)}</span>
                                <strong>{batchDisplayName(batch, entry.group)}</strong>
                                <span>{batch.status}</span>
                                <small>{displayDateTime(batch.createdAt)}</small>
                              </button>
                            ))}
                          </div>
                        </section>
                      ))}
                      {!productionResourceGroups.length ? <p className="emptyDetail">No resources match current filters.</p> : null}
                    </div>
                  ) : (
                    <div className="resourceCardGrid">
                      {productionResourceCards.map((batch) => renderProductionResourceCard(batch))}
                      {!productionResourceCards.length ? <p className="emptyDetail">No resources match current filters.</p> : null}
                    </div>
                  )}
                </section>

                <aside className="resourceDetailDrawer">
                  {selectedProductionResource ? (() => {
                    const batch = selectedProductionResource;
                    const group = getProductionResourceGroup(batch);
                    const post = postContentMetadata(batch);
                    const music = musicTrackMetadata(batch);
                    return (
                      <>
                        <div className="drawerHeader">
                          <div>
                            <strong>{batchDisplayName(batch, group)}</strong>
                            <small>{productionResourceType(batch)} / {displayShortId(batch.id)}</small>
                          </div>
                          <button className="iconButton" onClick={() => setSelectedResourceId("")} title="Close">x</button>
                        </div>
                        <div className="resourceDrawerTabs">
                          {[
                            ["overview", "Overview"],
                            ["group", "Group"],
                            ["lineage", "Lineage"],
                            ["jobs", "Jobs"],
                            ["runtime", "Runtime"],
                            ["json", "Raw JSON"]
                          ].map(([tab, label]) => (
                            <button key={tab} className={resourceDrawerTab === tab ? "active" : ""} onClick={() => setResourceDrawerTab(tab as typeof resourceDrawerTab)}>{label}</button>
                          ))}
                        </div>

                        {resourceDrawerTab === "overview" ? (
                          <div className="resourceDrawerBody">
                            <div className="resourcePreviewHero">{renderResourcePreview(batch)}</div>
                            <div className="resourceMetaGrid detail">
                              <span>Status</span><strong>{batch.status}</strong>
                              <span>Usage</span><strong>{batch.usageStatus}</strong>
                              <span>Workflow</span><strong>{batch.workflowId ? displayShortId(batch.workflowId) : "-"}</strong>
                              <span>Created</span><strong>{displayDateTime(batch.createdAt)}</strong>
                            </div>
                            {batch.batchType === "POST_CONTENT" ? <div className="postPreview"><strong>{post.title || "Post content"}</strong><p>{post.caption || post.postText}</p><small>{post.hashtags.join(" ")} {post.cta ? `/ ${post.cta}` : ""}</small></div> : null}
                            {batch.batchType === "MUSIC_TRACK" ? <div className="postPreview"><strong>{[music.mood, music.tempo, music.style].filter(Boolean).join(" / ") || "Music track"}</strong><p>{[music.scene, music.emotion].filter(Boolean).join(" / ")}</p><small>{music.tags.join(", ")}</small></div> : null}
                            <div className="resourceActions">
                              <button className="dangerButton" onClick={() => deleteProductionResource(batch)}><Trash2 size={15} /> {productionResourceIsCharacterGroup(batch) ? "Delete Character Group" : "Delete Resource"}</button>
                            </div>
                          </div>
                        ) : null}

                        {resourceDrawerTab === "group" ? (
                          <div className="resourceDrawerBody">
                            {group ? (
                              <>
                                <strong>{group.name}</strong>
                                <span>{group.description}</span>
                                <small>{group.memberCount ?? 0} members / {group.attributesSummary || "No attributes"}</small>
                                <div className="resourceGroupThumbs">
                                  {(group.membersPreview ?? []).map((member) => (
                                    <div key={member.memberId ?? member.character.id}>
                                      {member.youngThumbnailUrl ? <img src={mediaUrl(member.youngThumbnailUrl)} alt="Young thumbnail" /> : <span>Young</span>}
                                      {member.oldThumbnailUrl ? <img src={mediaUrl(member.oldThumbnailUrl)} alt="Old thumbnail" /> : <span>Old</span>}
                                      <small>{member.character.name}</small>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : <p className="emptyDetail">No related Character Group found.</p>}
                          </div>
                        ) : null}

                        {resourceDrawerTab === "lineage" ? (
                          <div className="resourceDrawerBody">
                            <div className="resourceTimeline">
                              {productionResourceLineage.map((item, index) => (
                                <button className={item.id === batch.id ? "resourceTimelineItem active" : "resourceTimelineItem"} key={item.id} onClick={() => setSelectedResourceId(item.id)}>
                                  <span>{index + 1}</span>
                                  <div>
                                    <strong>{item.batchType}</strong>
                                    <small>{batchDisplayName(item, getProductionResourceGroup(item))} / {item.status}</small>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {resourceDrawerTab === "jobs" ? (
                          <div className="resourceDrawerBody">
                            {productionResourceJobs.map((job) => (
                              <button className="resourceRelatedRow" key={job.id} onClick={() => loadJobDetail(job)}>
                                <strong>{job.targetStageType}</strong>
                                <span>{job.status}</span>
                                <small>{displayShortId(job.id)} / {displayDateTime(job.createdAt)}</small>
                              </button>
                            ))}
                            {!productionResourceJobs.length ? <p className="emptyDetail">No related jobs found.</p> : null}
                          </div>
                        ) : null}

                        {resourceDrawerTab === "runtime" ? (
                          <div className="resourceDrawerBody">
                            {productionResourceRuntimeSessions.map((session) => (
                              <button className="resourceRelatedRow" key={session.id} onClick={() => selectRuntimeSession(session)}>
                                <strong>{session.status}</strong>
                                <span>{session.hostId ?? "-"}</span>
                                <small>{displayShortId(session.id)} / {displayDateTime(session.createdAt)}</small>
                              </button>
                            ))}
                            {!productionResourceRuntimeSessions.length ? <p className="emptyDetail">No related runtime sessions found.</p> : null}
                          </div>
                        ) : null}

                        {resourceDrawerTab === "json" ? (
                          <div className="resourceDrawerBody">
                            <pre className="jsonBlock">{compactJson({ resource: batch, group, lineage: productionResourceLineage, jobs: productionResourceJobs, runtimeSessions: productionResourceRuntimeSessions })}</pre>
                          </div>
                        ) : null}
                      </>
                    );
                  })() : <p className="emptyDetail">Select a resource to view details.</p>}
                </aside>
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
              <div className="adminTable">{orchestratorRules.map((rule) => <div className={`adminRow ${selectedRuleId === rule.id ? "selected" : ""}`} key={rule.id} onClick={() => setSelectedRuleId(rule.id)}><b>{rule.name}</b><span>{rule.triggerBatchType} to {rule.targetStageType}</span><span>{rule.priority}</span><span>{rule.isActive ? "active" : "disabled"}</span><button onClick={(event) => { event.stopPropagation(); adminAction("Toggle rule", () => api(`/orchestrator/rules/${rule.id}/${rule.isActive ? "disable" : "enable"}`, { method: "POST" })); }}>{rule.isActive ? "Disable" : "Enable"}</button></div>)}</div>
              <aside className="resourceDetailDrawer">
                {selectedRule ? (
                  <>
                    <div className="drawerHeader">
                      <div>
                        <strong>{selectedRule.name}</strong>
                        <small>{selectedRule.triggerBatchType} / {selectedRule.targetStageType}</small>
                      </div>
                      <button className="iconButton" onClick={() => setSelectedRuleId("")}>x</button>
                    </div>
                    <div className="resourceDrawerBody">
                      <div className="resourceMetaGrid detail">
                        <span>Rule ID</span><strong>{selectedRule.id}</strong>
                        <span>Trigger</span><strong>{selectedRule.triggerBatchType}.{selectedRule.triggerStatus}</strong>
                        <span>Target Stage</span><strong>{selectedRule.targetStageType}</strong>
                        <span>Priority</span><strong>{selectedRule.priority}</strong>
                        <span>Status</span><strong>{selectedRule.isActive ? "active" : "disabled"}</strong>
                      </div>
                      <details className="resourceCreatePanel"><summary>Debug JSON</summary><pre className="jsonBlock">{compactJson(selectedRule.config ?? {})}</pre></details>
                      <div className="resourceActions">
                        <button onClick={() => adminAction("Toggle rule", () => api(`/orchestrator/rules/${selectedRule.id}/${selectedRule.isActive ? "disable" : "enable"}`, { method: "POST" }))}>{selectedRule.isActive ? "Disable" : "Enable"}</button>
                        <button className="dangerButton" onClick={() => deleteSelectedRule(selectedRule)}><Trash2 size={15} /> Delete Rule</button>
                      </div>
                    </div>
                  </>
                ) : <p className="emptyDetail">Select an orchestrator rule to view details.</p>}
              </aside>
            </div>
          ) : null}

          {managementSection === "jobs" ? (
            <div className="managementJobsPage">
              <div className="resourceKpiBar">
                {[
                  { label: "Pending Jobs", value: managementJobKpis.pending, Icon: ClipboardList },
                  { label: "Allocated Jobs", value: managementJobKpis.allocated, Icon: Boxes },
                  { label: "Running Jobs", value: managementJobKpis.running, Icon: Play },
                  { label: "Completed Today", value: managementJobKpis.completedToday, Icon: Check },
                  { label: "Failed Jobs", value: managementJobKpis.failed, Icon: Archive },
                  { label: "Recoverable Failures", value: managementJobKpis.recoverable, Icon: RefreshCcw },
                  { label: "Waiting Instance", value: managementJobKpis.waitingInstance, Icon: Users },
                  { label: "Waiting Resource", value: managementJobKpis.waitingResource, Icon: PackagePlus }
                ].map(({ label, value, Icon }) => (
                  <div className="resourceKpiCard" key={label}>
                    <Icon size={17} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="jobsOpsToolbar">
                <div className="segmentedControl">
                  <button className={jobsViewMode === "kanban" ? "active" : ""} onClick={() => setJobsViewMode("kanban")}>Kanban View</button>
                  <button className={jobsViewMode === "table" ? "active" : ""} onClick={() => setJobsViewMode("table")}>Table View</button>
                </div>
                <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}><RefreshCcw size={15} /> Refresh</button>
                <label className="toggleControl"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /> Auto refresh 5s</label>
                <small>Last refresh: {lastJobsRefreshAt ? displayDateTime(lastJobsRefreshAt) : "-"}</small>
              </div>

              <div className="resourceFiltersPanel">
                <label>Search<input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="job id / batch id / group name" /></label>
                <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All</option>{jobBoardStatusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label>Target Stage<select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="">All</option>{["IMAGE_EDIT", "VIDEO_GENERATE", "MUSIC_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT"].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label>Workflow<select value={jobsWorkflowFilter} onChange={(event) => setJobsWorkflowFilter(event.target.value)}><option value="">All</option>{workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.name}</option>)}</select></label>
                <label>Character Group<select value={jobsGroupFilter} onChange={(event) => setJobsGroupFilter(event.target.value)}><option value="">All</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <label>Instance<select value={jobsInstanceFilter} onChange={(event) => setJobsInstanceFilter(event.target.value)}><option value="">All</option>{instances.map((instance) => <option key={instance.id} value={instance.id}>{instance.id}</option>)}</select></label>
                <label>Allocation Mode<select value={jobsAllocationModeFilter} onChange={(event) => setJobsAllocationModeFilter(event.target.value)}><option value="">All</option>{allocationModeOptions.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
                <label>Created Date<input type="date" value={jobsCreatedDateFilter} onChange={(event) => setJobsCreatedDateFilter(event.target.value)} /></label>
                <div className="resourceFilterChecks">
                  <label><input type="checkbox" checked={jobsFailedOnly} onChange={(event) => setJobsFailedOnly(event.target.checked)} /> Failed only</label>
                  <label><input type="checkbox" checked={jobsRecoverableOnly} onChange={(event) => setJobsRecoverableOnly(event.target.checked)} /> Recoverable only</label>
                </div>
              </div>

              <div className="bulkJobBar">
                <strong>{selectedJobIds.length} selected</strong>
                <button disabled={!selectedJobIds.length || busy} onClick={() => bulkJobsAction("allocate")}>Allocate selected</button>
                <button disabled={!selectedJobIds.length || busy} onClick={() => bulkJobsAction("execute-mock")}>Execute mock selected</button>
                <button disabled={!selectedJobIds.length || busy} onClick={() => bulkJobsAction("fail")}>Cancel/Fail selected</button>
                <button disabled={!selectedJobIds.length} onClick={() => setSelectedJobIds([])}>Clear</button>
              </div>

              <div className="managementJobsLayout">
                <section className="managementJobsMain">
                  {jobsViewMode === "kanban" ? (
                    <div className="managementJobBoard">
                      {managementJobColumns.map((column) => (
                        <section className="managementJobColumn" key={column.status}>
                          <header>
                            <strong>{column.status}</strong>
                            <span>{column.items.length}</span>
                          </header>
                          <div className="managementJobCards">
                            {column.items.map((job) => renderManagementJobCard(job))}
                            {!column.items.length ? (
                              <p className="emptyDetail">
                                {column.status === "PENDING"
                                  ? "No pending jobs. Run orchestrator scan or launch production from Production Studio."
                                  : column.status === "ALLOCATED"
                                    ? "No allocated jobs. Allocate a pending job to an eligible standby instance."
                                    : `No ${column.status.toLowerCase()} jobs.`}
                              </p>
                            ) : null}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="jobsTable operationsTable" role="table" aria-label="Management jobs">
                      <div className="jobsTableHeader" role="row">
                        <span></span><span>Job ID</span><span>Stage</span><span>Status</span><span>Source</span><span>Group</span><span>Instance</span><span>Allocation</span><span>Created</span><span>Actions</span>
                      </div>
                      {managementFilteredJobs.map((job) => {
                        const { sourceBatch, group, allocation } = jobRelationship(job);
                        return (
                          <div className={`jobsTableRow ${selectedJobId === job.id ? "selected" : ""}`} role="row" key={job.id} onClick={() => loadJobDetail(job)}>
                            <span onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selectedJobIds.includes(job.id)} onChange={() => toggleSelectedJob(job.id)} /></span>
                            <span title={job.id}>{displayShortId(job.id)}</span>
                            <strong>{job.targetStageType}</strong>
                            <span className="statusPill">{job.status}</span>
                            <span>{sourceBatch?.batchType ?? "-"} / {displayShortId(job.sourceBatchId)}</span>
                            <span>{group?.name ?? "-"}</span>
                            <span>{displayShortId(displayJobInstance(job) !== "-" ? displayJobInstance(job) : allocation?.instanceId)}</span>
                            <span>{displayJobAllocationMode(job) !== "-" ? displayJobAllocationMode(job) : allocation?.allocationMode ?? "-"}</span>
                            <span>{displayDateTime(job.createdAt)}</span>
                            <div className="jobActions">{renderJobStatusActions(job)}</div>
                          </div>
                        );
                      })}
                      {!managementFilteredJobs.length ? <div className="jobsEmpty">No jobs match the current filters.</div> : null}
                    </div>
                  )}
                </section>

                <aside className="managementJobDrawer">
                  <div className="drawerHeader">
                    <div>
                      <strong>Job Detail</strong>
                      <small>{selectedJob ? `${selectedJob.targetStageType} / ${displayShortId(selectedJob.id)}` : "Select a job"}</small>
                    </div>
                    {selectedJob ? <button className="iconButton" onClick={() => setSelectedJobId("")} title="Close">x</button> : null}
                  </div>
                  {jobDetailLoading ? <div className="detailLoading"><Loader2 className="spin" size={15} /> Loading job detail</div> : null}
                  {jobDetailError ? <div className="detailError">{jobDetailError}</div> : null}
                  {selectedJob ? (
                    <>
                      <div className="resourceDrawerTabs">
                        {[
                          ["overview", "Overview"],
                          ["source", "Source Resource"],
                          ["allocation", "Allocation"],
                          ["runtime", "Runtime Session"],
                          ["script", "Script Run"],
                          ["output", "Output"],
                          ["lineage", "Lineage"],
                          ["json", "Debug JSON"]
                        ].map(([tab, label]) => <button key={tab} className={jobDrawerTab === tab ? "active" : ""} onClick={() => setJobDrawerTab(tab as typeof jobDrawerTab)}>{label}</button>)}
                      </div>

                      {jobDrawerTab === "overview" ? (
                        <div className="resourceDrawerBody">
                          <div className="resourceMetaGrid detail">
                            <span>Job ID</span><strong>{selectedJob.id}</strong>
                            <span>Status</span><strong>{selectedJob.status}</strong>
                            <span>Target Stage</span><strong>{selectedJob.targetStageType}</strong>
                            <span>Source Batch</span><strong>{displayShortId(selectedJob.sourceBatchId)}</strong>
                            <span>Workflow</span><strong>{selectedJobWorkflow?.name ?? "-"}</strong>
                            <span>Character Group</span><strong>{selectedJobGroup?.name ?? "-"}</strong>
                            <span>Created</span><strong>{displayDateTime(selectedJob.createdAt)}</strong>
                            <span>Updated</span><strong>{displayDateTime(selectedJob.updatedAt)}</strong>
                          </div>
                          <div className="postPreview"><strong>Error</strong><p>{findJobError(selectedJob, runtimeSession, scriptRun) || "No error reported."}</p></div>
                          <div className="jobCardActions">{renderJobStatusActions(selectedJob)}</div>
                          <div className="resourceActions">
                            <button className="dangerButton" onClick={() => deleteSelectedJob(selectedJob)}><Trash2 size={15} /> Delete Job</button>
                          </div>
                        </div>
                      ) : null}

                      {jobDrawerTab === "source" ? (
                        <div className="resourceDrawerBody">
                          {selectedJobSourceBatch ? (
                            <>
                              <strong>{selectedJobSourceBatch.batchType}</strong>
                              <small>{selectedJobSourceBatch.id} / {selectedJobSourceBatch.status} / {selectedJobSourceBatch.usageStatus}</small>
                              <div className="resourceGroupThumbs">
                                {selectedJobOutputAssets.slice(0, 6).map((asset) => listImageUrl(asset) ? <img key={asset.id} src={listImageUrl(asset)} alt={asset.name} /> : null)}
                              </div>
                              <pre className="jsonBlock">{compactJson(selectedJobSourceBatch.metadata)}</pre>
                            </>
                          ) : <p className="emptyDetail">Source batch not found.</p>}
                        </div>
                      ) : null}

                      {jobDrawerTab === "allocation" ? (
                        <div className="resourceDrawerBody">
                          {selectedJobAllocation ? (
                            <div className="resourceMetaGrid detail">
                              <span>Allocation ID</span><strong>{selectedJobAllocation.id}</strong>
                              <span>Instance</span><strong>{selectedJobAllocation.instanceId}</strong>
                              <span>Host</span><strong>{selectedJobAllocation.hostId ?? "-"}</strong>
                              <span>ADB</span><strong>{selectedJobAllocation.adbId ?? "-"}</strong>
                              <span>Mode</span><strong>{selectedJobAllocation.allocationMode ?? "-"}</strong>
                              <span>Status</span><strong>{selectedJobAllocation.status}</strong>
                              <span>Allocated</span><strong>{displayDateTime(selectedJobAllocation.allocatedAt ?? undefined)}</strong>
                              <span>Released</span><strong>{displayDateTime(selectedJobAllocation.releasedAt ?? undefined)}</strong>
                            </div>
                          ) : <p className="emptyDetail">No allocation found yet.</p>}
                        </div>
                      ) : null}

                      {jobDrawerTab === "runtime" ? (
                        <div className="resourceDrawerBody">
                          {runtimeSession ? (
                            <>
                              <div className="resourceMetaGrid detail">
                                <span>Runtime Session</span><strong>{runtimeSession.id}</strong>
                                <span>Status</span><strong>{runtimeSession.status}</strong>
                                <span>Current Step</span><strong>{runtimeSession.currentStepNo}</strong>
                                <span>Host</span><strong>{runtimeSession.hostId ?? "-"}</strong>
                                <span>Instance</span><strong>{runtimeSession.instanceId ?? "-"}</strong>
                              </div>
                              <div className="resourceActions">
                                <button onClick={() => runHostAction("screenshot")} disabled={!runtimeSession.instanceId}>Test Screenshot</button>
                                <button onClick={recoverRuntimeSession} disabled={runtimeSession.status !== "FAILED_RECOVERABLE"}>Recover</button>
                                <button onClick={() => runtimeAction("mark-unrecoverable", runtimeSession)} disabled={runtimeSession.status !== "FAILED_RECOVERABLE"}>Mark Unrecoverable</button>
                              </div>
                              <pre className="jsonBlock">{compactJson(runtimeSession.checkpoint)}</pre>
                            </>
                          ) : <p className="emptyDetail">Runtime not started yet.</p>}
                        </div>
                      ) : null}

                      {jobDrawerTab === "script" ? (
                        <div className="resourceDrawerBody">
                          {scriptRun ? (
                            <>
                              <div className="resourceMetaGrid detail">
                                <span>Script Run</span><strong>{scriptRun.id}</strong>
                                <span>Status</span><strong>{scriptRun.status}</strong>
                                <span>Script</span><strong>{scripts.find((item) => item.id === scriptRun.scriptId)?.name ?? displayShortId(scriptRun.scriptId)}</strong>
                                <span>Version</span><strong>{displayShortId(scriptRun.scriptVersionId)}</strong>
                              </div>
                              <div className="scriptStepTable">
                                {(scriptRun.steps ?? []).map((step) => (
                                  <div key={step.id}>
                                    <span>{step.stepNo}</span><span>{step.stepType}</span><b>{step.status}</b><small>{step.errorMessage ?? ""}</small>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : <p className="emptyDetail">No script run yet.</p>}
                        </div>
                      ) : null}

                      {jobDrawerTab === "output" ? (
                        <div className="resourceDrawerBody">
                          {outputBatches.map((batch) => <button className="resourceRelatedRow" key={batch.id} onClick={() => { setManagementSection("production-resources"); setSelectedResourceId(batch.id); }}><strong>{batch.batchType}</strong><span>{batch.status}</span><small>{batch.id}</small></button>)}
                          {selectedJobOutputAssets.map((asset) => <div className="assetPreview" key={asset.id}>{listImageUrl(asset) ? <img src={listImageUrl(asset)} alt={asset.name} /> : <span>{asset.name}</span>}</div>)}
                          {!outputBatches.length ? <p className="emptyDetail">No output batch yet.</p> : null}
                        </div>
                      ) : null}

                      {jobDrawerTab === "lineage" ? (
                        <div className="resourceDrawerBody">
                          <div className="resourceTimeline">
                            {selectedJobLineage.map((item, index) => (
                              <div className="resourceTimelineItem" key={`${item.type}-${item.id}`}>
                                <span>{index + 1}</span>
                                <div><strong>{item.type}</strong><small>{item.label} / {item.status} / {displayShortId(item.id)}</small></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {jobDrawerTab === "json" ? (
                        <div className="resourceDrawerBody">
                          <pre className="jsonBlock">{compactJson({ job: selectedJob, payload: selectedJob.payload, sourceBatch: selectedJobSourceBatch, allocation: selectedJobAllocation, runtimeSession, scriptRun, outputBatches })}</pre>
                        </div>
                      ) : null}
                    </>
                  ) : <p className="emptyDetail">Select a job to inspect linked resources, allocation, runtime, script run, and output.</p>}
                </aside>
              </div>
            </div>
          ) : null}
          {managementSection === "runtime-sessions" ? (
            <div className="managementJobsPage runtimeSessionsPage">
              <div className="resourceKpiBar">
                {[
                  { label: "Running Sessions", value: runtimeKpis.running, Icon: Play },
                  { label: "Completed Today", value: runtimeKpis.completedToday, Icon: Check },
                  { label: "Failed Sessions", value: runtimeKpis.failed, Icon: Archive },
                  { label: "Recoverable Sessions", value: runtimeKpis.recoverable, Icon: RefreshCcw },
                  { label: "Paused Sessions", value: runtimeKpis.paused, Icon: Edit3 },
                  { label: "Avg Duration", value: runtimeKpis.averageDuration, Icon: ClipboardList },
                  { label: "Waiting Host", value: runtimeKpis.waitingHost, Icon: Users },
                  { label: "Waiting Recovery", value: runtimeKpis.waitingRecovery, Icon: Rocket }
                ].map(({ label, value, Icon }) => (
                  <div className="resourceKpiCard" key={label}>
                    <Icon size={17} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="jobsOpsToolbar">
                <div className="segmentedControl">
                  <button className={runtimeViewMode === "board" ? "active" : ""} onClick={() => setRuntimeViewMode("board")}>Board View</button>
                  <button className={runtimeViewMode === "table" ? "active" : ""} onClick={() => setRuntimeViewMode("table")}>Table View</button>
                </div>
                <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}><RefreshCcw size={15} /> Refresh</button>
                <label className="toggleControl"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /> Auto refresh 5s</label>
                <small>Last refresh: {lastRuntimeRefreshAt ? displayDateTime(lastRuntimeRefreshAt) : "-"}</small>
              </div>

              <div className="resourceFiltersPanel">
                <label>Search<input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="runtime / job / script / instance" /></label>
                <label>Status<select value={runtimeStatusFilter} onChange={(event) => setRuntimeStatusFilter(event.target.value)}><option value="">All</option>{runtimeStatusBoardOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <label>Host<select value={runtimeHostFilter} onChange={(event) => setRuntimeHostFilter(event.target.value)}><option value="">All</option>{hosts.map((host) => <option key={host.id} value={host.hostId}>{host.name}</option>)}</select></label>
                <label>Instance<select value={runtimeInstanceFilter} onChange={(event) => setRuntimeInstanceFilter(event.target.value)}><option value="">All</option>{instances.map((instance) => <option key={instance.id} value={instance.id}>{instance.id}</option>)}</select></label>
                <label>Job Type<select value={runtimeJobTypeFilter} onChange={(event) => setRuntimeJobTypeFilter(event.target.value)}><option value="">All</option>{workflowJobTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label>Script Category<select value={runtimeScriptCategoryFilter} onChange={(event) => setRuntimeScriptCategoryFilter(event.target.value)}><option value="">All</option>{scriptCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label>Created Date<input type="date" value={runtimeCreatedDateFilter} onChange={(event) => setRuntimeCreatedDateFilter(event.target.value)} /></label>
                <div className="resourceFilterChecks">
                  <label><input type="checkbox" checked={runtimeRecoverableOnly} onChange={(event) => setRuntimeRecoverableOnly(event.target.checked)} /> Recoverable only</label>
                  <label><input type="checkbox" checked={runtimeFailedOnly} onChange={(event) => setRuntimeFailedOnly(event.target.checked)} /> Failed only</label>
                  <label><input type="checkbox" checked={runtimeRunningOnly} onChange={(event) => setRuntimeRunningOnly(event.target.checked)} /> Running only</label>
                </div>
              </div>

              <div className="managementJobsLayout">
                <section className="managementJobsMain">
                  {runtimeViewMode === "board" ? (
                    <div className="managementJobBoard runtimeBoardGrid">
                      {runtimeColumns.map((column) => (
                        <section className="managementJobColumn" key={column.status}>
                          <header><strong>{column.status}</strong><span>{column.items.length}</span></header>
                          <div className="managementJobCards">
                            {column.items.map((session) => renderRuntimeSessionCard(session))}
                            {!column.items.length ? <p className="emptyDetail">{column.status === "RUNNING" ? "No runtime sessions are currently running." : column.status === "FAILED_RECOVERABLE" ? "No recoverable failures." : `No ${column.status.toLowerCase()} sessions.`}</p> : null}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="jobsTable operationsTable" role="table" aria-label="Runtime sessions">
                      <div className="jobsTableHeader" role="row"><span>Runtime</span><span>Status</span><span>Job</span><span>Script</span><span>Step</span><span>Progress</span><span>Host</span><span>Instance</span><span>Duration</span><span>Actions</span></div>
                      {filteredRuntimeSessions.map((session) => {
                        const { job, run, script } = runtimeRelationship(session);
                        const progress = runtimeProgress(session, run);
                        return (
                          <div className={`jobsTableRow ${selectedRuntimeId === session.id ? "selected" : ""}`} role="row" key={session.id} onClick={() => selectRuntimeSession(session)}>
                            <span>{displayShortId(session.id)}</span><span className="statusPill">{session.status}</span><span>{job?.targetStageType ?? "-"}</span><span>{script?.name ?? displayShortId(run?.scriptVersionId)}</span><span>{session.currentStepNo}</span><span>{progress.completed}/{progress.total || "-"}</span><span>{session.hostId ?? "-"}</span><span>{displayShortId(session.instanceId)}</span><span>{displayDuration(session.startedAt ?? session.updatedAt, session.finishedAt)}</span><div className="jobActions">{renderRuntimeActions(session)}</div>
                          </div>
                        );
                      })}
                      {!filteredRuntimeSessions.length ? <div className="jobsEmpty">Run or execute a job to create a runtime session.</div> : null}
                    </div>
                  )}
                </section>

                <aside className="managementJobDrawer runtimeDetailDrawer">
                  <div className="drawerHeader">
                    <div><strong>Runtime Detail</strong><small>{selectedRuntime ? `${selectedRuntime.status} / ${displayShortId(selectedRuntime.id)}` : "Select a runtime session"}</small></div>
                    {selectedRuntime ? <button className="iconButton" onClick={() => setSelectedRuntimeId("")}>x</button> : null}
                  </div>
                  {selectedRuntime ? (
                    <>
                      <div className="resourceDrawerTabs">
                        {[
                          ["overview", "Overview"], ["checkpoint", "Checkpoint"], ["timeline", "Script Timeline"], ["host", "Host / Instance"], ["job", "Related Job"], ["output", "Output"], ["recovery", "Recovery"], ["json", "Debug JSON"]
                        ].map(([tab, label]) => <button key={tab} className={runtimeDrawerTab === tab ? "active" : ""} onClick={() => setRuntimeDrawerTab(tab as typeof runtimeDrawerTab)}>{label}</button>)}
                      </div>

                      {runtimeDrawerTab === "overview" ? (
                        <div className="resourceDrawerBody">
                          <div className="resourceMetaGrid detail">
                            <span>Runtime ID</span><strong>{selectedRuntime.id}</strong>
                            <span>Status</span><strong>{selectedRuntime.status}</strong>
                            <span>Job</span><strong>{displayShortId(selectedRuntime.jobId)}</strong>
                            <span>Target Stage</span><strong>{selectedRuntimeJob?.targetStageType ?? "-"}</strong>
                            <span>Workflow</span><strong>{selectedRuntimeSourceBatch?.workflowId ? displayShortId(selectedRuntimeSourceBatch.workflowId) : "-"}</strong>
                            <span>Character Group</span><strong>{batchGroupId(selectedRuntimeSourceBatch) ? groups.find((group) => group.id === batchGroupId(selectedRuntimeSourceBatch))?.name ?? "-" : "-"}</strong>
                            <span>Source Batch</span><strong>{displayShortId(selectedRuntimeSourceBatch?.id)}</strong>
                            <span>Host</span><strong>{selectedRuntime.hostId ?? "-"}</strong>
                            <span>Instance</span><strong>{selectedRuntime.instanceId ?? "-"}</strong>
                            <span>ADB</span><strong>{selectedRuntimeInstance?.adbId ?? "-"}</strong>
                            <span>Started</span><strong>{displayDateTime(selectedRuntime.startedAt ?? selectedRuntime.updatedAt)}</strong>
                            <span>Finished</span><strong>{displayDateTime(selectedRuntime.finishedAt ?? undefined)}</strong>
                            <span>Duration</span><strong>{displayDuration(selectedRuntime.startedAt ?? selectedRuntime.updatedAt, selectedRuntime.finishedAt)}</strong>
                          </div>
                          <div className="postPreview"><strong>Error</strong><p>{findJobError(selectedRuntimeJob, selectedRuntime, scriptRun) || "No error reported."}</p></div>
                          <div className="resourceActions">
                            <button className="dangerButton" onClick={() => deleteSelectedRuntime(selectedRuntime)}><Trash2 size={15} /> Delete Runtime Session</button>
                          </div>
                        </div>
                      ) : null}

                      {runtimeDrawerTab === "checkpoint" ? (
                        <div className="resourceDrawerBody">
                          <div className="resourceMetaGrid detail">
                            <span>Current Step</span><strong>{selectedRuntime.currentStepNo}</strong>
                            <span>Last Successful Step</span><strong>{getString(getRecord(selectedRuntime.checkpoint).lastSuccessfulStepNo) || "-"}</strong>
                            <span>Job</span><strong>{displayShortId(selectedRuntime.jobId)}</strong>
                            <span>Allocation</span><strong>{getString(getRecord(selectedRuntime.checkpoint).allocationId) || jobPayloadString(selectedRuntimeJob ?? { id: "", sourceBatchId: "", targetStageType: "", status: "", createdAt: "" }, "allocationId") || "-"}</strong>
                            <span>Host</span><strong>{selectedRuntime.hostId ?? "-"}</strong>
                            <span>Instance</span><strong>{selectedRuntime.instanceId ?? "-"}</strong>
                            <span>Updated</span><strong>{displayDateTime(selectedRuntime.updatedAt)}</strong>
                          </div>
                          <details className="resourceCreatePanel"><summary>Raw checkpoint JSON</summary><pre className="jsonBlock">{compactJson(selectedRuntime.checkpoint)}</pre></details>
                        </div>
                      ) : null}

                      {runtimeDrawerTab === "timeline" ? (
                        <div className="resourceDrawerBody">
                          <div className="runtimeTimelineStrip">{(scriptRun?.steps ?? selectedRuntime.steps ?? []).map((step) => <span className={step.status.toLowerCase()} key={step.id}>{step.stepType} {step.status === "COMPLETED" ? "✓" : step.status === "FAILED" ? "✗" : ""}</span>)}</div>
                          {(scriptRun?.steps ?? selectedRuntime.steps ?? []).map((step) => {
                            const url = findUrl(step.output);
                            return (
                              <article className="runtimeStepCard" key={step.id}>
                                <header><strong>{step.stepNo}. {step.stepType}</strong><span className="statusPill">{step.status}</span></header>
                                <small>{displayDateTime(step.startedAt ?? undefined)} → {displayDateTime(step.finishedAt ?? undefined)} / {displayDuration(step.startedAt, step.finishedAt)}</small>
                                <p>Input: {scriptStepSummary({ config: step.input ?? {} })}</p>
                                <p>Output: {scriptStepSummary({ config: step.output ?? {} })}</p>
                                {step.errorMessage ? <span className="jobErrorBadge">{step.errorMessage}</span> : null}
                                {url ? <img src={mediaUrl(url)} alt={`${step.stepType} output`} /> : null}
                              </article>
                            );
                          })}
                          {!(scriptRun?.steps ?? selectedRuntime.steps ?? []).length ? <p className="emptyDetail">No script steps recorded.</p> : null}
                        </div>
                      ) : null}

                      {runtimeDrawerTab === "host" ? (
                        <div className="resourceDrawerBody">
                          <div className="resourceMetaGrid detail">
                            <span>Host</span><strong>{selectedRuntimeHost?.name ?? selectedRuntime.hostId ?? "-"}</strong>
                            <span>Host Health</span><strong>{selectedRuntimeHost?.status ?? "-"}</strong>
                            <span>Instance</span><strong>{selectedRuntime.instanceId ?? "-"}</strong>
                            <span>ADB</span><strong>{selectedRuntimeInstance?.adbId ?? "-"}</strong>
                            <span>Pool</span><strong>{selectedRuntimeInstance?.currentPoolType ?? "-"}</strong>
                            <span>Capabilities</span><strong>{selectedRuntimeInstance ? instanceCapabilityLabels(selectedRuntimeInstance).join(", ") || "-" : "-"}</strong>
                          </div>
                          <div className="resourceActions">
                            <button disabled={!selectedRuntime.instanceId} onClick={() => runtimeAction("test-screenshot", selectedRuntime)}>Test Screenshot</button>
                            <button disabled={!selectedRuntimeInstance?.adbId} onClick={() => runRuntimeHostAction(selectedRuntime, "send-text")}>Send Test Text</button>
                            <button disabled={!selectedRuntimeInstance?.adbId} onClick={() => runRuntimeHostAction(selectedRuntime, "download-latest")}>Download Latest</button>
                          </div>
                          <pre className="jsonBlock">{compactJson(hostResult)}</pre>
                        </div>
                      ) : null}

                      {runtimeDrawerTab === "job" ? (
                        <div className="resourceDrawerBody">
                          {selectedRuntimeJob ? (
                            <>
                              <div className="resourceMetaGrid detail"><span>Job</span><strong>{selectedRuntimeJob.id}</strong><span>Status</span><strong>{selectedRuntimeJob.status}</strong><span>Stage</span><strong>{selectedRuntimeJob.targetStageType}</strong><span>Source Batch</span><strong>{displayShortId(selectedRuntimeJob.sourceBatchId)}</strong><span>Output Batch</span><strong>{displayShortId(selectedRuntimeOutputBatches[0]?.id)}</strong></div>
                              <button onClick={() => { setManagementSection("jobs"); loadJobDetail(selectedRuntimeJob); }}>Open job</button>
                            </>
                          ) : <p className="emptyDetail">No related job found.</p>}
                        </div>
                      ) : null}

                      {runtimeDrawerTab === "output" ? (
                        <div className="resourceDrawerBody">
                          {selectedRuntimeOutputBatches.map((batch) => <button className="resourceRelatedRow" key={batch.id} onClick={() => { setManagementSection("production-resources"); setSelectedResourceId(batch.id); }}><strong>{batch.batchType}</strong><span>{batch.status}</span><small>{batch.id}</small></button>)}
                          {selectedRuntimeOutputAssets.map((asset) => <div className="assetPreview" key={asset.id}>{listImageUrl(asset) ? <img src={listImageUrl(asset)} alt={asset.name} /> : <span>{asset.name}</span>}</div>)}
                          {!selectedRuntimeOutputBatches.length ? <p className="emptyDetail">No output batch yet.</p> : null}
                        </div>
                      ) : null}

                      {runtimeDrawerTab === "recovery" ? (
                        <div className="resourceDrawerBody">
                          {selectedRuntime.status === "FAILED_RECOVERABLE" ? <div className="adminNotice"><strong>Recoverable Runtime</strong><span>This runtime failed with a recoverable error. Factory can allocate a new eligible STANDBY instance and resume from checkpoint.</span></div> : <p className="emptyDetail">No recoverable failure.</p>}
                          <div className="resourceActions"><button disabled={selectedRuntime.status !== "FAILED_RECOVERABLE"} onClick={() => runtimeAction("recover", selectedRuntime)}>Recover</button><button disabled={selectedRuntime.status !== "FAILED_RECOVERABLE"} onClick={() => runtimeAction("mark-unrecoverable", selectedRuntime)}>Mark Unrecoverable</button></div>
                          <pre className="jsonBlock">{compactJson({ checkpoint: selectedRuntime.checkpoint, eligibleStandbyInstances: instances.filter((instance) => (instance.currentPoolType ?? "") === "STANDBY") })}</pre>
                        </div>
                      ) : null}

                      {runtimeDrawerTab === "json" ? <div className="resourceDrawerBody"><pre className="jsonBlock">{compactJson({ runtimeSession: selectedRuntime, checkpoint: selectedRuntime.checkpoint, context: selectedRuntime.context, scriptRun, job: selectedRuntimeJob })}</pre></div> : null}
                    </>
                  ) : <p className="emptyDetail">Run or execute a job to create a runtime session.</p>}
                </aside>
              </div>
            </div>
          ) : null}

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
                    {renderInstanceScreenshotPreview(instance)}
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
          <button className="secondaryButton" onClick={() => { refreshQueue(); loadAssetCenterItems(); }} disabled={busy}>
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
                setAssetLibraryCategoryFilter("");
                setAssetStatusFilter("");
                setAssetSourceFilter("");
                setAssetTagFilter("");
                setAssetAttributeFilter("");
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
            {["PROMPT_TEMPLATE", "POST_TEMPLATE", "PRODUCTION_RESOURCE"].includes(assetTab) ? (
              <>
                <div className="panelHeader compact">
                  <ClipboardList size={18} />
                  <h2>Source Module</h2>
                </div>
                <p className="emptyDetail">
                  Asset Center aggregates this tab from original modules. It does not create duplicate asset rows.
                </p>
                {assetTab === "PROMPT_TEMPLATE" || assetTab === "POST_TEMPLATE" ? (
                  <button className="primaryButton" onClick={() => { setPage("management"); setManagementSection("prompt-templates"); }}>Open Prompt Templates</button>
                ) : (
                  <button className="primaryButton" onClick={() => { setPage("management"); setManagementSection("production-resources"); }}>Open Production Resources</button>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </aside>

          <section className="panel assetMainPanel">
            <div className="assetFilters">
              <label>Search<input value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} placeholder="Search names, tags, metadata" /></label>
              <label>Category<select value={assetLibraryCategoryFilter} onChange={(event) => setAssetLibraryCategoryFilter(event.target.value)}><option value="">All categories</option>{assetCenterCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              <label>Status<select value={assetStatusFilter} onChange={(event) => setAssetStatusFilter(event.target.value)}><option value="">All status</option>{assetCenterStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label>Source<select value={assetSourceFilter} onChange={(event) => setAssetSourceFilter(event.target.value)}><option value="">All modules</option>{assetCenterSourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
              <label>Tag / Variable<select value={assetTagFilter} onChange={(event) => setAssetTagFilter(event.target.value)}><option value="">All tags</option>{assetCenterTagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label>
              <label>Attribute<select value={assetAttributeFilter} onChange={(event) => setAssetAttributeFilter(event.target.value)}><option value="">All attributes</option>{assetCenterAttributeOptions.map((attribute) => <option key={attribute} value={attribute}>{attribute}</option>)}</select></label>
              <label>Updated Date<input type="date" value={assetUpdatedDateFilter} onChange={(event) => setAssetUpdatedDateFilter(event.target.value)} /></label>
            </div>

            <div className="assetWorkspace">
              <div className="assetList">
                {assetCenterItems.slice(0, 80).map((item) => {
                  const sourceAsset = item.sourceModule === "assets" ? assets.find((asset) => asset.id === item.sourceId) : null;
                  const thumbUrl = item.thumbnailUrl ? mediaUrl(item.thumbnailUrl) : sourceAsset ? listImageUrl(sourceAsset) : "";
                  return (
                    <button className={`assetCard ${selectedAssetCenterItemId === item.id ? "selected" : ""}`} key={item.id} onClick={() => { setSelectedAssetCenterItemId(item.id); if (sourceAsset) setSelectedAssetId(sourceAsset.id); }}>
                      <div className="assetPreview">
                        {thumbUrl ? <img src={thumbUrl} alt={item.title} /> : <span>{item.itemType}</span>}
                      </div>
                      <strong>{item.title}</strong>
                      <small>{item.subtitle ?? item.category ?? item.sourceModule}</small>
                      <span>{item.status ?? "-"}</span>
                      <small>{item.sourceModule} / {displayShortId(item.sourceId)}</small>
                      {item.previewText ? <p>{item.previewText}</p> : null}
                      <span className="poolBadgeList">{(item.tags ?? []).slice(0, 4).map((tag) => <span className="poolBadge" key={tag}>{tag}</span>)}</span>
                    </button>
                  );
                })}
                {!assetCenterItems.length ? <p className="emptyDetail">{assetCenterEmptyState()}</p> : null}
              </div>

              <aside className="assetInspector">
                <div className="panelHeader compact">
                  <Search size={18} />
                  <h2>Preview</h2>
                </div>
                {selectedAssetCenterItem ? (
                  <>
                    <div className="assetHeroPreview">
                      {selectedAssetCenterItem.sourceModule === "assets" && selectedAsset && originalImageUrl(selectedAsset)
                        ? <img src={originalImageUrl(selectedAsset)} alt={selectedAssetCenterItem.title} />
                        : <pre>{selectedAssetCenterItem.previewText || compactJson(selectedAssetCenterItem.metadata)}</pre>}
                    </div>
                    <div className="detailList">
                      <span>ID <b>{displayShortId(selectedAssetCenterItem.sourceId)}</b></span>
                      <span>Item Type <b>{selectedAssetCenterItem.itemType}</b></span>
                      <span>Category <b>{selectedAssetCenterItem.category ?? "-"}</b></span>
                      <span>Status <b>{selectedAssetCenterItem.status ?? "-"}</b></span>
                      <span>Source <b>{selectedAssetCenterItem.sourceModule}</b></span>
                      <span>Updated <b>{displayDateTime(selectedAssetCenterItem.updatedAt ?? undefined)}</b></span>
                    </div>
                    <div className="controlActions">
                      <button onClick={() => openAssetCenterItem(selectedAssetCenterItem)}>Open Source</button>
                      {selectedAssetCenterItem.sourceModule === "prompt_templates" ? <button onClick={() => { setPage("management"); setManagementSection("prompt-templates"); openPromptTemplate(selectedAssetCenterItem.sourceId, "preview"); }}>Preview Render</button> : null}
                      {selectedAssetCenterItem.sourceModule === "prompt_templates" ? <button onClick={() => duplicateAssetCenterPrompt(selectedAssetCenterItem)}>Duplicate</button> : null}
                    </div>
                    {selectedAssetCenterItem.sourceModule === "assets" && selectedAsset ? (
                      <>
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
                      </>
                    ) : null}
                    <div className="assetSection">
                      <strong>Raw JSON</strong>
                      <pre className="jsonBlock">{compactJson(selectedAssetCenterItem)}</pre>
                    </div>
                  </>
                ) : <p className="emptyDetail">{assetCenterEmptyState()}</p>}
              </aside>
            </div>
            <small className="emptyDetail">Showing {assetCenterItems.length} of {assetCenterTotal} unified library items.</small>
          </section>
        </div>
      </section>
      ) : page === "studio" ? (
      <section className="studioWorkspace">
        <div className="studioSummaryBar panel">
          <div>
            <strong>Production Studio</strong>
            <small>Guided setup for resource-driven content production</small>
          </div>
          <span className="statusPill">{selectedStudioGroup?.name ?? "No group selected"}</span>
          <span className="statusPill">{selectedWorkflow?.name ?? "No workflow selected"}</span>
          <span className={`readinessBadge ${studioReadinessWarnings.length ? "warning" : "ready"}`}>{studioReadinessWarnings.length ? `${studioReadinessWarnings.length} warnings` : "Ready to launch"}</span>
        </div>

        <div className="studioGuidedLayout">
          <main className="studioSteps">
            <section className="studioStep panel">
              <header><span>1</span><div><strong>Select Character Group</strong><small>Character Group is the production unit. Characters keep ownership of original images.</small></div></header>
              <div className="studioFilters">
                <label>Search<input value={studioGroupFilters.search} onChange={(event) => setStudioGroupFilters({ ...studioGroupFilters, search: event.target.value })} /></label>
                <label>Group Size<input type="number" value={studioGroupFilters.groupSize} onChange={(event) => setStudioGroupFilters({ ...studioGroupFilters, groupSize: event.target.value })} /></label>
                <label><input type="checkbox" checked={studioGroupFilters.readyOnly} onChange={(event) => setStudioGroupFilters({ ...studioGroupFilters, readyOnly: event.target.checked })} /> Ready only</label>
                <label><input type="checkbox" checked={studioGroupFilters.missingImages} onChange={(event) => setStudioGroupFilters({ ...studioGroupFilters, missingImages: event.target.checked })} /> Missing images</label>
                <label><input type="checkbox" checked={studioGroupFilters.recentlyCreated} onChange={(event) => setStudioGroupFilters({ ...studioGroupFilters, recentlyCreated: event.target.checked })} /> Recent</label>
              </div>
              <div className="studioGroupGrid">
                {filteredStudioGroups.map((group) => (
                  <button className={`studioGroupCard ${selectedPrimaryGroup === group.id ? "selected" : ""}`} key={group.id} onClick={() => { setSelectedGroups([group.id]); openCharacterGroup(group.id).catch(() => undefined); }}>
                    <div><strong>{group.name}</strong><span className={`readinessBadge ${groupReadinessClass(group.readiness)}`}>{group.readiness?.label ?? group.status}</span></div>
                    <small>{group.memberCount ?? 0} members / {group.attributesSummary ?? "No attributes"}</small>
                    <div className="studioMemberThumbs">{(group.membersPreview ?? []).slice(0, 8).map((member) => <span key={member.memberId ?? member.character.id}>{listImageUrl(member.youngOriginalImage ?? member.character.sourceImages?.youngOriginalImage) ? <img src={listImageUrl(member.youngOriginalImage ?? member.character.sourceImages?.youngOriginalImage)} alt={member.character.name} /> : member.character.name.slice(0, 1)}</span>)}</div>
                    <small>History {group.productionBatchCount ?? 0} / Updated {displayDateTime(group.updatedAt ?? undefined)}</small>
                  </button>
                ))}
              </div>
              {selectedStudioMembers.length ? (
                <div className="studioCharactersStrip">
                  {selectedStudioMembers.map((member) => {
                    const young = member.youngOriginalImage ?? member.character.sourceImages?.youngOriginalImage;
                    const old = member.oldOriginalImage ?? member.character.sourceImages?.oldOriginalImage;
                    return <article key={member.memberId ?? member.character.id}><div>{listImageUrl(young) ? <img src={listImageUrl(young)} alt={`${member.character.name} young`} /> : <span>Young missing</span>}{listImageUrl(old) ? <img src={listImageUrl(old)} alt={`${member.character.name} old`} /> : <span>Old missing</span>}</div><strong>{member.character.name}</strong><small>{member.character.status ?? "-"} / age {member.character.age ?? "-"}</small></article>;
                  })}
                </div>
              ) : null}
            </section>

            <section className="studioStep panel">
              <header><span>2</span><div><strong>Configure Attributes</strong><small>Dynamic attributes are stored as production attributes snapshot.</small></div></header>
              <div className="studioAttributeGrid">
                {studioAttributes.map((attribute) => {
                  const key = normalizeAttributeKey(attribute.key || attribute.name);
                  const suggestions = [
                    ...(attributePresets[key] ?? []),
                    ...((selectedGroupDetail?.attributeSuggestions ?? []).filter((item) => normalizeAttributeKey(item.key) === key && item.value).map((item) => String(item.value)))
                  ];
                  return (
                    <label key={attribute.id}>{attribute.name}
                      <input list={`studio-attr-${attribute.id}`} value={attributeValues[key] ?? ""} onChange={(event) => setAttributeValues((current) => ({ ...current, [key]: event.target.value }))} placeholder="custom value" />
                      <datalist id={`studio-attr-${attribute.id}`}>{[...new Set(suggestions)].map((value) => <option key={value} value={value} />)}</datalist>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="studioStep panel">
              <header><span>3</span><div><strong>Select Workflow Template</strong><small>Workflow is a resource-driven production template.</small></div></header>
              <div className="studioWorkflowGrid">
                {studioWorkflowCards.map((workflow) => (
                  <button className={`workflowCard ${selectedWorkflow?.id === workflow.id ? "selected" : ""}`} key={workflow.id} onClick={() => setSelectedWorkflowId(workflow.id)}>
                    <div className="scriptCardHeader"><strong>{workflow.name}</strong><span className="resourceTypeBadge">{workflowModeLabel(workflow)}</span></div>
                    <small>{workflowCapacitySummary(workflow.capacityConfig)}</small>
                    <div className="resourceBadgeRow">{workflowJobTypes.filter((jobType) => compactJson(workflow.resourceRules ?? workflow.promptMapping ?? {}).includes(jobType)).map((jobType) => <span className="poolBadge" key={jobType}>{jobType}</span>)}</div>
                    <small>Music {getString(workflow.musicPolicy?.mode) || "default"} / Post {Object.keys(workflow.postContentPolicy ?? {}).length ? "enabled" : "default"}</small>
                  </button>
                ))}
              </div>
              <div className="studioPipeline">
                {["CHARACTER_GROUP", "IMAGE_EDIT", "IMAGE_BATCH", "VIDEO_GENERATE", "VIDEO_BATCH", "MUSIC_TRACK", "VIDEO_COMPOSE", "FINAL_VIDEO", "POST_CONTENT"].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
              </div>
            </section>

            <section className="studioStep panel">
              <header><span>4</span><div><strong>Review Prompts & Scripts</strong><small>Override choices apply only to this production launch.</small></div></header>
              <div className="studioMappingGrid">
                {studioPromptScriptRows.map((row) => (
                  <article key={row.jobType}>
                    <strong>{row.jobType}</strong>
                    <label>Prompt<select value={row.prompt?.id ?? ""} onChange={(event) => setPromptSelections((current) => ({ ...current, [row.jobType === "IMAGE_EDIT" ? "image" : row.jobType === "VIDEO_GENERATE" ? "video" : row.jobType === "MUSIC_GENERATE" ? "music" : "post"]: event.target.value }))}><option value="">No prompt</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
                    <label>Script<select value={row.script?.id ?? ""} disabled><option>{row.script?.name ?? "No script mapping"}</option></select></label>
                    <small>{row.prompt?.activeVersion ? `Prompt v${row.prompt.activeVersion.versionNo}` : "Prompt missing"} / {row.script?.status ?? "Script missing"}</small>
                  </article>
                ))}
              </div>
              <div className="previewStack">{(["image", "video", "music", "post"] as PromptKind[]).map((kind) => <article className="promptPreview" key={kind}><span>{kind} prompt</span><p>{previews[kind] || "Select a group and template to preview."}</p></article>)}</div>
            </section>

            <section className="studioStep panel">
              <header><span>5</span><div><strong>Configure Music / Post Policies</strong><small>Music is selected by policy, not Character Group ownership.</small></div></header>
              <div className="studioPolicyGrid">
                <article><strong>Music Policy</strong><label>Mode<select value={musicPolicyMode} onChange={(event) => setMusicPolicyMode(event.target.value)}>{musicPolicyModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label><p>{musicPolicyMode === "RANDOM_LIBRARY" ? "Choose reusable music randomly." : musicPolicyMode === "REQUIRE_MATCHED" ? "Wait for reusable music matching attributes." : "Create a dedicated music track if no match exists."}</p><div className="choiceRow">{musicMatchAttributeOptions.map((attribute) => <button className={musicMatchAttributes.includes(attribute) ? "choice active" : "choice"} key={attribute} onClick={() => toggleMusicMatchAttribute(attribute)}>{attribute}</button>)}</div></article>
                <article><strong>Post Content Policy</strong><label><input type="checkbox" checked={postPolicyEnabled} onChange={(event) => setPostPolicyEnabled(event.target.checked)} /> Enable POST_CONTENT</label><label>Platform<select value={postPolicyPlatform} onChange={(event) => setPostPolicyPlatform(event.target.value)}>{["facebook", "tiktok", "instagram", "youtube"].map((platform) => <option key={platform}>{platform}</option>)}</select></label><label>Hashtag Policy<input value={postHashtagPolicy} onChange={(event) => setPostHashtagPolicy(event.target.value)} /></label><label>CTA Policy<input value={postCtaPolicy} onChange={(event) => setPostCtaPolicy(event.target.value)} /></label></article>
              </div>
            </section>

            <section className="studioStep panel">
              <header><span>6</span><div><strong>Review Capacity & Readiness</strong><small>Warnings are shown before Launch Production.</small></div></header>
              <div className="capacityStageRows">{studioCapacityRows.map((row) => <div className={`capacityStageRow ${row.shortage ? "warning" : ""}`} key={row.stageType}><strong>{row.stageType}</strong><span>Required {row.required}</span><span>Standby capable {row.available}</span><b>{row.shortage ? `Shortage ${row.shortage}` : "OK"}</b></div>)}</div>
              <div className="capacityHints">{studioReadinessWarnings.map((warning) => <span key={warning}>{warning}</span>)}{!studioReadinessWarnings.length ? <span>All launch checks look good.</span> : null}</div>
            </section>

            <section className="studioStep panel">
              <header><span>7</span><div><strong>Launch Production</strong><small>Create resources and jobs. Execution remains manual unless existing settings trigger it.</small></div></header>
              <div className="resourceActions"><button onClick={saveStudioDraft}>Save Draft</button>{studioDrafts.slice(0, 3).map((draft) => <button key={String(draft.id)} onClick={() => loadStudioDraft(draft)}>Load {String(draft.name ?? "Draft")}</button>)}<button className="primaryButton compact" onClick={launchStudioProduction} disabled={busy || !selectedPrimaryGroup || !selectedWorkflow}>{busy ? <Loader2 className="spin" size={16} /> : <Rocket size={16} />} Launch Production</button><button onClick={() => setPage("production-jobs")}>Open Production Control Center</button></div>
              {launchedJobs.length ? <div className="launchResult"><strong>Created jobs</strong>{launchedJobs.map((job) => <span key={job.id}>{job.targetStageType} - {job.status}</span>)}</div> : null}
            </section>
          </main>

          <aside className="studioLivePreview panel">
            <div className="panelHeader compact"><Boxes size={18} /><h2>Production Plan Summary</h2></div>
            <div className="detailList">
              <span>Group <b>{selectedStudioGroup?.name ?? "-"}</b></span>
              <span>Workflow <b>{selectedWorkflow?.name ?? "-"}</b></span>
              <span>Characters <b>{selectedStudioMembers.length}</b></span>
              <span>Music <b>{musicPolicyMode}</b></span>
              <span>Capacity <b>{studioCapacityRows.some((row) => row.shortage) ? "PARTIAL" : "OK"}</b></span>
            </div>
            <div className="assetSection"><strong>Selected Attributes</strong>{Object.entries(attributeValues).map(([key, value]) => <span key={key}>{key}: {String(value)}</span>)}</div>
            <div className="assetSection"><strong>Expected Jobs</strong>{workflowJobTypes.filter((jobType) => postPolicyEnabled || jobType !== "POST_CONTENT").map((jobType) => <span key={jobType}>{jobType}</span>)}</div>
            <div className="assetSection"><strong>Expected Outputs</strong>{studioExpectedOutputs.map((output) => <span key={output}>{output}</span>)}</div>
            <div className="assetSection"><strong>Prompt Previews</strong>{Object.entries(previews).map(([kind, text]) => <small key={kind}>{kind}: {text ? text.slice(0, 120) : "-"}</small>)}</div>
          </aside>
        </div>
      </section>
      ) : (
      <section className="productionControlPage">
        <div className="jobsToolbar panel">
          <div className="jobsToolbarTitle">
            <ClipboardList size={18} />
            <div>
              <strong>Production Control Center</strong>
              <small>{managementFilteredJobs.length} jobs / last refresh {lastJobsRefreshAt ? displayDateTime(lastJobsRefreshAt) : "-"}</small>
            </div>
          </div>
          <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{productionQueueStatusOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          <label><span>Target Stage</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="">All stages</option>{jobStageOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          <label><span>Pool Type</span><select value={poolFilter} onChange={(event) => setPoolFilter(event.target.value)}><option value="">All pools</option>{poolTypeOptions.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
          <label className="toggleControl"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /> Auto 5s</label>
          <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}><RefreshCcw size={15} />Refresh</button>
        </div>

        <div className="resourceKpiBar">
          {[
            ["Pending Jobs", managementJobKpis.pending],
            ["Running Jobs", managementJobKpis.running],
            ["Completed Today", managementJobKpis.completedToday],
            ["Failed Jobs", managementJobKpis.failed],
            ["Recoverable Failures", managementJobKpis.recoverable],
            ["Waiting Capacity", managementJobKpis.waitingInstance],
            ["Waiting Music", managementJobKpis.waitingMusic],
            ["Waiting Resources", managementJobKpis.waitingResource],
            ["Final Outputs Today", managementJobKpis.finalOutputsToday],
            ["Post Contents Today", managementJobKpis.postContentsToday]
          ].map(([label, value]) => <div className="resourceKpiCard" key={label}><Boxes size={17} /><span>{label}</span><strong>{value}</strong></div>)}
        </div>

        <section className="panel productionPipelinePanel">
          <div className="panelHeader compact"><Rocket size={18} /><h2>Production Pipeline</h2></div>
          <div className="productionPipelineFlow">
            {productionPipelineStats.map((stage, index) => (
              <article key={stage.stage}>
                <strong>{stage.stage}</strong>
                <span>Pending: {stage.pending}</span>
                <span>Running: {stage.running}</span>
                <span>Completed: {stage.completed}</span>
                <span>Failed: {stage.failed}</span>
                {index < productionPipelineStats.length - 1 ? <b>↓</b> : null}
              </article>
            ))}
          </div>
        </section>

        <div className="resourceTabs">
          <button className={productionControlView === "group" ? "active" : ""} onClick={() => setProductionControlView("group")}>View By Character Group</button>
          <button className={productionControlView === "job" ? "active" : ""} onClick={() => setProductionControlView("job")}>View By Job</button>
        </div>

        {productionControlView === "group" ? (
          <section className="productionGroupBoard">
            {productionGroupTimelines.map((entry) => (
              <article className="productionGroupCard" key={entry.groupId} onClick={() => entry.jobs[0] ? loadJobDetail(entry.jobs[0]) : null}>
                <header>
                  <strong>{entry.group?.name ?? "Ungrouped"}</strong>
                  <span className="statusPill">{entry.group?.memberCount ?? 0} members</span>
                </header>
                <div className="productionTimeline">
                  {["CHARACTER_GROUP", "IMAGE_BATCH", "VIDEO_BATCH", "FINAL_VIDEO", "POST_CONTENT"].map((batchType) => {
                    const batch = entry.batches.find((item) => item.batchType === batchType);
                    return <span key={batchType} className={batch?.status === "READY" ? "ready" : batch?.status === "FAILED" ? "failed" : ""}>{batchType}<b>{batch?.status ?? "-"}</b></span>;
                  })}
                </div>
                <div className="productionTimeline">
                  {["IMAGE_EDIT", "VIDEO_GENERATE", "VIDEO_COMPOSE", "POST_CONTENT"].map((stage) => {
                    const job = entry.jobs.find((item) => item.targetStageType === stage);
                    return <span key={stage} className={job?.status === "COMPLETED" ? "ready" : productionJobStatus(job ?? { id: "", sourceBatchId: "", targetStageType: stage, status: "PENDING", createdAt: "" }) === "FAILED" ? "failed" : ""}>{stage}<b>{job ? productionJobStatus(job) : "-"}</b></span>;
                  })}
                </div>
              </article>
            ))}
            {!productionGroupTimelines.length ? <p className="emptyDetail">No production groups found.</p> : null}
          </section>
        ) : (
          <div className="managementJobBoard productionQueueBoard">
            {productionControlColumns.map((column) => (
              <section className="managementJobColumn" key={column.status}>
                <header><strong>{column.status}</strong><span>{column.items.length}</span></header>
                <div className="managementJobCards">{column.items.map((job) => renderManagementJobCard(job))}{!column.items.length ? <p className="emptyDetail">No jobs.</p> : null}</div>
              </section>
            ))}
          </div>
        )}

        <div className="productionControlGrid">
          <section className="panel">
            <div className="panelHeader compact"><Boxes size={18} /><h2>Capacity Visibility</h2></div>
            <div className="capacityStageRows">{productionCapacityRows.map((row) => <div className={`capacityStageRow ${row.shortage ? "warning" : ""}`} key={row.stageType}><strong>{row.stageType}</strong><span>Need {row.required}</span><span>Allocated {row.allocated}</span><span>Available {row.available}</span><b>{row.shortage ? "PARTIAL CAPACITY" : "OK"}</b></div>)}</div>
          </section>
          <section className="panel">
            <div className="panelHeader compact"><RefreshCcw size={18} /><h2>Recovery Center</h2></div>
            <div className="outputBatchList">{productionRecoveryJobs.slice(0, 8).map((job) => { const runtime = runtimeSessions.find((session) => session.jobId === job.id); return <div key={job.id}><strong>{job.targetStageType}</strong><small>{findJobError(job, runtime, scriptRuns.find((run) => run.runtimeSessionId === runtime?.id) ?? null) || "Recoverable failure"}</small><span>Checkpoint {runtime?.currentStepNo ?? "-"}</span><button disabled={!runtime} onClick={() => runtime && runtimeAction("recover", runtime)}>Recover</button></div>; })}{!productionRecoveryJobs.length ? <p className="emptyDetail">No recoverable failures.</p> : null}</div>
          </section>
          <section className="panel">
            <div className="panelHeader compact"><Sparkles size={18} /><h2>Output Center</h2></div>
            <div className="outputBatchList">{productionOutputCenter.slice(0, 10).map((batch) => <button key={batch.id} onClick={() => { setPage("management"); setManagementSection("production-resources"); setSelectedResourceId(batch.id); }}><strong>{batch.batchType}</strong><small>{batchDisplayName(batch, groups.find((group) => group.id === batchGroupId(batch)))}</small><span>{batch.status} / {batch.usageStatus}</span></button>)}{!productionOutputCenter.length ? <p className="emptyDetail">No outputs completed today.</p> : null}</div>
          </section>
          <section className="panel">
            <div className="panelHeader compact"><Search size={18} /><h2>Smart Recommendations</h2></div>
            <div className="capacityHints">{productionRecommendations.map((hint) => <span key={hint}>{hint}</span>)}</div>
          </section>
        </div>

        {drawerOpen ? (
          <aside className="jobDrawer panel productionJobDrawer">
            <div className="drawerHeader"><div><strong>Production Job Detail</strong><small>{selectedJob ? `${selectedJob.targetStageType} / ${displayShortId(selectedJob.id)}` : "Select a job"}</small></div><button className="iconButton" onClick={() => setDrawerOpen(false)} title="Close job detail">x</button></div>
            {jobDetailLoading ? <div className="detailLoading"><Loader2 className="spin" size={15} />Loading job detail</div> : null}
            {jobDetailError ? <div className="detailError">{jobDetailError}</div> : null}
            {selectedJob ? (
              <>
                <div className="resourceDrawerTabs">{[
                  ["overview", "Production Context"], ["source", "Source Resources"], ["runtime", "Runtime"], ["script", "Script"], ["output", "Output"], ["lineage", "Error"], ["json", "Debug JSON"]
                ].map(([tab, label]) => <button key={tab} className={jobDrawerTab === tab ? "active" : ""} onClick={() => setJobDrawerTab(tab as typeof jobDrawerTab)}>{label}</button>)}</div>
                <div className="resourceDrawerBody">
                  {jobDrawerTab === "overview" ? <><div className="resourceMetaGrid detail"><span>Character Group</span><strong>{selectedJobGroup?.name ?? "-"}</strong><span>Members</span><strong>{selectedJobGroup?.memberCount ?? "-"}</strong><span>Workflow</span><strong>{selectedJobWorkflow?.name ?? "-"}</strong><span>Music Policy</span><strong>{compactJson(selectedJobWorkflow?.musicPolicy ?? {}).slice(0, 80)}</strong><span>Post Policy</span><strong>{compactJson(selectedJobWorkflow?.postContentPolicy ?? {}).slice(0, 80)}</strong></div><pre className="jsonBlock">{compactJson(selectedJobSourceBatch?.attributes ?? selectedJobGroup)}</pre></> : null}
                  {jobDrawerTab === "source" ? <><div className="outputBatchList">{[selectedJobSourceBatch, ...outputBatches].filter(Boolean).map((batch) => <div key={(batch as ProductionBatch).id}><strong>{(batch as ProductionBatch).batchType}</strong><small>{(batch as ProductionBatch).id}</small><span>{(batch as ProductionBatch).status} / {(batch as ProductionBatch).usageStatus}</span></div>)}</div><div className="resourcePreviewGrid">{selectedJobOutputAssets.slice(0, 8).map((asset) => listImageUrl(asset) ? <img key={asset.id} src={listImageUrl(asset)} alt={asset.name} /> : null)}</div></> : null}
                  {jobDrawerTab === "runtime" ? <><div className="detailList"><span>Runtime <b>{runtimeSession?.id ?? "-"}</b></span><span>Status <b>{runtimeSession?.status ?? "-"}</b></span><span>Step <b>{runtimeSession?.currentStepNo ?? "-"}</b></span><span>Host <b>{runtimeSession?.hostId ?? "-"}</b></span><span>Instance <b>{runtimeSession?.instanceId ?? "-"}</b></span></div><div className="resourceActions"><button disabled={!runtimeSession || runtimeSession.status !== "FAILED_RECOVERABLE"} onClick={recoverRuntimeSession}>Recover</button><button disabled={!runtimeSession} onClick={() => runtimeSession && runtimeAction("test-screenshot", runtimeSession)}>Test Screenshot</button></div><pre className="jsonBlock">{compactJson(runtimeSession?.checkpoint ?? {})}</pre></> : null}
                  {jobDrawerTab === "script" ? <><div className="detailList"><span>Script Run <b>{scriptRun?.id ?? "-"}</b></span><span>Status <b>{scriptRun?.status ?? "-"}</b></span><span>Version <b>{displayShortId(scriptRun?.scriptVersionId)}</b></span></div><div className="scriptStepTable">{(scriptRun?.steps ?? []).map((step) => <div key={step.id}><span>{step.stepNo}</span><span>{step.stepType}</span><b>{step.status}</b><small>{step.errorMessage ?? findUrl(step.output) ?? ""}</small></div>)}{!scriptRun?.steps?.length ? <p className="emptyDetail">No script steps recorded.</p> : null}</div></> : null}
                  {jobDrawerTab === "output" ? <><div className="outputBatchList">{outputBatches.map((batch) => <button key={batch.id} onClick={() => { setPage("management"); setManagementSection("production-resources"); setSelectedResourceId(batch.id); }}><strong>{batch.batchType}</strong><small>{batch.id}</small><span>{batch.status} / {batch.usageStatus}</span></button>)}{!outputBatches.length ? <p className="emptyDetail">No output batches found.</p> : null}</div><div className="resourcePreviewGrid">{selectedJobOutputAssets.map((asset) => listImageUrl(asset) ? <img key={asset.id} src={listImageUrl(asset)} alt={asset.name} /> : null)}</div></> : null}
                  {jobDrawerTab === "lineage" ? <><div className="postPreview"><strong>Error Category</strong><p>{runtimeSession?.status === "FAILED_RECOVERABLE" ? "Recoverable" : selectedJob.status === "FAILED" ? "Non-Recoverable or unknown" : "No active error"}</p></div><div className="postPreview"><strong>Recommendation</strong><p>{findJobError(selectedJob, runtimeSession, scriptRun) || "Check capacity, resource availability, runtime checkpoint, and output lineage."}</p></div></> : null}
                  {jobDrawerTab === "json" ? <pre className="jsonBlock">{compactJson({ job: selectedJob, sourceBatch: selectedJobSourceBatch, runtimeSession, scriptRun, outputBatches, allocation: selectedJobAllocation })}</pre> : null}
                </div>
              </>
            ) : <p className="emptyDetail">Select a job to inspect production context.</p>}
          </aside>
        ) : null}
      </section>
      )}
    </main>
  );
}
