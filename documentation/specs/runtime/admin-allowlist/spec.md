# Admin Allowlist - Spec

> **Domain:** `runtime`
> **Feature Slug:** `admin-allowlist`
> **Status:** `Verified`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`
> **Legacy Sources:** `N/A`

## Objective
Entregar `admin.allowlist` como capability admin para consultar y gestionar `chat_id` autorizados con guardrails estrictos, trazabilidad operativa y confirm flow en mutaciones.

## Inputs / Outputs
- Inputs:
  - Mensajes admin de allowlist (`admin allowlist`, `admin allowlist add <chat_id>`, `admin allowlist remove <chat_id>`).
  - Contexto de `chat_id` solicitante.
  - Allowlist en memoria runtime.
- Outputs:
  - Respuesta de consulta o mutacion (`view|add|remove`) con total y lista acotada de `chat_id`.
  - `trace_ref` visible en exito/no-op.
  - Mensajes controlados con `Ref` para guardrails y fallos.

## Business Rules
1. `admin.allowlist view` es consulta read-only y no requiere confirm flow.
2. `admin.allowlist add/remove` siempre requiere `confirmar|cancelar`.
3. `add/remove` exige `target_chat_id`; si falta, runtime debe pedir `admin_allowlist_target_chat_id` y continuar.
4. `remove` debe bloquear `self-remove` del `chat_id` actual.
5. `remove` debe bloquear reduccion por debajo de `min_allowlist_size`.
6. Respuesta admin debe incluir `Ref` (`trace_ref`) en exito/no-op/fallo controlado.
7. Persistencia `v1`: temporal en memoria runtime (`persistent=false`), sin mutar `.env` automaticamente.

## Error Behavior
- `admin_allowlist_target_missing`: pedir `chat_id` objetivo en pending flow.
- `admin_allowlist_self_remove_blocked`: responder rechazo controlado con `Ref`.
- `admin_allowlist_min_size_violation`: responder rechazo controlado con `Ref`.
- `admin_allowlist_execution_failed`: responder fallo generico controlado con `Ref`.

## Test Cases
1. Consulta `view` devuelve lista actual + `trace_ref`.
2. `add` y `remove` pasan por resumen + confirm flow.
3. `remove self` se bloquea con mensaje controlado y `Ref`.
4. Si falta `target_chat_id`, runtime pregunta faltante y reanuda.
5. Error del tool devuelve mensaje controlado con `Ref`.

## Implementation Notes (v1)
- Tool dedicado: `src/tools/admin/adminAllowlist.ts`.
- Wiring runtime: `src/runtime/conversationProcessor.ts`, `src/state/stateStore.ts`, `src/runtime/persona.ts`, `src/index.ts`.
- Smoke dedicado: `scripts/smoke/admin-allowlist-smoke.ts`.
- Skill coverage gate: `skills/admin.allowlist/SKILL.md`.
