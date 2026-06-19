import type { Response, Router } from "express";
import { Router as createRouter } from "express";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { ZodError } from "zod";
import { db } from "../../database/db";

export type JsonMap = Record<string, unknown>;
export type QueryMap = Record<string, unknown>;

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function now() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export function containsBinaryContent(value: unknown): boolean {
  if (typeof value === "string") {
    const compact = value.replace(/\s+/g, "");
    const looksLikeLargeBase64 = compact.length > 4096
      && compact.length % 4 === 0
      && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
    return /data:(image|video|audio)\//i.test(value)
      || /base64,/i.test(value)
      || looksLikeLargeBase64;
  }
  if (Array.isArray(value)) return value.some((item) => containsBinaryContent(item));
  if (value && typeof value === "object") return Object.values(value).some((item) => containsBinaryContent(item));
  return false;
}

export function jsonString(value: unknown, fallback: unknown) {
  const resolved = value ?? fallback;
  if (containsBinaryContent(resolved)) {
    throw new AppError("BINARY_CONTENT_NOT_ALLOWED_IN_DB", "Binary/base64 media content is not allowed in SQLite JSON fields", 400);
  }
  return JSON.stringify(resolved);
}

export function jsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        detail: error.flatten()
      }
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      ok: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  return res.status(500).json({
    ok: false,
    error: {
      code: message,
      message
    }
  });
}

export type ResourceService<TCreate, TRow> = {
  list(query: QueryMap): TRow[];
  get(id: string): TRow | null;
  create(payload: TCreate): TRow;
};

export function createResourceRouter<TCreate, TRow>(
  schema: z.ZodType<TCreate>,
  service: ResourceService<TCreate, TRow>
): Router {
  const router = createRouter();

  router.get("/", (req, res) => {
    res.json({ ok: true, data: service.list(req.query as QueryMap) });
  });

  router.get("/:id", (req, res) => {
    const data = service.get(req.params.id);

    if (!data) {
      return res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found"
        }
      });
    }

    return res.json({ ok: true, data });
  });

  router.post("/", (req, res) => {
    try {
      const payload = schema.parse(req.body);
      return res.status(201).json({ ok: true, data: service.create(payload) });
    } catch (error) {
      return sendError(res, error);
    }
  });

  return router;
}

export function listRows<T>(
  table: string,
  mapper: (row: Record<string, unknown>) => T,
  query: QueryMap,
  filters: Record<string, string>
): T[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  for (const [queryKey, columnName] of Object.entries(filters)) {
    const value = query[queryKey];
    if (typeof value === "string" && value.trim()) {
      clauses.push(`${columnName} = ?`);
      params.push(value);
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM ${table} ${where} ORDER BY created_at DESC`).all(...params);
  return rows.map((row: unknown) => mapper(row as Record<string, unknown>));
}

export function getRow<T>(
  table: string,
  id: string,
  mapper: (row: Record<string, unknown>) => T
): T | null {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  return row ? mapper(row as Record<string, unknown>) : null;
}
