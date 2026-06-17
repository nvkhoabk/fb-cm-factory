import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import { config } from "../config";
import { requireAgentApiKey } from "../security/api-key.middleware";
import { storageService } from "./storage.service";

export const storageRouter = Router();

storageRouter.get("/info", requireAgentApiKey, (_req, res) => {
  storageService.ensureStorageRoot();
  res.json({
    ok: true,
    data: {
      hostStorageRoot: config.hostStorageRoot,
      publicBaseUrl: config.publicBaseUrl
    }
  });
});

storageRouter.get("/files", requireAgentApiKey, (_req, res) => {
  storageService.ensureStorageRoot();

  const files = fs.readdirSync(config.hostStorageRoot, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => fs.statSync(path.join(config.hostStorageRoot, entry)).isFile());

  res.json({
    ok: true,
    data: files
  });
});
