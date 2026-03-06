/**
 * OpenClaw Bakery - Order Webhook (Apps Script)
 * Script Properties requeridas:
 * - ORDER_SHEETS_API_KEY            (obligatorio)
 * - ORDER_SHEETS_API_KEY_HEADER     (opcional, default: x-api-key)
 * - ORDER_SHEET_ID                  (opcional, si no usa Spreadsheet activo)
 * - ORDER_SHEET_NAME                (opcional, default: Orders)
 */

const ORDER_DEFAULT_SHEET_NAME = "Orders";
const ORDER_DEFAULT_API_KEY_HEADER = "x-api-key";
const ORDER_HEADER_ROW = [
  "fecha_registro",
  "folio",
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
  "notas",
  "chat_id",
  "operation_id",
  "created_at"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const props = PropertiesService.getScriptProperties();
    const expectedApiKey = (props.getProperty("ORDER_SHEETS_API_KEY") || "").trim();
    const apiKeyHeader = (props.getProperty("ORDER_SHEETS_API_KEY_HEADER") || ORDER_DEFAULT_API_KEY_HEADER).trim();

    if (!expectedApiKey) {
      throw new Error("order_server_misconfigured_api_key");
    }

    const body = parseJsonBody_(e);
    const providedApiKey = extractApiKey_(e, body, apiKeyHeader);

    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      throw new Error("order_unauthorized");
    }

    if ((body.intent || "").trim() !== "pedido") {
      throw new Error("order_invalid_intent");
    }

    const operationId = stringOrEmpty_(body.operation_id);
    const chatId = stringOrEmpty_(body.chat_id);
    const order = body.order || {};
    const rowObj = body.row || {};

    const fechaRegistro = normalizeDateTime_(pickFirstDefined_(rowObj.fecha_registro), new Date().toISOString());
    const folio = stringOrEmpty_(pickFirstDefined_(rowObj.folio, operationId)) || operationId;
    const fechaHoraEntrega = normalizeDateTime_(pickFirstDefined_(rowObj.fecha_hora_entrega, order.fecha_hora_entrega), "");
    const nombreCliente = stringOrEmpty_(pickFirstDefined_(rowObj.nombre_cliente, order.nombre_cliente));
    const telefono = stringOrEmpty_(pickFirstDefined_(rowObj.telefono, order.telefono));
    const producto = stringOrEmpty_(pickFirstDefined_(rowObj.producto, order.producto));
    const descripcionProducto = stringOrEmpty_(pickFirstDefined_(rowObj.descripcion_producto, order.descripcion_producto));
    const cantidad = Number(pickFirstDefined_(rowObj.cantidad, order.cantidad));
    const saborPan = stringOrEmpty_(pickFirstDefined_(rowObj.sabor_pan, order.sabor_pan));
    const saborRelleno = stringOrEmpty_(pickFirstDefined_(rowObj.sabor_relleno, order.sabor_relleno));
    const tipoEnvio = stringOrEmpty_(pickFirstDefined_(rowObj.tipo_envio, order.tipo_envio));
    const direccion = stringOrEmpty_(pickFirstDefined_(rowObj.direccion, order.direccion));
    const estadoPago = stringOrEmpty_(pickFirstDefined_(rowObj.estado_pago, order.estado_pago));
    const totalRaw = pickFirstDefined_(rowObj.total, order.total);
    const total = totalRaw === undefined || totalRaw === null || totalRaw === "" ? "" : Number(totalRaw);
    const moneda = stringOrEmpty_(pickFirstDefined_(rowObj.moneda, order.moneda)) || "MXN";
    const notas = stringOrEmpty_(pickFirstDefined_(rowObj.notas, order.notas));

    if (!operationId) throw new Error("order_operation_id_missing");
    if (!chatId) throw new Error("order_chat_id_missing");
    if (!nombreCliente) throw new Error("order_nombre_cliente_missing");
    if (!producto) throw new Error("order_producto_missing");
    if (!Number.isFinite(cantidad) || cantidad <= 0) throw new Error("order_cantidad_invalid");
    if (!tipoEnvio) throw new Error("order_tipo_envio_missing");
    if (!fechaHoraEntrega) throw new Error("order_fecha_hora_entrega_missing");
    if (tipoEnvio === "envio_domicilio" && !direccion) throw new Error("order_direccion_missing");
    if (total !== "" && (!Number.isFinite(total) || total < 0)) throw new Error("order_total_invalid");

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
      fechaRegistro,
      folio,
      fechaHoraEntrega,
      nombreCliente,
      telefono,
      producto,
      descripcionProducto,
      cantidad,
      saborPan,
      saborRelleno,
      tipoEnvio,
      direccion,
      estadoPago,
      total,
      moneda,
      notas,
      chatId,
      operationId,
      new Date().toISOString()
    ]);

    return jsonResponse_({
      ok: true,
      appended: true,
      duplicate: false,
      operation_id: operationId
    });
  } catch (err) {
    console.error("order_webhook_error", err);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function parseJsonBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("order_body_missing");
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (_err) {
    throw new Error("order_body_invalid_json");
  }
}

function extractApiKey_(e, body, apiKeyHeader) {
  const fromHeader = readHeaderCaseInsensitive_(e, apiKeyHeader);
  if (fromHeader) return fromHeader.trim();

  const fromQuery = e && e.parameter ? stringOrEmpty_(e.parameter.api_key) : "";
  if (fromQuery) return fromQuery.trim();

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
  const sheetId = stringOrEmpty_(props.getProperty("ORDER_SHEET_ID"));
  const sheetName = stringOrEmpty_(props.getProperty("ORDER_SHEET_NAME")) || ORDER_DEFAULT_SHEET_NAME;

  const ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function ensureHeader_(sheet) {
  const lastCol = ORDER_HEADER_ROW.length;
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const hasHeader = ORDER_HEADER_ROW.every((h, i) => String(current[i] || "").trim() === h);
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, lastCol).setValues([ORDER_HEADER_ROW]);
  }
}

function isDuplicateOperation_(sheet, operationId) {
  const opColIndex = ORDER_HEADER_ROW.indexOf("operation_id") + 1;
  if (opColIndex <= 0) return false;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const finder = sheet
    .getRange(2, opColIndex, lastRow - 1, 1)
    .createTextFinder(operationId)
    .matchEntireCell(true);
  return !!finder.findNext();
}

function normalizeDateTime_(value, fallback) {
  const raw = stringOrEmpty_(value);
  if (!raw) return fallback;
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
