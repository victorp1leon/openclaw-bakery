import fs from "node:fs";
import path from "node:path";

import type { AppConfig } from "../config/appConfig";

export type HealthStatus = "ok" | "warn" | "fail";

export type HealthCheckItem = {
  name: string;
  status: HealthStatus;
  detail: string;
};

export type HealthReport = {
  status: Exclude<HealthStatus, "warn"> | "warn";
  checks: HealthCheckItem[];
};

function skillPathExists(relPath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relPath));
}

function summarizeStatus(items: HealthCheckItem[]): HealthReport["status"] {
  if (items.some((item) => item.status === "fail")) return "fail";
  if (items.some((item) => item.status === "warn")) return "warn";
  return "ok";
}

export function runHealthcheck(args: {
  config: AppConfig;
  dbOpen: boolean;
  dbPath: string;
  allowlistSize: number;
}): HealthReport {
  const checks: HealthCheckItem[] = [];

  checks.push({
    name: "env",
    status: "ok",
    detail: `NODE_ENV=${args.config.nodeEnv}, TZ=${args.config.timezone}, currency=${args.config.defaultCurrency}, persona=${args.config.botPersona}`
  });

  checks.push({
    name: "allowlist",
    status: args.allowlistSize > 0 ? "ok" : "warn",
    detail: args.allowlistSize > 0 ? `${args.allowlistSize} chat_id(s) autorizados` : "ALLOWLIST_CHAT_IDS vacío (deny-by-default)"
  });

  checks.push({
    name: "rate_limit",
    status: args.config.rateLimit.enabled ? "ok" : "warn",
    detail: [
      `enabled=${args.config.rateLimit.enabled ? "1" : "0"}`,
      `windowMs=${args.config.rateLimit.windowMs}`,
      `maxMessages=${args.config.rateLimit.maxMessagesPerWindow}`,
      `blockMs=${args.config.rateLimit.blockDurationMs}`
    ].join(", ")
  });

  checks.push({
    name: "sqlite",
    status: args.dbOpen ? "ok" : "fail",
    detail: `${args.dbPath} (${args.dbOpen ? "open" : "closed"})`
  });

  checks.push({
    name: "openclaw_runtime",
    status: args.config.openclaw.enabled ? "ok" : "warn",
    detail: [
      `enabled=${args.config.openclaw.enabled ? "1" : "0"}`,
      `agent=${args.config.openclaw.agentId}`,
      `profile=${args.config.openclaw.profile ?? "default"}`,
      `timeout=${args.config.openclaw.timeoutSeconds}s`
    ].join(", ")
  });

  const expenseConnectorStatus: HealthStatus = args.config.expenseTool.dryRun
    ? "warn"
    : args.config.expenseTool.gws.command && args.config.expenseTool.gws.spreadsheetId && args.config.expenseTool.gws.range
      ? "ok"
      : "fail";

  checks.push({
    name: "expense_connector",
    status: expenseConnectorStatus,
    detail: [
      `dryRun=${args.config.expenseTool.dryRun ? "1" : "0"}`,
      `provider=${args.config.expenseTool.sheetsProvider}`,
      `gwsCommand=${args.config.expenseTool.gws.command}`,
      `gwsSpreadsheetIdConfigured=${args.config.expenseTool.gws.spreadsheetId ? "1" : "0"}`,
      `gwsRangeConfigured=${args.config.expenseTool.gws.range ? "1" : "0"}`,
      `gwsValueInputOption=${args.config.expenseTool.gws.valueInputOption}`,
      `timeoutMs=${args.config.expenseTool.timeoutMs}`,
      `maxRetries=${args.config.expenseTool.maxRetries}`
    ].join(", ")
  });

  const orderTrelloStatus: HealthStatus = args.config.orderTool.trello.dryRun
    ? "warn"
    : args.config.orderTool.trello.apiKey &&
        args.config.orderTool.trello.token &&
        args.config.orderTool.trello.listId &&
        args.config.orderTool.trello.cancelListId
      ? "ok"
      : "fail";

  checks.push({
    name: "order_trello_connector",
    status: orderTrelloStatus,
    detail: [
      `dryRun=${args.config.orderTool.trello.dryRun ? "1" : "0"}`,
      `apiKeyConfigured=${args.config.orderTool.trello.apiKey ? "1" : "0"}`,
      `tokenConfigured=${args.config.orderTool.trello.token ? "1" : "0"}`,
      `listIdConfigured=${args.config.orderTool.trello.listId ? "1" : "0"}`,
      `cancelListIdConfigured=${args.config.orderTool.trello.cancelListId ? "1" : "0"}`,
      `apiBaseUrl=${args.config.orderTool.trello.apiBaseUrl}`,
      `timeoutMs=${args.config.orderTool.trello.timeoutMs}`,
      `maxRetries=${args.config.orderTool.trello.maxRetries}`
    ].join(", ")
  });

  const orderSheetsStatus: HealthStatus = args.config.orderTool.sheets.dryRun
    ? "warn"
    : args.config.orderTool.sheets.gws.command &&
          args.config.orderTool.sheets.gws.spreadsheetId &&
          args.config.orderTool.sheets.gws.range
      ? "ok"
      : "fail";

  checks.push({
    name: "order_sheets_connector",
    status: orderSheetsStatus,
    detail: [
      `dryRun=${args.config.orderTool.sheets.dryRun ? "1" : "0"}`,
      `provider=${args.config.orderTool.sheets.provider}`,
      `gwsCommand=${args.config.orderTool.sheets.gws.command}`,
      `gwsSpreadsheetIdConfigured=${args.config.orderTool.sheets.gws.spreadsheetId ? "1" : "0"}`,
      `gwsRangeConfigured=${args.config.orderTool.sheets.gws.range ? "1" : "0"}`,
      `gwsValueInputOption=${args.config.orderTool.sheets.gws.valueInputOption}`,
      `timeoutMs=${args.config.orderTool.sheets.timeoutMs}`,
      `maxRetries=${args.config.orderTool.sheets.maxRetries}`
    ].join(", ")
  });

  const webPublishStatus: HealthStatus = args.config.webTool.publish.dryRun
    ? "warn"
    : args.config.webTool.publish.webhookUrl &&
        args.config.webTool.publish.apiKey &&
        args.config.webTool.publish.allowedImageDomains.length > 0
      ? "ok"
      : "fail";

  checks.push({
    name: "web_chat_mode",
    status: "ok",
    detail: [
      `enabled=${args.config.webTool.chatEnabled ? "1" : "0"}`,
      `contentPath=${args.config.webTool.contentPath}`
    ].join(", ")
  });

  checks.push({
    name: "web_publish_connector",
    status: webPublishStatus,
    detail: [
      `dryRun=${args.config.webTool.publish.dryRun ? "1" : "0"}`,
      `urlConfigured=${args.config.webTool.publish.webhookUrl ? "1" : "0"}`,
      `apiKeyConfigured=${args.config.webTool.publish.apiKey ? "1" : "0"}`,
      `apiKeyHeader=${args.config.webTool.publish.apiKeyHeader}`,
      `allowedImageDomains=${args.config.webTool.publish.allowedImageDomains.join("|")}`,
      `facebookPageUrlConfigured=${args.config.webTool.publish.facebookPageUrl ? "1" : "0"}`,
      `timeoutMs=${args.config.webTool.publish.timeoutMs}`,
      `maxRetries=${args.config.webTool.publish.maxRetries}`
    ].join(", ")
  });

  checks.push({
    name: "channel",
    status:
      args.config.channelMode === "telegram" && !args.config.telegram.botToken
        ? "fail"
        : "ok",
    detail:
      args.config.channelMode === "telegram"
        ? `telegram${args.config.telegram.botToken ? " configured" : " missing TELEGRAM_BOT_TOKEN"}`
        : "console"
  });

  checks.push({
    name: "skills",
    status: skillPathExists("skills/expense.add/SKILL.md") && skillPathExists("skills/order.create/SKILL.md") ? "ok" : "fail",
    detail: "skills/expense.add y skills/order.create"
  });

  checks.push({
    name: "tools_skeleton",
    status:
      skillPathExists("src/tools/expense/appendExpense.ts") &&
      skillPathExists("src/tools/order/createCard.ts") &&
      skillPathExists("src/tools/order/appendOrder.ts") &&
      skillPathExists("src/tools/order/reportOrders.ts") &&
      skillPathExists("src/tools/web/publishSite.ts")
        ? "ok"
        : "warn",
    detail: "tools base disponibles (expense/order/report/web)"
  });

  return {
    status: summarizeStatus(checks),
    checks
  };
}
