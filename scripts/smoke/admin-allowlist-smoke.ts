import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_admin_allowlist_now_invalid");
}

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId, "chat-secondary"]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  newOperationId: (() => {
    let i = 0;
    return () => {
      i += 1;
      return `admin-allowlist-op-${i}`;
    };
  })()
});

const processorFail = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  newOperationId: () => "admin-allowlist-fail-op",
  executeAdminAllowlistFn: async () => {
    throw new Error("admin_allowlist_mock_down");
  }
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "admin_allowlist_smoke_start",
        mode: "mock",
        chatId
      },
      null,
      2
    )
  );

  const viewReplies = await processor.handleMessage({ chat_id: chatId, text: "admin allowlist" });
  const viewOk = (viewReplies[0] ?? "").includes("Operación allowlist: consulta") && (viewReplies[0] ?? "").includes("Ref: admin-allowlist:");
  console.log(JSON.stringify({ event: "admin_allowlist_smoke_case", input: "admin allowlist", reply: viewReplies[0], ok: viewOk }, null, 2));
  if (!viewOk) throw new Error("admin_allowlist_smoke_view_failed");

  const addSummary = await processor.handleMessage({ chat_id: chatId, text: "admin allowlist add chat-smoke-new" });
  const addSummaryOk = (addSummary[0] ?? "").includes("\"intent\": \"admin.allowlist\"") && (addSummary[0] ?? "").includes("\"operation\": \"add\"");
  console.log(JSON.stringify({ event: "admin_allowlist_smoke_case", input: "admin allowlist add chat-smoke-new", reply: addSummary[0], ok: addSummaryOk }, null, 2));
  if (!addSummaryOk) throw new Error("admin_allowlist_smoke_add_summary_failed");

  const addConfirm = await processor.handleMessage({ chat_id: chatId, text: "confirmar" });
  const addConfirmOk = (addConfirm[0] ?? "").includes("Operación allowlist: agregado chat-smoke-new") && (addConfirm[0] ?? "").includes("Ref: admin-allowlist:");
  console.log(JSON.stringify({ event: "admin_allowlist_smoke_case", input: "confirmar (add)", reply: addConfirm[0], ok: addConfirmOk }, null, 2));
  if (!addConfirmOk) throw new Error("admin_allowlist_smoke_add_confirm_failed");

  const removeSummary = await processor.handleMessage({ chat_id: chatId, text: "admin allowlist remove chat-smoke-new" });
  const removeSummaryOk = (removeSummary[0] ?? "").includes("\"operation\": \"remove\"");
  console.log(JSON.stringify({ event: "admin_allowlist_smoke_case", input: "admin allowlist remove chat-smoke-new", reply: removeSummary[0], ok: removeSummaryOk }, null, 2));
  if (!removeSummaryOk) throw new Error("admin_allowlist_smoke_remove_summary_failed");

  const removeConfirm = await processor.handleMessage({ chat_id: chatId, text: "confirmar" });
  const removeConfirmOk = (removeConfirm[0] ?? "").includes("Operación allowlist: removido chat-smoke-new") && (removeConfirm[0] ?? "").includes("Ref: admin-allowlist:");
  console.log(JSON.stringify({ event: "admin_allowlist_smoke_case", input: "confirmar (remove)", reply: removeConfirm[0], ok: removeConfirmOk }, null, 2));
  if (!removeConfirmOk) throw new Error("admin_allowlist_smoke_remove_confirm_failed");

  const selfRemoveSummary = await processor.handleMessage({ chat_id: chatId, text: `admin allowlist remove ${chatId}` });
  const selfSummaryOk = (selfRemoveSummary[0] ?? "").includes("\"operation\": \"remove\"");
  console.log(JSON.stringify({ event: "admin_allowlist_smoke_case", input: "admin allowlist remove self", reply: selfRemoveSummary[0], ok: selfSummaryOk }, null, 2));
  if (!selfSummaryOk) throw new Error("admin_allowlist_smoke_self_remove_summary_failed");

  const selfRemoveConfirm = await processor.handleMessage({ chat_id: chatId, text: "confirmar" });
  const selfConfirmOk = (selfRemoveConfirm[0] ?? "").includes("No puedo remover tu propio chat_id") && (selfRemoveConfirm[0] ?? "").includes("Ref: admin-allowlist:");
  console.log(JSON.stringify({ event: "admin_allowlist_smoke_case", input: "confirmar (self-remove)", reply: selfRemoveConfirm[0], ok: selfConfirmOk }, null, 2));
  if (!selfConfirmOk) throw new Error("admin_allowlist_smoke_self_remove_confirm_failed");

  const failReplies = await processorFail.handleMessage({ chat_id: chatId, text: "admin allowlist" });
  const failOk = (failReplies[0] ?? "").includes("No pude consultar la allowlist") && (failReplies[0] ?? "").includes("Ref: admin-allowlist:admin-allowlist-fail-op");
  console.log(JSON.stringify({ event: "admin_allowlist_smoke_failure_case", reply: failReplies[0], ok: failOk }, null, 2));
  if (!failOk) throw new Error("admin_allowlist_smoke_failure_case_unexpected_reply");

  console.log(JSON.stringify({ event: "admin_allowlist_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "admin_allowlist_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
