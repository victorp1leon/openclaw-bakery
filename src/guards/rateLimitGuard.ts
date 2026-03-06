export type RateLimitDecision =
  | { ok: true }
  | { ok: false; reason: "window_limit" | "blocked"; retryAfterSeconds: number };

export type RateLimitGuard = {
  check: (chat_id: string) => RateLimitDecision;
};

export function createRateLimitGuard(args: {
  enabled: boolean;
  windowMs: number;
  maxMessagesPerWindow: number;
  blockDurationMs: number;
  nowMs?: () => number;
}): RateLimitGuard {
  const nowMs = args.nowMs ?? (() => Date.now());
  const byChat = new Map<string, { hits: number[]; blockedUntilMs?: number }>();

  function check(chat_id: string): RateLimitDecision {
    if (!args.enabled) {
      return { ok: true };
    }

    const now = nowMs();
    const current = byChat.get(chat_id) ?? { hits: [] };

    if (current.blockedUntilMs && now < current.blockedUntilMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.blockedUntilMs - now) / 1000));
      byChat.set(chat_id, current);
      return { ok: false, reason: "blocked", retryAfterSeconds };
    }

    const windowStart = now - args.windowMs;
    const prunedHits = current.hits.filter((ts) => ts > windowStart);
    prunedHits.push(now);

    if (prunedHits.length > args.maxMessagesPerWindow) {
      const blockedUntilMs = now + args.blockDurationMs;
      byChat.set(chat_id, { hits: [], blockedUntilMs });
      return {
        ok: false,
        reason: "window_limit",
        retryAfterSeconds: Math.max(1, Math.ceil(args.blockDurationMs / 1000))
      };
    }

    byChat.set(chat_id, { hits: prunedHits });
    return { ok: true };
  }

  return { check };
}

