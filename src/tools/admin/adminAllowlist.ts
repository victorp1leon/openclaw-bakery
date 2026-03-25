import { v4 as uuidv4 } from "uuid";

export type AdminAllowlistOperation = "view" | "add" | "remove";

export type AdminAllowlistEntry = {
  chat_id: string;
};

export type AdminAllowlistResult = {
  status: "ok";
  operation: AdminAllowlistOperation;
  changed: boolean;
  target_chat_id?: string;
  allowlist_size: number;
  allowlist: AdminAllowlistEntry[];
  persistent: false;
  trace_ref: string;
  detail: string;
  generated_at: string;
};

export type AdminAllowlistToolConfig = {
  allowlist: Set<string>;
  now?: () => Date;
  newTraceId?: () => string;
  maxEntries?: number;
};

function normalizeChatId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  if (!out) return undefined;
  return /^[a-zA-Z0-9._:-]{3,120}$/.test(out) ? out : undefined;
}

function sortedAllowlist(allowlist: Set<string>, maxEntries: number): AdminAllowlistEntry[] {
  return [...allowlist]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, maxEntries)
    .map((chat_id) => ({ chat_id }));
}

export function createAdminAllowlistTool(config: AdminAllowlistToolConfig) {
  const now = config.now ?? (() => new Date());
  const newTraceId = config.newTraceId ?? uuidv4;
  const maxEntries = Number.isInteger(config.maxEntries) && (config.maxEntries ?? 0) > 0
    ? Math.min(100, Math.trunc(config.maxEntries!))
    : 50;

  return async (args: {
    chat_id: string;
    operation: AdminAllowlistOperation;
    target_chat_id?: string;
  }): Promise<AdminAllowlistResult> => {
    const requester = normalizeChatId(args.chat_id);
    if (!requester) {
      throw new Error("admin_allowlist_requester_invalid");
    }

    const operation = args.operation;
    let changed = false;
    const target = normalizeChatId(args.target_chat_id);

    if (operation === "add") {
      if (!target) throw new Error("admin_allowlist_target_missing");
      if (!config.allowlist.has(target)) {
        config.allowlist.add(target);
        changed = true;
      }
    } else if (operation === "remove") {
      if (!target) throw new Error("admin_allowlist_target_missing");
      if (target === requester) {
        throw new Error("admin_allowlist_self_remove_blocked");
      }
      if (config.allowlist.size <= 1) {
        throw new Error("admin_allowlist_min_size_violation");
      }
      if (config.allowlist.has(target)) {
        config.allowlist.delete(target);
        changed = true;
      }
      if (config.allowlist.size === 0) {
        config.allowlist.add(requester);
        throw new Error("admin_allowlist_min_size_violation");
      }
    }

    return {
      status: "ok",
      operation,
      changed,
      ...(target ? { target_chat_id: target } : {}),
      allowlist_size: config.allowlist.size,
      allowlist: sortedAllowlist(config.allowlist, maxEntries),
      persistent: false,
      trace_ref: `admin-allowlist:${newTraceId()}`,
      detail: `admin-allowlist executed (operation=${operation};changed=${changed ? 1 : 0})`,
      generated_at: now().toISOString()
    };
  };
}
