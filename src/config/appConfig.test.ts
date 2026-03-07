import { describe, expect, it } from "vitest";

import { loadAppConfig } from "./appConfig";

describe("appConfig", () => {
  it("loads defaults when env is missing", () => {
    const config = loadAppConfig({});

    expect(config.botPersona).toBe("neutral");
    expect(config.channelMode).toBe("console");
    expect(config.openclaw.timeoutSeconds).toBe(30);
    expect(config.rateLimit.enabled).toBe(true);
    expect(config.rateLimit.windowMs).toBe(10_000);
    expect(config.rateLimit.maxMessagesPerWindow).toBe(8);
    expect(config.rateLimit.blockDurationMs).toBe(30_000);
    expect(config.expenseTool.dryRun).toBe(true);
    expect(config.expenseTool.sheetsProvider).toBe("apps_script");
    expect(config.expenseTool.sheetsWebhookUrl).toBeUndefined();
    expect(config.expenseTool.apiKey).toBeUndefined();
    expect(config.expenseTool.apiKeyHeader).toBe("x-api-key");
    expect(config.expenseTool.timeoutMs).toBe(5000);
    expect(config.expenseTool.maxRetries).toBe(2);
    expect(config.expenseTool.gws.command).toBe("gws");
    expect(config.expenseTool.gws.commandArgs).toEqual([]);
    expect(config.expenseTool.gws.spreadsheetId).toBeUndefined();
    expect(config.expenseTool.gws.range).toBeUndefined();
    expect(config.expenseTool.gws.valueInputOption).toBe("USER_ENTERED");
    expect(config.orderTool.trello.dryRun).toBe(true);
    expect(config.orderTool.trello.apiKey).toBeUndefined();
    expect(config.orderTool.trello.token).toBeUndefined();
    expect(config.orderTool.trello.listId).toBeUndefined();
    expect(config.orderTool.trello.apiBaseUrl).toBe("https://api.trello.com");
    expect(config.orderTool.trello.timeoutMs).toBe(5000);
    expect(config.orderTool.trello.maxRetries).toBe(2);
    expect(config.orderTool.sheets.dryRun).toBe(true);
    expect(config.orderTool.sheets.provider).toBe("apps_script");
    expect(config.orderTool.sheets.webhookUrl).toBeUndefined();
    expect(config.orderTool.sheets.apiKey).toBeUndefined();
    expect(config.orderTool.sheets.apiKeyHeader).toBe("x-api-key");
    expect(config.orderTool.sheets.timeoutMs).toBe(5000);
    expect(config.orderTool.sheets.maxRetries).toBe(2);
    expect(config.orderTool.sheets.gws.command).toBe("gws");
    expect(config.orderTool.sheets.gws.commandArgs).toEqual([]);
    expect(config.orderTool.sheets.gws.spreadsheetId).toBeUndefined();
    expect(config.orderTool.sheets.gws.range).toBeUndefined();
    expect(config.orderTool.sheets.gws.valueInputOption).toBe("USER_ENTERED");
    expect(config.webTool.publish.dryRun).toBe(true);
    expect(config.webTool.chatEnabled).toBe(false);
    expect(config.webTool.contentPath).toBe("site/CONTENT.json");
    expect(config.webTool.publish.webhookUrl).toBeUndefined();
    expect(config.webTool.publish.apiKey).toBeUndefined();
    expect(config.webTool.publish.apiKeyHeader).toBe("x-api-key");
    expect(config.webTool.publish.timeoutMs).toBe(5000);
    expect(config.webTool.publish.maxRetries).toBe(2);
    expect(config.webTool.publish.allowedImageDomains).toEqual(["facebook.com", "fbcdn.net"]);
    expect(config.webTool.publish.facebookPageUrl).toBeUndefined();
  });

  it("parses openclaw flags and timeouts", () => {
    const config = loadAppConfig({
      OPENCLAW_ENABLE: "1",
      OPENCLAW_AGENT_ID: "bakery-main",
      OPENCLAW_PROFILE: "prod",
      OPENCLAW_TIMEOUT_SECONDS: "90",
      OPENCLAW_STRICT: "1",
      OPENCLAW_STRICT_SOFTFAIL: "1",
      OPENCLAW_THINKING: "medium"
    } as NodeJS.ProcessEnv);

    expect(config.openclaw.enabled).toBe(true);
    expect(config.openclaw.agentId).toBe("bakery-main");
    expect(config.openclaw.profile).toBe("prod");
    expect(config.openclaw.timeoutSeconds).toBe(90);
    expect(config.openclaw.strict).toBe(true);
    expect(config.openclaw.strictSoftfail).toBe(true);
    expect(config.openclaw.thinking).toBe("medium");
  });

  it("parses bot persona and falls back on unknown values", () => {
    const configured = loadAppConfig({ BOT_PERSONA: "bakery_warm" } as NodeJS.ProcessEnv);
    const fallback = loadAppConfig({ BOT_PERSONA: "retro" } as NodeJS.ProcessEnv);

    expect(configured.botPersona).toBe("bakery_warm");
    expect(fallback.botPersona).toBe("neutral");
  });

  it("falls back to console on unknown channel mode", () => {
    const config = loadAppConfig({ CHANNEL_MODE: "discord" } as NodeJS.ProcessEnv);
    expect(config.channelMode).toBe("console");
  });

  it("parses rate limit flags and thresholds", () => {
    const config = loadAppConfig({
      RATE_LIMIT_ENABLE: "0",
      RATE_LIMIT_WINDOW_SECONDS: "5",
      RATE_LIMIT_MAX_MESSAGES: "3",
      RATE_LIMIT_BLOCK_SECONDS: "15"
    } as NodeJS.ProcessEnv);

    expect(config.rateLimit.enabled).toBe(false);
    expect(config.rateLimit.windowMs).toBe(5_000);
    expect(config.rateLimit.maxMessagesPerWindow).toBe(3);
    expect(config.rateLimit.blockDurationMs).toBe(15_000);
  });

  it("parses expense tool connector settings", () => {
    const config = loadAppConfig({
      EXPENSE_TOOL_DRY_RUN: "0",
      EXPENSE_SHEETS_PROVIDER: "gws",
      EXPENSE_SHEETS_WEBHOOK_URL: " https://example.com/webhook ",
      EXPENSE_TOOL_API_KEY: "  super-secret  ",
      EXPENSE_TOOL_API_KEY_HEADER: "  X-Expense-Key  ",
      EXPENSE_TOOL_TIMEOUT_MS: "8500",
      EXPENSE_TOOL_MAX_RETRIES: "4",
      EXPENSE_GWS_COMMAND: " gws ",
      EXPENSE_GWS_COMMAND_ARGS: " auth,print-token ",
      EXPENSE_GWS_SPREADSHEET_ID: " expense-sheet-id ",
      EXPENSE_GWS_RANGE: " Gastos!A1 ",
      EXPENSE_GWS_VALUE_INPUT_OPTION: "RAW"
    } as NodeJS.ProcessEnv);

    expect(config.expenseTool.dryRun).toBe(false);
    expect(config.expenseTool.sheetsProvider).toBe("gws");
    expect(config.expenseTool.sheetsWebhookUrl).toBe("https://example.com/webhook");
    expect(config.expenseTool.apiKey).toBe("super-secret");
    expect(config.expenseTool.apiKeyHeader).toBe("X-Expense-Key");
    expect(config.expenseTool.timeoutMs).toBe(8500);
    expect(config.expenseTool.maxRetries).toBe(4);
    expect(config.expenseTool.gws.command).toBe("gws");
    expect(config.expenseTool.gws.commandArgs).toEqual(["auth", "print-token"]);
    expect(config.expenseTool.gws.spreadsheetId).toBe("expense-sheet-id");
    expect(config.expenseTool.gws.range).toBe("Gastos!A1");
    expect(config.expenseTool.gws.valueInputOption).toBe("RAW");
  });

  it("parses order tool connector settings", () => {
    const config = loadAppConfig({
      ORDER_TRELLO_DRY_RUN: "0",
      ORDER_TRELLO_API_KEY: "  trello-key  ",
      ORDER_TRELLO_TOKEN: "  trello-token  ",
      ORDER_TRELLO_LIST_ID: "  list-123  ",
      ORDER_TRELLO_API_BASE_URL: " https://api.trello.com ",
      ORDER_TRELLO_TIMEOUT_MS: "6200",
      ORDER_TRELLO_MAX_RETRIES: "5",
      ORDER_SHEETS_DRY_RUN: "0",
      ORDER_SHEETS_PROVIDER: "gws",
      ORDER_SHEETS_WEBHOOK_URL: " https://example.com/order-webhook ",
      ORDER_SHEETS_API_KEY: "  order-secret  ",
      ORDER_SHEETS_API_KEY_HEADER: "  X-Order-Key  ",
      ORDER_SHEETS_TIMEOUT_MS: "9100",
      ORDER_SHEETS_MAX_RETRIES: "6",
      ORDER_SHEETS_GWS_COMMAND: " gws ",
      ORDER_SHEETS_GWS_COMMAND_ARGS: " auth,print-token ",
      ORDER_SHEETS_GWS_SPREADSHEET_ID: " order-sheet-id ",
      ORDER_SHEETS_GWS_RANGE: " Pedidos!A1 ",
      ORDER_SHEETS_GWS_VALUE_INPUT_OPTION: "RAW"
    } as NodeJS.ProcessEnv);

    expect(config.orderTool.trello.dryRun).toBe(false);
    expect(config.orderTool.trello.apiKey).toBe("trello-key");
    expect(config.orderTool.trello.token).toBe("trello-token");
    expect(config.orderTool.trello.listId).toBe("list-123");
    expect(config.orderTool.trello.apiBaseUrl).toBe("https://api.trello.com");
    expect(config.orderTool.trello.timeoutMs).toBe(6200);
    expect(config.orderTool.trello.maxRetries).toBe(5);

    expect(config.orderTool.sheets.dryRun).toBe(false);
    expect(config.orderTool.sheets.provider).toBe("gws");
    expect(config.orderTool.sheets.webhookUrl).toBe("https://example.com/order-webhook");
    expect(config.orderTool.sheets.apiKey).toBe("order-secret");
    expect(config.orderTool.sheets.apiKeyHeader).toBe("X-Order-Key");
    expect(config.orderTool.sheets.timeoutMs).toBe(9100);
    expect(config.orderTool.sheets.maxRetries).toBe(6);
    expect(config.orderTool.sheets.gws.command).toBe("gws");
    expect(config.orderTool.sheets.gws.commandArgs).toEqual(["auth", "print-token"]);
    expect(config.orderTool.sheets.gws.spreadsheetId).toBe("order-sheet-id");
    expect(config.orderTool.sheets.gws.range).toBe("Pedidos!A1");
    expect(config.orderTool.sheets.gws.valueInputOption).toBe("RAW");
  });

  it("parses web publish connector settings", () => {
    const config = loadAppConfig({
      WEB_CHAT_ENABLE: "1",
      WEB_CONTENT_PATH: " site/CONTENT.prod.json ",
      WEB_PUBLISH_DRY_RUN: "0",
      WEB_PUBLISH_WEBHOOK_URL: " https://example.com/web/publish ",
      WEB_PUBLISH_API_KEY: "  web-secret  ",
      WEB_PUBLISH_API_KEY_HEADER: "  X-Web-Key  ",
      WEB_PUBLISH_TIMEOUT_MS: "7800",
      WEB_PUBLISH_MAX_RETRIES: "4",
      WEB_PUBLISH_ALLOWED_IMAGE_DOMAINS: " images.hadibakery.com, fbcdn.net ",
      WEB_FACEBOOK_PAGE_URL: " https://www.facebook.com/hadibakery "
    } as NodeJS.ProcessEnv);

    expect(config.webTool.chatEnabled).toBe(true);
    expect(config.webTool.contentPath).toBe("site/CONTENT.prod.json");
    expect(config.webTool.publish.dryRun).toBe(false);
    expect(config.webTool.publish.webhookUrl).toBe("https://example.com/web/publish");
    expect(config.webTool.publish.apiKey).toBe("web-secret");
    expect(config.webTool.publish.apiKeyHeader).toBe("X-Web-Key");
    expect(config.webTool.publish.timeoutMs).toBe(7800);
    expect(config.webTool.publish.maxRetries).toBe(4);
    expect(config.webTool.publish.allowedImageDomains).toEqual(["images.hadibakery.com", "fbcdn.net"]);
    expect(config.webTool.publish.facebookPageUrl).toBe("https://www.facebook.com/hadibakery");
  });
});
