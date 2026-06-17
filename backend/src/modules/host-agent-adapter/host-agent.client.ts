import { AppError } from "../shared/resource";

type HostAgentResponse = {
  ok?: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
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
        response.status >= 500 ? 502 : response.status
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

  takeScreenshot(target: HostAgentTarget, instanceId: string) {
    return requestAgent(target, `/instances/${encodeURIComponent(instanceId)}/screenshot`, {
      method: "POST",
      body: body({ adbId: instanceId })
    });
  },

  tap(target: HostAgentTarget, instanceId: string, x: number, y: number) {
    return requestAgent(target, `/instances/${encodeURIComponent(instanceId)}/tap`, {
      method: "POST",
      body: body({ adbId: instanceId, x, y })
    });
  },

  swipe(target: HostAgentTarget, input: {
    instanceId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    durationMs?: number;
  }) {
    return requestAgent(target, `/instances/${encodeURIComponent(input.instanceId)}/swipe`, {
      method: "POST",
      body: body({
        adbId: input.instanceId,
        x1: input.x1,
        y1: input.y1,
        x2: input.x2,
        y2: input.y2,
        durationMs: input.durationMs
      })
    });
  },

  sendText(target: HostAgentTarget, instanceId: string, text: string) {
    return requestAgent(target, `/instances/${encodeURIComponent(instanceId)}/send-text`, {
      method: "POST",
      body: body({ adbId: instanceId, text })
    });
  },

  sendKey(target: HostAgentTarget, instanceId: string, key: string | number) {
    return requestAgent(target, `/instances/${encodeURIComponent(instanceId)}/send-key`, {
      method: "POST",
      body: body({ adbId: instanceId, keyCode: key })
    });
  },

  downloadLatest(target: HostAgentTarget, input: {
    instanceId: string;
    sourceDir?: string;
    extensions?: string[];
    targetFolder?: string;
  }) {
    return requestAgent(target, `/instances/${encodeURIComponent(input.instanceId)}/download-latest`, {
      method: "POST",
      body: body({
        adbId: input.instanceId,
        sourceDir: input.sourceDir,
        extensions: input.extensions,
        targetFolder: input.targetFolder
      })
    });
  }
};
