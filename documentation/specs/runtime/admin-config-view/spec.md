# Admin Config View - Spec

> **Domain:** `runtime`
> **Feature Slug:** `admin-config-view`
> **Status:** `Verified`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Objective
Exponer una capacidad admin read-only (`admin.config.view`) para consultar configuracion operativa del bot en formato sanitizado, sin revelar secretos ni identificadores sensibles.

## Inputs / Outputs
- Inputs:
  - Mensajes admin de configuracion (ej. "configuracion del bot", "admin config", "ver settings del sistema").
  - Config runtime (`AppConfig`) + tamaño de allowlist.
- Outputs:
  - Snapshot de configuracion operativa sanitizada (flags, limites, estados configured/no-configured).
  - `trace_ref` visible en respuesta para soporte.

## Business Rules
1. `admin.config.view` es read-only; no requiere confirm flow ni mutaciones.
2. La salida no debe incluir valores de secretos (token/key), IDs sensibles (list ids, spreadsheet ids) ni rutas sensibles.
3. Debe mostrar indicadores operativos utiles (`enabled`, `dry_run`, limites, timeouts, configured booleans).
4. Debe funcionar tanto por routing read-only OpenClaw como por fallback deterministico.
5. Debe mantener formato admin consistente e incluir `Ref` (`trace_ref`) en exito/fallo controlado.

## Error Behavior
- Si falla la construccion del snapshot, responder error controlado con `Ref/trace_ref`.
- Si el usuario no esta autorizado, aplicar flujo existente de rechazo allowlist.
- Si el intent admin es ambiguo, pedir aclaracion minima sin ejecutar mutaciones.

## Test Cases
1. Solicitud valida retorna snapshot sanitizado con `trace_ref`.
2. Routing OpenClaw read-only enruta `admin.config.view` y ejecuta el tool correcto.
3. Fallback deterministico detecta frases de configuracion admin cuando OpenClaw read-only esta deshabilitado.
4. La serializacion del resultado no contiene tokens/keys/IDs sensibles.

## Implementation Notes (v1)
- Tool dedicado en `src/tools/admin/adminConfigView.ts`.
- Intent read-only agregado en `src/skills/readOnlyIntentRouter.ts` como `admin.config.view`.
- Wiring runtime + respuesta en `src/runtime/conversationProcessor.ts`.
- Smoke dedicado en `scripts/smoke/admin-config-view-smoke.ts`.
