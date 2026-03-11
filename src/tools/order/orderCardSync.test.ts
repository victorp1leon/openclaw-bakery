import { describe, expect, it, vi } from "vitest";

import { createOrderCardSyncTool } from "./orderCardSync";

describe("orderCardSync tool", () => {
  it("returns dry-run payload for update when dry-run is enabled", async () => {
    const tool = createOrderCardSyncTool();

    const result = await tool.updateCardForOrder({
      operation_id: "op-1",
      chat_id: "chat-1",
      reference: { folio: "op-1" },
      patch: { cantidad: 10 }
    });

    expect(result.dry_run).toBe(true);
    expect(result.card_id).toBe("trello-dry-run-card");
  });

  it("updates card due date and appends update comment", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ cards: [{ id: "card-1", name: "Pedido", desc: "d", idList: "list-1" }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "card-1" })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "comment-1" })
      });

    const tool = createOrderCardSyncTool({
      fetchFn,
      apiKey: "key",
      token: "token",
      dryRunDefault: false,
      maxRetries: 0,
      now: () => new Date("2026-03-11T12:00:00.000Z")
    });

    const result = await tool.updateCardForOrder({
      operation_id: "op-2",
      chat_id: "chat-2",
      reference: { operation_id_ref: "op-2" },
      patch: { fecha_hora_entrega: "2026-03-12 16:30" }
    });

    expect(result.dry_run).toBe(false);
    expect(result.card_id).toBe("card-1");
    expect(fetchFn).toHaveBeenCalledTimes(3);

    const dueCallUrl = String(fetchFn.mock.calls[1]?.[0] ?? "");
    expect(dueCallUrl).toContain("/1/cards/card-1");
    expect(dueCallUrl).toContain("due=");

    const commentCallUrl = String(fetchFn.mock.calls[2]?.[0] ?? "");
    expect(commentCallUrl).toContain("/actions/comments");
    expect(commentCallUrl).toContain("%5BUPDATE%5D");
  });

  it("moves card to cancel list and appends cancel comment", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ cards: [{ id: "card-2", name: "Pedido", desc: "d", idList: "list-1" }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "card-2" })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "comment-2" })
      });

    const tool = createOrderCardSyncTool({
      fetchFn,
      apiKey: "key",
      token: "token",
      cancelListId: "list-cancel",
      dryRunDefault: false,
      maxRetries: 0
    });

    const result = await tool.cancelCardForOrder({
      operation_id: "op-3",
      chat_id: "chat-3",
      reference: { folio: "op-3" },
      motivo: "cliente cancelo"
    });

    expect(result.card_id).toBe("card-2");
    expect(fetchFn).toHaveBeenCalledTimes(3);

    const moveCallUrl = String(fetchFn.mock.calls[1]?.[0] ?? "");
    expect(moveCallUrl).toContain("idList=list-cancel");

    const commentCallUrl = String(fetchFn.mock.calls[2]?.[0] ?? "");
    expect(commentCallUrl).toContain("motivo%3Acliente+cancelo");
  });

  it("rolls back trello update when comment append fails", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          cards: [
            {
              id: "card-rb-update",
              name: "Pedido",
              desc: "d",
              due: "2026-03-11T12:00:00.000Z",
              idList: "list-1"
            }
          ]
        })
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "card-rb-update" }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "card-rb-update" }) });

    const tool = createOrderCardSyncTool({
      fetchFn,
      apiKey: "key",
      token: "token",
      dryRunDefault: false,
      maxRetries: 0,
      now: () => new Date("2026-03-11T12:00:00.000Z")
    });

    await expect(
      tool.updateCardForOrder({
        operation_id: "op-rb-update",
        chat_id: "chat-rb-update",
        reference: { operation_id_ref: "op-rb-update" },
        patch: { fecha_hora_entrega: "2026-03-12 16:30" }
      })
    ).rejects.toThrow("order_trello_update_failed:");

    expect(fetchFn).toHaveBeenCalledTimes(4);
    const rollbackCallUrl = String(fetchFn.mock.calls[3]?.[0] ?? "");
    expect(rollbackCallUrl).toContain("/1/cards/card-rb-update");
    expect(rollbackCallUrl).toContain("idList=list-1");
  });

  it("rolls back trello cancel move when comment append fails", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          cards: [{ id: "card-rb-cancel", name: "Pedido", desc: "d", idList: "list-active" }]
        })
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "card-rb-cancel" }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "card-rb-cancel" }) });

    const tool = createOrderCardSyncTool({
      fetchFn,
      apiKey: "key",
      token: "token",
      cancelListId: "list-cancel",
      dryRunDefault: false,
      maxRetries: 0
    });

    await expect(
      tool.cancelCardForOrder({
        operation_id: "op-rb-cancel",
        chat_id: "chat-rb-cancel",
        reference: { operation_id_ref: "op-rb-cancel" },
        motivo: "cliente cancelo"
      })
    ).rejects.toThrow("order_trello_cancel_failed:");

    expect(fetchFn).toHaveBeenCalledTimes(4);
    const rollbackCallUrl = String(fetchFn.mock.calls[3]?.[0] ?? "");
    expect(rollbackCallUrl).toContain("/1/cards/card-rb-cancel");
    expect(rollbackCallUrl).toContain("idList=list-active");
  });

  it("restores and deletes card from snapshot helpers", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "card-4" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    const tool = createOrderCardSyncTool({
      fetchFn,
      apiKey: "key",
      token: "token",
      dryRunDefault: false,
      maxRetries: 0
    });

    await tool.rollbackCard({
      operation_id: "op-4",
      snapshot: {
        card_id: "card-4",
        name: "n",
        desc: "d",
        due: "2026-03-12T16:30:00.000Z",
        idList: "list-1"
      }
    });

    await tool.deleteCard({
      operation_id: "op-4",
      card_id: "card-4"
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(String(fetchFn.mock.calls[0]?.[0] ?? "")).toContain("/1/cards/card-4");
    expect(String(fetchFn.mock.calls[1]?.[0] ?? "")).toContain("/1/cards/card-4");
  });
});
