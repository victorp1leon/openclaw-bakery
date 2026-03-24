# Code Review Graph Integration - Implementation Plan

> **Domain:** `platform`
> **Feature Slug:** `code-review-graph-integration`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Scope
### In Scope
- Diseñar contrato del adapter para operaciones CRG (`build_or_update_graph`, `get_impact_radius`, `get_review_context`).
- Implementar validaciones de seguridad previas a ejecucion externa (allowlist, path safety, timeout, redaction).
- Conectar adapter al runtime bajo feature flag.
- Agregar pruebas unitarias del adapter y pruebas de routing basicas.
- Documentar operacion segura local (sin acceso a secretos reales).

### Out of Scope
- Embeder `code-review-graph` dentro del repositorio OpenClaw.
- Ejecutar analisis sobre repos externos no allowlisted.
- Publicar servicio remoto CRG multi-tenant.

## Approach
| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Discover tecnico de puntos de extension en runtime/config/tools | Complete | Entry points mapeados en plan maestro de integracion |
| 2 | Formalizar contrato del adapter y reglas de seguridad | Complete | Definido en `spec.md`/`clarify.md`/`analyze.md` |
| 3 | Implementar `tool`/adapter CRG en OpenClaw | Complete | `src/tools/admin/codeReviewGraph.ts` + `scripts/admin/code-review-graph-adapter.py` |
| 4 | Wiring runtime con feature flag y respuesta segura | Complete | Integrado en `src/index.ts` y `src/runtime/conversationProcessor.ts` con comando admin `crg` |
| 5 | Pruebas unitarias + smoke seguro local | Complete | Unit tests en verde + smoke mock `npm run smoke:code-review-graph` |
| 6 | Documentar runbook y cerrar artefactos de colaboracion | Complete | Gate `npm run test:smoke-integration:summary` completado en mock (0 fallos) y artefactos sincronizados |

## Validation
- Commands:
  - `CI=1 npm test -- --run <tests_crg_adapter_y_runtime>`
  - `npm run smoke:code-review-graph`
  - `npm run security:scan`
- Acceptance criteria:
  - Operaciones CRG solo corren sobre repos allowlisted.
  - No hay traversal ni exposicion de secretos en respuestas.
  - Fallos/timeout retornan errores controlados con `trace_ref`.
