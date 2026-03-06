const dotenv = require("dotenv");
const path = require("node:path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`missing_env_${name}`);
  }
  return value.trim();
}

function maybeJson(text) {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function main() {
  const webhookUrl = required("ORDER_SHEETS_WEBHOOK_URL");
  const apiKey = required("ORDER_SHEETS_API_KEY");
  const apiKeyHeader = (process.env.ORDER_SHEETS_API_KEY_HEADER || "x-api-key").trim();

  const operationId = process.env.CHECK_OPERATION_ID?.trim() || `manual-order-${Date.now()}`;
  const chatId = process.env.CHECK_CHAT_ID?.trim() || "local-dev";
  const nowIso = new Date().toISOString();

  const payload = {
    api_key: apiKey,
    operation_id: operationId,
    chat_id: chatId,
    intent: "pedido",
    order: {
      nombre_cliente: "Smoke Cliente",
      producto: "cupcakes",
      cantidad: 12,
      tipo_envio: "recoger_en_tienda",
      fecha_hora_entrega: nowIso,
      estado_pago: "pendiente",
      total: 0,
      moneda: "MXN",
      notas: "check-order-webhook.js"
    },
    row: {
      folio: operationId,
      nombre_cliente: "Smoke Cliente",
      producto: "cupcakes",
      cantidad: 12,
      tipo_envio: "recoger_en_tienda",
      fecha_hora_entrega: nowIso,
      estado_pago: "pendiente",
      total: 0,
      moneda: "MXN",
      chat_id: chatId,
      operation_id: operationId
    }
  };

  const endpointHost = (() => {
    try {
      return new URL(webhookUrl).host;
    } catch {
      return "invalid_url";
    }
  })();

  console.log(
    JSON.stringify(
      {
        event: "order_webhook_check_start",
        operation_id: operationId,
        endpoint_host: endpointHost,
        apiKeyHeader,
        webhookConfigured: true,
        apiKeyConfigured: true
      },
      null,
      2
    )
  );

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [apiKeyHeader]: apiKey
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  const parsed = maybeJson(raw);

  console.log(
    JSON.stringify(
      {
        event: "order_webhook_check_result",
        operation_id: operationId,
        http_status: response.status,
        ok: response.ok,
        response_json: parsed ?? null,
        response_text: parsed ? null : raw
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "order_webhook_check_failed", detail }, null, 2));
  process.exitCode = 1;
});
