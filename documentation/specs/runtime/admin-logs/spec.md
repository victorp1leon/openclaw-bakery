# Admin Logs - Spec

> **Domain:** `runtime`
> **Feature Slug:** `admin-logs`
> **Status:** `Verified`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`
> **Legacy Sources:** `N/A`

## Objective
Exponer una capacidad admin read-only (`admin.logs`) para consultar trazas operativas persistidas en SQLite (`operations`) por `chat_id` y/o `operation_id`, con redaccion de datos sensibles y referencia de soporte (`trace_ref`).

## Inputs / Outputs
- Inputs:
  - Mensajes admin de logs/trazas (ej. `admin logs`, `logs chat_id chat-1`, `logs operation_id op-123`).
  - Filtros opcionales: `chat_id`, `operation_id`, `limit`.
- Outputs:
  - Lista resumida de entradas (`operation_id`, `chat_id`, `intent`, `status`, `updated_at`, `payload_preview` sanitizado).
  - Metadatos de filtros aplicados y `trace_ref` visible.

## Business Rules
1. `admin.logs` es read-only; no requiere confirm flow ni mutaciones.
2. Si no se especifica filtro, usar `chat_id` actual como default para evitar consultas amplias por accidente.
3. Permitir filtros por `chat_id` y/o `operation_id`; limitar resultados por `limit` acotado.
4. `payload_preview` debe estar redaccionado (sin `token|secret|apiKey|password|authorization` ni patrones equivalentes).
5. La respuesta debe incluir `Ref` (`trace_ref`) en exito/no-match y en error controlado.

## Error Behavior
- Si falla la consulta de trazas, responder error controlado con `Ref/trace_ref`.
- Si el usuario no esta autorizado, aplicar flujo existente de rechazo allowlist.
- Si OpenClaw read-only no clasifica el intent, mantener fallback deterministico por frases admin de logs.

## Test Cases
1. Consulta con filtros explicitos (`operation_id`, `limit`) retorna trazas y `trace_ref`.
2. Consulta sin filtros explicitos usa `chat_id` actual como default.
3. `payload_preview` no expone secretos ni tokens.
4. Error de ejecucion retorna mensaje controlado con `Ref`.

## Implementation Notes (v1)
- Tool dedicado en `src/tools/admin/adminLogs.ts` sobre tabla SQLite `operations`.
- Intent read-only agregado en `src/skills/readOnlyIntentRouter.ts` como `admin.logs`.
- Wiring runtime + formatter en `src/runtime/conversationProcessor.ts`.
- Smoke dedicado en `scripts/smoke/admin-logs-smoke.ts`.
