import {
  Boxes,
  Check,
  ClipboardList,
  Dices,
  Image,
  Loader2,
  Music,
  Play,
  Rocket,
  RefreshCcw,
  Search,
  Sparkles,
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
  status?: string;
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
  capacityConfig?: CapacityConfig;
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
  status: string;
  createdAt?: string;
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
  status: string;
  usageStatus: string;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
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
type ManagementSection =
  | "hosts"
  | "workflows"
  | "instances"
  | "instance-pools"
  | "scripts"
  | "prompt-templates"
  | "character-groups"
  | "production-resources"
  | "orchestrator-rules"
  | "jobs"
  | "runtime-sessions";
type AppPage = "control-center" | "studio" | "production-jobs" | "management";

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
const promptCategoryOptions = ["image", "video", "music", "POST_CONTENT"];
const musicPolicyModes = ["RANDOM_LIBRARY", "REQUIRE_MATCHED", "CREATE_DEDICATED"];
const musicMatchAttributeOptions = ["mood", "tempo", "style", "scene", "emotion", "tags"];

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

function getRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function getString(value: unknown) {
  return typeof value === "string" && value ? value : "";
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
  const [groups, setGroups] = useState<CharacterGroup[]>([]);
  const [attributes, setAttributes] = useState<GroupAttribute[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRunRecord[]>([]);
  const [pools, setPools] = useState<InstancePool[]>([]);
  const [instances, setInstances] = useState<InstanceRecord[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [jobs, setJobs] = useState<OrchestratorJob[]>([]);
  const [runtimeSessions, setRuntimeSessions] = useState<RuntimeSession[]>([]);
  const [scriptRuns, setScriptRuns] = useState<ScriptRun[]>([]);
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
  const [managementSection, setManagementSection] = useState<ManagementSection>("hosts");
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
  const [capacityResult, setCapacityResult] = useState<WorkflowCapacityResponse | null>(null);
  const [instancePoolStateFilter, setInstancePoolStateFilter] = useState("");
  const [instanceCapabilityFilter, setInstanceCapabilityFilter] = useState("");
  const [instanceRuntimeFilter, setInstanceRuntimeFilter] = useState("");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminJson, setAdminJson] = useState("{}");
  const [hostForm, setHostForm] = useState({ hostId: "", name: "", baseUrl: "http://localhost:3300", apiKey: "", status: "active" });
  const [poolForm, setPoolForm] = useState({ name: "", poolType: "IMAGE_EDIT", status: "active" });
  const [memberForm, setMemberForm] = useState({ instanceId: "", priority: "100", status: "ACTIVE", metadata: "{\n  \"hostId\": \"\",\n  \"localId\": \"\",\n  \"adbId\": \"\"\n}" });
  const [scriptForm, setScriptForm] = useState({ name: "", status: "active", steps: "{\n  \"steps\": [\n    { \"type\": \"wait\", \"config\": { \"ms\": 500 } }\n  ]\n}" });
  const [templateForm, setTemplateForm] = useState({ name: "", category: "image", status: "active", templateText: "Transform into a {scene} scene." });
  const [groupForm, setGroupForm] = useState({ name: "", description: "", status: "active", characterId: "", role: "member", attributeId: "", customValue: "" });
  const [batchForm, setBatchForm] = useState({ batchType: "IMAGE_BATCH", status: "NEW", usageStatus: "AVAILABLE", metadata: "{}" });
  const [ruleForm, setRuleForm] = useState({ name: "", triggerBatchType: "IMAGE_BATCH", triggerStatus: "READY", targetStageType: "VIDEO_GENERATE", priority: "100", config: "{}" });
  const [status, setStatus] = useState("Loading studio data");
  const [busy, setBusy] = useState(false);

  const selectedPrimaryGroup = selectedGroups[0] ?? "";
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
  const selectedScriptRun = useMemo(
    () => scriptRun ?? scriptRuns.find((run) => run.runtimeSessionId === selectedRuntime?.id) ?? null,
    [scriptRun, scriptRuns, selectedRuntime]
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
    readyBatches: batches.filter((batch) => batch.status === "READY" && ["AVAILABLE", "REUSABLE"].includes(batch.usageStatus)).length,
    pendingJobs: jobs.filter((job) => job.status === "PENDING").length,
    allocatedJobs: jobs.filter((job) => job.status === "ALLOCATED").length,
    runningRuntimeSessions: runtimeSessions.filter((session) => session.status === "RUNNING").length,
    failedRecoverableSessions: runtimeSessions.filter((session) => session.status === "FAILED_RECOVERABLE").length,
    finalOutputs: batches.filter((batch) => batch.batchType === "FINAL_VIDEO" && batch.status === "READY").length
  }), [batches, jobs, runtimeSessions]);
  const board = useMemo(() => ({
    inputGroups: batches.filter((batch) => batch.batchType === "CHARACTER_GROUP"),
    imageBatches: batches.filter((batch) => batch.batchType === "IMAGE_BATCH"),
    videoBatches: batches.filter((batch) => batch.batchType === "VIDEO_BATCH"),
    musicTracks: batches.filter((batch) => batch.batchType === "MUSIC_TRACK"),
    finalVideos: batches.filter((batch) => batch.batchType === "FINAL_VIDEO"),
    jobs,
    runtimeSessions
  }), [batches, jobs, runtimeSessions]);

  const loadData = useCallback(async () => {
    setStatus("Loading studio data");
    const [
      groupData,
      attributeData,
      templateData,
      hostData,
      workflowData,
      workflowRunData,
      instanceData,
      poolData,
      batchData,
      jobData,
      sessionData,
      scriptRunData,
      scriptData,
      ruleData
    ] = await Promise.all([
      api<CharacterGroup[]>("/character-groups"),
      api<GroupAttribute[]>("/group-attributes"),
      api<PromptTemplate[]>("/prompt-templates"),
      api<HostRecord[]>("/hosts"),
      api<WorkflowRecord[]>("/workflows"),
      api<WorkflowRunRecord[]>("/workflow-runs"),
      api<InstanceRecord[]>("/instances"),
      api<InstancePool[]>("/instance-pools"),
      api<ProductionBatch[]>("/production-batches"),
      api<OrchestratorJob[]>("/orchestrator/jobs"),
      api<RuntimeSession[]>("/runtime-sessions"),
      api<ScriptRun[]>("/script-runs"),
      api<ScriptRecord[]>("/scripts"),
      api<OrchestratorRule[]>("/orchestrator/rules")
    ]);

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
    const config = selectedWorkflowRun?.capacityConfig && Object.values(selectedWorkflowRun.capacityConfig).some((value) => Number(value) > 0)
      ? selectedWorkflowRun.capacityConfig
      : selectedWorkflow?.capacityConfig ?? {};
    setCapacityForm((current) => ({
      ...current,
      ...Object.fromEntries(capacityStageOptions.map((stageType) => [stageType, Number(config[stageType] ?? 0)]))
    }));
  }, [selectedWorkflow, selectedWorkflowRun]);

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
    const [latestHosts, latestWorkflows, latestWorkflowRuns, latestInstances, latestPools, latestBatches, latestJobs, latestSessions, latestScriptRuns, latestScripts, latestRules] = await Promise.all([
      api<HostRecord[]>("/hosts"),
      api<WorkflowRecord[]>("/workflows"),
      api<WorkflowRunRecord[]>("/workflow-runs"),
      api<InstanceRecord[]>("/instances"),
      api<InstancePool[]>("/instance-pools"),
      api<ProductionBatch[]>("/production-batches"),
      api<OrchestratorJob[]>("/orchestrator/jobs"),
      api<RuntimeSession[]>("/runtime-sessions"),
      api<ScriptRun[]>("/script-runs"),
      api<ScriptRecord[]>("/scripts"),
      api<OrchestratorRule[]>("/orchestrator/rules")
    ]);
    setHosts(latestHosts);
    setWorkflows(latestWorkflows);
    setWorkflowRuns(latestWorkflowRuns);
    setInstances(latestInstances);
    const latestPoolDetails = await Promise.all(latestPools.map((pool) =>
      api<InstancePool>(`/instance-pools/${pool.id}`).catch(() => pool)
    ));

    setPools(latestPoolDetails);
    setBatches(latestBatches);
    setJobs(latestJobs);
    setRuntimeSessions(latestSessions);
    setScriptRuns(latestScriptRuns);
    setScripts(latestScripts);
    setOrchestratorRules(latestRules);
    return {
      batches: latestBatches,
      jobs: latestJobs,
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

  async function runtimeAction(action: "test-screenshot" | "recover" | "mark-unrecoverable") {
    const session = selectedRuntime;
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
          <h1>
            {page === "control-center"
              ? "Factory Control Center"
              : page === "production-jobs"
                ? "Production Jobs"
                : "Production Studio"}
          </h1>
        </div>
        <div className="statusLine">
          {busy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
          <span>{status}</span>
          <button className="iconButton" onClick={() => loadData()} title="Refresh studio data">
            <RefreshCcw size={16} />
          </button>
        </div>
      </header>

      <nav className="appNav" aria-label="Main navigation">
        <button className={page === "control-center" ? "active" : ""} onClick={() => setPage("control-center")}>
          <Boxes size={16} />
          Control Center
        </button>
        <button className={page === "production-jobs" ? "active" : ""} onClick={() => setPage("production-jobs")}>
          <ClipboardList size={16} />
          Production Jobs
        </button>
        <button className={page === "studio" ? "active" : ""} onClick={() => setPage("studio")}>
          <Sparkles size={16} />
          Production Studio
        </button>
        <button className={page === "management" ? "active" : ""} onClick={() => setPage("management")}>
          <Users size={16} />
          Management
        </button>
      </nav>

      {page === "management" ? (
      <section className="managementPage">
        <aside className="managementMenu panel">
          <strong>Management</strong>
          {[
            ["hosts", "Hosts"],
            ["workflows", "Workflows"],
            ["instances", "Instances"],
            ["instance-pools", "Instance Pools"],
            ["scripts", "Scripts"],
            ["prompt-templates", "Prompt Templates"],
            ["character-groups", "Character Groups"],
            ["production-resources", "Production Resources"],
            ["orchestrator-rules", "Orchestrator Rules"],
            ["jobs", "Jobs"],
            ["runtime-sessions", "Runtime Sessions"]
          ].map(([id, label]) => (
            <button
              key={id}
              className={managementSection === id ? "active" : ""}
              onClick={() => setManagementSection(id as ManagementSection)}
            >
              {label}
            </button>
          ))}
        </aside>
        <section className="managementContent panel">
          <div className="managementHeader">
            <div>
              <h2>{managementSection.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ")}</h2>
              <small>Simple CRUD tools for operators</small>
            </div>
            <input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search/filter" />
            <button className="secondaryButton" onClick={() => refreshQueue()} disabled={busy}>
              <RefreshCcw size={15} />
              Refresh
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
                      <button onClick={() => adminAction("Testing screenshot", () => api(`/hosts/${host.id}/screenshot`, { method: "POST", body: JSON.stringify({ instanceId: hostInstanceId, adbId: hostAdbId }) }))}>Screenshot</button>
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
                            <span>{instance.maintenanceReason ?? "-"}</span>
                            <span className="poolBadgeList">{renderPoolBadges(instance.id)}</span>
                            <div>
                              <button onClick={() => instanceHostAction(instance, "screenshot")}>Screenshot</button>
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
                {capacityStageOptions.map((stageType) => (
                  <label key={stageType}>{stageType}<input type="number" min="0" value={capacityForm[stageType] ?? 0} onChange={(event) => setCapacityForm({ ...capacityForm, [stageType]: Number(event.target.value) })} /></label>
                ))}
                <button disabled={!selectedWorkflow} onClick={() => saveWorkflowCapacity("workflow")}>Save Workflow Capacity</button>
                <button disabled={!selectedWorkflowRun} onClick={() => saveWorkflowCapacity("run")}>Save Run Capacity</button>
                <button disabled={!selectedWorkflowRun} onClick={() => allocateWorkflowCapacity()}>Allocate Capacity</button>
                <button disabled={!selectedWorkflowRun} onClick={loadWorkflowRunCapacity}>Refresh Capacity</button>
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
                      <span>{instance.maintenanceReason ?? "-"}</span>
                      <span className="poolBadgeList">{renderPoolBadges(instance.id)}</span>
                      <button onClick={(event) => { event.stopPropagation(); instanceHostAction(instance, "screenshot"); }}>Screenshot</button>
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
                <label>Status<input value={scriptForm.status} onChange={(event) => setScriptForm({ ...scriptForm, status: event.target.value })} /></label>
                <button onClick={() => adminAction("Creating script", () => api("/scripts", { method: "POST", body: JSON.stringify({ name: scriptForm.name, status: scriptForm.status }) }))}>Create Script</button>
                <label>Script<select value={selectedScriptId} onChange={(event) => setSelectedScriptId(event.target.value)}>{scripts.map((script) => <option key={script.id} value={script.id}>{script.name}</option>)}</select></label>
                <label>Steps JSON<textarea value={scriptForm.steps} onChange={(event) => setScriptForm({ ...scriptForm, steps: event.target.value })} /></label>
                <button disabled={!selectedScriptId} onClick={() => adminAction("Creating script version", () => api(`/scripts/${selectedScriptId}/versions`, { method: "POST", body: JSON.stringify({ status: "active", definition: parseJsonText(scriptForm.steps) }) }))}>Create Version</button>
                <label>Runtime Session<select value={selectedRuntimeId} onChange={(event) => setSelectedRuntimeId(event.target.value)}><option value="">Select runtime</option>{runtimeSessions.map((session) => <option key={session.id} value={session.id}>{session.id}</option>)}</select></label>
                <button disabled={!selectedRuntimeId || !selectedScriptId} onClick={() => adminAction("Testing script run", () => api(`/runtime-sessions/${selectedRuntimeId}/run-script`, { method: "POST", body: JSON.stringify({ scriptId: selectedScriptId, context: {} }) }))}>Test Run</button>
              </div>
              <AdminSimpleList items={[...scripts, ...scriptRuns]} search={adminSearch} />
            </div>
          ) : null}

          {managementSection === "prompt-templates" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Name<input value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} /></label>
                <label>Category<select value={templateForm.category} onChange={(event) => setTemplateForm({ ...templateForm, category: event.target.value })}>{promptCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label>Status<input value={templateForm.status} onChange={(event) => setTemplateForm({ ...templateForm, status: event.target.value })} /></label>
                <button onClick={() => adminAction("Creating template", () => api("/prompt-templates", { method: "POST", body: JSON.stringify({ name: templateForm.name, category: templateForm.category, status: templateForm.status }) }))}>Create Template</button>
                <label>Template<select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
                <label>Template Text<textarea value={templateForm.templateText} onChange={(event) => setTemplateForm({ ...templateForm, templateText: event.target.value })} /></label>
                <button disabled={!selectedTemplateId} onClick={() => adminAction("Creating template version", () => api(`/prompt-templates/${selectedTemplateId}/versions`, { method: "POST", body: JSON.stringify({ templateText: templateForm.templateText, status: "draft" }) }))}>Create Version</button>
                <label>Group<select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <button disabled={!selectedTemplateId || !selectedGroupId} onClick={() => adminAction("Rendering preview", () => api("/prompt-builder/render", { method: "POST", body: JSON.stringify({ templateId: selectedTemplateId, groupId: selectedGroupId }) }))}>Render Preview</button>
              </div>
              <AdminSimpleList items={templates} search={adminSearch} />
            </div>
          ) : null}

          {managementSection === "character-groups" ? (
            <div className="adminGrid">
              <div className="adminForm">
                <label>Name<input value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} /></label>
                <label>Description<input value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} /></label>
                <button onClick={() => adminAction("Creating group", () => api("/character-groups", { method: "POST", body: JSON.stringify({ name: groupForm.name, description: groupForm.description, status: groupForm.status }) }))}>Create Group</button>
                <label>Group<select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
                <label>Character ID<input value={groupForm.characterId} onChange={(event) => setGroupForm({ ...groupForm, characterId: event.target.value })} /></label>
                <button disabled={!selectedGroupId} onClick={() => adminAction("Adding member", () => api(`/character-groups/${selectedGroupId}/members`, { method: "POST", body: JSON.stringify({ characterId: groupForm.characterId, role: groupForm.role }) }))}>Add Member</button>
                <label>Attribute<select value={groupForm.attributeId} onChange={(event) => setGroupForm({ ...groupForm, attributeId: event.target.value })}>{attributes.map((attr) => <option key={attr.id} value={attr.id}>{attr.name}</option>)}</select></label>
                <label>Custom Value<input value={groupForm.customValue} onChange={(event) => setGroupForm({ ...groupForm, customValue: event.target.value })} /></label>
                <button disabled={!selectedGroupId || !groupForm.attributeId} onClick={() => adminAction("Assigning attribute", () => api(`/character-groups/${selectedGroupId}/attributes`, { method: "POST", body: JSON.stringify({ attributeId: groupForm.attributeId, customValue: groupForm.customValue }) }))}>Assign Attribute</button>
                <button disabled={!selectedGroupId} onClick={() => adminAction("Creating production batch", () => api("/production-batches", { method: "POST", body: JSON.stringify({ batchType: "CHARACTER_GROUP", sourceGroupId: selectedGroupId, status: "READY", usageStatus: "AVAILABLE", metadata: { createdFrom: "Management" } }) }))}>Create Batch</button>
              </div>
              <AdminSimpleList items={groups} search={adminSearch} />
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
            <small>Production flow visibility and test controls</small>
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
            ["Ready Batches", kpis.readyBatches],
            ["Pending Jobs", kpis.pendingJobs],
            ["Allocated Jobs", kpis.allocatedJobs],
            ["Running Runtime Sessions", kpis.runningRuntimeSessions],
            ["Failed Recoverable Sessions", kpis.failedRecoverableSessions],
            ["Final Outputs", kpis.finalOutputs]
          ].map(([label, value]) => (
            <div className="kpiCard" key={String(label)}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="pipelineBoard">
          {[
            { title: "Input Groups", items: board.inputGroups, kind: "batch" },
            { title: "Image Batches", items: board.imageBatches, kind: "batch" },
            { title: "Video Batches", items: board.videoBatches, kind: "batch" },
            { title: "Music Tracks", items: board.musicTracks, kind: "batch" },
            { title: "Final Videos", items: board.finalVideos, kind: "batch" },
            { title: "Jobs", items: board.jobs, kind: "job" },
            { title: "Runtime Sessions", items: board.runtimeSessions, kind: "runtime" }
          ].map((column) => (
            <section className="pipelineColumn" key={column.title}>
              <h2>{column.title}</h2>
              <div className="pipelineCards">
                {column.items.slice(0, 12).map((item) => {
                  const isJob = column.kind === "job";
                  const isRuntime = column.kind === "runtime";
                  const batch = item as ProductionBatch;
                  const job = item as OrchestratorJob;
                  const runtime = item as RuntimeSession;
                  return (
                    <button
                      className="pipelineCard"
                      key={String(item.id)}
                      onClick={() => {
                        if (isJob) loadJobDetail(job);
                        else if (isRuntime) selectRuntimeSession(runtime);
                        else setSelectedBatchId(String(batch.id));
                      }}
                    >
                      <strong>{displayShortId(String(item.id))}</strong>
                      <span>{isJob ? job.targetStageType : isRuntime ? "Runtime" : batch.batchType}</span>
                      <small>{String(item.status)}</small>
                      {!isJob && !isRuntime ? <small>{batch.usageStatus}</small> : null}
                      <small>{displayDateTime(isRuntime ? runtime.updatedAt : isJob ? job.createdAt : batch.createdAt)}</small>
                      {isJob ? <em>source {displayShortId(job.sourceBatchId)}</em> : null}
                      {isRuntime ? <em>job {displayShortId(runtime.jobId)}</em> : null}
                    </button>
                  );
                })}
                {!column.items.length ? <p>No items</p> : null}
              </div>
            </section>
          ))}
        </div>

        <div className="controlDetails">
          <section className="panel controlPanel">
            <div className="panelHeader">
              <ClipboardList size={18} />
              <h2>Job Detail</h2>
            </div>
            {selectedJob ? (
              <>
                <div className="detailList">
                  <span>Job id <b>{selectedJob.id}</b></span>
                  <span>Source batch <b>{selectedJob.sourceBatchId}</b></span>
                  <span>Target stage <b>{selectedJob.targetStageType}</b></span>
                  <span>Status <b>{selectedJob.status}</b></span>
                  <span>Pool <b>{displayJobPool(selectedJob, pools)}</b></span>
                  <span>Instance <b>{displayJobInstance(selectedJob)}</b></span>
                  <span>Allocation <b>{displayJobAllocationMode(selectedJob)}</b></span>
                </div>
                <pre className="jsonBlock">{compactJson(selectedJob.payload)}</pre>
                <div className="controlActions">
                  {(["allocate", "execute-mock", "execute-image-edit", "start", "complete", "fail"] as const).map((action) => (
                    <button
                      key={action}
                      onClick={() => runJobAction(selectedJob, action)}
                      disabled={
                        busy
                        || (action === "allocate" && selectedJob.status !== "PENDING")
                        || (["execute-mock", "execute-image-edit", "start"].includes(action) && selectedJob.status !== "ALLOCATED")
                        || (action === "execute-image-edit" && selectedJob.targetStageType !== "IMAGE_EDIT")
                        || (action === "complete" && !["ALLOCATED", "RUNNING"].includes(selectedJob.status))
                        || (action === "fail" && ["COMPLETED", "FAILED", "CANCELLED"].includes(selectedJob.status))
                      }
                    >
                      {action === "execute-image-edit" ? "Execute IMAGE_EDIT" : action}
                    </button>
                  ))}
                  <button onClick={() => refreshQueue()} disabled={busy}>Refresh</button>
                </div>
              </>
            ) : (
              <p className="emptyDetail">Select a job from the board.</p>
            )}
          </section>

          <section className="panel controlPanel">
            <div className="panelHeader">
              <Play size={18} />
              <h2>Runtime Detail</h2>
            </div>
            {selectedRuntime ? (
              <>
                <div className="detailList">
                  <span>Runtime id <b>{selectedRuntime.id}</b></span>
                  <span>Status <b>{selectedRuntime.status}</b></span>
                  <span>Host <b>{selectedRuntime.hostId ?? "-"}</b></span>
                  <span>Instance <b>{selectedRuntime.instanceId ?? "-"}</b></span>
                  <span>Current step <b>{selectedRuntime.currentStepNo}</b></span>
                </div>
                <pre className="jsonBlock">{compactJson(selectedRuntime.checkpoint)}</pre>
                <div className="controlActions">
                  <button onClick={() => runtimeAction("test-screenshot")} disabled={busy}>Test Screenshot</button>
                  <button onClick={() => runtimeAction("recover")} disabled={busy || selectedRuntime.status !== "FAILED_RECOVERABLE"}>Recover</button>
                  <button onClick={() => runtimeAction("mark-unrecoverable")} disabled={busy}>Mark Unrecoverable</button>
                </div>
              </>
            ) : (
              <p className="emptyDetail">Select a runtime session from the board.</p>
            )}
          </section>

          <section className="panel controlPanel timelinePanel">
            <div className="panelHeader">
              <ClipboardList size={18} />
              <h2>Script Run Timeline</h2>
            </div>
            {selectedScriptRun ? (
              <div className="timelineList">
                <strong>{selectedScriptRun.status} / {selectedScriptRun.id}</strong>
                {(selectedScriptRun.steps ?? []).map((step) => {
                  const previewUrl = findUrl(step.output);
                  return (
                    <article className="timelineStep" key={step.id}>
                      <span>{step.stepNo}. {step.stepType}</span>
                      <b>{step.status}</b>
                      <small>{displayDateTime(step.startedAt ?? undefined)} - {displayDateTime(step.finishedAt ?? undefined)}</small>
                      {step.errorMessage ? <em>{step.errorMessage}</em> : null}
                      {previewUrl ? <img src={previewUrl} alt="step output preview" /> : null}
                      <pre>{compactJson(step.output)}</pre>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="emptyDetail">No script run selected.</p>
            )}
          </section>

          <section className="panel controlPanel">
            <div className="panelHeader">
              <Users size={18} />
              <h2>Host Agent Test</h2>
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
              <button onClick={() => runHostAction("screenshot")} disabled={busy}>Screenshot</button>
              <button onClick={() => runHostAction("tap")} disabled={busy}>Tap Test</button>
              <button onClick={() => runHostAction("send-text")} disabled={busy}>Send Text</button>
              <button onClick={() => runHostAction("download-latest")} disabled={busy}>Download Latest</button>
            </div>
            {adbDevices.length ? (
              <div className="deviceList">
                {adbDevices.map((device) => <button key={device.adbId} onClick={() => setHostAdbId(device.adbId)}>{device.adbId} / {device.state}</button>)}
              </div>
            ) : null}
            <pre className="jsonBlock">{compactJson(hostResult)}</pre>
          </section>
        </div>

        <div className="panel relationshipPanel">
          <div className="panelHeader">
            <Boxes size={18} />
            <h2>Visual Links</h2>
          </div>
          <div className="relationshipList">
            {selectedJob ? <span>Batch {displayShortId(selectedJob.sourceBatchId)} to Job {displayShortId(selectedJob.id)}</span> : null}
            {selectedJob && selectedRuntime ? <span>Job {displayShortId(selectedJob.id)} to Runtime {displayShortId(selectedRuntime.id)}</span> : null}
            {selectedRuntime && selectedScriptRun ? <span>Runtime {displayShortId(selectedRuntime.id)} to Script Run {displayShortId(selectedScriptRun.id)}</span> : null}
            {selectedJob && outputBatches.map((batch) => <span key={batch.id}>Job {displayShortId(selectedJob.id)} to Output Batch {displayShortId(batch.id)}</span>)}
            {!selectedJob && !selectedRuntime ? <span>Select a job or runtime to see links.</span> : null}
          </div>
        </div>

        <div className="panel debugPanel">
          <div className="drawerSectionHeader">
            <strong>Debug JSON</strong>
            <button className="secondaryButton" onClick={() => setDebugOpen((current) => !current)}>
              {debugOpen ? "Hide" : "Show"}
            </button>
          </div>
          {debugOpen ? (
            <div className="debugGrid">
              <pre>{compactJson(selectedBatch)}</pre>
              <pre>{compactJson(selectedJob)}</pre>
              <pre>{compactJson(selectedRuntime)}</pre>
              <pre>{compactJson(selectedScriptRun)}</pre>
            </div>
          ) : null}
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
