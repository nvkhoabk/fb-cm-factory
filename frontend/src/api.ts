export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    detail?: unknown;
  };
};

export type ApiErrorWithPayload = Error & {
  code?: string;
  detail?: unknown;
  payload?: unknown;
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.ok === false) {
    const code = payload.error?.code;
    const message = payload.error?.message ?? `Request failed: ${path}`;
    const error = new Error(code ? `${code}: ${message}` : message) as ApiErrorWithPayload;
    error.code = code;
    error.detail = payload.error?.detail;
    error.payload = payload;
    throw error;
  }
  return payload.data;
}

export function mediaUrl(value?: string | null) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/storage/")) return value;
  if (value.startsWith("storage/")) return `/${value}`;
  if (value.startsWith("/")) return value;
  return value;
}
