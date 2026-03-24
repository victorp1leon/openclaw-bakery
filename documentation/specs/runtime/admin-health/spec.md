# Admin Health - Spec

> **Domain:** `runtime`
> **Feature Slug:** `admin-health`
> **Status:** `Verified`
> **Created:** `2026-03-23`
> **Last Updated:** `2026-03-23`
> **Legacy Sources:** `N/A`

## Objective
Exponer una capacidad admin read-only (`admin.health`) para consultar estado operativo del bot (runtime + dependencias criticas) de forma segura, trazable y sin fuga de secretos.

## Inputs / Outputs
- Inputs:
  - Mensajes admin equivalentes a salud/estado (ej. "estado del bot", "admin health", "salud del sistema").
  - Contexto de ejecucion del runtime y cheques de `healthcheck`.
- Outputs:
  - Respuesta resumida con estado (`ok|degraded|error`) y señales operativas relevantes.
  - `trace_ref` visible en respuesta para soporte.

## Business Rules
1. `admin.health` es read-only; no requiere confirm flow ni mutaciones.
2. Debe respetar guardrails de seguridad/allowlist vigentes.
3. El payload de salida debe estar sanitizado (sin secretos/tokens/keys).
4. En estado no saludable, la respuesta debe indicar componente afectado y accion sugerida de runbook.
5. Debe mantener formato consistente con otras respuestas admin/read-only.

## Error Behavior
- Si falla la recoleccion de estado, responder fallo controlado con `Ref/trace_ref`.
- Si la solicitud no pertenece a usuario permitido, aplicar flujo de rechazo existente (allowlist guard).
- Si el intent admin es ambiguo, pedir aclaracion minima sin ejecutar acciones.

## Test Cases
1. Solicitud valida admin retorna estado `ok` con campos esperados y `trace_ref`.
2. Falla simulada en chequeo de salud retorna respuesta controlada con `Ref`.
3. Usuario no autorizado no obtiene detalles operativos.
4. Salida no contiene secretos (sanitizacion efectiva).

## Implementation Notes (v1)
- Intent read-only agregado en `src/skills/readOnlyIntentRouter.ts` como `admin.health`.
- Fallback deterministico agregado en `src/runtime/conversationProcessor.ts` para mensajes como `estado del bot`/`salud del sistema`.
- Tool dedicado agregado en `src/tools/admin/adminHealth.ts` reusando `runHealthcheck`.
- Reply runtime incluye estado resumido, checks sanitizados y `Ref` (`trace_ref`).
