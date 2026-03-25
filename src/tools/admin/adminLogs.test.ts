import { describe, expect, it } from "vitest";

import { createAdminLogsTool } from "./adminLogs";

describe("createAdminLogsTool", () => {
  it("aplica filtros y regresa entries sanitizados", async () => {
    const tool = createAdminLogsTool({
      newTraceId: () => "trace-fixed",
      now: () => new Date("2026-03-25T12:00:00.000Z"),
      queryRowsFn: (filters) => {
        expect(filters.chat_id).toBe("chat-1");
        expect(filters.operation_id).toBe("op-1");
        expect(filters.limit).toBe(3);

        return [
          {
            operation_id: "op-1",
            chat_id: "chat-1",
            intent: "pedido",
            status: "executed",
            payload_json: JSON.stringify({
              total: 480,
              token: "top-secret-token",
              nested: {
                apiKey: "secret-api-key"
              }
            }),
            created_at: "2026-03-25T11:00:00.000Z",
            updated_at: "2026-03-25T11:05:00.000Z"
          }
        ];
      }
    });

    const result = await tool({
      chat_id: "chat-admin",
      filters: {
        chat_id: "chat-1",
        operation_id: "op-1",
        limit: 3
      }
    });

    expect(result.status).toBe("ok");
    expect(result.total).toBe(1);
    expect(result.filters).toEqual({
      chat_id: "chat-1",
      operation_id: "op-1",
      limit: 3
    });
    expect(result.trace_ref).toBe("admin-logs:trace-fixed");
    expect(result.generated_at).toBe("2026-03-25T12:00:00.000Z");
    expect(result.entries[0]?.payload_preview).toContain("\"token\":\"REDACTED\"");
    expect(result.entries[0]?.payload_preview).toContain("\"apiKey\":\"REDACTED\"");
    expect(result.entries[0]?.payload_preview).not.toContain("top-secret-token");
    expect(result.entries[0]?.payload_preview).not.toContain("secret-api-key");
  });

  it("usa limit default y normaliza payload invalido", async () => {
    const tool = createAdminLogsTool({
      defaultLimit: 7,
      newTraceId: () => "trace-invalid-payload",
      queryRowsFn: (filters) => {
        expect(filters.limit).toBe(7);
        expect(filters.chat_id).toBeUndefined();
        expect(filters.operation_id).toBeUndefined();
        return [
          {
            operation_id: "op-2",
            chat_id: "chat-2",
            intent: "gasto",
            status: "failed",
            payload_json: "token=abc123",
            created_at: "2026-03-25T10:00:00.000Z",
            updated_at: "2026-03-25T10:00:00.000Z"
          }
        ];
      }
    });

    const result = await tool({
      chat_id: "chat-admin",
      filters: {}
    });

    expect(result.filters.limit).toBe(7);
    expect(result.entries[0]?.payload_preview).toContain("token=REDACTED");
    expect(result.entries[0]?.payload_preview).not.toContain("abc123");
  });
});
