import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_admin_logs_now_invalid");
}

const entries = [
  {
    operation_id: "op-smoke-1",
    chat_id: chatId,
    intent: "pedido",
    status: "executed" as const,
    payload_preview: "{\"nombre_cliente\":\"Ana\"}",
    created_at: "2026-03-25T10:00:00.000Z",
    updated_at: "2026-03-25T10:05:00.000Z"
  }
];

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeAdminLogsFn: async ({ filters }) => ({
    status: "ok",
    filters: {
      chat_id: filters?.chat_id,
      operation_id: filters?.operation_id,
      limit: filters?.limit ?? 10
    },
    total: entries.length,
    entries,
    trace_ref: "admin-logs:smoke:a1",
    detail: "admin-logs smoke mock execution",
    generated_at: "2026-03-25T10:10:00.000Z"
  })
});

const processorFail = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  newOperationId: () => "admin-logs-fail-op",
  executeAdminLogsFn: async () => {
    throw new Error("admin_logs_mock_down");
  }
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "admin_logs_smoke_start",
        mode: "mock",
        chatId
      },
      null,
      2
    )
  );

  const scenarios = [
    "admin logs",
    `logs chat_id ${chatId}`,
    "logs operation_id op-smoke-1 top 5"
  ];

  for (const text of scenarios) {
    const replies = await processor.handleMessage({ chat_id: chatId, text });
    const reply = replies[0] ?? "";
    const ok = reply.includes("Logs admin") && reply.includes("Ref: admin-logs:smoke:a1");

    console.log(
      JSON.stringify(
        {
          event: "admin_logs_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`admin_logs_smoke_unexpected_reply:${text}`);
    }
  }

  const failureReplies = await processorFail.handleMessage({ chat_id: chatId, text: "admin logs" });
  const failureReply = failureReplies[0] ?? "";
  const failureOk = failureReply.includes("No pude consultar las trazas operativas") && failureReply.includes("Ref: admin-logs:admin-logs-fail-op");

  console.log(
    JSON.stringify(
      {
        event: "admin_logs_smoke_failure_case",
        reply: failureReply,
        ok: failureOk
      },
      null,
      2
    )
  );

  if (!failureOk) {
    throw new Error("admin_logs_smoke_failure_case_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "admin_logs_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "admin_logs_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
