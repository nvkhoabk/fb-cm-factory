import { AppError } from "../shared/resource";

type HostAgentResponse = {
  ok?: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
    detail?: unknown;
  };
};

type HostAgentTarget = {
  baseUrl: string;
  apiKey: string;
};

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function requestAgent(
  target: HostAgentTarget,
  path: string,
  options: RequestInit = {}
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(buildUrl(target.baseUrl, path), {
      ...options,
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(target.apiKey ? { "x-agent-key": target.apiKey } : {}),
        ...(options.headers as Record<string, string> | undefined)
      },
      signal: controller.signal
    });

    const body = (await response.json().catch(() => ({}))) as HostAgentResponse;

    if (!response.ok || body.ok === false) {
      throw new AppError(
        body.error?.code ?? "HOST_AGENT_REQUEST_FAILED",
        body.error?.message ?? `Host Agent request failed with ${response.status}`,
        response.status >= 500 ? 502 : response.status,
        body.error?.detail
      );
    }

    return body.data ?? body;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("HOST_AGENT_UNAVAILABLE", "Host Agent is unavailable", 503);
  } finally {
    clearTimeout(timeout);
  }
}

function body(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

export const hostAgentClient = {
  healthCheckAgent(target: HostAgentTarget) {
    return requestAgent(target, "/health", { method: "GET" });
  },

  listInstances(target: HostAgentTarget) {
    return requestAgent(target, "/instances", { method: "GET" });
  },

  listAdbDevices(target: HostAgentTarget) {
    return requestAgent(target, "/adb/devices", { method: "GET" });
  },

  startInstance(target: HostAgentTarget, localId: string) {
    return requestAgent(target, `/ldplayer/instances/${encodeURIComponent(localId)}/start`, { method: "POST" });
  },

  stopInstance(target: HostAgentTarget, localId: string) {
    return requestAgent(target, `/ldplayer/instances/${encodeURIComponent(localId)}/stop`, { method: "POST" });
  },

  restartInstance(target: HostAgentTarget, localId: string) {
    return requestAgent(target, `/ldplayer/instances/${encodeURIComponent(localId)}/restart`, { method: "POST" });
  },

  takeScreenshot(target: HostAgentTarget, instanceId: string, adbId: string) {
    return requestAgent(target, `/instances/${encodeURIComponent(instanceId)}/screenshot`, {
      method: "POST",
      body: body({ instanceId, adbId })
    });
  },

  takeLiveScreenshot(target: HostAgentTarget, input: { instanceId: string; localId?: string | number; adbId: string }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/live-screenshot`, {
      method: "POST",
      body: body({ instanceId: input.instanceId, adbId: input.adbId })
    });
  },

  tap(target: HostAgentTarget, instanceId: string, adbId: string, x: number, y: number) {
    return requestAgent(target, `/instances/${encodeURIComponent(instanceId)}/tap`, {
      method: "POST",
      body: body({ instanceId, adbId, x, y })
    });
  },

  swipe(target: HostAgentTarget, input: {
    instanceId: string;
    adbId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    durationMs?: number;
  }) {
    return requestAgent(target, `/instances/${encodeURIComponent(input.instanceId)}/swipe`, {
      method: "POST",
      body: body({
        instanceId: input.instanceId,
        adbId: input.adbId,
        x1: input.x1,
        y1: input.y1,
        x2: input.x2,
        y2: input.y2,
        durationMs: input.durationMs
      })
    });
  },

  longPress(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    x: number;
    y: number;
    durationMs?: number;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/long-press`, {
      method: "POST",
      body: body({
        instanceId: input.instanceId,
        adbId: input.adbId,
        x: input.x,
        y: input.y,
        durationMs: input.durationMs
      })
    });
  },

  scrollToEnd(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    direction?: "down" | "up";
    iterations?: number;
    durationMs?: number;
    pauseMs?: number;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/scroll-to-end`, {
      method: "POST",
      body: body({
        instanceId: input.instanceId,
        adbId: input.adbId,
        direction: input.direction,
        iterations: input.iterations,
        durationMs: input.durationMs,
        pauseMs: input.pauseMs,
        startX: input.startX,
        startY: input.startY,
        endX: input.endX,
        endY: input.endY
      })
    });
  },

  sendText(target: HostAgentTarget, instanceId: string, adbId: string, text: string) {
    return requestAgent(target, `/instances/${encodeURIComponent(instanceId)}/send-text`, {
      method: "POST",
      body: body({ instanceId, adbId, text })
    });
  },

  sendKey(target: HostAgentTarget, instanceId: string, adbId: string, key: string | number) {
    return requestAgent(target, `/instances/${encodeURIComponent(instanceId)}/send-key`, {
      method: "POST",
      body: body({ instanceId, adbId, keyCode: key })
    });
  },

  downloadLatest(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    sourceDir?: string;
    sourceDirs?: string[];
    extensions?: string[];
    targetFolder?: string;
    deleteAfterPull?: boolean;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/download-latest`, {
      method: "POST",
      body: body({
        instanceId: input.instanceId,
        adbId: input.adbId,
        sourceDir: input.sourceDir,
        sourceDirs: input.sourceDirs,
        extensions: input.extensions,
        targetFolder: input.targetFolder,
        deleteAfterPull: input.deleteAfterPull
      })
    });
  },

  listDownloadCandidates(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    sourceDir?: string;
    sourceDirs?: string[];
    extensions?: string[];
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/list-download-candidates`, {
      method: "POST",
      body: body({
        instanceId: input.instanceId,
        adbId: input.adbId,
        sourceDir: input.sourceDir,
        sourceDirs: input.sourceDirs,
        extensions: input.extensions
      })
    });
  },

  clearDownload(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    sourceDir?: string;
    extensions?: string[];
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/clear-download`, {
      method: "POST",
      body: body({
        instanceId: input.instanceId,
        adbId: input.adbId,
        sourceDir: input.sourceDir,
        extensions: input.extensions
      })
    });
  },

  pushUploadFile(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    runtimeSessionId?: string;
    jobId?: string;
    assetId: string;
    sourceAbsolutePath: string;
    sourceBase64?: string;
    fileName?: string;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/push-upload-file`, {
      method: "POST",
      body: body(input)
    });
  },

  openFile(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    remotePath: string;
    mimeType?: string;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/open-file`, {
      method: "POST",
      body: body(input)
    });
  },

  cleanupUploadSession(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    runtimeSessionId?: string;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/cleanup-upload-session`, {
      method: "POST",
      body: body(input)
    });
  },

  cleanupUploadStaging(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    olderThanHours?: number;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/cleanup-upload-staging`, {
      method: "POST",
      body: body(input)
    });
  },

  cleanupFactoryTemp(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
    olderThanHours?: number;
    includeUploads?: boolean;
    includeLiveScreenshots?: boolean;
    includeDebugScreenshots?: boolean;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(target, `/instances/${encodeURIComponent(localId)}/cleanup-factory-temp`, {
      method: "POST",
      body: body(input)
    });
  },

  factoryTempUsage(target: HostAgentTarget, input: {
    instanceId: string;
    localId?: string | number;
    adbId: string;
  }) {
    const localId = input.localId === undefined || input.localId === null || input.localId === ""
      ? input.instanceId
      : String(input.localId);
    return requestAgent(
      target,
      `/instances/${encodeURIComponent(localId)}/factory-temp-usage?adbId=${encodeURIComponent(input.adbId)}`,
      { method: "GET" }
    );
  }
};
