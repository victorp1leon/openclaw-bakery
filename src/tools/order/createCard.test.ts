import { describe, expect, it, vi } from "vitest";

import type { Order } from "../../schemas/order";
import { createCreateCardTool } from "./createCard";

function buildOrder(): Order {
  return {
    nombre_cliente: "Victor",
    producto: "cupcakes",
    cantidad: 12,
    tipo_envio: "recoger_en_tienda",
    fecha_hora_entrega: "2026-03-04T17:30:00.000Z",
    estado_pago: "pagado",
    total: 480,
    moneda: "MXN",
    notas: "sin nuez"
  };
}

describe("createCardTool", () => {
  it("returns dry-run by default", async () => {
    const tool = createCreateCardTool();

    const result = await tool({
      operation_id: "op-1",
      chat_id: "chat-1",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(true);
    expect(result.detail).toContain("dry-run");
  });

  it("fails when live mode is missing trello api key", async () => {
    const fetchFn = vi.fn();
    const tool = createCreateCardTool({
      fetchFn,
      token: "token-1",
      listId: "list-1",
      dryRunDefault: false
    });

    await expect(
      tool({
        operation_id: "op-2",
        chat_id: "chat-2",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_trello_api_key_missing");

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails when live mode is missing trello token", async () => {
    const fetchFn = vi.fn();
    const tool = createCreateCardTool({
      fetchFn,
      apiKey: "key-1",
      listId: "list-1",
      dryRunDefault: false
    });

    await expect(
      tool({
        operation_id: "op-3",
        chat_id: "chat-3",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_trello_token_missing");

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails when live mode is missing trello list id", async () => {
    const fetchFn = vi.fn();
    const tool = createCreateCardTool({
      fetchFn,
      apiKey: "key-1",
      token: "token-1",
      dryRunDefault: false
    });

    await expect(
      tool({
        operation_id: "op-4",
        chat_id: "chat-4",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_trello_list_id_missing");

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("maps payload to trello requests and creates card", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "card-1", shortUrl: "https://trello.test/c/card-1" })
      });

    const tool = createCreateCardTool({
      fetchFn,
      apiKey: "key-1",
      token: "token-1",
      listId: "list-1",
      apiBaseUrl: "https://api.trello.com",
      dryRunDefault: false,
      timeoutMs: 2000,
      maxRetries: 0
    });

    const result = await tool({
      operation_id: "op-5",
      chat_id: "chat-5",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(result.payload.trello_card_id).toBe("card-1");
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const searchUrl = new URL(String(fetchFn.mock.calls[0]?.[0]));
    expect(searchUrl.pathname).toContain("/1/lists/list-1/cards");
    expect(searchUrl.searchParams.get("key")).toBe("key-1");
    expect(searchUrl.searchParams.get("token")).toBe("token-1");

    const createUrl = new URL(String(fetchFn.mock.calls[1]?.[0]));
    expect(createUrl.pathname).toBe("/1/cards");
    expect(createUrl.searchParams.get("idList")).toBe("list-1");
    expect(createUrl.searchParams.get("name")).toContain("cupcakes");
    expect(createUrl.searchParams.get("desc")).toContain("[operation_id:op-5]");
  });

  it("dedupes when existing card already has operation marker", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: "card-existing", shortUrl: "https://trello.test/c/existing", desc: "[operation_id:op-6]" }]
    });

    const tool = createCreateCardTool({
      fetchFn,
      apiKey: "key-1",
      token: "token-1",
      listId: "list-1",
      dryRunDefault: false,
      maxRetries: 0
    });

    const result = await tool({
      operation_id: "op-6",
      chat_id: "chat-6",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(result.payload.trello_card_id).toBe("card-existing");
    expect(result.detail).toContain("deduped");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("retries once on retriable 5xx response", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "card-7", shortUrl: "https://trello.test/c/7" })
      });

    const tool = createCreateCardTool({
      fetchFn,
      apiKey: "key-1",
      token: "token-1",
      listId: "list-1",
      dryRunDefault: false,
      maxRetries: 2,
      retryBackoffMs: 0
    });

    const result = await tool({
      operation_id: "op-7",
      chat_id: "chat-7",
      payload: buildOrder()
    });

    expect(result.ok).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("does not retry on non-retriable 4xx response", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({})
    });

    const tool = createCreateCardTool({
      fetchFn,
      apiKey: "key-1",
      token: "token-1",
      listId: "list-1",
      dryRunDefault: false,
      maxRetries: 3,
      retryBackoffMs: 0
    });

    await expect(
      tool({
        operation_id: "op-8",
        chat_id: "chat-8",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_trello_http_400");

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("handles non-json 4xx trello responses without json parse crash", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "invalid key"
    });

    const tool = createCreateCardTool({
      fetchFn,
      apiKey: "bad-key",
      token: "bad-token",
      listId: "list-1",
      dryRunDefault: false,
      maxRetries: 0
    });

    await expect(
      tool({
        operation_id: "op-9",
        chat_id: "chat-9",
        payload: buildOrder()
      })
    ).rejects.toThrow("order_trello_http_401");

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
