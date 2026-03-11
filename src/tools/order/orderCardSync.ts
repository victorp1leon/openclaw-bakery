import { normalizeDeliveryDateTime } from "./deliveryDateTime";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export type TrelloCardSnapshot = {
  card_id: string;
  name?: string;
  desc?: string;
  due?: string;
  idList?: string;
};

export type OrderCardSyncConfig = {
  fetchFn?: FetchLike;
  apiKey?: string;
  token?: string;
  apiBaseUrl?: string;
  cancelListId?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  dryRunDefault?: boolean;
  timezone?: string;
  now?: () => Date;
};

type TrelloCard = {
  id?: string;
  name?: string;
  desc?: string;
  due?: string;
  idList?: string;
  url?: string;
};

const TRELLO_BASE_URL_DEFAULT = "https://api.trello.com";

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyTransportError(err: unknown): "timeout" | "network" | "other" {
  if (err instanceof Error && err.name === "AbortError") return "timeout";
  if (err instanceof TypeError) return "network";
  return "other";
}

function isRetriableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function normalizeBaseUrl(url?: string): string {
  const value = (url?.trim() || TRELLO_BASE_URL_DEFAULT).replace(/\/+$/, "");
  return value.length > 0 ? value : TRELLO_BASE_URL_DEFAULT;
}

async function readResponseBody(response: Awaited<ReturnType<FetchLike>>): Promise<unknown> {
  if (response.text) {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  if (response.json) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function operationMarker(operationId: string): string {
  return `[operation_id:${operationId}]`;
}

function toSnapshot(card: TrelloCard): TrelloCardSnapshot {
  if (!card.id) {
    throw new Error("order_trello_card_payload_invalid");
  }
  return {
    card_id: card.id,
    name: card.name,
    desc: card.desc,
    due: card.due,
    idList: card.idList
  };
}

function normalizeReferenceForSearch(args: {
  operation_id_ref?: string;
  folio?: string;
}): string | undefined {
  const operation_id_ref = args.operation_id_ref?.trim();
  if (operation_id_ref) return operation_id_ref;
  const folio = args.folio?.trim();
  if (folio) return folio;
  return undefined;
}

function updateComment(args: {
  operation_id: string;
  chat_id: string;
  patch: Record<string, unknown>;
}): string {
  return [
    `[UPDATE] op:${args.operation_id} chat:${args.chat_id}`,
    JSON.stringify(args.patch)
  ].join("\n");
}

function cancelComment(args: {
  operation_id: string;
  chat_id: string;
  motivo?: string;
}): string {
  return `[CANCELADO] op:${args.operation_id} chat:${args.chat_id} motivo:${args.motivo ?? "n/a"}`;
}

function errorDetail(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

export function createOrderCardSyncTool(config: OrderCardSyncConfig = {}) {
  const fetchFn = config.fetchFn ?? ((globalThis.fetch as unknown) as FetchLike | undefined);
  const apiKey = config.apiKey?.trim() || undefined;
  const token = config.token?.trim() || undefined;
  const apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
  const cancelListId = config.cancelListId?.trim() || undefined;
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const dryRunDefault = config.dryRunDefault ?? true;
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const now = config.now ?? (() => new Date());

  async function fetchWithRetry(args: {
    operation_id: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    params?: Record<string, string | undefined>;
  }): Promise<{ status: number; data: unknown }> {
    if (!fetchFn) throw new Error("order_trello_fetch_unavailable");
    if (!apiKey) throw new Error("order_trello_api_key_missing");
    if (!token) throw new Error("order_trello_token_missing");

    const attempts = maxRetries + 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const search = new URLSearchParams({ key: apiKey, token });
        for (const [key, value] of Object.entries(args.params ?? {})) {
          if (typeof value === "string" && value.length > 0) {
            search.set(key, value);
          }
        }
        const url = `${apiBaseUrl}${args.path}?${search.toString()}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        let response: Awaited<ReturnType<FetchLike>>;
        try {
          response = await fetchFn(url, {
            method: args.method,
            signal: controller.signal
          });
        } finally {
          clearTimeout(timer);
        }

        const data = await readResponseBody(response);
        if (response.ok) {
          return { status: response.status, data };
        }

        if (isRetriableHttpStatus(response.status) && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        throw new Error(`order_trello_http_${response.status}`);
      } catch (err) {
        const cls = classifyTransportError(err);
        if ((cls === "timeout" || cls === "network") && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    throw lastError ?? new Error("order_trello_failed");
  }

  async function resolveCard(args: {
    operation_id: string;
    trello_card_id?: string;
    operation_id_ref?: string;
    folio?: string;
  }): Promise<TrelloCard> {
    if (args.trello_card_id) {
      const found = await fetchWithRetry({
        operation_id: args.operation_id,
        method: "GET",
        path: `/1/cards/${encodeURIComponent(args.trello_card_id)}`,
        params: { fields: "id,name,desc,due,idList,url" }
      });
      return (found.data ?? {}) as TrelloCard;
    }

    const markerRef = normalizeReferenceForSearch({
      operation_id_ref: args.operation_id_ref,
      folio: args.folio
    });
    if (!markerRef) {
      throw new Error("order_trello_card_reference_missing");
    }

    const marker = operationMarker(markerRef);
    const search = await fetchWithRetry({
      operation_id: args.operation_id,
      method: "GET",
      path: "/1/search",
      params: {
        query: marker,
        modelTypes: "cards",
        cards_limit: "1",
        card_fields: "id,name,desc,due,idList,url"
      }
    });

    const cards = ((search.data as Record<string, unknown> | undefined)?.cards as unknown[] | undefined) ?? [];
    const first = cards[0];
    if (!first || typeof first !== "object") {
      throw new Error("order_trello_card_not_found");
    }
    return first as TrelloCard;
  }

  async function rollbackCard(args: {
    operation_id: string;
    snapshot: TrelloCardSnapshot;
    dryRun?: boolean;
  }): Promise<void> {
    const dry_run = args.dryRun ?? dryRunDefault;
    if (dry_run) return;

    await fetchWithRetry({
      operation_id: args.operation_id,
      method: "PUT",
      path: `/1/cards/${encodeURIComponent(args.snapshot.card_id)}`,
      params: {
        name: args.snapshot.name,
        desc: args.snapshot.desc,
        due: args.snapshot.due,
        idList: args.snapshot.idList
      }
    });
  }

  async function updateCardForOrder(args: {
    operation_id: string;
    chat_id: string;
    trello_card_id?: string;
    reference: {
      operation_id_ref?: string;
      folio?: string;
    };
    patch: Record<string, unknown>;
    dryRun?: boolean;
  }): Promise<{ card_id: string; snapshot: TrelloCardSnapshot; dry_run: boolean }> {
    const dry_run = args.dryRun ?? dryRunDefault;
    if (dry_run) {
      return {
        card_id: args.trello_card_id ?? "trello-dry-run-card",
        snapshot: {
          card_id: args.trello_card_id ?? "trello-dry-run-card"
        },
        dry_run
      };
    }

    const card = await resolveCard({
      operation_id: args.operation_id,
      trello_card_id: args.trello_card_id,
      operation_id_ref: args.reference.operation_id_ref,
      folio: args.reference.folio
    });
    const snapshot = toSnapshot(card);
    const card_id = snapshot.card_id;

    const fechaHoraRaw = typeof args.patch.fecha_hora_entrega === "string" ? args.patch.fecha_hora_entrega : undefined;
    const due = fechaHoraRaw
      ? normalizeDeliveryDateTime({ value: fechaHoraRaw, timezone, now: now() })
      : undefined;

    try {
      if (due) {
        await fetchWithRetry({
          operation_id: args.operation_id,
          method: "PUT",
          path: `/1/cards/${encodeURIComponent(card_id)}`,
          params: {
            due: `${due}:00.000Z`
          }
        });
      }

      await fetchWithRetry({
        operation_id: args.operation_id,
        method: "POST",
        path: `/1/cards/${encodeURIComponent(card_id)}/actions/comments`,
        params: {
          text: updateComment({
            operation_id: args.operation_id,
            chat_id: args.chat_id,
            patch: args.patch
          })
        }
      });
    } catch (err) {
      try {
        await rollbackCard({
          operation_id: args.operation_id,
          snapshot,
          dryRun: false
        })
      } catch (rollbackErr) {
        throw new Error(`order_trello_update_rollback_failed:${errorDetail(rollbackErr)}`);
      }
      throw new Error(`order_trello_update_failed:${errorDetail(err)}`);
    }

    return {
      card_id,
      snapshot,
      dry_run
    };
  }

  async function cancelCardForOrder(args: {
    operation_id: string;
    chat_id: string;
    trello_card_id?: string;
    reference: {
      operation_id_ref?: string;
      folio?: string;
    };
    motivo?: string;
    dryRun?: boolean;
  }): Promise<{ card_id: string; snapshot: TrelloCardSnapshot; dry_run: boolean }> {
    const dry_run = args.dryRun ?? dryRunDefault;
    if (dry_run) {
      return {
        card_id: args.trello_card_id ?? "trello-dry-run-card",
        snapshot: {
          card_id: args.trello_card_id ?? "trello-dry-run-card"
        },
        dry_run
      };
    }

    if (!cancelListId) {
      throw new Error("order_trello_cancel_list_id_missing");
    }

    const card = await resolveCard({
      operation_id: args.operation_id,
      trello_card_id: args.trello_card_id,
      operation_id_ref: args.reference.operation_id_ref,
      folio: args.reference.folio
    });
    const snapshot = toSnapshot(card);
    const card_id = snapshot.card_id;

    try {
      await fetchWithRetry({
        operation_id: args.operation_id,
        method: "PUT",
        path: `/1/cards/${encodeURIComponent(card_id)}`,
        params: {
          idList: cancelListId
        }
      });

      await fetchWithRetry({
        operation_id: args.operation_id,
        method: "POST",
        path: `/1/cards/${encodeURIComponent(card_id)}/actions/comments`,
        params: {
          text: cancelComment({
            operation_id: args.operation_id,
            chat_id: args.chat_id,
            motivo: args.motivo
          })
        }
      });
    } catch (err) {
      try {
        await rollbackCard({
          operation_id: args.operation_id,
          snapshot,
          dryRun: false
        })
      } catch (rollbackErr) {
        throw new Error(`order_trello_cancel_rollback_failed:${errorDetail(rollbackErr)}`);
      }
      throw new Error(`order_trello_cancel_failed:${errorDetail(err)}`);
    }

    return {
      card_id,
      snapshot,
      dry_run
    };
  }

  async function deleteCard(args: {
    operation_id: string;
    card_id: string;
    dryRun?: boolean;
  }): Promise<void> {
    const dry_run = args.dryRun ?? dryRunDefault;
    if (dry_run) return;

    await fetchWithRetry({
      operation_id: args.operation_id,
      method: "DELETE",
      path: `/1/cards/${encodeURIComponent(args.card_id)}`
    });
  }

  return {
    updateCardForOrder,
    cancelCardForOrder,
    rollbackCard,
    deleteCard
  };
}
