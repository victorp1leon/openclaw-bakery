import { describe, expect, it, vi } from "vitest";

import { createTelegramChannel } from "./telegramChannel";

function okJson(result: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true, result })
  };
}

describe("telegram channel", () => {
  it("falla al iniciar sin token", () => {
    const channel = createTelegramChannel({
      pollIntervalMs: 1,
      longPollTimeoutSeconds: 1,
      apiBaseUrl: "https://api.telegram.org"
    });

    expect(() => channel.start(async () => {})).toThrow("telegram_bot_token_missing");
  });

  it("procesa updates de texto y omite mensajes sin texto", async () => {
    const onMessage = vi.fn(async () => {});
    const fetchFn = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("/getUpdates")) {
        return okJson([
          {
            update_id: 1,
            message: { message_id: 10, chat: { id: 123 }, text: "hola bot" }
          },
          {
            update_id: 2,
            message: { message_id: 11, chat: { id: 123 } }
          }
        ]);
      }

      return okJson(true);
    });

    const channel = createTelegramChannel({
      botToken: "dummy",
      pollIntervalMs: 50,
      longPollTimeoutSeconds: 1,
      apiBaseUrl: "https://api.telegram.org",
      fetchFn
    });

    channel.start(onMessage);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await channel.stop?.();

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ chat_id: "123", text: "hola bot" });
    expect(fetchFn).toHaveBeenCalled();
  });

  it("envia mensajes con sendMessage", async () => {
    const fetchFn = vi.fn(async () => okJson({ message_id: 99 }));
    const channel = createTelegramChannel({
      botToken: "dummy",
      pollIntervalMs: 1,
      longPollTimeoutSeconds: 1,
      apiBaseUrl: "https://api.telegram.org",
      fetchFn
    });

    await channel.send({ chat_id: "123", text: "respuesta" });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(String(url)).toContain("/sendMessage");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      chat_id: "123",
      text: "respuesta"
    });
  });
});

