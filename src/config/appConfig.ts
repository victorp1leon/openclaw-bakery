import { parseBotPersona, type BotPersona } from "../runtime/persona";

export type ChannelMode = "console" | "telegram";
export type SheetsProvider = "gws";
export type GwsValueInputOption = "RAW" | "USER_ENTERED";
export type RecipeSource = "inline" | "gws";

export type AppConfig = {
  botPersona: BotPersona;
  nodeEnv: string;
  logLevel: string;
  timezone: string;
  defaultCurrency: string;
  allowedChatIdsRaw: string | undefined;
  localChatId: string;
  channelMode: ChannelMode;
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxMessagesPerWindow: number;
    blockDurationMs: number;
  };
  openclaw: {
    enabled: boolean;
    agentId: string;
    profile?: string;
    timeoutSeconds: number;
    strict: boolean;
    strictSoftfail: boolean;
    thinking?: string;
  };
  telegram: {
    botToken?: string;
    pollIntervalMs: number;
    longPollTimeoutSeconds: number;
    apiBaseUrl: string;
  };
  expenseTool: {
    dryRun: boolean;
    sheetsProvider: SheetsProvider;
    timeoutMs: number;
    maxRetries: number;
    gws: {
      command: string;
      commandArgs: string[];
      spreadsheetId?: string;
      range?: string;
      valueInputOption: GwsValueInputOption;
    };
  };
  orderTool: {
    trello: {
      dryRun: boolean;
      apiKey?: string;
      token?: string;
      listId?: string;
      cancelListId?: string;
      apiBaseUrl: string;
      timeoutMs: number;
      maxRetries: number;
    };
    sheets: {
      dryRun: boolean;
      provider: SheetsProvider;
      timeoutMs: number;
      maxRetries: number;
      gws: {
        command: string;
        commandArgs: string[];
        spreadsheetId?: string;
        range?: string;
        valueInputOption: GwsValueInputOption;
      };
    };
    recipes: {
      source: RecipeSource;
      timeoutMs: number;
      maxRetries: number;
      gws: {
        command: string;
        commandArgs: string[];
        spreadsheetId?: string;
        range?: string;
      };
    };
  };
  webTool: {
    chatEnabled: boolean;
    contentPath: string;
    publish: {
      dryRun: boolean;
      webhookUrl?: string;
      apiKey?: string;
      apiKeyHeader: string;
      timeoutMs: number;
      maxRetries: number;
      allowedImageDomains: string[];
      facebookPageUrl?: string;
    };
  };
};

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

function toNonNegativeInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

function parseChannelMode(raw: string | undefined): ChannelMode {
  const value = raw?.trim().toLowerCase();
  if (!value || value === "console") return "console";
  if (value === "telegram") return "telegram";
  return "console";
}

function parseHeaderName(raw: string | undefined, fallback: string): string {
  const value = raw?.trim();
  return value && value.length > 0 ? value : fallback;
}

function parseSheetsProvider(raw: string | undefined, fallback: SheetsProvider): SheetsProvider {
  const value = raw?.trim().toLowerCase();
  if (value === "gws") return "gws";
  return fallback;
}

function parseGwsValueInputOption(raw: string | undefined, fallback: GwsValueInputOption): GwsValueInputOption {
  const value = raw?.trim().toUpperCase();
  if (value === "RAW" || value === "USER_ENTERED") return value;
  return fallback;
}

function parseRecipeSource(raw: string | undefined): RecipeSource {
  const value = raw?.trim().toLowerCase();
  if (value === "gws") return "gws";
  return "inline";
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const webAllowedImageDomains = parseCsv(env.WEB_PUBLISH_ALLOWED_IMAGE_DOMAINS).map((domain) => domain.toLowerCase());
  const orderSheetsTimeoutMs = toPositiveInt(env.ORDER_SHEETS_TIMEOUT_MS, 5000);
  const orderSheetsMaxRetries = toNonNegativeInt(env.ORDER_SHEETS_MAX_RETRIES, 2);
  const orderSheetsGwsCommand = env.ORDER_SHEETS_GWS_COMMAND?.trim() || "gws";
  const orderSheetsGwsCommandArgs = parseCsv(env.ORDER_SHEETS_GWS_COMMAND_ARGS);
  const orderSheetsGwsSpreadsheetId = env.ORDER_SHEETS_GWS_SPREADSHEET_ID?.trim() || undefined;
  const orderSheetsGwsRange = env.ORDER_SHEETS_GWS_RANGE?.trim() || undefined;
  const orderRecipesSource = parseRecipeSource(env.ORDER_RECIPES_SOURCE);
  const orderRecipesCommand = env.ORDER_RECIPES_GWS_COMMAND?.trim() || orderSheetsGwsCommand;
  const orderRecipesCommandArgs = env.ORDER_RECIPES_GWS_COMMAND_ARGS != null
    ? parseCsv(env.ORDER_RECIPES_GWS_COMMAND_ARGS)
    : orderSheetsGwsCommandArgs;
  const orderRecipesSpreadsheetId = env.ORDER_RECIPES_GWS_SPREADSHEET_ID?.trim() || orderSheetsGwsSpreadsheetId;
  const orderRecipesRange = env.ORDER_RECIPES_GWS_RANGE?.trim() || "CatalogoRecetas!A:F";
  const orderRecipesTimeoutMs = toPositiveInt(env.ORDER_RECIPES_TIMEOUT_MS, orderSheetsTimeoutMs);
  const orderRecipesMaxRetries = toNonNegativeInt(env.ORDER_RECIPES_MAX_RETRIES, orderSheetsMaxRetries);

  return {
    botPersona: parseBotPersona(env.BOT_PERSONA),
    nodeEnv: env.NODE_ENV ?? "development",
    logLevel: env.LOG_LEVEL ?? "info",
    timezone: env.TIMEZONE ?? "America/Mexico_City",
    defaultCurrency: env.DEFAULT_CURRENCY ?? "MXN",
    allowedChatIdsRaw: env.ALLOWLIST_CHAT_IDS,
    localChatId: env.LOCAL_CHAT_ID ?? "local-dev",
    channelMode: parseChannelMode(env.CHANNEL_MODE),
    rateLimit: {
      enabled: (env.RATE_LIMIT_ENABLE ?? "1") === "1",
      windowMs: toPositiveInt(env.RATE_LIMIT_WINDOW_SECONDS, 10) * 1000,
      maxMessagesPerWindow: toPositiveInt(env.RATE_LIMIT_MAX_MESSAGES, 8),
      blockDurationMs: toPositiveInt(env.RATE_LIMIT_BLOCK_SECONDS, 30) * 1000
    },
    openclaw: {
      enabled: env.OPENCLAW_ENABLE === "1",
      agentId: env.OPENCLAW_AGENT_ID ?? "main",
      profile: env.OPENCLAW_PROFILE?.trim() || undefined,
      timeoutSeconds: toPositiveInt(env.OPENCLAW_TIMEOUT_SECONDS, 30),
      strict: env.OPENCLAW_STRICT === "1",
      strictSoftfail: env.OPENCLAW_STRICT_SOFTFAIL === "1",
      thinking: env.OPENCLAW_THINKING?.trim() || undefined
    },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
      pollIntervalMs: toPositiveInt(env.TELEGRAM_POLL_INTERVAL_MS, 1000),
      longPollTimeoutSeconds: toPositiveInt(env.TELEGRAM_LONG_POLL_TIMEOUT_SECONDS, 25),
      apiBaseUrl: env.TELEGRAM_API_BASE_URL?.trim() || "https://api.telegram.org"
    },
    expenseTool: {
      dryRun: (env.EXPENSE_TOOL_DRY_RUN ?? "1") === "1",
      sheetsProvider: parseSheetsProvider(env.EXPENSE_SHEETS_PROVIDER, "gws"),
      timeoutMs: toPositiveInt(env.EXPENSE_TOOL_TIMEOUT_MS, 5000),
      maxRetries: toNonNegativeInt(env.EXPENSE_TOOL_MAX_RETRIES, 2),
      gws: {
        command: env.EXPENSE_GWS_COMMAND?.trim() || "gws",
        commandArgs: parseCsv(env.EXPENSE_GWS_COMMAND_ARGS),
        spreadsheetId: env.EXPENSE_GWS_SPREADSHEET_ID?.trim() || undefined,
        range: env.EXPENSE_GWS_RANGE?.trim() || undefined,
        valueInputOption: parseGwsValueInputOption(env.EXPENSE_GWS_VALUE_INPUT_OPTION, "USER_ENTERED")
      }
    },
    orderTool: {
      trello: {
        dryRun: (env.ORDER_TRELLO_DRY_RUN ?? "1") === "1",
        apiKey: env.ORDER_TRELLO_API_KEY?.trim() || undefined,
        token: env.ORDER_TRELLO_TOKEN?.trim() || undefined,
        listId: env.ORDER_TRELLO_LIST_ID?.trim() || undefined,
        cancelListId: env.ORDER_TRELLO_CANCEL_LIST_ID?.trim() || undefined,
        apiBaseUrl: env.ORDER_TRELLO_API_BASE_URL?.trim() || "https://api.trello.com",
        timeoutMs: toPositiveInt(env.ORDER_TRELLO_TIMEOUT_MS, 5000),
        maxRetries: toNonNegativeInt(env.ORDER_TRELLO_MAX_RETRIES, 2)
      },
      sheets: {
        dryRun: (env.ORDER_SHEETS_DRY_RUN ?? "1") === "1",
        provider: parseSheetsProvider(env.ORDER_SHEETS_PROVIDER, "gws"),
        timeoutMs: orderSheetsTimeoutMs,
        maxRetries: orderSheetsMaxRetries,
        gws: {
          command: orderSheetsGwsCommand,
          commandArgs: orderSheetsGwsCommandArgs,
          spreadsheetId: orderSheetsGwsSpreadsheetId,
          range: orderSheetsGwsRange,
          valueInputOption: parseGwsValueInputOption(env.ORDER_SHEETS_GWS_VALUE_INPUT_OPTION, "USER_ENTERED")
        }
      },
      recipes: {
        source: orderRecipesSource,
        timeoutMs: orderRecipesTimeoutMs,
        maxRetries: orderRecipesMaxRetries,
        gws: {
          command: orderRecipesCommand,
          commandArgs: orderRecipesCommandArgs,
          spreadsheetId: orderRecipesSpreadsheetId,
          range: orderRecipesRange
        }
      }
    },
    webTool: {
      chatEnabled: (env.WEB_CHAT_ENABLE ?? "0") === "1",
      contentPath: env.WEB_CONTENT_PATH?.trim() || "site/CONTENT.json",
      publish: {
        dryRun: (env.WEB_PUBLISH_DRY_RUN ?? "1") === "1",
        webhookUrl: env.WEB_PUBLISH_WEBHOOK_URL?.trim() || undefined,
        apiKey: env.WEB_PUBLISH_API_KEY?.trim() || undefined,
        apiKeyHeader: parseHeaderName(env.WEB_PUBLISH_API_KEY_HEADER, "x-api-key"),
        timeoutMs: toPositiveInt(env.WEB_PUBLISH_TIMEOUT_MS, 5000),
        maxRetries: toNonNegativeInt(env.WEB_PUBLISH_MAX_RETRIES, 2),
        allowedImageDomains: webAllowedImageDomains.length > 0 ? webAllowedImageDomains : ["facebook.com", "fbcdn.net"],
        facebookPageUrl: env.WEB_FACEBOOK_PAGE_URL?.trim() || undefined
      }
    }
  };
}
