import { describe, expect, it } from "vitest";

import { loadAppConfig } from "../../config/appConfig";
import { createAdminHealthTool } from "./adminHealth";

describe("createAdminHealthTool", () => {
  it("mapea estados healthcheck y agrega trace_ref", async () => {
    const config = loadAppConfig({
      ALLOWLIST_CHAT_IDS: "chat-1,chat-2"
    } as NodeJS.ProcessEnv);

    const tool = createAdminHealthTool({
      config,
      newTraceId: () => "trace-fixed",
      now: () => new Date("2026-03-23T10:00:00.000Z"),
      runHealthcheckFn: () => ({
        status: "warn",
        checks: [
          { name: "env", status: "ok", detail: "NODE_ENV=development" },
          { name: "allowlist", status: "warn", detail: "ALLOWLIST_CHAT_IDS vacío" },
          { name: "sqlite", status: "fail", detail: "bot.db (closed)" }
        ]
      })
    });

    const result = await tool({ chat_id: "chat-1" });
    expect(result.status).toBe("degraded");
    expect(result.trace_ref).toBe("admin-health:trace-fixed");
    expect(result.generated_at).toBe("2026-03-23T10:00:00.000Z");
    expect(result.checks).toEqual([
      { name: "env", status: "ok", detail: "NODE_ENV=development" },
      { name: "allowlist", status: "degraded", detail: "ALLOWLIST_CHAT_IDS vacío" },
      { name: "sqlite", status: "error", detail: "bot.db (closed)" }
    ]);
  });

  it("redacta detalles sensibles", async () => {
    const config = loadAppConfig({} as NodeJS.ProcessEnv);
    const tool = createAdminHealthTool({
      config,
      newTraceId: () => "trace-secure",
      runHealthcheckFn: () => ({
        status: "ok",
        checks: [
          {
            name: "connector",
            status: "ok",
            detail: "apiKey=my-secret-key, token=abc123, authorization=Bearer abc.def.ghi"
          }
        ]
      })
    });

    const result = await tool({ chat_id: "chat-safe" });
    expect(result.checks[0]?.detail).toContain("apiKey=REDACTED");
    expect(result.checks[0]?.detail).toContain("token=REDACTED");
    expect(result.checks[0]?.detail).toContain("authorization=REDACTED");
    expect(result.checks[0]?.detail).not.toContain("my-secret-key");
    expect(result.checks[0]?.detail).not.toContain("abc123");
  });
});
