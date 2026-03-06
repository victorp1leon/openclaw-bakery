import { describe, expect, it } from "vitest";

import { createRateLimitGuard } from "./rateLimitGuard";

describe("rateLimitGuard", () => {
  it("allows messages within window", () => {
    let now = 1_700_000_000_000;
    const guard = createRateLimitGuard({
      enabled: true,
      windowMs: 10_000,
      maxMessagesPerWindow: 3,
      blockDurationMs: 30_000,
      nowMs: () => now
    });

    expect(guard.check("chat-1")).toEqual({ ok: true });
    now += 100;
    expect(guard.check("chat-1")).toEqual({ ok: true });
    now += 100;
    expect(guard.check("chat-1")).toEqual({ ok: true });
  });

  it("blocks when window limit is exceeded", () => {
    let now = 1_700_000_000_000;
    const guard = createRateLimitGuard({
      enabled: true,
      windowMs: 10_000,
      maxMessagesPerWindow: 2,
      blockDurationMs: 30_000,
      nowMs: () => now
    });

    expect(guard.check("chat-1")).toEqual({ ok: true });
    now += 100;
    expect(guard.check("chat-1")).toEqual({ ok: true });
    now += 100;

    const blocked = guard.check("chat-1");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe("window_limit");
      expect(blocked.retryAfterSeconds).toBe(30);
    }
  });

  it("keeps chat blocked until duration expires", () => {
    let now = 1_700_000_000_000;
    const guard = createRateLimitGuard({
      enabled: true,
      windowMs: 10_000,
      maxMessagesPerWindow: 1,
      blockDurationMs: 20_000,
      nowMs: () => now
    });

    expect(guard.check("chat-1")).toEqual({ ok: true });
    now += 100;
    const over = guard.check("chat-1");
    expect(over.ok).toBe(false);

    now += 5_000;
    const stillBlocked = guard.check("chat-1");
    expect(stillBlocked.ok).toBe(false);
    if (!stillBlocked.ok) {
      expect(stillBlocked.reason).toBe("blocked");
      expect(stillBlocked.retryAfterSeconds).toBe(15);
    }

    now += 15_000;
    expect(guard.check("chat-1")).toEqual({ ok: true });
  });

  it("isolates limits per chat id", () => {
    let now = 1_700_000_000_000;
    const guard = createRateLimitGuard({
      enabled: true,
      windowMs: 10_000,
      maxMessagesPerWindow: 1,
      blockDurationMs: 20_000,
      nowMs: () => now
    });

    expect(guard.check("chat-a")).toEqual({ ok: true });
    now += 100;
    expect(guard.check("chat-a").ok).toBe(false);
    expect(guard.check("chat-b")).toEqual({ ok: true });
  });

  it("bypasses checks when disabled", () => {
    const guard = createRateLimitGuard({
      enabled: false,
      windowMs: 10_000,
      maxMessagesPerWindow: 1,
      blockDurationMs: 20_000
    });

    expect(guard.check("chat-1")).toEqual({ ok: true });
    expect(guard.check("chat-1")).toEqual({ ok: true });
    expect(guard.check("chat-1")).toEqual({ ok: true });
  });
});

