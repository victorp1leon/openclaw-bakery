import { spawn } from "node:child_process";

export type GwsCommandResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type GwsCommandRunner = (args: {
  command: string;
  commandArgs: string[];
  stdin?: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}) => Promise<GwsCommandResult>;

export const runGwsCommand: GwsCommandRunner = async (args) => {
  const command = args.command.trim();
  if (!command) {
    throw new Error("gws_command_missing");
  }

  return new Promise<GwsCommandResult>((resolve, reject) => {
    const child = spawn(command, args.commandArgs, {
      env: args.env ?? process.env,
      stdio: "pipe"
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, args.timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut
      });
    });

    if (args.stdin && args.stdin.length > 0) {
      child.stdin.write(args.stdin);
    }
    child.stdin.end();
  });
};
