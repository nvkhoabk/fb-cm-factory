import fs from "node:fs";
import path from "node:path";

export type HostAgentConfig = {
  port: number;
  hostId: string;
  agentName: string;
  apiKey: string;
  adbPath: string;
  ldConsolePath: string;
  publicBaseUrl: string;
  hostStorageRoot: string;
  mockMode: boolean;
};

const configPath = path.resolve(__dirname, "../config.json");
const exampleConfigPath = path.resolve(__dirname, "../config.example.json");

function readConfigFile(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<HostAgentConfig>;
}

const rawConfig = fs.existsSync(configPath)
  ? readConfigFile(configPath)
  : readConfigFile(exampleConfigPath);

function requiredString(value: unknown, key: keyof HostAgentConfig) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid host-agent config: ${String(key)} is required`);
  }
  return value;
}

export const config: HostAgentConfig = {
  port: Number(rawConfig.port ?? 4100),
  hostId: requiredString(rawConfig.hostId, "hostId"),
  agentName: requiredString(rawConfig.agentName, "agentName"),
  apiKey: requiredString(rawConfig.apiKey, "apiKey"),
  adbPath: requiredString(rawConfig.adbPath, "adbPath"),
  ldConsolePath: requiredString(rawConfig.ldConsolePath, "ldConsolePath"),
  publicBaseUrl: requiredString(rawConfig.publicBaseUrl, "publicBaseUrl").replace(/\/+$/, ""),
  hostStorageRoot: path.resolve(requiredString(rawConfig.hostStorageRoot, "hostStorageRoot")),
  mockMode: Boolean(rawConfig.mockMode)
};
