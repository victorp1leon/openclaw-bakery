---
name: admin.allowlist
description: Use when admin needs to query or manage authorized chat IDs with strict confirmation flow and guardrails.
---

# skill: admin.allowlist

## Overview
Gestiona la allowlist de `chat_id` autorizados para el bot. Soporta consulta (`view`) y mutaciones (`add`/`remove`) con confirmacion obligatoria.

## When To Use
- El admin pide ver o cambiar chats autorizados.
- Ejemplos: `admin allowlist`, `admin allowlist add <chat_id>`, `admin allowlist remove <chat_id>`.
- Se requiere control de acceso operativo en tiempo de ejecucion.

## When Not To Use
- Consultas de salud/config/logs.
- Mutaciones de negocio (pedido/pago/inventario/web).
- Cambios persistentes de `.env` (esta version no persiste automaticamente).

## Input Contract
- `operation`: `view | add | remove`
- `target_chat_id` requerido para `add/remove`.
- `chat_id` solicitante siempre requerido.

## Output Contract
- Respuesta con:
  - operacion ejecutada y si hubo cambio (`changed`)
  - total y preview de allowlist actual
  - nota de persistencia temporal
  - `Ref: <trace_ref>`

## Workflow
1. Detectar comando admin allowlist.
2. Para `view`: ejecutar directo (read-only).
3. Para `add/remove`: construir resumen y exigir `confirmar/cancelar`.
4. Ejecutar mutacion con guardrails.
5. Responder resultado + `Ref`.

## Safety Constraints
- No permitir remover el propio `chat_id` del solicitante (evitar lockout accidental).
- No permitir dejar allowlist vacia.
- Mantener salida trazable sin exponer secretos.
- Tratar cambios como temporales (en memoria runtime) hasta persistencia explicita en otra fase.

## Common Mistakes
- Ejecutar mutaciones sin confirmacion.
- Asumir persistencia en `.env` automaticamente.
- Permitir self-remove o vaciar allowlist.
