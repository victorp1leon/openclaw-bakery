import { spawn } from "node:child_process";
import { parseJsonFromText } from "./jsonExtract";

export type OpenClawJsonRuntime = {
  completeJson: (prompt: string) => Promise<unknown>;
};

async function execFileNoShell(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  const bin = args[0];
  const cmdArgs = args.slice(1);

  return await new Promise((resolve, reject) => {
    const child = spawn(bin, cmdArgs, {
      env: {
        ...process.env,
        OPENCLAW_SKIP_CHANNELS: "1",
        CLAWDBOT_SKIP_CHANNELS: "1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => resolve({ stdout, stderr, code: code ?? -1 }));
  });
}

export function createOpenClawJsonRuntime(): OpenClawJsonRuntime {
  return {
    async completeJson(prompt: string): Promise<unknown> {
      const enabled = process.env.OPENCLAW_ENABLE === "1";
      if (!enabled) {
        throw new Error("openclaw_disabled");
      }

      const timeoutSeconds = process.env.OPENCLAW_TIMEOUT_SECONDS ?? "30";
      const agentId = process.env.OPENCLAW_AGENT_ID ?? "main";
      const bin = process.env.OPENCLAW_BIN ?? "npx";
      const profile = process.env.OPENCLAW_PROFILE?.trim();
      const thinking = process.env.OPENCLAW_THINKING?.trim();
      const baseArgs = [
        "agent",
        "--local",
        "--json",
        "--agent",
        agentId,
        "--message",
        prompt,
        "--timeout",
        timeoutSeconds
      ];

      if (thinking) {
        baseArgs.push("--thinking", thinking);
      }

      const args =
        bin === "npx"
          ? profile
            ? ["npx", "openclaw", "--profile", profile, ...baseArgs]
            : ["npx", "openclaw", ...baseArgs]
          : profile
            ? [bin, "--profile", profile, ...baseArgs]
            : [bin, ...baseArgs];

      const result = await execFileNoShell(args);
      const combined = `${result.stdout}\n${result.stderr}`;

      if (result.code !== 0) {
        throw new Error(`openclaw_command_failed:exit=${result.code}:${combined.trim() || "no_output"}`);
      }

      return parseJsonFromText(combined);
    }
  };
}
