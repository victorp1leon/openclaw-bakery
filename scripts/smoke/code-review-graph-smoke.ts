import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";

dotenv.config();

const previousCrgEnv = process.env.CODE_REVIEW_GRAPH_ENABLE;
process.env.CODE_REVIEW_GRAPH_ENABLE = "1";

const config = loadAppConfig();
const chatIdBase = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const chatId = `${chatIdBase}-crg-${Date.now()}`;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_code_review_graph_now_invalid");
}

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeCodeReviewGraphFn: async ({ operation }) => ({
    status: "ok",
    operation,
    summary: `Operacion ${operation} ejecutada correctamente.`,
    detail: "ok",
    trace_ref: "code-review-graph:smoke:a1",
    generated_at: "2026-03-24T20:00:00.000Z",
    data: {
      impacted_files_count: operation === "get_impact_radius" ? 3 : 0
    },
    meta: {
      repo_root: "/home/victor/openclaw-bakery",
      duration_ms: 42,
      timed_out: false,
      exit_code: 0,
      truncated: false
    }
  })
});

const processorFailure = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeCodeReviewGraphFn: async () => ({
    status: "error",
    operation: "get_impact_radius",
    summary: "Code Review Graph devolvió un error controlado.",
    detail: "mock_error",
    trace_ref: "code-review-graph:smoke:error",
    generated_at: "2026-03-24T20:00:00.000Z",
    data: {},
    meta: {
      repo_root: "/home/victor/openclaw-bakery",
      duration_ms: 17,
      timed_out: false,
      exit_code: 0,
      truncated: false
    }
  })
});

async function main() {
  console.log(JSON.stringify({ event: "code_review_graph_smoke_start", mode: "mock", chatId }, null, 2));

  const buildReplies = await processor.handleMessage({ chat_id: chatId, text: "admin crg build" });
  const buildReply = buildReplies[0] ?? "";
  const buildOk = buildReply.includes("Code Review Graph: OK") && buildReply.includes("Ref: code-review-graph:smoke:a1");
  console.log(JSON.stringify({ event: "code_review_graph_smoke_build", reply: buildReply, ok: buildOk }, null, 2));
  if (!buildOk) throw new Error("code_review_graph_smoke_build_unexpected_reply");

  const impactReplies = await processor.handleMessage({
    chat_id: chatId,
    text: "admin crg impact src/runtime/conversationProcessor.ts depth 3"
  });
  const impactReply = impactReplies[0] ?? "";
  const impactOk = impactReply.includes("Code Review Graph: OK") && impactReply.includes("impact radius");
  console.log(JSON.stringify({ event: "code_review_graph_smoke_impact", reply: impactReply, ok: impactOk }, null, 2));
  if (!impactOk) throw new Error("code_review_graph_smoke_impact_unexpected_reply");

  const missingPathReplies = await processor.handleMessage({ chat_id: chatId, text: "admin crg context" });
  const missingPathReply = missingPathReplies[0] ?? "";
  const missingPathOk = missingPathReply.includes("Necesito la ruta del archivo objetivo");
  console.log(
    JSON.stringify({ event: "code_review_graph_smoke_missing_path", reply: missingPathReply, ok: missingPathOk }, null, 2)
  );
  if (!missingPathOk) throw new Error("code_review_graph_smoke_missing_path_unexpected_reply");

  const failureReplies = await processorFailure.handleMessage({
    chat_id: chatId,
    text: "admin crg impact src/index.ts"
  });
  const failureReply = failureReplies[0] ?? "";
  const failureOk = failureReply.includes("Code Review Graph: ERROR") && failureReply.includes("Ref: code-review-graph:smoke:error");
  console.log(JSON.stringify({ event: "code_review_graph_smoke_failure", reply: failureReply, ok: failureOk }, null, 2));
  if (!failureOk) throw new Error("code_review_graph_smoke_failure_unexpected_reply");

  console.log(JSON.stringify({ event: "code_review_graph_smoke_done", ok: true }, null, 2));
}

void main()
  .catch((err: unknown) => {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: "code_review_graph_smoke_failed", detail }, null, 2));
    process.exitCode = 1;
  })
  .finally(() => {
    if (previousCrgEnv == null) delete process.env.CODE_REVIEW_GRAPH_ENABLE;
    else process.env.CODE_REVIEW_GRAPH_ENABLE = previousCrgEnv;
  });
