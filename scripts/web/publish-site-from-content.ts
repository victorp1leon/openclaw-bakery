import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createPublishSiteTool, type WebAction } from "../../src/tools/web/publishSite";

dotenv.config();

const config = loadAppConfig();

const actionRaw = process.env.WEB_PUBLISH_ACTION?.trim().toLowerCase() || "publicar";
const action: WebAction = actionRaw === "crear" || actionRaw === "menu" || actionRaw === "publicar" ? actionRaw : "publicar";
const includeContentDefault = action === "publicar" ? "0" : "1";
const includeContent = (process.env.WEB_PUBLISH_INCLUDE_CONTENT ?? includeContentDefault) === "1";
const operationId = process.env.WEB_OPERATION_ID?.trim() || `web-publish-${Date.now()}`;
const contentPath = process.env.WEB_CONTENT_PATH?.trim() || config.webTool.contentPath;
const resolvedContentPath = path.resolve(process.cwd(), contentPath);

if (!fs.existsSync(resolvedContentPath)) {
  throw new Error(`web_content_file_missing:${resolvedContentPath}`);
}

const raw = fs.readFileSync(resolvedContentPath, "utf8");
let content: Record<string, unknown>;
try {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("not_object");
  }
  content = parsed as Record<string, unknown>;
} catch {
  throw new Error("web_content_json_invalid");
}

const executePublish = createPublishSiteTool({
  webhookUrl: config.webTool.publish.webhookUrl,
  apiKey: config.webTool.publish.apiKey,
  apiKeyHeader: config.webTool.publish.apiKeyHeader,
  timeoutMs: config.webTool.publish.timeoutMs,
  maxRetries: config.webTool.publish.maxRetries,
  dryRunDefault: config.webTool.publish.dryRun,
  allowedImageDomains: config.webTool.publish.allowedImageDomains,
  facebookPageUrl: config.webTool.publish.facebookPageUrl
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "web_publish_content_start",
        operationId,
        action,
        includeContent,
        contentPath: resolvedContentPath,
        publish: {
          dryRun: config.webTool.publish.dryRun,
          webhookConfigured: Boolean(config.webTool.publish.webhookUrl),
          apiKeyConfigured: Boolean(config.webTool.publish.apiKey),
          apiKeyHeader: config.webTool.publish.apiKeyHeader,
          timeoutMs: config.webTool.publish.timeoutMs,
          maxRetries: config.webTool.publish.maxRetries
        }
      },
      null,
      2
    )
  );

  const result = await executePublish({
    operation_id: operationId,
    payload: includeContent
      ? {
          action,
          content
        }
      : { action }
  });

  console.log(
    JSON.stringify(
      {
        event: "web_publish_content_result",
        ok: result.ok,
        dryRun: result.dry_run,
        operationId: result.operation_id,
        detail: result.detail,
        deployId: result.payload.deploy_id,
        deployUrl: result.payload.deploy_url
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "web_publish_content_failed", detail }, null, 2));
  process.exitCode = 1;
});
