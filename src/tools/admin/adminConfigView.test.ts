import { describe, expect, it } from "vitest";

import { loadAppConfig } from "../../config/appConfig";
import { createAdminConfigViewTool } from "./adminConfigView";

describe("createAdminConfigViewTool", () => {
  it("devuelve snapshot sanitizado con trace_ref", async () => {
    const config = loadAppConfig({
      NODE_ENV: "test",
      CHANNEL_MODE: "telegram",
      ALLOWLIST_CHAT_IDS: "chat-1,chat-2",
      OPENCLAW_ENABLE: "1",
      OPENCLAW_READONLY_ROUTING_ENABLE: "1",
      TELEGRAM_BOT_TOKEN: "token-value",
      ORDER_TRELLO_API_KEY: "api-key",
      ORDER_TRELLO_TOKEN: "token",
      WEB_PUBLISH_API_KEY: "web-key",
      CODE_REVIEW_GRAPH_ENABLE: "1",
      CODE_REVIEW_GRAPH_REPO_ALLOWLIST: "/tmp/a,/tmp/b"
    } as NodeJS.ProcessEnv);

    const tool = createAdminConfigViewTool({
      config,
      newTraceId: () => "trace-fixed",
      now: () => new Date("2026-03-24T10:00:00.000Z")
    });

    const result = await tool({ chat_id: "chat-1" });

    expect(result.status).toBe("ok");
    expect(result.trace_ref).toBe("admin-config-view:trace-fixed");
    expect(result.generated_at).toBe("2026-03-24T10:00:00.000Z");
    expect(result.snapshot.runtime.allowlist_size).toBe(2);
    expect(result.snapshot.runtime.channel_mode).toBe("telegram");
    expect(result.snapshot.openclaw.enabled).toBe(true);
    expect(result.snapshot.telegram.bot_token_configured).toBe(true);
    expect(result.snapshot.order.trello.api_key_configured).toBe(true);
    expect(result.snapshot.web.publish.api_key_configured).toBe(true);
    expect(result.snapshot.code_review_graph.allowlist_count).toBe(2);
  });

  it("no expone secretos ni identificadores sensibles", async () => {
    const config = loadAppConfig({
      ALLOWLIST_CHAT_IDS: "chat-a,chat-b",
      TELEGRAM_BOT_TOKEN: "telegram-secret-token",
      ORDER_TRELLO_API_KEY: "trello-secret-key",
      ORDER_TRELLO_TOKEN: "trello-secret-token",
      ORDER_TRELLO_LIST_ID: "list-sensitive-id",
      ORDER_TRELLO_CANCEL_LIST_ID: "cancel-sensitive-id",
      WEB_PUBLISH_API_KEY: "webhook-secret-key",
      ORDER_SHEETS_GWS_SPREADSHEET_ID: "spreadsheet-sensitive-id",
      CODE_REVIEW_GRAPH_DEFAULT_REPO_ROOT: "/very/sensitive/repo"
    } as NodeJS.ProcessEnv);

    const tool = createAdminConfigViewTool({
      config,
      newTraceId: () => "trace-safe"
    });

    const result = await tool({ chat_id: "chat-a" });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("telegram-secret-token");
    expect(serialized).not.toContain("trello-secret-key");
    expect(serialized).not.toContain("trello-secret-token");
    expect(serialized).not.toContain("list-sensitive-id");
    expect(serialized).not.toContain("cancel-sensitive-id");
    expect(serialized).not.toContain("webhook-secret-key");
    expect(serialized).not.toContain("spreadsheet-sensitive-id");
    expect(serialized).not.toContain("/very/sensitive/repo");

    expect(result.snapshot.telegram.bot_token_configured).toBe(true);
    expect(result.snapshot.order.trello.list_id_configured).toBe(true);
    expect(result.snapshot.order.trello.cancel_list_id_configured).toBe(true);
    expect(result.snapshot.code_review_graph.default_repo_configured).toBe(true);
  });
});
