# Admin Config View - Analyze

> **Domain:** `runtime`
> **Feature Slug:** `admin-config-view`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Context
`admin.health` ya entrega estado operativo. Falta `admin.config.view` para diagnostico de configuracion activa en runtime sin riesgo de fuga de credenciales.

## Risks
1. **Information disclosure**: filtrar tokens/keys/IDs/rutas al canal.
2. **Intent collision**: colision entre `admin.health` y `admin.config.view` en frases ambiguas.
3. **Drift de contratos**: runtime/skills cambian sin actualizar contratos canonicos.

## Mitigations
- Exponer solo booleans/counts/flags y limites numericos (no valores sensibles crudos).
- Cobertura de tests negativos con serializacion completa para detectar fugas.
- Mantener intent explicito en router read-only (`admin.config.view`) + fallback deterministico con contexto admin.
- Actualizar contratos de `read-only-intent-router` y `conversation-processor`.

## Validation Strategy
- Unit: `src/tools/admin/adminConfigView.test.ts`
- Router: `src/skills/readOnlyIntentRouter.test.ts`
- Runtime: `src/runtime/conversationProcessor.test.ts`
- Smoke: `scripts/smoke/admin-config-view-smoke.ts`
- Security scan: `npm run security:scan`
