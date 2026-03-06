/**
 * OpenClaw Bakery - Expense Webhook (Apps Script)
 * Requiere Script Properties:
 * - EXPENSE_TOOL_API_KEY           (obligatorio)
 * - EXPENSE_TOOL_API_KEY_HEADER    (opcional, default: x-api-key)
 * - EXPENSE_SHEET_ID               (opcional, si no usa Spreadsheet activo)
 * - EXPENSE_SHEET_NAME             (opcional, default: Expenses)
 */

const DEFAULT_SHEET_NAME = "Expenses";
const DEFAULT_API_KEY_HEADER = "x-api-key";
const HEADER_ROW = [
  "operation_id",
  "chat_id",
  "fecha",
  "monto",
  "moneda",
  "concepto",
  "categoria",
  "metodo_pago",
  "proveedor",
  "notas",
  "created_at"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const props = PropertiesService.getScriptProperties();
    const expectedApiKey = (props.getProperty("EXPENSE_TOOL_API_KEY") || "").trim();
    const apiKeyHeader = (props.getProperty("EXPENSE_TOOL_API_KEY_HEADER") || DEFAULT_API_KEY_HEADER).trim();

    if (!expectedApiKey) {
      throw new Error("expense_server_misconfigured_api_key");
    }

    const body = parseJsonBody_(e);
    const providedApiKey = extractApiKey_(e, body, apiKeyHeader);

    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      throw new Error("expense_unauthorized");
    }

    if ((body.intent || "").trim() !== "gasto") {
      throw new Error("expense_invalid_intent");
    }

    const operationId = stringOrEmpty_(body.operation_id);
    const chatId = stringOrEmpty_(body.chat_id);

    const expense = body.expense || {};
    const rowObj = body.row || {};

    const monto = Number(pickFirstDefined_(rowObj.monto, expense.monto));
    const concepto = stringOrEmpty_(pickFirstDefined_(rowObj.concepto, expense.concepto));
    const moneda = stringOrEmpty_(pickFirstDefined_(rowObj.moneda, expense.moneda)) || "MXN";
    const fecha = normalizeFecha_(pickFirstDefined_(rowObj.fecha, expense.fecha));
    const categoria = stringOrEmpty_(pickFirstDefined_(rowObj.categoria, expense.categoria));
    const metodoPago = stringOrEmpty_(pickFirstDefined_(rowObj.metodo_pago, expense.metodo_pago));
    const proveedor = stringOrEmpty_(pickFirstDefined_(rowObj.proveedor, expense.proveedor));
    const notas = stringOrEmpty_(pickFirstDefined_(rowObj.notas, expense.notas));

    if (!operationId) throw new Error("expense_operation_id_missing");
    if (!chatId) throw new Error("expense_chat_id_missing");
    if (!Number.isFinite(monto) || monto <= 0) throw new Error("expense_monto_invalid");
    if (!concepto) throw new Error("expense_concepto_missing");

    const sheet = getOrCreateSheet_(props);
    ensureHeader_(sheet);

    if (isDuplicateOperation_(sheet, operationId)) {
      return jsonResponse_({
        ok: true,
        appended: false,
        duplicate: true,
        operation_id: operationId
      });
    }

    sheet.appendRow([
      operationId,
      chatId,
      fecha,
      monto,
      moneda,
      concepto,
      categoria,
      metodoPago,
      proveedor,
      notas,
      new Date().toISOString()
    ]);

    return jsonResponse_({
      ok: true,
      appended: true,
      duplicate: false,
      operation_id: operationId
    });
  } catch (err) {
    console.error("expense_webhook_error", err);
    throw err; // fuerza HTTP error para que el cliente no lo trate como éxito
  } finally {
    lock.releaseLock();
  }
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("expense_body_missing");
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (_err) {
    throw new Error("expense_body_invalid_json");
  }
}

function extractApiKey_(e, body, apiKeyHeader) {
  // Primario: header (si el runtime/proxy de Apps Script lo expone)
  const fromHeader = readHeaderCaseInsensitive_(e, apiKeyHeader);
  if (fromHeader) return fromHeader.trim();

  // Fallbacks MVP:
  // 1) query param ?api_key=...
  const fromQuery = e && e.parameter ? stringOrEmpty_(e.parameter.api_key) : "";
  if (fromQuery) return fromQuery.trim();

  // 2) body.api_key
  const fromBody = stringOrEmpty_(body.api_key);
  if (fromBody) return fromBody.trim();

  return "";
}

function readHeaderCaseInsensitive_(e, wantedName) {
  if (!e || !e.headers) return "";
  const headers = e.headers;
  const key = Object.keys(headers).find(
    (k) => String(k).toLowerCase() === String(wantedName).toLowerCase()
  );
  return key ? String(headers[key]) : "";
}

function getOrCreateSheet_(props) {
  const sheetId = stringOrEmpty_(props.getProperty("EXPENSE_SHEET_ID"));
  const sheetName = stringOrEmpty_(props.getProperty("EXPENSE_SHEET_NAME")) || DEFAULT_SHEET_NAME;

  const ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function ensureHeader_(sheet) {
  const lastCol = HEADER_ROW.length;
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const hasHeader = HEADER_ROW.every((h, i) => String(current[i] || "").trim() === h);
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, lastCol).setValues([HEADER_ROW]);
  }
}

function isDuplicateOperation_(sheet, operationId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const finder = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(operationId)
    .matchEntireCell(true);
  return !!finder.findNext();
}

function normalizeFecha_(value) {
  const raw = stringOrEmpty_(value);
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toISOString();
}

function pickFirstDefined_() {
  for (let i = 0; i < arguments.length; i += 1) {
    if (arguments[i] !== undefined && arguments[i] !== null) return arguments[i];
  }
  return undefined;
}

function stringOrEmpty_(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
