import type { NextFunction, Request, Response } from "express";
import { config } from "../config";

export function requireAgentApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header("x-agent-key");

  if (key !== config.apiKey) {
    return res.status(401).json({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing x-agent-key"
      }
    });
  }

  return next();
}
