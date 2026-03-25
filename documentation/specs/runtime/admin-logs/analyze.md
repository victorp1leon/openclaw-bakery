# Admin Logs - Analyze

> **Domain:** `runtime`
> **Feature Slug:** `admin-logs`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`
> **Legacy Sources:** `N/A`

## Context
Fase 6 requiere consultas operativas admin por trazas (`chat_id|operation_id`) sin fuga de secretos. El runtime ya persiste operaciones en SQLite (`operations`), por lo que `admin.logs` v1 puede construirse de forma read-only sobre esta fuente.

## Risks
1. **Information disclosure**: exponer `payload_json` sensible en canal.
2. **Query overreach**: consultas demasiado amplias sin filtro/limite.
3. **Intent collision**: mezclar `admin.logs` con consultas de negocio (`order.status`, `order.lookup`).

## Mitigations
- Sanitizar `payload_preview` por clave y por patrones de texto sensible.
- Aplicar limite acotado y default seguro por `chat_id` actual cuando no hay filtro.
- Mantener routing explicito read-only (`admin.logs`) + fallback deterministico con contexto admin/logs.
- Incluir `trace_ref` en exito/no-match/fallo para soporte.

## Validation Strategy
- Unit: `src/tools/admin/adminLogs.test.ts`
- Router: `src/skills/readOnlyIntentRouter.test.ts`
- Runtime: `src/runtime/conversationProcessor.test.ts`
- Smoke: `scripts/smoke/admin-logs-smoke.ts`
- Hardening:
  - `npm run check:intent-skills`
  - `npm run security:scan`
