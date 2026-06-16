import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3200),
  DB_PATH: z.string().min(1),
  STORAGE_ROOT: z.string().min(1).default("./storage"),
  HOST_AGENT_API_KEY: z.string().min(1).default("change-me")
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
  hostAgentApiKey: parsed.data.HOST_AGENT_API_KEY
};

