import type { ToolExecutionResult } from "../types";
import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";

export type OrderCancelReference = {
  folio?: string;
  operation_id_ref?: string;
};

export type OrderCancelPreview = {
  folio: string;
  operation_id?: string;
  fecha_hora_entrega: string;
  nombre_cliente: string;
  producto: string;
  estado_pago?: string;
  notas?: string;
  estado_pedido?: string;
  trello_card_id?: string;
};

export type OrderCancelExecutionPayload = {
  reference: OrderCancelReference;
  matched_row_index?: number;
  already_canceled: boolean;
  after?: OrderCancelPreview;
};

export type CancelOrderToolConfig = {
  dryRunDefault?: boolean;
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  gwsValueInputOption?: "RAW" | "USER_ENTERED";
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  now?: () => Date;
  gwsRunner?: GwsCommandRunner;
};

type ParsedRange = {
  sheet: string;
  startCol: string;
  startRow: number;
  width: number;
};

type RowMatch = {
  sheetRow: number;
  row: Array<string | number>;
  folio: string;
  operation_id?: string;
};

const INDEX = {
  folio: 1,
  fecha_hora_entrega: 2,
  nombre_cliente: 3,
  producto: 5,
  estado_pago: 12,
  notas: 15,
  operation_id: 17,
  fecha_hora_entrega_iso: 18,
  estado_pedido: 19,
  trello_card_id: 20
} as const;

const CANCEL_MARKER = "[CANCELADO]";

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseJsonText(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function extractGwsError(value: unknown): { code?: number; message?: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as Record<string, unknown>;

  if (root.error && typeof root.error === "object") {
    const errObj = root.error as Record<string, unknown>;
    const code = typeof errObj.code === "number" ? errObj.code : undefined;
    const message = typeof errObj.message === "string" ? errObj.message : undefined;
    return { code, message };
  }

  const code = typeof root.code === "number" ? root.code : undefined;
  const message = typeof root.message === "string" ? root.message : undefined;
  if (code !== undefined || message !== undefined) {
    return { code, message };
  }

  return undefined;
}

function classifyGwsSpawnError(err: unknown): "network" | "other" {
  if (!(err instanceof Error)) return "other";
  const code = (err as NodeJS.ErrnoException).code;
  if (!code) return "other";
  if (["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED"].includes(code)) return "network";
  return "other";
}

function isRetriableGwsFailure(args: { timedOut: boolean; code?: number; stdout: string; stderr: string }): boolean {
  if (args.timedOut) return true;
  if (typeof args.code === "number" && (args.code === 429 || args.code >= 500)) return true;

  const combined = `${args.stdout}\n${args.stderr}`.toLowerCase();
  return /(timeout|timed out|econnreset|enotfound|eai_again|network|temporar|rate limit|429)/.test(combined);
}

function normalizeReadRange(value: string | undefined): string | undefined {
  const range = value?.trim();
  if (!range) return undefined;

  const bang = range.indexOf("!");
  if (bang === -1) return `${range}!A:R`;
  const sheet = range.slice(0, bang).trim();
  const a1 = range.slice(bang + 1).trim();
  if (!sheet) return undefined;
  if (!a1) return `${sheet}!A:U`;
  if (!a1.includes(":")) return `${sheet}!A:U`;

  const [startTokenRaw, endTokenRaw] = a1.split(":");
  const startToken = startTokenRaw?.trim() || "A";
  const endToken = endTokenRaw?.trim() || "U";
  const endMatch = endToken.match(/^([A-Za-z]+)(\d+)?$/);
  if (!endMatch) return `${sheet}!${a1}`;

  const endCol = endMatch[1].toUpperCase();
  const endRow = endMatch[2] ?? "";
  if (lettersToColumnNumber(endCol) >= lettersToColumnNumber("U")) {
    return `${sheet}!${a1}`;
  }

  return `${sheet}!${startToken}:U${endRow}`;
}

function lettersToColumnNumber(value: string): number {
  let out = 0;
  for (const ch of value.toUpperCase()) {
    if (ch < "A" || ch > "Z") return 0;
    out = out * 26 + (ch.charCodeAt(0) - 64);
  }
  return out;
}

function columnNumberToLetters(value: number): string {
  let n = Math.trunc(value);
  if (n <= 0) return "A";
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.trunc((n - 1) / 26);
  }
  return out;
}

function parseRangeMeta(normalizedRange: string): ParsedRange {
  const [sheetRaw, a1Raw = "A:R"] = normalizedRange.split("!");
  const sheet = sheetRaw.trim() || "Pedidos";
  const a1 = a1Raw.trim() || "A:R";
  const [startTokenRaw, endTokenRaw] = a1.split(":");
  const startToken = startTokenRaw?.trim() || "A";
  const endToken = endTokenRaw?.trim() || startToken;

  const startMatch = startToken.match(/^([A-Za-z]+)(\d+)?$/);
  const endMatch = endToken.match(/^([A-Za-z]+)(\d+)?$/);

  const startCol = startMatch?.[1]?.toUpperCase() || "A";
  const endCol = endMatch?.[1]?.toUpperCase() || "R";
  const startRow = Number(startMatch?.[2] ?? "1");

  const startColNum = lettersToColumnNumber(startCol);
  const endColNum = lettersToColumnNumber(endCol);
  const width = startColNum > 0 && endColNum >= startColNum ? endColNum - startColNum + 1 : 18;

  return {
    sheet,
    startCol,
    startRow: Number.isInteger(startRow) && startRow > 0 ? startRow : 1,
    width
  };
}

function rowRangeFor(args: { meta: ParsedRange; row: number; width: number }): string {
  const startColNum = lettersToColumnNumber(args.meta.startCol) || 1;
  const endColNum = startColNum + Math.max(1, args.width) - 1;
  const endCol = columnNumberToLetters(endColNum);
  return `${args.meta.sheet}!${args.meta.startCol}${args.row}:${endCol}${args.row}`;
}

function readValuesFromGwsPayload(value: unknown): string[][] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as Record<string, unknown>;

  const candidates: unknown[] = [
    root.values,
    (root.data as Record<string, unknown> | undefined)?.values,
    (root.result as Record<string, unknown> | undefined)?.values,
    (root.response as Record<string, unknown> | undefined)?.values
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map((row) => {
      if (!Array.isArray(row)) return [];
      return row.map((cell) => (cell == null ? "" : String(cell)));
    });
  }

  return undefined;
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => cell.trim().toLowerCase());
  return normalized.includes("folio") && normalized.includes("fecha_hora_entrega");
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  return out.length > 0 ? out : undefined;
}

function ensureReference(value: OrderCancelReference): OrderCancelReference {
  const folio = trimOptional(value.folio);
  const operation_id_ref = trimOptional(value.operation_id_ref);
  if (!folio && !operation_id_ref) {
    throw new Error("order_cancel_reference_missing");
  }
  return { folio, operation_id_ref };
}

function mapRowsWithIndex(rows: string[][], startRow: number): RowMatch[] {
  const hasHeader = rows.length > 0 && isHeaderRow(rows[0]);
  const skip = hasHeader ? 1 : 0;
  const out: RowMatch[] = [];

  for (let idx = 0; idx < rows.length - skip; idx += 1) {
    const row = rows[idx + skip] ?? [];
    const folio = row[INDEX.folio] ?? "";
    const operation_id = row[INDEX.operation_id] || undefined;
    out.push({
      sheetRow: startRow + skip + idx,
      row: [...row],
      folio,
      operation_id
    });
  }

  return out;
}

function matchesReference(row: RowMatch, reference: OrderCancelReference): boolean {
  const rowFolio = normalizeForMatch(row.folio);
  const rowOperation = normalizeForMatch(row.operation_id ?? "");

  if (reference.folio && rowFolio !== normalizeForMatch(reference.folio)) {
    return false;
  }
  if (reference.operation_id_ref && rowOperation !== normalizeForMatch(reference.operation_id_ref)) {
    return false;
  }
  return true;
}

function toPreview(row: Array<string | number>): OrderCancelPreview {
  return {
    folio: String(row[INDEX.folio] ?? ""),
    operation_id: trimOptional(row[INDEX.operation_id]),
    fecha_hora_entrega: String(row[INDEX.fecha_hora_entrega] ?? ""),
    nombre_cliente: String(row[INDEX.nombre_cliente] ?? ""),
    producto: String(row[INDEX.producto] ?? ""),
    estado_pago: trimOptional(row[INDEX.estado_pago]),
    notas: trimOptional(row[INDEX.notas]),
    estado_pedido: trimOptional(row[INDEX.estado_pedido]),
    trello_card_id: trimOptional(row[INDEX.trello_card_id])
  };
}

function normalizeMotivo(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : undefined;
}

function applyCancel(args: {
  row: Array<string | number>;
  operation_id: string;
  chat_id: string;
  motivo?: string;
  trello_card_id?: string;
  now: Date;
  writeWidth: number;
}): {
  updatedRow: Array<string | number>;
  alreadyCanceled: boolean;
  needsWrite: boolean;
} {
  const updatedRow = Array.from({ length: args.writeWidth }, (_, idx) => {
    const existing = args.row[idx];
    return existing == null ? "" : existing;
  });

  let needsWrite = false;
  const existingEstadoPedido = trimOptional(updatedRow[INDEX.estado_pedido]);
  if (existingEstadoPedido !== "cancelado") {
    updatedRow[INDEX.estado_pedido] = "cancelado";
    needsWrite = true;
  }

  const nextCardId = trimOptional(args.trello_card_id);
  if (nextCardId) {
    const existingCardId = trimOptional(updatedRow[INDEX.trello_card_id]);
    if (existingCardId !== nextCardId) {
      updatedRow[INDEX.trello_card_id] = nextCardId;
      needsWrite = true;
    }
  }

  const notes = trimOptional(updatedRow[INDEX.notas]) ?? "";
  if (notes.toLowerCase().includes(CANCEL_MARKER.toLowerCase())) {
    return { updatedRow, alreadyCanceled: true, needsWrite };
  }

  const marker = `${CANCEL_MARKER} ${args.now.toISOString()} op:${args.operation_id} chat:${args.chat_id} motivo:${args.motivo ?? "n/a"}`;
  updatedRow[INDEX.notas] = notes ? `${notes} | ${marker}` : marker;
  return { updatedRow, alreadyCanceled: false, needsWrite: true };
}

export function createCancelOrderTool(config: CancelOrderToolConfig = {}) {
  const dryRunDefault = config.dryRunDefault ?? true;
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const normalizedRange = normalizeReadRange(config.gwsRange) ?? "Pedidos!A:U";
  const gwsValueInputOption = config.gwsValueInputOption ?? "USER_ENTERED";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function cancelOrder(args: {
    operation_id: string;
    chat_id: string;
    reference: OrderCancelReference;
    motivo?: string;
    trello_card_id?: string;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<OrderCancelExecutionPayload>> {
    const reference = ensureReference(args.reference);
    const motivo = normalizeMotivo(args.motivo);
    const dry_run = args.dryRun ?? dryRunDefault;

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: {
          reference,
          already_canceled: false
        },
        detail: "cancel-order dry-run"
      };
    }

    if (!gwsSpreadsheetId) {
      throw new Error("order_cancel_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("order_cancel_gws_range_missing");
    }

    const rangeMeta = parseRangeMeta(normalizedRange);
    const writeWidth = Math.max(rangeMeta.width, INDEX.trello_card_id + 1);
    const readParams = {
      spreadsheetId: gwsSpreadsheetId,
      range: normalizedRange
    };

    const attempts = maxRetries + 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const readResult = await gwsRunner({
          command: gwsCommand,
          commandArgs: [
            ...gwsCommandArgs,
            "sheets",
            "spreadsheets",
            "values",
            "get",
            "--params",
            JSON.stringify(readParams)
          ],
          timeoutMs
        });

        const parsedReadStdout = parseJsonText(readResult.stdout);
        const parsedReadStderr = parseJsonText(readResult.stderr);
        const readErrInfo = extractGwsError(parsedReadStdout) ?? extractGwsError(parsedReadStderr);
        const readRetriable = isRetriableGwsFailure({
          timedOut: readResult.timedOut,
          code: readErrInfo?.code,
          stdout: readResult.stdout,
          stderr: readResult.stderr
        });

        if (readResult.timedOut || readResult.exitCode !== 0 || readErrInfo) {
          if (readRetriable && attempt < attempts) {
            await sleep(retryBackoffMs * attempt);
            continue;
          }
          const token = sanitizeErrorToken((readErrInfo?.message ?? readResult.stderr) || `exit_${readResult.exitCode ?? "unknown"}`);
          throw new Error(`order_cancel_gws_read_${token}`);
        }

        const rows = readValuesFromGwsPayload(parsedReadStdout);
        if (!rows) {
          throw new Error("order_cancel_gws_invalid_payload");
        }

        const matchedRows = mapRowsWithIndex(rows, rangeMeta.startRow).filter((row) => matchesReference(row, reference));
        if (matchedRows.length === 0) {
          throw new Error("order_cancel_not_found");
        }
        if (matchedRows.length > 1) {
          throw new Error("order_cancel_reference_ambiguous");
        }

        const target = matchedRows[0];
        const applied = applyCancel({
          row: target.row,
          operation_id: args.operation_id,
          chat_id: args.chat_id,
          motivo,
          trello_card_id: args.trello_card_id,
          now: now(),
          writeWidth
        });

        if (applied.alreadyCanceled && !applied.needsWrite) {
          return {
            ok: true,
            dry_run,
            operation_id: args.operation_id,
            payload: {
              reference: {
                folio: target.folio || reference.folio,
                operation_id_ref: target.operation_id || reference.operation_id_ref
              },
              matched_row_index: target.sheetRow,
              already_canceled: true,
              after: toPreview(applied.updatedRow)
            },
            detail: `cancel-order already-canceled (provider=gws, attempt=${attempt})`
          };
        }

        const writeParams = {
          spreadsheetId: gwsSpreadsheetId,
          range: rowRangeFor({ meta: rangeMeta, row: target.sheetRow, width: writeWidth }),
          valueInputOption: gwsValueInputOption
        };
        const writeBody = {
          values: [applied.updatedRow]
        };

        const writeResult = await gwsRunner({
          command: gwsCommand,
          commandArgs: [
            ...gwsCommandArgs,
            "sheets",
            "spreadsheets",
            "values",
            "update",
            "--params",
            JSON.stringify(writeParams),
            "--json",
            JSON.stringify(writeBody)
          ],
          timeoutMs
        });

        const parsedWriteStdout = parseJsonText(writeResult.stdout);
        const parsedWriteStderr = parseJsonText(writeResult.stderr);
        const writeErrInfo = extractGwsError(parsedWriteStdout) ?? extractGwsError(parsedWriteStderr);
        const writeRetriable = isRetriableGwsFailure({
          timedOut: writeResult.timedOut,
          code: writeErrInfo?.code,
          stdout: writeResult.stdout,
          stderr: writeResult.stderr
        });

        if (writeResult.timedOut || writeResult.exitCode !== 0 || writeErrInfo) {
          if (writeRetriable && attempt < attempts) {
            await sleep(retryBackoffMs * attempt);
            continue;
          }
          const token = sanitizeErrorToken((writeErrInfo?.message ?? writeResult.stderr) || `exit_${writeResult.exitCode ?? "unknown"}`);
          throw new Error(`order_cancel_gws_write_${token}`);
        }

        return {
          ok: true,
          dry_run,
          operation_id: args.operation_id,
          payload: {
            reference: {
              folio: target.folio || reference.folio,
              operation_id_ref: target.operation_id || reference.operation_id_ref
            },
            matched_row_index: target.sheetRow,
            already_canceled: applied.alreadyCanceled,
            after: toPreview(applied.updatedRow)
          },
          detail: applied.alreadyCanceled
            ? `cancel-order already-canceled-synced (provider=gws, attempt=${attempt})`
            : `cancel-order executed (provider=gws, attempt=${attempt})`
        };
      } catch (err) {
        const cls = classifyGwsSpawnError(err);
        if (cls === "network" && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === "ENOENT") {
          lastError = new Error("order_cancel_gws_command_unavailable");
          break;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    throw lastError ?? new Error("order_cancel_failed");
  };
}

export const cancelOrderTool = createCancelOrderTool();
