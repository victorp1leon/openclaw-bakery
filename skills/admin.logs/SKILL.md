---
name: admin.logs
description: Use when admin asks to inspect runtime operation traces by chat_id or operation_id in read-only mode with sanitized payload preview and trace reference.
---

# skill: admin.logs

## Overview
Consulta trazas operativas (`operations`) en modo read-only con filtros por `chat_id` y/o `operation_id`, salida resumida y redaccion de payload sensible.

## When To Use
- El admin pide logs/trazas/bitacora del bot o runtime.
- Ejemplos: `admin logs`, `logs chat_id chat-1`, `logs operation_id op-123`.
- Se requiere diagnostico operativo sin mutaciones.

## When Not To Use
- Cambios de configuracion o allowlist.
- Healthcheck (`admin.health`) o snapshot de config (`admin.config.view`).
- Mutaciones de negocio (pedido/pago/inventario/web).

## Input Contract
- Texto libre con intencion admin de logs.
- Filtros opcionales:
  - `chat_id`
  - `operation_id`
  - `limit` (`top N` / `ultimos N`)
- Si no hay filtro explicito, runtime usa `chat_id` actual por defecto.

## Output Contract
- Respuesta textual con:
  - encabezado de filtros aplicados
  - lista de entradas (`operation_id`, `chat_id`, `intent`, `status`, timestamp, `payload_preview`)
  - `Generado: <timestamp>`
  - `Ref: <trace_ref>`
- En no-match: mensaje controlado + `Ref`.

## Workflow
1. Detectar intent `admin.logs` por routing OpenClaw o fallback deterministico.
2. Resolver filtros seguros (defaults y limites acotados).
3. Consultar `operations` en SQLite en modo read-only.
4. Sanitizar payload preview (sin secretos/tokens/keys).
5. Responder formato admin consistente con `Ref`.

## Safety Constraints
- Nunca ejecutar mutaciones.
- No exponer `payload_json` crudo ni secretos.
- No incluir stack traces en respuesta al chat.

## Common Mistakes
- Ejecutar consultas amplias sin limite.
- Mostrar payload sensible sin redaccion.
- Omitir `Ref` en exito/fallo.
