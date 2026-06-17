import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config";
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
    return "0,Mock Instance,0,0,0,0,0,0,0,0,0\n";
  }

  return "OK\n";
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
        raw: line
      };
    });
}

export const ldplayerClient = {
  runLdConsole,

  async listLdInstances() {
    const result = await runLdConsole(["list2"]);
    return {
      instances: parseLdInstances(result.stdout),
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
