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

type InstancePool = {
  id: string;
  name: string;
  poolType: string;
  status: string;
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
  errorMessage?: string | null;
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
  errorMessage?: string | null;
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
type AppPage = "studio" | "production-jobs";

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
  VIDEO_COMPOSE: "VIDEO_COMPOSE"
};

const pageSizeOptions = [10, 20, 50];

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

function normalizeCategory(category: string) {
  const lower = category.toLowerCase();
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

export function App() {
  const [page, setPage] = useState<AppPage>("production-jobs");
  const [groups, setGroups] = useState<CharacterGroup[]>([]);
  const [attributes, setAttributes] = useState<GroupAttribute[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [pools, setPools] = useState<InstancePool[]>([]);
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

  const loadData = useCallback(async () => {
    setStatus("Loading studio data");
    const [groupData, attributeData, templateData, poolData, batchData, jobData, sessionData, scriptRunData] = await Promise.all([
      api<CharacterGroup[]>("/character-groups"),
      api<GroupAttribute[]>("/group-attributes"),
      api<PromptTemplate[]>("/prompt-templates"),
      api<InstancePool[]>("/instance-pools"),
      api<ProductionBatch[]>("/production-batches"),
      api<OrchestratorJob[]>("/orchestrator/jobs"),
      api<RuntimeSession[]>("/runtime-sessions"),
      api<ScriptRun[]>("/script-runs")
    ]);

    setGroups(groupData);
    setAttributes(attributeData);
    setTemplates(templateData);
    setPools(poolData);
    setBatches(batchData);
    setJobs(jobData);
    setRuntimeSessions(sessionData);
    setScriptRuns(scriptRunData);
    setSelectedGroups((current) => current.length ? current : groupData[0] ? [groupData[0].id] : []);

    const nextSelections = { image: "", video: "", music: "" };
    for (const template of templateData) {
      const kind = normalizeCategory(template.category) as PromptKind;
      if (!nextSelections[kind]) nextSelections[kind] = template.id;
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
          promptPreview: previews
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
    const [latestPools, latestBatches, latestJobs, latestSessions, latestScriptRuns] = await Promise.all([
      api<InstancePool[]>("/instance-pools"),
      api<ProductionBatch[]>("/production-batches"),
      api<OrchestratorJob[]>("/orchestrator/jobs"),
      api<RuntimeSession[]>("/runtime-sessions"),
      api<ScriptRun[]>("/script-runs")
    ]);
    setPools(latestPools);
    setBatches(latestBatches);
    setJobs(latestJobs);
    setRuntimeSessions(latestSessions);
    setScriptRuns(latestScriptRuns);
    return {
      batches: latestBatches,
      jobs: latestJobs,
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

  async function runJobAction(job: OrchestratorJob, action: "allocate" | "execute-mock" | "execute-image-edit") {
    setBusy(true);
    setStatus(`${action} ${job.targetStageType}`);
    try {
      const path = action === "execute-mock"
        ? `/job-executor/jobs/${job.id}/execute-mock`
        : action === "execute-image-edit"
          ? `/job-executor/jobs/${job.id}/execute-image-edit`
          : `/orchestrator/jobs/${job.id}/allocate`;
      await api(path, {
        method: "POST"
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

  return (
    <main className="studio">
      <header className="topbar">
        <div>
          <p className="eyebrow">FB-CM Factory</p>
          <h1>{page === "production-jobs" ? "Production Jobs" : "Production Studio"}</h1>
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
        <button className={page === "production-jobs" ? "active" : ""} onClick={() => setPage("production-jobs")}>
          <ClipboardList size={16} />
          Production Jobs
        </button>
        <button className={page === "studio" ? "active" : ""} onClick={() => setPage("studio")}>
          <Sparkles size={16} />
          Production Studio
        </button>
      </nav>

      {page === "studio" ? (
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
