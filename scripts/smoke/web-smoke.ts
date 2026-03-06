import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createPublishSiteTool, type WebAction, type WebImageSource } from "../../src/tools/web/publishSite";

dotenv.config();

const config = loadAppConfig();

const operationId = process.env.SMOKE_OPERATION_ID?.trim() || `smoke-web-${Date.now()}`;
const actionRaw = process.env.SMOKE_WEB_ACTION?.trim().toLowerCase() || "menu";
const action: WebAction = actionRaw === "crear" || actionRaw === "menu" || actionRaw === "publicar" ? actionRaw : "menu";
const imageSourceRaw = process.env.SMOKE_WEB_IMAGE_SOURCE?.trim().toLowerCase() || "manual";
const imageSource: WebImageSource = imageSourceRaw === "facebook" ? "facebook" : "manual";

const businessName = process.env.SMOKE_WEB_BUSINESS_NAME?.trim() || "Hadi Bakery";
const whatsapp = process.env.SMOKE_WEB_WHATSAPP?.trim() || "+5215512345678";
const imageUrl = process.env.SMOKE_WEB_IMAGE_URL?.trim() || "https://facebook.com/hadibakery/photos";

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
        event: "web_smoke_start",
        operationId,
        action,
        publish: {
          dryRun: config.webTool.publish.dryRun,
          webhookConfigured: Boolean(config.webTool.publish.webhookUrl),
          apiKeyConfigured: Boolean(config.webTool.publish.apiKey),
          apiKeyHeader: config.webTool.publish.apiKeyHeader,
          allowedImageDomains: config.webTool.publish.allowedImageDomains,
          facebookPageUrlConfigured: Boolean(config.webTool.publish.facebookPageUrl),
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
    payload: {
      action,
      content: {
        businessName,
        whatsapp,
        zones: ["Norte", "Centro"],
        menuItems: [{ nombre: "Cupcake", descripcion: "Vainilla", precio: 45 }],
        catalogItems: [
          {
            id: "smoke-item-1",
            nombre: "Cupcake Smoke",
            descripcion: "Producto de prueba",
            precio: 45,
            categoria: "cupcakes",
            imageUrl,
            imageSource
          }
        ],
        cta: "Pide por WhatsApp"
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        event: "web_smoke_result",
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
  console.error(JSON.stringify({ event: "web_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
