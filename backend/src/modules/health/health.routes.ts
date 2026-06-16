import { Router } from "express";
import { config } from "../../config";
import { db } from "../../database/db";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  const dbResult = db.prepare("SELECT 1 AS ok").get() as { ok: number };

  res.json({
    ok: true,
    data: {
      service: "fb-cm-factory-backend",
      version: "v2",
      env: config.env,
      database: {
        ok: dbResult.ok === 1,
        path: config.dbPath
      },
      time: new Date().toISOString()
    }
  });
});

