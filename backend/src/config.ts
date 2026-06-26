import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

function backendRoot() {
  const cwd = process.cwd();
  return path.basename(cwd).toLowerCase() === "backend"
    ? cwd
    : path.resolve(cwd, "backend");
}

function loadEnv() {
  if (process.env.DOTENV_CONFIG_PATH) {
    dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });
    return;
  }

  const root = backendRoot();
  const productionEnv = path.resolve(root, ".env.production");
  const defaultEnv = path.resolve(root, ".env");
  const envPath = fs.existsSync(productionEnv) ? productionEnv : defaultEnv;
  dotenv.config({ path: envPath });
}

loadEnv();

function defaultStorageRoot() {
  const repoRoot = path.resolve(backendRoot(), "..");
  return path.resolve(repoRoot, "..", "data", "fb-cm-factory", "backend-storage");
}

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3200),
  DB_PATH: z.string().min(1),
  STORAGE_ROOT: z.string().min(1).default(defaultStorageRoot()),
  MANAGER_V1_BASE_URL: z.string().url().default("http://localhost:3000"),
  MANAGER_V1_API_KEY: z.string().default("")
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid backend configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  dbPath: parsed.data.DB_PATH,
  storageRoot: parsed.data.STORAGE_ROOT,
  managerV1BaseUrl: parsed.data.MANAGER_V1_BASE_URL,
  managerV1ApiKey: parsed.data.MANAGER_V1_API_KEY
};
