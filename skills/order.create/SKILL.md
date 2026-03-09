---
name: order.create
description: Use when parsing a Spanish free-text bakery order request into structured JSON for local confirmation flow without external side effects.
---

# skill: order.create

## Overview
Captura un pedido desde lenguaje natural y produce JSON estructurado para validacion local. Esta skill no ejecuta APIs externas.

## When To Use
- El usuario quiere registrar un pedido nuevo.
- El mensaje llega en texto libre y requiere extraccion de campos.
- Se necesita mantener flujo de confirmacion (`confirmar` o `cancelar`) antes de ejecutar.

## When Not To Use
- Actualizar o cancelar un pedido existente.
- Ejecutar acciones externas directas (Sheets/Trello/API).
- Responder consultas analiticas o reportes.

## Input Contract
- Texto libre en espanol con intencion de pedido.
- Ejemplos:
  - `pedido 12 cupcakes red velvet manana 2pm recoger 480 pagado`
  - `pedido Ana 1 pastel chocolate entrega: 2026-02-21 17:00 envio: domicilio`

## Output Contract
Responder solo JSON valido con esta forma:

```json
{
  "intent": "pedido",
  "operation": {
    "operation_id": "uuid-v4",
    "idempotency_key": "sha256",
    "status": "needs_missing | pending_confirm | canceled | executed"
  },
  "payload": {
    "nombre_cliente": "Ana",
    "producto": "pastel chocolate",
    "cantidad": 1,
    "tipo_envio": "envio_domicilio",
    "fecha_hora_entrega": "2026-02-21 17:00",
    "direccion": "Calle 123",
    "telefono": "",
    "descripcion_producto": "",
    "sabor_pan": "chocolate",
    "sabor_relleno": "oreo",
    "estado_pago": "pendiente",
    "total": 480,
    "moneda": "MXN",
    "notas": ""
  },
  "missing": ["direccion"],
  "asked": "direccion",
  "reply": "Direccion de entrega?"
}
```

## Workflow
1. Detectar intencion `pedido`.
2. Extraer campos del payload y normalizar formato.
3. Validar faltantes:
   - Preguntar exactamente un campo por turno.
   - `direccion` es obligatoria cuando `tipo_envio = envio_domicilio`.
4. Cuando no haya faltantes, presentar resumen y pedir `confirmar` o `cancelar`.
5. Si el usuario responde:
   - `confirmar` -> mover estado a `executed` solo en runtime local/simulado.
   - `cancelar` -> mover estado a `canceled`.

## Required And Optional Fields
- Obligatorios: `nombre_cliente`, `producto`, `cantidad`, `tipo_envio`, `fecha_hora_entrega`.
- Condicional: `direccion` si `tipo_envio = envio_domicilio`.
- Opcionales: `telefono`, `descripcion_producto`, `sabor_pan`, `sabor_relleno`, `estado_pago`, `total`, `moneda`, `notas`.

## Safety Constraints
- Nunca ejecutar acciones externas directamente.
- Mantener salida estrictamente en JSON valido.
- No preguntar mas de un faltante por turno.

## Common Mistakes
- Devolver texto libre junto con el JSON.
- Marcar `executed` sin confirmacion explicita.
- Omitir `direccion` cuando hay envio a domicilio.
