import { createConsoleChannel } from "./consoleChannel";
import { createTelegramChannel } from "./telegramChannel";
import type { ChannelAdapter } from "./types";
import type { AppConfig } from "../config/appConfig";

export function createChannelAdapter(
  config: AppConfig,
  logger?: {
    warn: (obj: Record<string, unknown>, msg?: string) => void;
    info: (obj: Record<string, unknown>, msg?: string) => void;
  }
): ChannelAdapter {
  if (config.channelMode === "telegram") {
    return createTelegramChannel({
      botToken: config.telegram.botToken,
      pollIntervalMs: config.telegram.pollIntervalMs,
      longPollTimeoutSeconds: config.telegram.longPollTimeoutSeconds,
      apiBaseUrl: config.telegram.apiBaseUrl,
      logger
    });
  }

  return createConsoleChannel(config.localChatId);
}
