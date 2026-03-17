export const BOT_PERSONAS = ["neutral", "bakery_warm", "concise"] as const;
export type BotPersona = (typeof BOT_PERSONAS)[number];

type MessageBuilder = {
  askFor: (field: string) => string;
  summary: (intent: string, payload: Record<string, unknown>, operationId: string) => string;
  unauthorized: () => string;
  rateLimited: (retryAfterSeconds: number) => string;
  expenseFailed: (operationId: string) => string;
  orderFailed: (operationId: string) => string;
  webFailed: (operationId: string) => string;
  executed: (operationId: string, dryRun: boolean) => string;
  executedSimulated: (operationId: string) => string;
  canceled: (operationId: string) => string;
  pendingOperation: (operationId: string) => string;
  help: () => string;
  unknown: () => string;
  webDisabled: () => string;
  inventoryConsumeDisabled: () => string;
  inventoryConsumeReplay: (orderRef: string, operationId: string) => string;
  parseError: (error: string) => string;
  duplicate: (operationId: string, status: string) => string;
};

const FIELD_PROMPTS: Record<string, string> = {
  monto: "¿Cuál es el monto? (ej. 380)",
  concepto: "¿Cuál es el concepto? (ej. harina y azúcar)",
  nombre_cliente: "¿Nombre del cliente?",
  order_lookup_query: "¿Me podrías pasar el folio, nombre del cliente o producto para buscar el pedido?",
  shopping_list_query: "¿Para qué pedido(s) quieres la lista de insumos? Puedes compartir folio, nombre del cliente, producto o periodo.",
  schedule_day_query: "¿Para qué día quieres la agenda? Puedes decir hoy, mañana o una fecha (ej. 2026-03-20).",
  order_reference: "¿Me podrías pasar el folio del pedido? (también puede ser operation_id)",
  payment_estado_pago: "¿Cuál es el estado de pago? (pagado | pendiente | parcial)",
  producto: "¿Qué producto es?",
  cantidad: "¿Cantidad?",
  tipo_envio: "¿Tipo de envío? (envio_domicilio | recoger_en_tienda). También puedes escribir: envío a domicilio / recoger en tienda.",
  fecha_hora_entrega: "¿Fecha/hora de entrega? (ej. 2026-02-20 14:00)",
  direccion: "¿Dirección de entrega?",
  "content.businessName": "¿Cuál es el nombre del negocio para el sitio?",
  "content.whatsapp": "¿Cuál es el WhatsApp del negocio? (ej. +5215512345678)",
  "content.catalogItemsJson":
    "Comparte un JSON de catálogo (array) con al menos un item: [{\"id\":\"item-1\",\"nombre\":\"Cupcake\",\"precio\":45,\"imageUrl\":\"https://...\",\"imageSource\":\"manual\"}]"
};

function neutralMessages(): MessageBuilder {
  return {
    askFor: (field) => FIELD_PROMPTS[field] ?? `Falta: ${field}. ¿Cuál es el valor?`,
    summary: (intent, payload, operationId) =>
      `Resumen:\n${JSON.stringify({ intent, operation_id: operationId, ...payload }, null, 2)}\n\nEscribe: confirmar | cancelar`,
    unauthorized: () => "No autorizado para usar este bot.",
    rateLimited: (retryAfterSeconds) => `Demasiados mensajes en poco tiempo. Intenta de nuevo en ${retryAfterSeconds}s.`,
    expenseFailed: (operationId) =>
      `No se pudo ejecutar el gasto. operation_id: ${operationId}. Responde confirmar para reintentar o cancelar.`,
    orderFailed: (operationId) =>
      `No se pudo ejecutar el pedido. operation_id: ${operationId}. Responde confirmar para reintentar o cancelar.`,
    webFailed: (operationId) =>
      `No se pudo ejecutar la publicación web. operation_id: ${operationId}. Responde confirmar para reintentar o cancelar.`,
    executed: (operationId, dryRun) => `Ejecutado${dryRun ? " (dry-run)" : ""}. operation_id: ${operationId}`,
    executedSimulated: (operationId) => `Ejecutado (simulado). operation_id: ${operationId}`,
    canceled: (operationId) => `Cancelado. operation_id: ${operationId}`,
    pendingOperation: (operationId) =>
      `Hay una operación pendiente (${operationId}). Responde confirmar o cancelar antes de iniciar otra.`,
    help: () =>
      [
        "Guía rápida:",
        "- Crear pedido: pedido Victor 12 cupcakes red velvet para mañana 2pm recoger en tienda pagado total 480",
        "- Consultar pedido: consulta pedido folio op-xyz-123",
        "- Actualizar pedido: actualiza pedido folio op-xyz-123, cambia fecha de entrega a 2026-03-12 17:00",
        "- Cancelar pedido: cancela pedido folio op-xyz-123 motivo cliente cancelo",
        "- Registrar pago: registra pago del pedido folio op-xyz-123 en parcial, abono 350 por transferencia, nota anticipo",
        "- Consumir inventario: consume inventario del pedido folio op-xyz-123",
        "- Reporte diario: que pedidos tengo hoy",
        "- Agenda diaria: dame la agenda de hoy",
        "- Lista de insumos: dame lista de insumos para hoy",
        "- Gasto: gasto 380 harina y azúcar en Costco",
        "Notas:",
        "- Si falta información te la voy pidiendo (folio, estado de pago, producto, etc.)",
        "- Para tipo de envío puedes escribir: envío a domicilio o recoger en tienda",
        "- Después del resumen responde: confirmar | cancelar"
      ].join("\n"),
    unknown: () => "No entendí. Escribe 'ayuda' para ejemplos.",
    webDisabled: () =>
      "La operación web por chat está deshabilitada. Usa publicación content-driven por terminal/CI (`npm run web:publish`).",
    inventoryConsumeDisabled: () =>
      "La operación inventory.consume está deshabilitada. Activa INVENTORY_CONSUME_ENABLE=1 para usarla.",
    inventoryConsumeReplay: (orderRef, operationId) => `Consumo ya aplicado para ${orderRef}. operation_id: ${operationId}`,
    parseError: (error) => `Error parse: ${error}`,
    duplicate: (operationId, status) => `Operación duplicada detectada. operation_id: ${operationId}, status: ${status}`
  };
}

function bakeryWarmMessages(): MessageBuilder {
  return {
    askFor: (field) => {
      const base = FIELD_PROMPTS[field] ?? `Falta: ${field}. ¿Cuál es el valor?`;
      return `Perfecto, para continuar: ${base}`;
    },
    summary: (intent, payload, operationId) =>
      `Resumen listo:\n${JSON.stringify({ intent, operation_id: operationId, ...payload }, null, 2)}\n\nPara continuar responde: confirmar | cancelar`,
    unauthorized: () => "Este chat no está autorizado para usar el bot.",
    rateLimited: (retryAfterSeconds) => `Vamos muy rápido. Intenta de nuevo en ${retryAfterSeconds}s.`,
    expenseFailed: (operationId) =>
      `No pude ejecutar el gasto. operation_id: ${operationId}. Puedes reintentar con confirmar o cancelar.`,
    orderFailed: (operationId) =>
      `No pude ejecutar el pedido. operation_id: ${operationId}. Puedes reintentar con confirmar o cancelar.`,
    webFailed: (operationId) =>
      `No pude ejecutar la publicación web. operation_id: ${operationId}. Puedes reintentar con confirmar o cancelar.`,
    executed: (operationId, dryRun) => `Listo${dryRun ? " (dry-run)" : ""}. operation_id: ${operationId}`,
    executedSimulated: (operationId) => `Listo (simulado). operation_id: ${operationId}`,
    canceled: (operationId) => `Operación cancelada. operation_id: ${operationId}`,
    pendingOperation: (operationId) =>
      `Tienes una operación pendiente (${operationId}). Primero responde confirmar o cancelar.`,
    help: () =>
      [
        "Guía rápida:",
        "- Crear pedido: pedido Victor 12 cupcakes red velvet para mañana 2pm recoger en tienda pagado total 480",
        "- Consultar pedido: consulta pedido folio op-xyz-123",
        "- Actualizar pedido: actualiza pedido folio op-xyz-123, cambia fecha de entrega a 2026-03-12 17:00",
        "- Cancelar pedido: cancela pedido folio op-xyz-123 motivo cliente cancelo",
        "- Registrar pago: registra pago del pedido folio op-xyz-123 en parcial, abono 350 por transferencia, nota anticipo",
        "- Consumir inventario: consume inventario del pedido folio op-xyz-123",
        "- Reporte diario: que pedidos tengo hoy",
        "- Agenda diaria: dame la agenda de hoy",
        "- Lista de insumos: dame lista de insumos para hoy",
        "- Gasto: gasto 380 harina y azúcar en Costco",
        "Tips:",
        "- Si falta información te voy preguntando lo necesario",
        "- Para tipo de envío puedes escribir: envío a domicilio o recoger en tienda",
        "- Cuando veas el resumen responde: confirmar | cancelar"
      ].join("\n"),
    unknown: () => "No te entendí. Escribe 'ayuda' y te muestro ejemplos.",
    webDisabled: () =>
      "La operación web por chat está deshabilitada. Usa publicación content-driven por terminal/CI (`npm run web:publish`).",
    inventoryConsumeDisabled: () =>
      "La operación inventory.consume está deshabilitada. Activa INVENTORY_CONSUME_ENABLE=1 para usarla.",
    inventoryConsumeReplay: (orderRef, operationId) => `Consumo ya aplicado para ${orderRef}. operation_id: ${operationId}`,
    parseError: (error) => `No pude interpretar el mensaje. Detalle: ${error}`,
    duplicate: (operationId, status) => `Ya existe una operación similar. operation_id: ${operationId}, status: ${status}`
  };
}

function conciseMessages(): MessageBuilder {
  return {
    askFor: (field) => FIELD_PROMPTS[field] ?? `Falta ${field}.`,
    summary: (intent, payload, operationId) =>
      `Resumen:\n${JSON.stringify({ intent, operation_id: operationId, ...payload }, null, 2)}\n\nconfirmar | cancelar`,
    unauthorized: () => "Chat no autorizado.",
    rateLimited: (retryAfterSeconds) => `Rate limit activo. Reintenta en ${retryAfterSeconds}s.`,
    expenseFailed: (operationId) => `Error al ejecutar gasto. operation_id: ${operationId}. confirmar | cancelar`,
    orderFailed: (operationId) => `Error al ejecutar pedido. operation_id: ${operationId}. confirmar | cancelar`,
    webFailed: (operationId) => `Error al ejecutar publicación web. operation_id: ${operationId}. confirmar | cancelar`,
    executed: (operationId, dryRun) => `Hecho${dryRun ? " (dry-run)" : ""}. operation_id: ${operationId}`,
    executedSimulated: (operationId) => `Hecho (simulado). operation_id: ${operationId}`,
    canceled: (operationId) => `Cancelado. operation_id: ${operationId}`,
    pendingOperation: (operationId) => `Hay una operación pendiente (${operationId}). confirmar | cancelar`,
    help: () =>
      [
        "Ayuda:",
        "- Crear pedido: pedido Victor 12 cupcakes red velvet para mañana 2pm recoger en tienda pagado total 480",
        "- Consultar pedido: consulta pedido folio op-xyz-123",
        "- Cancelar pedido: cancela pedido folio op-xyz-123 motivo cliente cancelo",
        "- Actualizar pedido: actualiza pedido folio op-xyz-123, cambia estado de pago a pagado",
        "- Registrar pago: registra pago del pedido folio op-xyz-123 en pagado",
        "- Consumir inventario: consume inventario del pedido folio op-xyz-123",
        "- Reporte diario: que pedidos tengo hoy",
        "- Agenda diaria: dame la agenda de hoy",
        "- Lista de insumos: dame lista de insumos para hoy",
        "- Gasto: gasto 380 harina y azúcar en Costco",
        "- Si falta información te la pido",
        "- Responde confirmar | cancelar después del resumen"
      ].join("\n"),
    unknown: () => "No entendí. Escribe 'ayuda'.",
    webDisabled: () => "Web por chat deshabilitado. Usa `npm run web:publish`.",
    inventoryConsumeDisabled: () => "inventory.consume deshabilitado. Activa INVENTORY_CONSUME_ENABLE=1.",
    inventoryConsumeReplay: (orderRef, operationId) => `Consumo ya aplicado para ${orderRef}. operation_id: ${operationId}`,
    parseError: (error) => `Error parse: ${error}`,
    duplicate: (operationId, status) => `Duplicada. operation_id: ${operationId}, status: ${status}`
  };
}

export function parseBotPersona(raw: string | undefined): BotPersona {
  const value = raw?.trim().toLowerCase();
  if (value === "bakery_warm" || value === "concise" || value === "neutral") {
    return value;
  }
  return "neutral";
}

export function createBotCopy(persona: BotPersona = "neutral"): MessageBuilder {
  if (persona === "bakery_warm") return bakeryWarmMessages();
  if (persona === "concise") return conciseMessages();
  return neutralMessages();
}
