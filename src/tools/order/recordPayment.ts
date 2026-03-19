import type { ToolExecutionResult } from "../types";
import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";

export type PaymentRecordReference = {
  folio?: string;
  operation_id_ref?: string;
};

export type PaymentRecordInput = {
  estado_pago: "pagado" | "pendiente" | "parcial";
  monto?: number;
  metodo?: "efectivo" | "transferencia" | "tarjeta" | "otro";
  notas?: string;
};

export type PaymentRecordExecutionPayload = {
  reference: PaymentRecordReference;
  matched_row_index?: number;
  before: {
    estado_pago?: string;
  };
  after: {
    estado_pago?: string;
  };
  payment_event: string;
  already_recorded: boolean;
};

export type RecordPaymentToolConfig = {
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
  estado_pago: 12,
  notas: 15,
  operation_id: 17,
  estado_pedido: 19
} as const;

const PAYMENT_VALUES = new Set(["pagado", "pendiente", "parcial"]);
const PAYMENT_METHOD_VALUES = new Set(["efectivo", "transferencia", "tarjeta", "otro"]);
const PAYMENT_MARKER = "[PAGO]";

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
  if (bang === -1) return `${range}!A:U`;
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
  return normalized.includes("folio") && normalized.includes("estado_pago");
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  return out.length > 0 ? out : undefined;
}

function ensureReference(value: PaymentRecordReference): PaymentRecordReference {
  const folio = trimOptional(value.folio);
  const operation_id_ref = trimOptional(value.operation_id_ref);
  if (!folio && !operation_id_ref) {
    throw new Error("payment_record_reference_missing");
  }
  return { folio, operation_id_ref };
}

function normalizePaymentNote(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const collapsed = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!collapsed) return undefined;
  return collapsed.length > 160 ? collapsed.slice(0, 160).trim() : collapsed;
}

function toStrictPositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function ensurePayment(value: unknown): PaymentRecordInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("payment_record_payload_invalid");
  }

  const raw = value as Record<string, unknown>;
  const estado = trimOptional(raw.estado_pago);
  if (!estado || !PAYMENT_VALUES.has(estado)) {
    throw new Error("payment_record_estado_pago_invalid");
  }

  let monto: number | undefined;
  if (raw.monto != null && String(raw.monto).trim() !== "") {
    monto = toStrictPositiveNumber(raw.monto);
    if (monto == null) {
      throw new Error("payment_record_monto_invalid");
    }
  }

  const metodo = trimOptional(raw.metodo);
  if (metodo && !PAYMENT_METHOD_VALUES.has(metodo)) {
    throw new Error("payment_record_metodo_invalid");
  }

  const notas = normalizePaymentNote(raw.notas);

  return {
    estado_pago: estado as PaymentRecordInput["estado_pago"],
    ...(monto != null ? { monto } : {}),
    ...(metodo ? { metodo: metodo as PaymentRecordInput["metodo"] } : {}),
    ...(notas ? { notas } : {})
  };
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

function matchesReference(row: RowMatch, reference: PaymentRecordReference): boolean {
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

function buildPaymentEvent(args: { operation_id: string; payment: PaymentRecordInput; now: Date }): string {
  const monto = args.payment.monto != null ? String(args.payment.monto) : "n/a";
  const metodo = args.payment.metodo ?? "n/a";
  const nota = args.payment.notas ?? "n/a";
  return `${PAYMENT_MARKER} ${args.now.toISOString()} op:${args.operation_id} estado:${args.payment.estado_pago} monto:${monto} metodo:${metodo} nota:${nota}`;
}

function applyPayment(args: {
  row: Array<string | number>;
  operation_id: string;
  payment: PaymentRecordInput;
  now: Date;
  writeWidth: number;
}): {
  updatedRow: Array<string | number>;
  paymentEvent: string;
  alreadyRecorded: boolean;
  needsWrite: boolean;
  beforeEstadoPago?: string;
  afterEstadoPago?: string;
} {
  const updatedRow = Array.from({ length: args.writeWidth }, (_, idx) => {
    const existing = args.row[idx];
    return existing == null ? "" : existing;
  });

  const notes = trimOptional(updatedRow[INDEX.notas]) ?? "";
  const estadoPedido = trimOptional(updatedRow[INDEX.estado_pedido]) ?? "";
  const canceledByStatus = estadoPedido.toLowerCase() === "cancelado";
  if (canceledByStatus) {
    throw new Error("payment_record_order_canceled");
  }

  const paymentEvent = buildPaymentEvent({
    operation_id: args.operation_id,
    payment: args.payment,
    now: args.now
  });
  const alreadyRecorded =
    notes.includes(`op:${args.operation_id}`) && notes.toUpperCase().includes(PAYMENT_MARKER.toUpperCase());

  const beforeEstadoPago = trimOptional(updatedRow[INDEX.estado_pago]);
  const afterEstadoPago = args.payment.estado_pago;
  let needsWrite = false;

  if (beforeEstadoPago !== afterEstadoPago) {
    updatedRow[INDEX.estado_pago] = afterEstadoPago;
    needsWrite = true;
  }

  if (!alreadyRecorded) {
    updatedRow[INDEX.notas] = notes ? `${notes}\n${paymentEvent}` : paymentEvent;
    needsWrite = true;
  }

  return {
    updatedRow,
    paymentEvent,
    alreadyRecorded,
    needsWrite,
    beforeEstadoPago,
    afterEstadoPago
  };
}

export function createRecordPaymentTool(config: RecordPaymentToolConfig = {}) {
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

  return async function recordPayment(args: {
    operation_id: string;
    chat_id: string;
    reference: PaymentRecordReference;
    payment: unknown;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<PaymentRecordExecutionPayload>> {
    const reference = ensureReference(args.reference);
    const payment = ensurePayment(args.payment);
    const dry_run = args.dryRun ?? dryRunDefault;
    const dryRunEvent = buildPaymentEvent({
      operation_id: args.operation_id,
      payment,
      now: now()
    });

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: {
          reference,
          before: {
            estado_pago: undefined
          },
          after: {
            estado_pago: payment.estado_pago
          },
          payment_event: dryRunEvent,
          already_recorded: false
        },
        detail: "record-payment dry-run"
      };
    }

    if (!gwsSpreadsheetId) {
      throw new Error("payment_record_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("payment_record_gws_range_missing");
    }

    const rangeMeta = parseRangeMeta(normalizedRange);
    const writeWidth = Math.max(rangeMeta.width, INDEX.estado_pedido + 1);
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
          throw new Error(`payment_record_gws_read_${token}`);
        }

        const rows = readValuesFromGwsPayload(parsedReadStdout);
        if (!rows) {
          throw new Error("payment_record_gws_invalid_payload");
        }

        const matchedRows = mapRowsWithIndex(rows, rangeMeta.startRow).filter((row) => matchesReference(row, reference));
        if (matchedRows.length === 0) {
          throw new Error("payment_record_not_found");
        }
        if (matchedRows.length > 1) {
          throw new Error("payment_record_reference_ambiguous");
        }

        const target = matchedRows[0];
        const applied = applyPayment({
          row: target.row,
          operation_id: args.operation_id,
          payment,
          now: now(),
          writeWidth
        });

        if (!applied.needsWrite) {
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
              before: {
                estado_pago: applied.beforeEstadoPago
              },
              after: {
                estado_pago: applied.afterEstadoPago
              },
              payment_event: applied.paymentEvent,
              already_recorded: true
            },
            detail: `record-payment already-recorded (provider=gws, attempt=${attempt})`
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
          throw new Error(`payment_record_gws_write_${token}`);
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
            before: {
              estado_pago: applied.beforeEstadoPago
            },
            after: {
              estado_pago: applied.afterEstadoPago
            },
            payment_event: applied.paymentEvent,
            already_recorded: applied.alreadyRecorded
          },
          detail: applied.alreadyRecorded
            ? `record-payment already-recorded-synced (provider=gws, attempt=${attempt})`
            : `record-payment executed (provider=gws, attempt=${attempt})`
        };
      } catch (err) {
        const cls = classifyGwsSpawnError(err);
        if (cls === "network" && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === "ENOENT") {
          lastError = new Error("payment_record_gws_command_unavailable");
          break;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    throw lastError ?? new Error("payment_record_failed");
  };
}

export const recordPaymentTool = createRecordPaymentTool();
