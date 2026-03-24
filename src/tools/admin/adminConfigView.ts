import { v4 as uuidv4 } from "uuid";

import { type AppConfig, loadAppConfig } from "../../config/appConfig";
import { parseAllowedChatIds } from "../../guards/allowlistGuard";

export type AdminConfigViewResult = {
  status: "ok";
  snapshot: {
    runtime: {
      node_env: string;
      channel_mode: AppConfig["channelMode"];
      timezone: string;
      allowlist_size: number;
      rate_limit: {
        enabled: boolean;
        window_ms: number;
        max_messages_per_window: number;
        block_duration_ms: number;
      };
    };
    openclaw: {
      enabled: boolean;
      agent_id: string;
      profile_configured: boolean;
      timeout_seconds: number;
      strict: boolean;
      strict_softfail: boolean;
      thinking_configured: boolean;
      readonly_routing_enabled: boolean;
      readonly_quote_enabled: boolean;
    };
    telegram: {
      bot_token_configured: boolean;
      poll_interval_ms: number;
      long_poll_timeout_seconds: number;
      api_base_url: string;
    };
    expense: {
      dry_run: boolean;
      provider: AppConfig["expenseTool"]["sheetsProvider"];
      timeout_ms: number;
      max_retries: number;
      gws: {
        command: string;
        command_args_count: number;
        spreadsheet_configured: boolean;
        range_configured: boolean;
        value_input_option: AppConfig["expenseTool"]["gws"]["valueInputOption"];
      };
    };
    order: {
      trello: {
        dry_run: boolean;
        api_key_configured: boolean;
        token_configured: boolean;
        list_id_configured: boolean;
        cancel_list_id_configured: boolean;
        api_base_url: string;
        timeout_ms: number;
        max_retries: number;
      };
      sheets: {
        dry_run: boolean;
        provider: AppConfig["orderTool"]["sheets"]["provider"];
        timeout_ms: number;
        max_retries: number;
        gws: {
          command: string;
          command_args_count: number;
          spreadsheet_configured: boolean;
          range_configured: boolean;
          value_input_option: AppConfig["orderTool"]["sheets"]["gws"]["valueInputOption"];
        };
      };
      recipes: {
        source: AppConfig["orderTool"]["recipes"]["source"];
        timeout_ms: number;
        max_retries: number;
        gws: {
          command: string;
          command_args_count: number;
          spreadsheet_configured: boolean;
          range_configured: boolean;
        };
      };
      limits: {
        lookup: number;
        status: number;
        report: number;
      };
    };
    inventory_consume: {
      enabled: boolean;
      allow_negative_stock: boolean;
      recipe_source: AppConfig["inventoryConsume"]["recipeSource"];
      timeout_ms: number;
      max_retries: number;
      gws: {
        command: string;
        command_args_count: number;
        spreadsheet_configured: boolean;
        orders_range_configured: boolean;
        inventory_range_configured: boolean;
        movements_range_configured: boolean;
        recipes_range_configured: boolean;
        value_input_option: AppConfig["inventoryConsume"]["gws"]["valueInputOption"];
      };
    };
    web: {
      chat_enabled: boolean;
      content_path_configured: boolean;
      publish: {
        dry_run: boolean;
        webhook_url_configured: boolean;
        api_key_configured: boolean;
        api_key_header: string;
        allowed_image_domains_count: number;
        facebook_page_url_configured: boolean;
        timeout_ms: number;
        max_retries: number;
      };
    };
    code_review_graph: {
      enabled: boolean;
      command: string;
      command_args_count: number;
      timeout_ms: number;
      allowlist_count: number;
      default_repo_configured: boolean;
      max_depth: number;
      include_source_default: boolean;
      max_lines_per_file: number;
      max_output_chars: number;
      base_ref: string;
    };
  };
  trace_ref: string;
  detail: string;
  generated_at: string;
};

export type AdminConfigViewToolConfig = {
  config?: AppConfig;
  allowlistSize?: number;
  now?: () => Date;
  newTraceId?: () => string;
};

function buildSnapshot(args: {
  config: AppConfig;
  allowlistSize: number;
}): AdminConfigViewResult["snapshot"] {
  const { config, allowlistSize } = args;

  return {
    runtime: {
      node_env: config.nodeEnv,
      channel_mode: config.channelMode,
      timezone: config.timezone,
      allowlist_size: allowlistSize,
      rate_limit: {
        enabled: config.rateLimit.enabled,
        window_ms: config.rateLimit.windowMs,
        max_messages_per_window: config.rateLimit.maxMessagesPerWindow,
        block_duration_ms: config.rateLimit.blockDurationMs
      }
    },
    openclaw: {
      enabled: config.openclaw.enabled,
      agent_id: config.openclaw.agentId,
      profile_configured: Boolean(config.openclaw.profile),
      timeout_seconds: config.openclaw.timeoutSeconds,
      strict: config.openclaw.strict,
      strict_softfail: config.openclaw.strictSoftfail,
      thinking_configured: Boolean(config.openclaw.thinking),
      readonly_routing_enabled: config.openclaw.readOnlyRoutingEnabled,
      readonly_quote_enabled: config.openclaw.readOnlyQuoteEnabled
    },
    telegram: {
      bot_token_configured: Boolean(config.telegram.botToken),
      poll_interval_ms: config.telegram.pollIntervalMs,
      long_poll_timeout_seconds: config.telegram.longPollTimeoutSeconds,
      api_base_url: config.telegram.apiBaseUrl
    },
    expense: {
      dry_run: config.expenseTool.dryRun,
      provider: config.expenseTool.sheetsProvider,
      timeout_ms: config.expenseTool.timeoutMs,
      max_retries: config.expenseTool.maxRetries,
      gws: {
        command: config.expenseTool.gws.command,
        command_args_count: config.expenseTool.gws.commandArgs.length,
        spreadsheet_configured: Boolean(config.expenseTool.gws.spreadsheetId),
        range_configured: Boolean(config.expenseTool.gws.range),
        value_input_option: config.expenseTool.gws.valueInputOption
      }
    },
    order: {
      trello: {
        dry_run: config.orderTool.trello.dryRun,
        api_key_configured: Boolean(config.orderTool.trello.apiKey),
        token_configured: Boolean(config.orderTool.trello.token),
        list_id_configured: Boolean(config.orderTool.trello.listId),
        cancel_list_id_configured: Boolean(config.orderTool.trello.cancelListId),
        api_base_url: config.orderTool.trello.apiBaseUrl,
        timeout_ms: config.orderTool.trello.timeoutMs,
        max_retries: config.orderTool.trello.maxRetries
      },
      sheets: {
        dry_run: config.orderTool.sheets.dryRun,
        provider: config.orderTool.sheets.provider,
        timeout_ms: config.orderTool.sheets.timeoutMs,
        max_retries: config.orderTool.sheets.maxRetries,
        gws: {
          command: config.orderTool.sheets.gws.command,
          command_args_count: config.orderTool.sheets.gws.commandArgs.length,
          spreadsheet_configured: Boolean(config.orderTool.sheets.gws.spreadsheetId),
          range_configured: Boolean(config.orderTool.sheets.gws.range),
          value_input_option: config.orderTool.sheets.gws.valueInputOption
        }
      },
      recipes: {
        source: config.orderTool.recipes.source,
        timeout_ms: config.orderTool.recipes.timeoutMs,
        max_retries: config.orderTool.recipes.maxRetries,
        gws: {
          command: config.orderTool.recipes.gws.command,
          command_args_count: config.orderTool.recipes.gws.commandArgs.length,
          spreadsheet_configured: Boolean(config.orderTool.recipes.gws.spreadsheetId),
          range_configured: Boolean(config.orderTool.recipes.gws.range)
        }
      },
      limits: {
        lookup: config.orderTool.lookup.limit,
        status: config.orderTool.status.limit,
        report: config.orderTool.report.limit
      }
    },
    inventory_consume: {
      enabled: config.inventoryConsume.enabled,
      allow_negative_stock: config.inventoryConsume.allowNegativeStock,
      recipe_source: config.inventoryConsume.recipeSource,
      timeout_ms: config.inventoryConsume.timeoutMs,
      max_retries: config.inventoryConsume.maxRetries,
      gws: {
        command: config.inventoryConsume.gws.command,
        command_args_count: config.inventoryConsume.gws.commandArgs.length,
        spreadsheet_configured: Boolean(config.inventoryConsume.gws.spreadsheetId),
        orders_range_configured: Boolean(config.inventoryConsume.gws.ordersRange),
        inventory_range_configured: Boolean(config.inventoryConsume.gws.inventoryRange),
        movements_range_configured: Boolean(config.inventoryConsume.gws.movementsRange),
        recipes_range_configured: Boolean(config.inventoryConsume.gws.recipesRange),
        value_input_option: config.inventoryConsume.gws.valueInputOption
      }
    },
    web: {
      chat_enabled: config.webTool.chatEnabled,
      content_path_configured: Boolean(config.webTool.contentPath?.trim()),
      publish: {
        dry_run: config.webTool.publish.dryRun,
        webhook_url_configured: Boolean(config.webTool.publish.webhookUrl),
        api_key_configured: Boolean(config.webTool.publish.apiKey),
        api_key_header: config.webTool.publish.apiKeyHeader,
        allowed_image_domains_count: config.webTool.publish.allowedImageDomains.length,
        facebook_page_url_configured: Boolean(config.webTool.publish.facebookPageUrl),
        timeout_ms: config.webTool.publish.timeoutMs,
        max_retries: config.webTool.publish.maxRetries
      }
    },
    code_review_graph: {
      enabled: config.codeReviewGraph.enabled,
      command: config.codeReviewGraph.command,
      command_args_count: config.codeReviewGraph.commandArgs.length,
      timeout_ms: config.codeReviewGraph.timeoutMs,
      allowlist_count: config.codeReviewGraph.repoAllowlist.length,
      default_repo_configured: Boolean(config.codeReviewGraph.defaultRepoRoot),
      max_depth: config.codeReviewGraph.maxDepth,
      include_source_default: config.codeReviewGraph.includeSourceDefault,
      max_lines_per_file: config.codeReviewGraph.maxLinesPerFile,
      max_output_chars: config.codeReviewGraph.maxOutputChars,
      base_ref: config.codeReviewGraph.baseRef
    }
  };
}

export function createAdminConfigViewTool(config: AdminConfigViewToolConfig = {}) {
  const appConfig = config.config ?? loadAppConfig();
  const allowlistSize = config.allowlistSize ?? parseAllowedChatIds(appConfig.allowedChatIdsRaw).size;
  const now = config.now ?? (() => new Date());
  const newTraceId = config.newTraceId ?? uuidv4;

  return async (args: { chat_id: string }): Promise<AdminConfigViewResult> => {
    void args.chat_id;

    const snapshot = buildSnapshot({
      config: appConfig,
      allowlistSize
    });

    return {
      status: "ok",
      snapshot,
      trace_ref: `admin-config-view:${newTraceId()}`,
      detail: "admin-config-view executed (sanitized)",
      generated_at: now().toISOString()
    };
  };
}
