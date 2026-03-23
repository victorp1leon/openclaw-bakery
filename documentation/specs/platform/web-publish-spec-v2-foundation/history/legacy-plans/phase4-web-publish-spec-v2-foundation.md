# Phase 4 - Web Publish Spec v2 Foundation

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-04`
> **Last Updated:** `2026-03-04`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Roadmap | `documentation/bot-bakery.roadmap.md` | Alcance de Fase 4 |
| DDD matrix | `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md` | Tracking de cobertura |
| publish-site spec | `documentation/specs/contracts/components/publish-site.spec.md` | Contrato v2 del adapter |

## Contexto
Con Fases 2 y 3 validadas live, el siguiente bloque critico es `web.publish`, que aun estaba en spec v1 stub. Antes de implementar conectores reales, se necesita contrato v2 verificable para auth, timeout/retries, idempotencia y errores controlados.

## Alcance
### In Scope
- Crear plan formal para arranque de Fase 4.
- Actualizar `publish-site.spec.md` de stub v1 a contrato v2 connector-ready.
- Reflejar avance de diseno en matriz DDD.
- Registrar handoff de la sesion.

### Out of Scope
- Implementacion real de `src/tools/web/publishSite.ts`.
- Nuevas variables de entorno y wiring runtime para deploy real.
- Tests de adapter `web.publish`.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Revisar baseline actual de `publish-site` (spec + código) | Completed | Baseline: stub v1 |
| 2 | Definir contrato v2 connector-ready | Completed | Auth/live gating + timeout/retries + idempotencia |
| 3 | Actualizar tracking y artefactos de colaboracion | Completed | DDD + index + handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `dry-run` por default en `web.publish` | Seguridad por defecto hasta cerrar credenciales y entorno de deploy | 2026-03-04 |
| Exigir auth/config en live mode para publicar | Evitar despliegues no autorizados o accidentales | 2026-03-04 |
| Definir `operation_id` como referencia canonical de idempotencia | Soporta retries/replays deterministas en publish | 2026-03-04 |

## Validation
- Validacion documental: coherencia entre roadmap, DDD y spec v2.
- No se ejecutaron tests (iteracion de diseno sin cambios runtime).

## Outcome
Fase 4 queda lista para implementar en codigo con contrato v2 claro y trazable. El siguiente bloque es adapter real + tests + smoke controlado de `web.publish`.
