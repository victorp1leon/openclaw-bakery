# Admin Allowlist - Analyze

> **Domain:** `runtime`
> **Feature Slug:** `admin-allowlist`
> **Status:** `Complete`
> **Created:** `2026-03-25`
> **Last Updated:** `2026-03-25`
> **Legacy Sources:** `N/A`

## Context
Fase 6 quedaba incompleta con `admin.allowlist` pendiente. Esta capability habilita gestion operativa de acceso por `chat_id` con controles estrictos para evitar lockout admin.

## Risks
1. **Auto-bloqueo admin**: remover el `chat_id` actual podria dejar al operador fuera del bot.
2. **Mutacion sin confirmacion**: cambios de allowlist sin `confirmar` elevan riesgo operativo.
3. **Ambiguedad de `chat_id` objetivo**: comandos incompletos (`add/remove` sin target) pueden mutar mal.
4. **Drift de trazabilidad**: errores sin `Ref` dificultan soporte.

## Mitigations
- Guardrail explicito: bloquear `self-remove`.
- Guardrail de tamaño minimo: impedir reducir allowlist por debajo del minimo configurado.
- Confirm flow obligatorio para `add/remove`; `view` permanece read-only.
- Prompt de faltante cuando falta `chat_id` objetivo.
- Respuesta estandar con `trace_ref`/`Ref` en exito y fallo controlado.

## Validation Strategy
- Unit tool: `src/tools/admin/adminAllowlist.test.ts`.
- Runtime tests: `src/runtime/conversationProcessor.test.ts`.
- Smoke dedicado: `scripts/smoke/admin-allowlist-smoke.ts`.
- Gates: `npm run check:intent-skills`, `npm run security:scan`.
