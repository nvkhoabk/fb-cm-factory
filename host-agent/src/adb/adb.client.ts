import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config";

const execFileAsync = promisify(execFile);

export type CommandResult = {
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  mock: boolean;
};

export async function runAdb(args: string[]): Promise<CommandResult> {
  if (config.mockMode) {
    return {
      command: config.adbPath,
      args,
      stdout: mockAdbStdout(args),
      stderr: "",
      mock: true
    };
  }

  const result = await execFileAsync(config.adbPath, args, {
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 1024 * 1024 * 10
  });

  return {
    command: config.adbPath,
    args,
    stdout: result.stdout,
    stderr: result.stderr,
    mock: false
  };
}

function mockAdbStdout(args: string[]) {
  if (args[0] === "devices") {
    return "List of devices attached\n127.0.0.1:5555\tdevice\n";
  }

  if (args.includes("screencap")) {
    return "";
  }

  if (args.includes("find")) {
    return "/sdcard/Download/mock-output.png\n";
  }

  return "OK\n";
}

export function parseAdbDevices(output: string) {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [adbId, state] = line.split(/\s+/);
      return { adbId, state };
    });
}

export const adbClient = {
  runAdb,

  async getAdbDevices() {
    const result = await runAdb(["devices"]);
    return {
      devices: parseAdbDevices(result.stdout),
      raw: result.stdout,
      mock: result.mock
    };
  },

  async connectAdb(adbId: string) {
    return runAdb(["connect", adbId]);
  },

  async testAdb(adbId: string) {
    return runAdb(["-s", adbId, "shell", "echo", "ok"]);
  }
};
