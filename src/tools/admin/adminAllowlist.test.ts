import { describe, expect, it } from "vitest";

import { createAdminAllowlistTool } from "./adminAllowlist";

describe("createAdminAllowlistTool", () => {
  it("consulta allowlist y refleja add/remove con guardrails", async () => {
    const allowlist = new Set(["chat-1", "chat-2"]);
    const tool = createAdminAllowlistTool({
      allowlist,
      newTraceId: () => "trace-fixed",
      now: () => new Date("2026-03-25T18:00:00.000Z")
    });

    const view = await tool({
      chat_id: "chat-1",
      operation: "view"
    });
    expect(view.allowlist_size).toBe(2);
    expect(view.allowlist.map((row) => row.chat_id)).toEqual(["chat-1", "chat-2"]);
    expect(view.trace_ref).toBe("admin-allowlist:trace-fixed");
    expect(view.generated_at).toBe("2026-03-25T18:00:00.000Z");

    const add = await tool({
      chat_id: "chat-1",
      operation: "add",
      target_chat_id: "chat-3"
    });
    expect(add.changed).toBe(true);
    expect(add.allowlist_size).toBe(3);
    expect(allowlist.has("chat-3")).toBe(true);

    const remove = await tool({
      chat_id: "chat-1",
      operation: "remove",
      target_chat_id: "chat-3"
    });
    expect(remove.changed).toBe(true);
    expect(remove.allowlist_size).toBe(2);
    expect(allowlist.has("chat-3")).toBe(false);
  });

  it("bloquea quitarse a si mismo y requiere target para mutaciones", async () => {
    const allowlist = new Set(["chat-1", "chat-2"]);
    const tool = createAdminAllowlistTool({
      allowlist
    });

    await expect(
      tool({
        chat_id: "chat-1",
        operation: "add"
      })
    ).rejects.toThrow("admin_allowlist_target_missing");

    await expect(
      tool({
        chat_id: "chat-1",
        operation: "remove",
        target_chat_id: "chat-1"
      })
    ).rejects.toThrow("admin_allowlist_self_remove_blocked");
  });
});
