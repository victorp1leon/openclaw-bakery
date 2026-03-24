import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_admin_health_now_invalid");
}

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeAdminHealthFn: async () => ({
    status: "ok",
    checks: [
      { name: "env", status: "ok", detail: "NODE_ENV=development" },
      { name: "sqlite", status: "ok", detail: "bot.db (open)" }
    ],
    trace_ref: "admin-health:smoke:a1",
    detail: "admin-health smoke mock execution",
    generated_at: "2026-03-23T12:00:00.000Z"
  })
});

const processorFail = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  newOperationId: () => "admin-health-fail-op",
  executeAdminHealthFn: async () => {
    throw new Error("admin_health_mock_down");
  }
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "admin_health_smoke_start",
        mode: "mock",
        chatId
      },
      null,
      2
    )
  );

  const scenarios = [
    "estado del bot",
    "admin health",
    "salud del sistema"
  ];

  for (const text of scenarios) {
    const replies = await processor.handleMessage({ chat_id: chatId, text });
    const reply = replies[0] ?? "";
    const ok = reply.includes("Estado admin del bot:") && reply.includes("Ref: admin-health:smoke:a1");

    console.log(
      JSON.stringify(
        {
          event: "admin_health_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`admin_health_smoke_unexpected_reply:${text}`);
    }
  }

  const failureReplies = await processorFail.handleMessage({ chat_id: chatId, text: "estado del bot" });
  const failureReply = failureReplies[0] ?? "";
  const failureOk = failureReply.includes("No pude consultar la salud operativa") && failureReply.includes("Ref: admin-health:admin-health-fail-op");

  console.log(
    JSON.stringify(
      {
        event: "admin_health_smoke_failure_case",
        reply: failureReply,
        ok: failureOk
      },
      null,
      2
    )
  );

  if (!failureOk) {
    throw new Error("admin_health_smoke_failure_case_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "admin_health_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "admin_health_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
