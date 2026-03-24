import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { createConversationProcessor } from "../../src/runtime/conversationProcessor";

dotenv.config();

const config = loadAppConfig();

const chatId = process.env.SMOKE_CHAT_ID?.trim() || config.localChatId;
const nowIso = process.env.SMOKE_NOW_ISO?.trim();
const nowMs = nowIso ? Date.parse(nowIso) : Date.now();

if (!Number.isFinite(nowMs)) {
  throw new Error("smoke_admin_config_view_now_invalid");
}

const snapshot = {
  runtime: {
    node_env: "test",
    channel_mode: "telegram" as const,
    timezone: "America/Mexico_City",
    allowlist_size: 1,
    rate_limit: {
      enabled: true,
      window_ms: 10_000,
      max_messages_per_window: 8,
      block_duration_ms: 30_000
    }
  },
  openclaw: {
    enabled: true,
    agent_id: "main",
    profile_configured: false,
    timeout_seconds: 30,
    strict: false,
    strict_softfail: false,
    thinking_configured: false,
    readonly_routing_enabled: true,
    readonly_quote_enabled: true
  },
  telegram: {
    bot_token_configured: true,
    poll_interval_ms: 1000,
    long_poll_timeout_seconds: 25,
    api_base_url: "https://api.telegram.org"
  },
  expense: {
    dry_run: true,
    provider: "gws" as const,
    timeout_ms: 30_000,
    max_retries: 2,
    gws: {
      command: "gws",
      command_args_count: 0,
      spreadsheet_configured: true,
      range_configured: true,
      value_input_option: "USER_ENTERED" as const
    }
  },
  order: {
    trello: {
      dry_run: true,
      api_key_configured: true,
      token_configured: true,
      list_id_configured: true,
      cancel_list_id_configured: true,
      api_base_url: "https://api.trello.com",
      timeout_ms: 30_000,
      max_retries: 2
    },
    sheets: {
      dry_run: true,
      provider: "gws" as const,
      timeout_ms: 30_000,
      max_retries: 2,
      gws: {
        command: "gws",
        command_args_count: 0,
        spreadsheet_configured: true,
        range_configured: true,
        value_input_option: "USER_ENTERED" as const
      }
    },
    recipes: {
      source: "inline" as const,
      timeout_ms: 30_000,
      max_retries: 2,
      gws: {
        command: "gws",
        command_args_count: 0,
        spreadsheet_configured: false,
        range_configured: false
      }
    },
    limits: {
      lookup: 10,
      status: 10,
      report: 10
    }
  },
  inventory_consume: {
    enabled: false,
    allow_negative_stock: false,
    recipe_source: "gws" as const,
    timeout_ms: 30_000,
    max_retries: 2,
    gws: {
      command: "gws",
      command_args_count: 0,
      spreadsheet_configured: true,
      orders_range_configured: true,
      inventory_range_configured: true,
      movements_range_configured: true,
      recipes_range_configured: true,
      value_input_option: "USER_ENTERED" as const
    }
  },
  web: {
    chat_enabled: true,
    content_path_configured: true,
    publish: {
      dry_run: true,
      webhook_url_configured: false,
      api_key_configured: false,
      api_key_header: "x-api-key",
      allowed_image_domains_count: 0,
      facebook_page_url_configured: false,
      timeout_ms: 30_000,
      max_retries: 2
    }
  },
  code_review_graph: {
    enabled: false,
    command: "python3",
    command_args_count: 2,
    timeout_ms: 15_000,
    allowlist_count: 1,
    default_repo_configured: true,
    max_depth: 2,
    include_source_default: false,
    max_lines_per_file: 80,
    max_output_chars: 60_000,
    base_ref: "HEAD~1"
  }
};

const processor = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  executeAdminConfigViewFn: async () => ({
    status: "ok",
    snapshot,
    trace_ref: "admin-config-view:smoke:a1",
    detail: "admin-config-view smoke mock execution",
    generated_at: "2026-03-24T20:00:00.000Z"
  })
});

const processorFail = createConversationProcessor({
  allowedChatIds: new Set([chatId]),
  nowMs: () => nowMs,
  routeIntentFn: async () => "unknown",
  newOperationId: () => "admin-config-view-fail-op",
  executeAdminConfigViewFn: async () => {
    throw new Error("admin_config_view_mock_down");
  }
});

async function main() {
  console.log(
    JSON.stringify(
      {
        event: "admin_config_view_smoke_start",
        mode: "mock",
        chatId
      },
      null,
      2
    )
  );

  const scenarios = [
    "configuracion del bot",
    "admin config",
    "ver settings del sistema"
  ];

  for (const text of scenarios) {
    const replies = await processor.handleMessage({ chat_id: chatId, text });
    const reply = replies[0] ?? "";
    const ok = reply.includes("Configuracion admin (sanitizada):") && reply.includes("Ref: admin-config-view:smoke:a1");

    console.log(
      JSON.stringify(
        {
          event: "admin_config_view_smoke_case",
          input: text,
          reply,
          ok
        },
        null,
        2
      )
    );

    if (!ok) {
      throw new Error(`admin_config_view_smoke_unexpected_reply:${text}`);
    }
  }

  const failureReplies = await processorFail.handleMessage({ chat_id: chatId, text: "configuracion del bot" });
  const failureReply = failureReplies[0] ?? "";
  const failureOk =
    failureReply.includes("No pude consultar la configuracion operativa") &&
    failureReply.includes("Ref: admin-config-view:admin-config-view-fail-op");

  console.log(
    JSON.stringify(
      {
        event: "admin_config_view_smoke_failure_case",
        reply: failureReply,
        ok: failureOk
      },
      null,
      2
    )
  );

  if (!failureOk) {
    throw new Error("admin_config_view_smoke_failure_case_unexpected_reply");
  }

  console.log(JSON.stringify({ event: "admin_config_view_smoke_done", ok: true }, null, 2));
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "admin_config_view_smoke_failed", detail }, null, 2));
  process.exitCode = 1;
});
