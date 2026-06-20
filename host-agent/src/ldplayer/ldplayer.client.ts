import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config";
import { adbClient } from "../adb/adb.client";
import type { CommandResult } from "../adb/adb.client";

const execFileAsync = promisify(execFile);

export async function runLdConsole(args: string[]): Promise<CommandResult> {
  if (config.mockMode) {
    return {
      command: config.ldConsolePath,
      args,
      stdout: mockLdConsoleStdout(args),
      stderr: "",
      mock: true
    };
  }

  const result = await execFileAsync(config.ldConsolePath, args, {
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 1024 * 1024 * 10
  });

  return {
    command: config.ldConsolePath,
    args,
    stdout: result.stdout,
    stderr: result.stderr,
    mock: false
  };
}

function mockLdConsoleStdout(args: string[]) {
  if (args[0] === "list2") {
    return "0,Mock Stopped,0,0,0,0,0,0,0,0,0\n2,Mock Running,0,0,1,1234,0,0,0,0,0\n";
  }

  return "OK\n";
}

function ldStatusFromParts(parts: string[]) {
  const androidStarted = parts[4]?.trim();
  const processId = Number(parts[5]?.trim() ?? 0);
  if (androidStarted === "1" || processId > 0) return "running";
  if (androidStarted === "0" || processId === 0) return "stopped";
  return "unknown";
}

function derivedAdbId(localId: string | number) {
  const index = Number(localId);
  if (!Number.isInteger(index) || index < 0) return null;
  return `emulator-${5554 + index * 2}`;
}

export function parseLdInstances(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",");
      return {
        localId: parts[0],
        name: parts[1] ?? "",
        ldStatus: ldStatusFromParts(parts),
        raw: line
      };
    });
}

async function verifyAdbId(adbId: string, devices: Array<{ adbId: string; state: string }>) {
  const device = devices.find((item) => item.adbId === adbId);
  if (!device || !["device", "online"].includes(String(device.state).toLowerCase())) return false;

  try {
    await adbClient.testAdb(adbId);
    return true;
  } catch {
    return false;
  }
}

export const ldplayerClient = {
  runLdConsole,

  async listLdInstances() {
    const result = await runLdConsole(["list2"]);
    const adb = await adbClient.getAdbDevices().catch(() => ({ devices: [] as Array<{ adbId: string; state: string }> }));
    const instances = await Promise.all(parseLdInstances(result.stdout).map(async (instance) => {
      const candidateAdbId = derivedAdbId(instance.localId);
      const isRunning = instance.ldStatus === "running";
      const verified = Boolean(isRunning && candidateAdbId && await verifyAdbId(candidateAdbId, adb.devices));
      return {
        hostId: config.hostId,
        localId: Number.isFinite(Number(instance.localId)) ? Number(instance.localId) : instance.localId,
        instanceId: `${config.hostId}-ld-${instance.localId}`,
        name: instance.name,
        ldStatus: instance.ldStatus,
        adbId: verified ? candidateAdbId : null,
        adbStatus: verified ? "online" : isRunning ? "unknown" : "offline",
        adbMappingConfidence: verified ? "derived" : "unknown",
        mappingSource: verified ? "ldconsole" : "none",
        raw: instance.raw
      };
    }));
    return {
      instances,
      adbDevices: adb.devices,
      raw: result.stdout,
      mock: result.mock
    };
  },

  async startInstance(localId: string) {
    return runLdConsole(["launch", "--index", localId]);
  },

  async stopInstance(localId: string) {
    return runLdConsole(["quit", "--index", localId]);
  },

  async restartInstance(localId: string) {
    return runLdConsole(["reboot", "--index", localId]);
  },

  async renameInstance(localId: string, name: string) {
    return runLdConsole(["rename", "--index", localId, "--title", name]);
  }
};
