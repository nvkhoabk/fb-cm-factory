import "dotenv/config";
import path from "node:path";
import { z } from "zod";

function defaultStorageRoot() {
  const cwd = process.cwd();
  const repoRoot = path.basename(cwd).toLowerCase() === "backend"
    ? path.resolve(cwd, "..")
    : cwd;
  return path.resolve(repoRoot, "..", "data", "fb-cm-factory", "backend-storage");
}

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3200),
  DB_PATH: z.string().min(1),
  STORAGE_ROOT: z.string().min(1).default(defaultStorageRoot()),
  HOST_AGENT_API_KEY: z.string().min(1).default("change-me"),
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
  hostAgentApiKey: parsed.data.HOST_AGENT_API_KEY,
  managerV1BaseUrl: parsed.data.MANAGER_V1_BASE_URL,
  managerV1ApiKey: parsed.data.MANAGER_V1_API_KEY
};
