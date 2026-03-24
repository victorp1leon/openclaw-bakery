import { v4 as uuidv4 } from "uuid";

import { type AppConfig, loadAppConfig } from "../../config/appConfig";
import { parseAllowedChatIds } from "../../guards/allowlistGuard";
import { type HealthStatus, runHealthcheck } from "../../health/healthcheck";
import { db } from "../../state/database";

export type AdminHealthStatus = "ok" | "degraded" | "error";

export type AdminHealthCheck = {
  name: string;
  status: AdminHealthStatus;
  detail: string;
};

export type AdminHealthResult = {
  status: AdminHealthStatus;
  checks: AdminHealthCheck[];
  trace_ref: string;
  detail: string;
  generated_at: string;
};

export type AdminHealthToolConfig = {
  config?: AppConfig;
  allowlistSize?: number;
  dbPath?: string;
  maxChecks?: number;
  now?: () => Date;
  newTraceId?: () => string;
  isDbOpen?: () => boolean;
  runHealthcheckFn?: typeof runHealthcheck;
};

function mapStatus(status: HealthStatus): AdminHealthStatus {
  if (status === "ok") return "ok";
  if (status === "warn") return "degraded";
  return "error";
}

function sanitizeDetail(detail: string): string {
  const trimmed = detail.trim();
  if (!trimmed) return "-";

  return trimmed
    .replace(
      /\b(token|secret|api[_-]?key|password|authorization|bearer)\b\s*=\s*([^,\s]+)/gi,
      (_match, key: string) => `${key}=REDACTED`
    )
    .replace(/\bbearer\s+[a-z0-9._-]+\b/gi, "bearer REDACTED");
}

export function createAdminHealthTool(config: AdminHealthToolConfig = {}) {
  const appConfig = config.config ?? loadAppConfig();
  const allowlistSize = config.allowlistSize ?? parseAllowedChatIds(appConfig.allowedChatIdsRaw).size;
  const dbPath = config.dbPath ?? process.env.BOT_DB_PATH ?? "bot.db";
  const maxChecks = Number.isInteger(config.maxChecks) && (config.maxChecks ?? 0) > 0 ? config.maxChecks! : 12;
  const now = config.now ?? (() => new Date());
  const newTraceId = config.newTraceId ?? uuidv4;
  const isDbOpen = config.isDbOpen ?? (() => db.open);
  const runHealthcheckFn = config.runHealthcheckFn ?? runHealthcheck;

  return async (args: { chat_id: string }): Promise<AdminHealthResult> => {
    void args.chat_id;

    const report = runHealthcheckFn({
      config: appConfig,
      dbOpen: isDbOpen(),
      dbPath,
      allowlistSize
    });

    const checks = report.checks.slice(0, maxChecks).map((item) => ({
      name: item.name,
      status: mapStatus(item.status),
      detail: sanitizeDetail(item.detail)
    }));

    return {
      status: mapStatus(report.status),
      checks,
      trace_ref: `admin-health:${newTraceId()}`,
      detail: `admin-health executed (checks=${checks.length})`,
      generated_at: now().toISOString()
    };
  };
}
