import type { ChannelAdapter, InboundMessage, OutboundMessage } from "./types";

type LoggerLike = {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn: (obj: Record<string, unknown>, msg?: string) => void;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number | string; type?: string };
  };
};

export type TelegramChannelConfig = {
  botToken?: string;
  pollIntervalMs: number;
  longPollTimeoutSeconds: number;
  apiBaseUrl: string;
  logger?: LoggerLike;
  fetchFn?: FetchLike;
};

function telegramMethodUrl(config: TelegramChannelConfig, method: string): string {
  const base = config.apiBaseUrl.replace(/\/+$/, "");
  return `${base}/bot${config.botToken}/${method}`;
}

function jsonHeaders() {
  return { "content-type": "application/json" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createTelegramChannel(config: TelegramChannelConfig): ChannelAdapter {
  const fetchFn: FetchLike = config.fetchFn ?? ((globalThis.fetch as unknown) as FetchLike);
  let running = false;
  let offset = 0;
  let loopPromise: Promise<void> | undefined;
  let onMessageHandler: ((msg: InboundMessage) => void | Promise<void>) | undefined;

  async function callTelegram<T>(method: string, body: Record<string, unknown>): Promise<T> {
    if (!config.botToken) throw new Error("telegram_bot_token_missing");
    if (!fetchFn) throw new Error("fetch_unavailable");

    const res = await fetchFn(telegramMethodUrl(config, method), {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body)
    });

    const payload = (await res.json()) as TelegramApiResponse<T>;
    if (!res.ok || !payload.ok || payload.result == null) {
      const detail = payload.description ?? `http_${res.status}`;
      throw new Error(`telegram_api_error:${method}:${detail}`);
    }

    return payload.result;
  }

  async function processUpdates(updates: TelegramUpdate[]): Promise<void> {
    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1);

      const msg = update.message;
      if (!msg) continue;
      if (typeof msg.text !== "string" || msg.text.trim().length === 0) {
        config.logger?.info(
          {
            channel: "telegram",
            update_id: update.update_id,
            chat_id: String(msg.chat.id)
          },
          "Telegram update ignored (no text)"
        );
        continue;
      }

      if (!onMessageHandler) continue;
      await onMessageHandler({
        chat_id: String(msg.chat.id),
        text: msg.text
      });
    }
  }

  async function pollLoop(): Promise<void> {
    while (running) {
      try {
        const updates = await callTelegram<TelegramUpdate[]>("getUpdates", {
          offset,
          timeout: config.longPollTimeoutSeconds,
          allowed_updates: ["message"]
        });

        if (updates.length > 0) {
          await processUpdates(updates);
        }
      } catch (err) {
        config.logger?.warn(
          {
            channel: "telegram",
            err: err instanceof Error ? err.message : String(err)
          },
          "Telegram polling error"
        );
        if (!running) break;
        await sleep(config.pollIntervalMs);
        continue;
      }

      if (!running) break;
      if (config.pollIntervalMs > 0) {
        await sleep(config.pollIntervalMs);
      }
    }
  }

  return {
    name: "telegram",
    start(onMessage: (msg: InboundMessage) => void | Promise<void>) {
      if (!config.botToken) {
        throw new Error("telegram_bot_token_missing");
      }

      if (running) return;
      running = true;
      onMessageHandler = onMessage;

      config.logger?.info(
        {
          channel: "telegram",
          pollIntervalMs: config.pollIntervalMs,
          longPollTimeoutSeconds: config.longPollTimeoutSeconds
        },
        "Telegram polling started"
      );

      loopPromise = pollLoop().finally(() => {
        running = false;
      });
    },
    async send(msg: OutboundMessage) {
      await callTelegram("sendMessage", {
        chat_id: msg.chat_id,
        text: msg.text
      });
    },
    async stop() {
      running = false;
      try {
        await loopPromise;
      } catch {
        // polling errors are already logged
      } finally {
        loopPromise = undefined;
      }
    }
  };
}

