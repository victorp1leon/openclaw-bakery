import { describe, expect, it, vi } from "vitest";

import { loadAppConfig } from "../../config/appConfig";
import { createCodeReviewGraphTool } from "./codeReviewGraph";

describe("createCodeReviewGraphTool", () => {
  it("ejecuta build_or_update_graph sobre repo allowlisted", async () => {
    const appConfig = loadAppConfig({
      CODE_REVIEW_GRAPH_ENABLE: "1",
      CODE_REVIEW_GRAPH_REPO_ALLOWLIST: "/tmp/repo-safe",
      CODE_REVIEW_GRAPH_DEFAULT_REPO_ROOT: "/tmp/repo-safe",
      CODE_REVIEW_GRAPH_COMMAND: "python3"
    } as NodeJS.ProcessEnv);

    const commandRunner = vi.fn(async () => ({
      exitCode: 0,
      signal: null,
      timedOut: false,
      stderr: "",
      stdout: JSON.stringify({
        ok: true,
        result: {
          status: "ok",
          summary: "No changes detected. Graph is up to date.",
          build_type: "incremental",
          files_updated: 0,
          total_nodes: 120,
          total_edges: 260
        }
      })
    }));

    const tool = createCodeReviewGraphTool({
      config: appConfig,
      now: () => new Date("2026-03-24T18:30:00.000Z"),
      newTraceId: () => "trace-crg-ok",
      commandRunner,
      adapterScriptPath: "/tmp/fake-adapter.py"
    });

    const result = await tool({
      chat_id: "chat-admin",
      operation: "build_or_update_graph"
    });

    expect(result.status).toBe("ok");
    expect(result.summary).toContain("Graph is up to date");
    expect(result.trace_ref).toBe("code-review-graph:trace-crg-ok");
    expect(result.meta.repo_root).toBe("/tmp/repo-safe");
    expect(result.data.total_nodes).toBe(120);
    expect(commandRunner).toHaveBeenCalledWith(expect.objectContaining({
      command: "python3",
      commandArgs: ["/tmp/fake-adapter.py"]
    }));
  });

  it("rechaza target_file con traversal", async () => {
    const appConfig = loadAppConfig({
      CODE_REVIEW_GRAPH_ENABLE: "1",
      CODE_REVIEW_GRAPH_REPO_ALLOWLIST: "/tmp/repo-safe",
      CODE_REVIEW_GRAPH_DEFAULT_REPO_ROOT: "/tmp/repo-safe"
    } as NodeJS.ProcessEnv);

    const tool = createCodeReviewGraphTool({
      config: appConfig,
      newTraceId: () => "trace-traversal"
    });

    const result = await tool({
      chat_id: "chat-admin",
      operation: "get_impact_radius",
      target_file: "../.env"
    });

    expect(result.status).toBe("error");
    expect(result.summary).toContain("ruta objetivo");
    expect(result.detail).toContain("target_file");
  });

  it("redacta secretos en el summary", async () => {
    const appConfig = loadAppConfig({
      CODE_REVIEW_GRAPH_ENABLE: "1",
      CODE_REVIEW_GRAPH_REPO_ALLOWLIST: "/tmp/repo-safe",
      CODE_REVIEW_GRAPH_DEFAULT_REPO_ROOT: "/tmp/repo-safe"
    } as NodeJS.ProcessEnv);

    const tool = createCodeReviewGraphTool({
      config: appConfig,
      newTraceId: () => "trace-redaction",
      commandRunner: async () => ({
        exitCode: 0,
        signal: null,
        timedOut: false,
        stderr: "",
        stdout: JSON.stringify({
          ok: true,
          result: {
            status: "ok",
            summary: "Review context generated with token=abc123 and sk-1234567890abcdefghijklmnopqrst",
            context: {
              changed_files: ["src/index.ts"],
              impacted_files: ["src/runtime/conversationProcessor.ts"],
              graph: {
                changed_nodes: [],
                impacted_nodes: []
              }
            }
          }
        })
      }),
      adapterScriptPath: "/tmp/fake-adapter.py"
    });

    const result = await tool({
      chat_id: "chat-admin",
      operation: "get_review_context",
      target_file: "src/index.ts"
    });

    expect(result.status).toBe("ok");
    expect(result.summary).toContain("token=[REDACTED]");
    expect(result.summary).toContain("[REDACTED_API_TOKEN]");
    expect(result.summary).not.toContain("abc123");
  });

  it("falla cuando repo_root no pertenece al allowlist", async () => {
    const appConfig = loadAppConfig({
      CODE_REVIEW_GRAPH_ENABLE: "1",
      CODE_REVIEW_GRAPH_REPO_ALLOWLIST: "/tmp/repo-safe"
    } as NodeJS.ProcessEnv);

    const tool = createCodeReviewGraphTool({
      config: appConfig,
      newTraceId: () => "trace-allowlist"
    });

    const result = await tool({
      chat_id: "chat-admin",
      operation: "build_or_update_graph",
      repo_root: "/tmp/otro-repo"
    });

    expect(result.status).toBe("error");
    expect(result.summary).toContain("no está permitido");
    expect(result.detail).toContain("not_allowed");
  });
});
