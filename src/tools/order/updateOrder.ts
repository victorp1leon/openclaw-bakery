import type { ToolExecutionResult } from "../types";
import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";
import { normalizeDeliveryDateTime } from "./deliveryDateTime";

export type OrderUpdateReference = {
  folio?: string;
  operation_id_ref?: string;
};

export type OrderUpdatePatch = {
  fecha_hora_entrega?: string;
  nombre_cliente?: string;
  telefono?: string;
  producto?: string;
  descripcion_producto?: string;
  cantidad?: number;
  sabor_pan?: "vainilla" | "chocolate" | "red_velvet" | "otro";
  sabor_relleno?: "cajeta" | "mermelada_fresa" | "oreo";
  tipo_envio?: "envio_domicilio" | "recoger_en_tienda";
  direccion?: string;
  estado_pago?: "pagado" | "pendiente" | "parcial";
  total?: number;
  moneda?: string;
  notas?: string;
};

export type OrderUpdatePreview = {
  folio: string;
  operation_id?: string;
  fecha_hora_entrega: string;
  fecha_hora_entrega_iso?: string;
  nombre_cliente: string;
  producto: string;
  cantidad?: number;
  tipo_envio?: string;
  direccion?: string;
  estado_pago?: string;
  total?: number;
  moneda?: string;
  notas?: string;
};

export type OrderUpdateExecutionPayload = {
  reference: OrderUpdateReference;
  patch: OrderUpdatePatch;
  matched_row_index?: number;
  updated_fields?: string[];
  before?: OrderUpdatePreview;
  after?: OrderUpdatePreview;
};

export type UpdateOrderToolConfig = {
  dryRunDefault?: boolean;
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  gwsValueInputOption?: "RAW" | "USER_ENTERED";
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  timezone?: string;
  now?: () => Date;
  gwsRunner?: GwsCommandRunner;
};

type ParsedRange = {
  sheet: string;
  startCol: string;
  endCol: string;
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
  fecha_registro: 0,
  folio: 1,
  fecha_hora_entrega: 2,
  nombre_cliente: 3,
  telefono: 4,
  producto: 5,
  descripcion_producto: 6,
  cantidad: 7,
  sabor_pan: 8,
  sabor_relleno: 9,
  tipo_envio: 10,
  direccion: 11,
  estado_pago: 12,
  total: 13,
  moneda: 14,
  notas: 15,
  chat_id: 16,
  operation_id: 17,
  fecha_hora_entrega_iso: 18
} as const;

const ALLOWED_PATCH_FIELDS = new Set<keyof OrderUpdatePatch>([
  "fecha_hora_entrega",
  "nombre_cliente",
  "telefono",
  "producto",
  "descripcion_producto",
  "cantidad",
  "sabor_pan",
  "sabor_relleno",
  "tipo_envio",
  "direccion",
  "estado_pago",
  "total",
  "moneda",
  "notas"
]);

const IMMUTABLE_FIELDS = new Set(["fecha_registro", "folio", "chat_id", "operation_id", "fecha_hora_entrega_iso"]);
const STRING_PATCH_FIELDS = new Set([
  "fecha_hora_entrega",
  "nombre_cliente",
  "telefono",
  "producto",
  "descripcion_producto",
  "direccion",
  "moneda",
  "notas"
]);
const PAYMENT_VALUES = new Set(["pagado", "pendiente", "parcial"]);
const SHIPPING_VALUES = new Set(["envio_domicilio", "recoger_en_tienda"]);
const SABOR_PAN_VALUES = new Set(["vainilla", "chocolate", "red_velvet", "otro"]);
const SABOR_RELLENO_VALUES = new Set(["cajeta", "mermelada_fresa", "oreo"]);

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
  if (!a1) return `${sheet}!A:R`;
  if (a1.includes(":")) return `${sheet}!${a1}`;
  return `${sheet}!A:R`;
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
    endCol,
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

function toNumberMaybe(value: string | number | undefined): number | undefined {
  if (value == null) return undefined;
  const normalized = String(value).trim().replace(",", ".");
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const out = value.trim();
  return out.length > 0 ? out : undefined;
}

function ensureReference(value: OrderUpdateReference): OrderUpdateReference {
  const folio = trimOptional(value.folio);
  const operation_id_ref = trimOptional(value.operation_id_ref);
  if (!folio && !operation_id_ref) {
    throw new Error("order_update_reference_missing");
  }
  return { folio, operation_id_ref };
}

function toPositiveInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function toNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

function ensurePatch(value: unknown): OrderUpdatePatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("order_update_patch_invalid");
  }

  const out: OrderUpdatePatch = {};

  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = rawKey.trim() as keyof OrderUpdatePatch;
    if (!key) continue;

    if (!ALLOWED_PATCH_FIELDS.has(key)) {
      if (IMMUTABLE_FIELDS.has(key)) {
        throw new Error("order_update_patch_field_immutable");
      }
      throw new Error("order_update_patch_field_invalid");
    }

    if (rawValue == null) {
      throw new Error(`order_update_patch_value_invalid_${key}`);
    }

    if (key === "cantidad") {
      const parsed = toPositiveInt(rawValue);
      if (parsed == null) throw new Error("order_update_patch_value_invalid_cantidad");
      out.cantidad = parsed;
      continue;
    }

    if (key === "total") {
      const parsed = toNonNegativeNumber(rawValue);
      if (parsed == null) throw new Error("order_update_patch_value_invalid_total");
      out.total = parsed;
      continue;
    }

    if (key === "tipo_envio") {
      const t = trimOptional(rawValue);
      if (!t || !SHIPPING_VALUES.has(t as "envio_domicilio")) {
        throw new Error("order_update_patch_value_invalid_tipo_envio");
      }
      out.tipo_envio = t as OrderUpdatePatch["tipo_envio"];
      continue;
    }

    if (key === "estado_pago") {
      const t = trimOptional(rawValue);
      if (!t || !PAYMENT_VALUES.has(t as "pagado")) {
        throw new Error("order_update_patch_value_invalid_estado_pago");
      }
      out.estado_pago = t as OrderUpdatePatch["estado_pago"];
      continue;
    }

    if (key === "sabor_pan") {
      const t = trimOptional(rawValue);
      if (!t || !SABOR_PAN_VALUES.has(t as "vainilla")) {
        throw new Error("order_update_patch_value_invalid_sabor_pan");
      }
      out.sabor_pan = t as OrderUpdatePatch["sabor_pan"];
      continue;
    }

    if (key === "sabor_relleno") {
      const t = trimOptional(rawValue);
      if (!t || !SABOR_RELLENO_VALUES.has(t as "cajeta")) {
        throw new Error("order_update_patch_value_invalid_sabor_relleno");
      }
      out.sabor_relleno = t as OrderUpdatePatch["sabor_relleno"];
      continue;
    }

    if (STRING_PATCH_FIELDS.has(key)) {
      const t = trimOptional(rawValue);
      if (!t) throw new Error(`order_update_patch_value_invalid_${key}`);
      (out as Record<string, unknown>)[key] = t;
      continue;
    }

    throw new Error("order_update_patch_field_invalid");
  }

  if (Object.keys(out).length === 0) {
    throw new Error("order_update_patch_empty");
  }

  return out;
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

function matchesReference(row: RowMatch, reference: OrderUpdateReference): boolean {
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

function valueToCell(value: unknown): string | number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  return "";
}

function toPreview(row: Array<string | number>): OrderUpdatePreview {
  return {
    folio: String(row[INDEX.folio] ?? ""),
    operation_id: trimOptional(row[INDEX.operation_id]),
    fecha_hora_entrega: String(row[INDEX.fecha_hora_entrega] ?? ""),
    fecha_hora_entrega_iso: trimOptional(row[INDEX.fecha_hora_entrega_iso]),
    nombre_cliente: String(row[INDEX.nombre_cliente] ?? ""),
    producto: String(row[INDEX.producto] ?? ""),
    cantidad: toNumberMaybe(row[INDEX.cantidad]),
    tipo_envio: trimOptional(row[INDEX.tipo_envio]),
    direccion: trimOptional(row[INDEX.direccion]),
    estado_pago: trimOptional(row[INDEX.estado_pago]),
    total: toNumberMaybe(row[INDEX.total]),
    moneda: trimOptional(row[INDEX.moneda]),
    notas: trimOptional(row[INDEX.notas])
  };
}

function applyPatch(args: {
  row: Array<string | number>;
  patch: OrderUpdatePatch;
  operation_id: string;
  chat_id: string;
  timezone: string;
  now: Date;
  writeWidth: number;
}): {
  updatedRow: Array<string | number>;
  updatedFields: string[];
} {
  const updatedRow = Array.from({ length: args.writeWidth }, (_, idx) => {
    const existing = args.row[idx];
    return existing == null ? "" : existing;
  });
  const updatedFields: string[] = [];

  const patchEntries = Object.entries(args.patch) as Array<[keyof OrderUpdatePatch, unknown]>;
  for (const [key, value] of patchEntries) {
    const index = INDEX[key];
    updatedRow[index] = valueToCell(value);
    updatedFields.push(key);
  }

  const tipoEnvio = trimOptional(updatedRow[INDEX.tipo_envio]);
  const direccion = trimOptional(updatedRow[INDEX.direccion]);
  if (tipoEnvio === "envio_domicilio" && !direccion) {
    throw new Error("order_update_shipping_invariant_violation");
  }

  if (args.patch.fecha_hora_entrega && args.writeWidth > INDEX.fecha_hora_entrega_iso) {
    const iso = normalizeDeliveryDateTime({
      value: String(updatedRow[INDEX.fecha_hora_entrega] ?? ""),
      timezone: args.timezone,
      now: args.now
    });
    updatedRow[INDEX.fecha_hora_entrega_iso] = iso ?? "";
    if (!updatedFields.includes("fecha_hora_entrega_iso")) {
      updatedFields.push("fecha_hora_entrega_iso");
    }
  }

  const auditTag = `[UPDATE] ${args.now.toISOString()} op:${args.operation_id} chat:${args.chat_id}`;
  const notes = trimOptional(updatedRow[INDEX.notas]);
  updatedRow[INDEX.notas] = notes ? `${notes} | ${auditTag}` : auditTag;
  if (!updatedFields.includes("notas")) {
    updatedFields.push("notas");
  }

  return { updatedRow, updatedFields };
}

export function createUpdateOrderTool(config: UpdateOrderToolConfig = {}) {
  const dryRunDefault = config.dryRunDefault ?? true;
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const normalizedRange = normalizeReadRange(config.gwsRange) ?? "Pedidos!A:R";
  const gwsValueInputOption = config.gwsValueInputOption ?? "USER_ENTERED";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function updateOrder(args: {
    operation_id: string;
    chat_id: string;
    reference: OrderUpdateReference;
    patch: unknown;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<OrderUpdateExecutionPayload>> {
    const reference = ensureReference(args.reference);
    const patch = ensurePatch(args.patch);
    const dry_run = args.dryRun ?? dryRunDefault;

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: { reference, patch },
        detail: "update-order dry-run"
      };
    }

    if (!gwsSpreadsheetId) {
      throw new Error("order_update_gws_spreadsheet_id_missing");
    }
    if (!normalizedRange) {
      throw new Error("order_update_gws_range_missing");
    }

    const rangeMeta = parseRangeMeta(normalizedRange);
    const writeWidth = Math.max(rangeMeta.width, INDEX.fecha_hora_entrega_iso + 1);
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
          throw new Error(`order_update_gws_read_${token}`);
        }

        const rows = readValuesFromGwsPayload(parsedReadStdout);
        if (!rows) {
          throw new Error("order_update_gws_invalid_payload");
        }

        const matchedRows = mapRowsWithIndex(rows, rangeMeta.startRow).filter((row) => matchesReference(row, reference));
        if (matchedRows.length === 0) {
          throw new Error("order_update_not_found");
        }
        if (matchedRows.length > 1) {
          throw new Error("order_update_reference_ambiguous");
        }

        const target = matchedRows[0];
        const before = toPreview(target.row);
        const applied = applyPatch({
          row: target.row,
          patch,
          operation_id: args.operation_id,
          chat_id: args.chat_id,
          timezone,
          now: now(),
          writeWidth
        });
        const after = toPreview(applied.updatedRow);

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
          throw new Error(`order_update_gws_write_${token}`);
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
            patch,
            matched_row_index: target.sheetRow,
            updated_fields: applied.updatedFields,
            before,
            after
          },
          detail: `update-order executed (provider=gws, attempt=${attempt})`
        };
      } catch (err) {
        const cls = classifyGwsSpawnError(err);
        if (cls === "network" && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === "ENOENT") {
          lastError = new Error("order_update_gws_command_unavailable");
          break;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    throw lastError ?? new Error("order_update_failed");
  };
}

export const updateOrderTool = createUpdateOrderTool();
