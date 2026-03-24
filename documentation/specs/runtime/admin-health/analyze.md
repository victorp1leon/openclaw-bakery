# Admin Health - Analysis

> **Domain:** `runtime`
> **Feature Slug:** `admin-health`
> **Status:** `Complete`
> **Created:** `2026-03-23`
> **Last Updated:** `2026-03-23`
> **Legacy Sources:** `N/A`

## Risks
- Risk: Exponer informacion sensible en respuestas admin.
- Mitigation: contrato de salida sanitizado + tests negativos de secretos.

- Risk: Colision de enrutado con intents existentes de consulta.
- Mitigation: patrones de deteccion admin explicitos + pruebas de no-interferencia.

- Risk: Drift entre `admin.health` y `healthcheck` real.
- Mitigation: reutilizar `src/health/healthcheck.ts` como fuente unica.

## Trade-offs
| Option | Pros | Cons | Decision |
|---|---|---|---|
| Reusar `healthcheck.ts` | Consistencia y menor mantenimiento | Menor flexibilidad de formato inicial | Chosen |
| Duplicar chequeos en skill admin | Formato custom inmediato | Alto riesgo de drift y deuda tecnica | Rejected |
| Exponer detalle profundo por defecto | Mayor visibilidad operativa | Mayor riesgo de fuga de datos | Deferred |

## Residual Risk
- La sanitizacion v1 es por patrones; si se agregan nuevos formatos de detalle sensible en `healthcheck`, se debe ampliar la cobertura de test negativa.
- La deteccion deterministica `admin.health` puede requerir afinacion semantica con nuevos intents admin para evitar colisiones futuras.
