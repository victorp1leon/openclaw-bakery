import { describe, expect, it } from "vitest";

import { runHealthcheck } from "./healthcheck";
import { loadAppConfig } from "../config/appConfig";

describe("runHealthcheck", () => {
  it("marca fail si el canal telegram está seleccionado sin token", () => {
    const config = loadAppConfig({
      CHANNEL_MODE: "telegram",
      OPENCLAW_ENABLE: "1",
      OPENCLAW_AGENT_ID: "main",
      OPENCLAW_TIMEOUT_SECONDS: "300",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.status).toBe("fail");
    expect(report.checks.find((c) => c.name === "channel")?.status).toBe("fail");
  });

  it("marca warn cuando rate limit está deshabilitado", () => {
    const config = loadAppConfig({
      RATE_LIMIT_ENABLE: "0",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.checks.find((c) => c.name === "rate_limit")?.status).toBe("warn");
    expect(report.status).toBe("warn");
  });

  it("marca fail cuando dry-run está desactivado sin webhook de gasto", () => {
    const config = loadAppConfig({
      EXPENSE_TOOL_DRY_RUN: "0",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.checks.find((c) => c.name === "expense_connector")?.status).toBe("fail");
    expect(report.status).toBe("fail");
  });

  it("marca fail cuando live no tiene API key", () => {
    const config = loadAppConfig({
      EXPENSE_TOOL_DRY_RUN: "0",
      EXPENSE_SHEETS_WEBHOOK_URL: "https://example.com/webhook",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.checks.find((c) => c.name === "expense_connector")?.status).toBe("fail");
    expect(report.status).toBe("fail");
  });

  it("marca fail cuando order trello live no tiene credenciales", () => {
    const config = loadAppConfig({
      ORDER_TRELLO_DRY_RUN: "0",
      ORDER_TRELLO_LIST_ID: "list-1",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.checks.find((c) => c.name === "order_trello_connector")?.status).toBe("fail");
    expect(report.status).toBe("fail");
  });

  it("marca fail cuando order trello live no tiene lista de cancelados", () => {
    const config = loadAppConfig({
      ORDER_TRELLO_DRY_RUN: "0",
      ORDER_TRELLO_API_KEY: "key",
      ORDER_TRELLO_TOKEN: "token",
      ORDER_TRELLO_LIST_ID: "list-1",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    const orderTrello = report.checks.find((c) => c.name === "order_trello_connector");
    expect(orderTrello?.status).toBe("fail");
    expect(orderTrello?.detail).toContain("cancelListIdConfigured=0");
    expect(report.status).toBe("fail");
  });

  it("marca fail cuando order sheets live no tiene api key", () => {
    const config = loadAppConfig({
      ORDER_SHEETS_DRY_RUN: "0",
      ORDER_SHEETS_WEBHOOK_URL: "https://example.com/order-webhook",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.checks.find((c) => c.name === "order_sheets_connector")?.status).toBe("fail");
    expect(report.status).toBe("fail");
  });

  it("marca fail cuando expense gws live no tiene spreadsheet/range", () => {
    const config = loadAppConfig({
      EXPENSE_TOOL_DRY_RUN: "0",
      EXPENSE_SHEETS_PROVIDER: "gws",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.checks.find((c) => c.name === "expense_connector")?.status).toBe("fail");
    expect(report.status).toBe("fail");
  });

  it("marca ok cuando order sheets gws live tiene command/spreadsheet/range", () => {
    const config = loadAppConfig({
      ORDER_SHEETS_DRY_RUN: "0",
      ORDER_SHEETS_PROVIDER: "gws",
      ORDER_SHEETS_GWS_COMMAND: "gws",
      ORDER_SHEETS_GWS_SPREADSHEET_ID: "sheet-123",
      ORDER_SHEETS_GWS_RANGE: "Pedidos!A1",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.checks.find((c) => c.name === "order_sheets_connector")?.status).toBe("ok");
    expect(report.status).toBe("warn");
  });

  it("marca fail cuando web publish live no tiene api key", () => {
    const config = loadAppConfig({
      WEB_PUBLISH_DRY_RUN: "0",
      WEB_PUBLISH_WEBHOOK_URL: "https://example.com/web/publish",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    expect(report.checks.find((c) => c.name === "web_publish_connector")?.status).toBe("fail");
    expect(report.status).toBe("fail");
  });

  it("expone modo de chat web y ruta de contenido", () => {
    const config = loadAppConfig({
      WEB_CHAT_ENABLE: "0",
      WEB_CONTENT_PATH: "site/CONTENT.json",
      NODE_ENV: "development",
      TIMEZONE: "America/Mexico_City",
      DEFAULT_CURRENCY: "MXN",
      ALLOWLIST_CHAT_IDS: "local-dev"
    } as NodeJS.ProcessEnv);

    const report = runHealthcheck({
      config,
      dbOpen: true,
      dbPath: "bot.db",
      allowlistSize: 1
    });

    const mode = report.checks.find((c) => c.name === "web_chat_mode");
    expect(mode?.status).toBe("ok");
    expect(mode?.detail).toContain("enabled=0");
    expect(mode?.detail).toContain("contentPath=site/CONTENT.json");
  });
});
