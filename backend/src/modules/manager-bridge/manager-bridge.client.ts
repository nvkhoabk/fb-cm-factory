import { config } from "../../config";
import { AppError } from "../shared/resource";

/**
 * @deprecated Use Host Agent V2 direct execution.
 */
type ManagerResponse = {
  ok?: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
  [key: string]: unknown;
};

function managerUrl(path: string) {
  const base = config.managerV1BaseUrl.replace(/\/+$/, "");
  return `${base}${path}`;
}

function extractTaskId(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.taskId,
    record.id,
    record.task_id,
    record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>).taskId : undefined,
    record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>).id : undefined,
    record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>).task_id : undefined
  ];

  const match = candidates.find((value) => typeof value === "string" && value.length > 0);
  return typeof match === "string" ? match : null;
}

async function requestManager(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(config.managerV1ApiKey
        ? {
            "x-api-key": config.managerV1ApiKey,
            authorization: `Bearer ${config.managerV1ApiKey}`
          }
        : {})
    };

    const response = await fetch(managerUrl(path), {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> | undefined)
      },
      signal: controller.signal
    });

    const body = (await response.json().catch(() => ({}))) as ManagerResponse;

    if (!response.ok || body.ok === false) {
      throw new AppError(
        "MANAGER_V1_REQUEST_FAILED",
        body.error?.message ?? `Manager V1 request failed with ${response.status}`,
        response.status >= 500 ? 502 : response.status
      );
    }

    return body;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("MANAGER_V1_UNAVAILABLE", "Manager V1 is unavailable", 503);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @deprecated Use Host Agent V2 direct execution.
 */
export const managerBridgeClient = {
  async healthCheckManager() {
    return requestManager("/health", {
      method: "GET"
    });
  },

  async createImageEditTask(payload: Record<string, unknown>) {
    const response = await requestManager("/api/tasks/image-edit", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const taskId = extractTaskId(response);
    if (!taskId) throw new AppError("MANAGER_V1_BAD_RESPONSE", "Manager V1 did not return a task id", 502);
    return { taskId, response };
  },

  async createVideoGenerateTask(payload: Record<string, unknown>) {
    const response = await requestManager("/api/tasks/video-generate", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const taskId = extractTaskId(response);
    if (!taskId) throw new AppError("MANAGER_V1_BAD_RESPONSE", "Manager V1 did not return a task id", 502);
    return { taskId, response };
  },

  async runManagerTask(taskId: string, instanceId: string) {
    return requestManager(`/api/tasks/${encodeURIComponent(taskId)}/run`, {
      method: "POST",
      body: JSON.stringify({ instanceId })
    });
  },

  async getManagerTaskStatus(taskId: string) {
    return requestManager(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
      method: "GET"
    });
  }
};
