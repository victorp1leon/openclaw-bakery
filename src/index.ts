import dotenv from "dotenv";
import pino from "pino";

import { createChannelAdapter } from "./channel/channelFactory";
import { loadAppConfig } from "./config/appConfig";
import { parseAllowedChatIds } from "./guards/allowlistGuard";
import { createRateLimitGuard } from "./guards/rateLimitGuard";
import { buildTextPreview, REQUIRED_REDACTION_PATHS } from "./logging/loggingPolicy";
import { createConversationProcessor } from "./runtime/conversationProcessor";
import { createAppendExpenseTool } from "./tools/expense/appendExpense";
import { createAppendOrderTool } from "./tools/order/appendOrder";
import { createCancelOrderTool } from "./tools/order/cancelOrder";
import { createCreateCardTool } from "./tools/order/createCard";
import { createLookupOrderTool } from "./tools/order/lookupOrder";
import { createInventoryConsumeTool } from "./tools/order/inventoryConsume";
import { createOrderCardSyncTool } from "./tools/order/orderCardSync";
import { createRecordPaymentTool } from "./tools/order/recordPayment";
import { createQuoteOrderTool } from "./tools/order/quoteOrder";
import { createOrderStatusTool } from "./tools/order/orderStatus";
import { createReportOrdersTool } from "./tools/order/reportOrders";
import { createShoppingListGenerateTool } from "./tools/order/shoppingListGenerate";
import { createUpdateOrderTool } from "./tools/order/updateOrder";
import { createPublishSiteTool } from "./tools/web/publishSite";

dotenv.config();

const appConfig = loadAppConfig();
const logger = pino({
  level: appConfig.logLevel,
  redact: [...REQUIRED_REDACTION_PATHS]
});

const allowedChatIds = parseAllowedChatIds(appConfig.allowedChatIdsRaw);
if (allowedChatIds.size === 0) {
  logger.warn("ALLOWLIST_CHAT_IDS vacío: deny-by-default activo (ningún chat autorizado)");
}

logger.info(
  {
    bot_persona: appConfig.botPersona,
    channel_mode: appConfig.channelMode,
    allowlist_chat_ids: [...allowedChatIds],
    local_chat_id: appConfig.localChatId,
    rate_limit: {
      enabled: appConfig.rateLimit.enabled,
      windowMs: appConfig.rateLimit.windowMs,
      maxMessagesPerWindow: appConfig.rateLimit.maxMessagesPerWindow,
      blockDurationMs: appConfig.rateLimit.blockDurationMs
    },
    expense_tool: {
      dryRun: appConfig.expenseTool.dryRun,
      provider: appConfig.expenseTool.sheetsProvider,
      timeoutMs: appConfig.expenseTool.timeoutMs,
      maxRetries: appConfig.expenseTool.maxRetries,
      gws: {
        command: appConfig.expenseTool.gws.command,
        commandArgs: appConfig.expenseTool.gws.commandArgs,
        spreadsheetIdConfigured: Boolean(appConfig.expenseTool.gws.spreadsheetId),
        rangeConfigured: Boolean(appConfig.expenseTool.gws.range),
        valueInputOption: appConfig.expenseTool.gws.valueInputOption
      }
    },
    order_tool: {
      trello: {
        dryRun: appConfig.orderTool.trello.dryRun,
        apiKeyConfigured: Boolean(appConfig.orderTool.trello.apiKey),
        tokenConfigured: Boolean(appConfig.orderTool.trello.token),
        listIdConfigured: Boolean(appConfig.orderTool.trello.listId),
        cancelListIdConfigured: Boolean(appConfig.orderTool.trello.cancelListId),
        apiBaseUrl: appConfig.orderTool.trello.apiBaseUrl,
        timeoutMs: appConfig.orderTool.trello.timeoutMs,
        maxRetries: appConfig.orderTool.trello.maxRetries
      },
      sheets: {
        dryRun: appConfig.orderTool.sheets.dryRun,
        provider: appConfig.orderTool.sheets.provider,
        timeoutMs: appConfig.orderTool.sheets.timeoutMs,
        maxRetries: appConfig.orderTool.sheets.maxRetries,
        gws: {
          command: appConfig.orderTool.sheets.gws.command,
          commandArgs: appConfig.orderTool.sheets.gws.commandArgs,
          spreadsheetIdConfigured: Boolean(appConfig.orderTool.sheets.gws.spreadsheetId),
          rangeConfigured: Boolean(appConfig.orderTool.sheets.gws.range),
          valueInputOption: appConfig.orderTool.sheets.gws.valueInputOption
        }
      },
      recipes: {
        source: appConfig.orderTool.recipes.source,
        timeoutMs: appConfig.orderTool.recipes.timeoutMs,
        maxRetries: appConfig.orderTool.recipes.maxRetries,
        gws: {
          command: appConfig.orderTool.recipes.gws.command,
          commandArgs: appConfig.orderTool.recipes.gws.commandArgs,
          spreadsheetIdConfigured: Boolean(appConfig.orderTool.recipes.gws.spreadsheetId),
          rangeConfigured: Boolean(appConfig.orderTool.recipes.gws.range)
        }
      }
    },
    inventory_consume: {
      enabled: appConfig.inventoryConsume.enabled,
      allowNegativeStock: appConfig.inventoryConsume.allowNegativeStock,
      recipeSource: appConfig.inventoryConsume.recipeSource,
      timeoutMs: appConfig.inventoryConsume.timeoutMs,
      maxRetries: appConfig.inventoryConsume.maxRetries,
      gws: {
        command: appConfig.inventoryConsume.gws.command,
        commandArgs: appConfig.inventoryConsume.gws.commandArgs,
        spreadsheetIdConfigured: Boolean(appConfig.inventoryConsume.gws.spreadsheetId),
        ordersRange: appConfig.inventoryConsume.gws.ordersRange,
        inventoryRange: appConfig.inventoryConsume.gws.inventoryRange,
        movementsRange: appConfig.inventoryConsume.gws.movementsRange,
        recipesRange: appConfig.inventoryConsume.gws.recipesRange,
        valueInputOption: appConfig.inventoryConsume.gws.valueInputOption
      }
    },
    web_tool: {
      chatEnabled: appConfig.webTool.chatEnabled,
      contentPath: appConfig.webTool.contentPath,
      publish: {
        dryRun: appConfig.webTool.publish.dryRun,
        urlConfigured: Boolean(appConfig.webTool.publish.webhookUrl),
        apiKeyConfigured: Boolean(appConfig.webTool.publish.apiKey),
        apiKeyHeader: appConfig.webTool.publish.apiKeyHeader,
        allowedImageDomains: appConfig.webTool.publish.allowedImageDomains,
        facebookPageUrlConfigured: Boolean(appConfig.webTool.publish.facebookPageUrl),
        timeoutMs: appConfig.webTool.publish.timeoutMs,
        maxRetries: appConfig.webTool.publish.maxRetries
      }
    },
    openclaw: {
      enabled: appConfig.openclaw.enabled,
      agentId: appConfig.openclaw.agentId,
      profile: appConfig.openclaw.profile ?? "default",
      timeoutSeconds: appConfig.openclaw.timeoutSeconds,
      strict: appConfig.openclaw.strict,
      strictSoftfail: appConfig.openclaw.strictSoftfail,
      thinking: appConfig.openclaw.thinking ?? "default"
    },
    telegram: {
      configured: Boolean(appConfig.telegram.botToken),
      pollIntervalMs: appConfig.telegram.pollIntervalMs,
      longPollTimeoutSeconds: appConfig.telegram.longPollTimeoutSeconds,
      apiBaseUrl: appConfig.telegram.apiBaseUrl
    }
  },
  "runtime_config"
);

const executeExpense = createAppendExpenseTool({
  timeoutMs: appConfig.expenseTool.timeoutMs,
  maxRetries: appConfig.expenseTool.maxRetries,
  dryRunDefault: appConfig.expenseTool.dryRun,
  gwsCommand: appConfig.expenseTool.gws.command,
  gwsCommandArgs: appConfig.expenseTool.gws.commandArgs,
  gwsSpreadsheetId: appConfig.expenseTool.gws.spreadsheetId,
  gwsRange: appConfig.expenseTool.gws.range,
  gwsValueInputOption: appConfig.expenseTool.gws.valueInputOption
});

const executeCreateCard = createCreateCardTool({
  apiKey: appConfig.orderTool.trello.apiKey,
  token: appConfig.orderTool.trello.token,
  listId: appConfig.orderTool.trello.listId,
  apiBaseUrl: appConfig.orderTool.trello.apiBaseUrl,
  timeoutMs: appConfig.orderTool.trello.timeoutMs,
  maxRetries: appConfig.orderTool.trello.maxRetries,
  dryRunDefault: appConfig.orderTool.trello.dryRun
});

const orderCardSync = createOrderCardSyncTool({
  apiKey: appConfig.orderTool.trello.apiKey,
  token: appConfig.orderTool.trello.token,
  apiBaseUrl: appConfig.orderTool.trello.apiBaseUrl,
  listId: appConfig.orderTool.trello.listId,
  cancelListId: appConfig.orderTool.trello.cancelListId,
  timeoutMs: appConfig.orderTool.trello.timeoutMs,
  maxRetries: appConfig.orderTool.trello.maxRetries,
  dryRunDefault: appConfig.orderTool.trello.dryRun,
  timezone: appConfig.timezone
});

const executeAppendOrder = createAppendOrderTool({
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries,
  dryRunDefault: appConfig.orderTool.sheets.dryRun,
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  gwsRange: appConfig.orderTool.sheets.gws.range,
  gwsValueInputOption: appConfig.orderTool.sheets.gws.valueInputOption,
  timezone: appConfig.timezone
});

const executeOrderReport = createReportOrdersTool({
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  gwsRange: appConfig.orderTool.sheets.gws.range,
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries,
  timezone: appConfig.timezone
});

const executeOrderLookup = createLookupOrderTool({
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  gwsRange: appConfig.orderTool.sheets.gws.range,
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries,
  timezone: appConfig.timezone
});

const executeOrderStatus = createOrderStatusTool({
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  gwsRange: appConfig.orderTool.sheets.gws.range,
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries,
  timezone: appConfig.timezone
});

const executeQuoteOrder = createQuoteOrderTool({
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries
});

const executeShoppingList = createShoppingListGenerateTool({
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  gwsRange: appConfig.orderTool.sheets.gws.range,
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries,
  recipeSource: appConfig.orderTool.recipes.source,
  recipesGwsCommand: appConfig.orderTool.recipes.gws.command,
  recipesGwsCommandArgs: appConfig.orderTool.recipes.gws.commandArgs,
  recipesGwsSpreadsheetId: appConfig.orderTool.recipes.gws.spreadsheetId,
  recipesGwsRange: appConfig.orderTool.recipes.gws.range,
  recipesTimeoutMs: appConfig.orderTool.recipes.timeoutMs,
  recipesMaxRetries: appConfig.orderTool.recipes.maxRetries,
  timezone: appConfig.timezone
});

const executeOrderUpdate = createUpdateOrderTool({
  dryRunDefault: appConfig.orderTool.sheets.dryRun,
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  gwsRange: appConfig.orderTool.sheets.gws.range,
  gwsValueInputOption: appConfig.orderTool.sheets.gws.valueInputOption,
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries,
  timezone: appConfig.timezone
});

const executeOrderCancel = createCancelOrderTool({
  dryRunDefault: appConfig.orderTool.sheets.dryRun,
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  gwsRange: appConfig.orderTool.sheets.gws.range,
  gwsValueInputOption: appConfig.orderTool.sheets.gws.valueInputOption,
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries
});

const executePaymentRecord = createRecordPaymentTool({
  dryRunDefault: appConfig.orderTool.sheets.dryRun,
  gwsCommand: appConfig.orderTool.sheets.gws.command,
  gwsCommandArgs: appConfig.orderTool.sheets.gws.commandArgs,
  gwsSpreadsheetId: appConfig.orderTool.sheets.gws.spreadsheetId,
  gwsRange: appConfig.orderTool.sheets.gws.range,
  gwsValueInputOption: appConfig.orderTool.sheets.gws.valueInputOption,
  timeoutMs: appConfig.orderTool.sheets.timeoutMs,
  maxRetries: appConfig.orderTool.sheets.maxRetries
});

const executeInventoryConsume = createInventoryConsumeTool({
  dryRunDefault: appConfig.orderTool.sheets.dryRun,
  allowNegativeStock: appConfig.inventoryConsume.allowNegativeStock,
  recipeSource: appConfig.inventoryConsume.recipeSource,
  gwsCommand: appConfig.inventoryConsume.gws.command,
  gwsCommandArgs: appConfig.inventoryConsume.gws.commandArgs,
  gwsSpreadsheetId: appConfig.inventoryConsume.gws.spreadsheetId,
  ordersGwsRange: appConfig.inventoryConsume.gws.ordersRange,
  inventoryGwsRange: appConfig.inventoryConsume.gws.inventoryRange,
  movementsGwsRange: appConfig.inventoryConsume.gws.movementsRange,
  recipesGwsRange: appConfig.inventoryConsume.gws.recipesRange,
  gwsValueInputOption: appConfig.inventoryConsume.gws.valueInputOption,
  timeoutMs: appConfig.inventoryConsume.timeoutMs,
  maxRetries: appConfig.inventoryConsume.maxRetries
});

const executeWebPublish = createPublishSiteTool({
  webhookUrl: appConfig.webTool.publish.webhookUrl,
  apiKey: appConfig.webTool.publish.apiKey,
  apiKeyHeader: appConfig.webTool.publish.apiKeyHeader,
  timeoutMs: appConfig.webTool.publish.timeoutMs,
  maxRetries: appConfig.webTool.publish.maxRetries,
  dryRunDefault: appConfig.webTool.publish.dryRun,
  allowedImageDomains: appConfig.webTool.publish.allowedImageDomains,
  facebookPageUrl: appConfig.webTool.publish.facebookPageUrl
});

const tracedProcessor = createConversationProcessor({
  allowedChatIds,
  botPersona: appConfig.botPersona,
  executeExpenseFn: executeExpense,
  executeCreateCardFn: executeCreateCard,
  executeAppendOrderFn: executeAppendOrder,
  executeOrderReportFn: executeOrderReport,
  executeOrderLookupFn: executeOrderLookup,
  executeOrderStatusFn: executeOrderStatus,
  executeShoppingListFn: executeShoppingList,
  executeQuoteOrderFn: executeQuoteOrder,
  executeOrderUpdateFn: executeOrderUpdate,
  executeOrderCancelFn: executeOrderCancel,
  executePaymentRecordFn: executePaymentRecord,
  executeInventoryConsumeFn: executeInventoryConsume,
  orderCardSync,
  orderReportTimezone: appConfig.timezone,
  executeWebPublishFn: executeWebPublish,
  webChatEnabled: appConfig.webTool.chatEnabled,
  inventoryConsumeEnabled: appConfig.inventoryConsume.enabled,
  rateLimiter: createRateLimitGuard({
    enabled: appConfig.rateLimit.enabled,
    windowMs: appConfig.rateLimit.windowMs,
    maxMessagesPerWindow: appConfig.rateLimit.maxMessagesPerWindow,
    blockDurationMs: appConfig.rateLimit.blockDurationMs
  }),
  onTrace: (event) => {
    logger.info(event, "conversation_trace");
  }
});

const channel = createChannelAdapter(appConfig, logger);

void Promise.resolve(
  channel.start(async ({ chat_id, text }) => {
    logger.info(
      {
        event: "inbound_message",
        channel: appConfig.channelMode,
        chat_id,
        text_preview: buildTextPreview(text)
      },
      "inbound_message"
    );

    try {
      const replies = await tracedProcessor.handleMessage({ chat_id, text });
      for (const reply of replies) {
        await channel.send({ chat_id, text: reply });
      }
    } catch (err) {
      logger.error({ err }, "Error procesando mensaje");
      await channel.send({ chat_id, text: "Error interno procesando mensaje." });
    }
  })
).catch((err) => {
  logger.error({ err, channel: appConfig.channelMode }, "No se pudo iniciar el canal");
  process.exitCode = 1;
});
