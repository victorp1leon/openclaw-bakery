import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dbPath = path.join(os.tmpdir(), `openclaw-int-${Date.now()}-${Math.random()}.db`);
process.env.BOT_DB_PATH = dbPath;

type InboundMessage = { chat_id: string; text: string };
type OutboundMessage = { chat_id: string; text: string };

let createConversationProcessor: (args: {
  allowedChatIds: Set<string>;
  nowMs?: () => number;
  newOperationId?: () => string;
  routeIntentFn?: (text: string) => Promise<"gasto" | "pedido" | "web" | "ayuda" | "unknown">;
  parseExpenseFn?: (text: string) => Promise<
    { ok: true; payload: Record<string, unknown>; source?: "openclaw" | "fallback" | "custom" } |
    { ok: false; error: string; source?: "openclaw" | "fallback" | "custom" }
  >;
}) => {
  handleMessage: (msg: InboundMessage) => Promise<string[]>;
};

let createTelegramChannel: (config: {
  botToken?: string;
  pollIntervalMs: number;
  longPollTimeoutSeconds: number;
  apiBaseUrl: string;
  fetchFn?: (input: string | URL, init?: RequestInit) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }>;
}) => {
  start: (onMessage: (msg: InboundMessage) => void | Promise<void>) => void;
  send: (msg: OutboundMessage) => Promise<void>;
  stop: () => Promise<void>;
};

let getState: (chat_id: string) => { pending?: { operation_id: string } };
let getOperation: (operation_id: string) => { status: string } | undefined;
let closeDatabase: () => void;

beforeAll(async () => {
  const runtimeMod = await import("./conversationProcessor");
  const channelMod = await import("../channel/telegramChannel");
  const stateMod = await import("../state/stateStore");
  const opsMod = await import("../state/operations");
  const dbMod = await import("../state/database");

  createConversationProcessor = runtimeMod.createConversationProcessor;
  createTelegramChannel = channelMod.createTelegramChannel;
  getState = stateMod.getState;
  getOperation = opsMod.getOperation;
  closeDatabase = dbMod.closeDatabase;
});

afterAll(() => {
  closeDatabase();
  fs.rmSync(dbPath, { force: true });
});

describe("integration: channel + runtime + state", () => {
  it("processes telegram inbound text and persists pending operation", async () => {
    const sentMessages: Array<{ chat_id: string; text: string }> = [];
    let servedUpdates = false;

    const fetchFn = async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const method = url.split("/").pop() ?? "";

      if (method === "getUpdates") {
        const result = servedUpdates
          ? []
          : [
              {
                update_id: 1001,
                message: {
                  message_id: 11,
                  text: "gasto 380 harina",
                  chat: { id: 123 }
                }
              }
            ];
        servedUpdates = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, result })
        };
      }

      if (method === "sendMessage") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        sentMessages.push({ chat_id: String(body.chat_id), text: String(body.text) });
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, result: { message_id: 99 } })
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ ok: false, description: "not_found" })
      };
    };

    const processor = createConversationProcessor({
      allowedChatIds: new Set(["123"]),
      nowMs: () => Date.parse("2026-02-21T10:00:00.000Z"),
      newOperationId: () => "op-int-1",
      routeIntentFn: async () => "gasto",
      parseExpenseFn: async () => ({ ok: true, payload: { monto: 380, concepto: "harina" }, source: "fallback" })
    });

    const channel = createTelegramChannel({
      botToken: "fake-token",
      pollIntervalMs: 1,
      longPollTimeoutSeconds: 1,
      apiBaseUrl: "https://api.telegram.org",
      fetchFn
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("integration_timeout")), 1500);

      channel.start(async ({ chat_id, text }) => {
        const replies = await processor.handleMessage({ chat_id, text });
        for (const reply of replies) {
          await channel.send({ chat_id, text: reply });
        }

        if (sentMessages.length > 0) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    await channel.stop();

    expect(sentMessages[0]?.text).toContain("Resumen");

    const state = getState("123");
    expect(state.pending?.operation_id).toBe("op-int-1");

    const operation = getOperation("op-int-1");
    expect(operation?.status).toBe("pending_confirm");
  });
});

