# Code Review Graph Integration Spec-Driven v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Flujo canonico | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Secuencia obligatoria Discover -> Close |
| Mapa transversal | `documentation/ai_collaboration/system-map.md` | Ubicar puntos de integracion en runtime/tools/channel |
| Guardrails operativos | `AGENTS.md` | Aprobaciones `apruebo`, seguridad y trazabilidad |
| Instrucciones de implementacion | `documentation/ai_implementation/implementation-instructions.md` | Criterios spec-first y disciplina de validacion |
| Spec package canonico | `documentation/specs/platform/code-review-graph-integration/` | Contrato funcional y tecnico v1 del adapter |
| Repo externo a integrar | `https://github.com/victorp1leon/code-review-graph` | Fuente canonica del motor de code graph |

## Contexto
Se validaron hardenings de seguridad y pruebas completas en `code-review-graph` (backend Python + extension VS Code). El siguiente paso es integrar esa capacidad en OpenClaw Bakery como herramienta externa, evitando acoplar repositorios y manteniendo aislamiento de secretos/productivo.

## Alcance
### In Scope
- Definir arquitectura de integracion OpenClaw -> Code Review Graph por adapter/tooling externo.
- Implementar adapter en OpenClaw para invocar capacidades clave (`build_or_update_graph`, `get_impact_radius`, `get_review_context`).
- Establecer configuracion segura por entorno (`repo_root` allowlist, timeouts, limites de salida, `include_source` por defecto seguro).
- Agregar validaciones (unit + smoke controlado) y documentacion operativa de uso.
- Trazabilidad completa en plan/index/handoff.

### Out of Scope
- Embeder el repo `code-review-graph` dentro de `openclaw-bakery`.
- Ejecutar flujos live sobre repositorios externos sin gate operativo explicito.
- Cambiar alcance funcional de Fase 6 admin operations.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Abrir plan maestro de integracion y alinear artefactos de colaboracion | Complete | Plan + index + handoff kickoff creados |
| 2 | Discover tecnico en OpenClaw (entrypoints runtime/tools + contratos de salida) | Complete | Mapeados `src/index.ts`, `src/runtime/conversationProcessor.ts`, `src/skills/readOnlyIntentRouter.ts`, `src/tools/googleWorkspace/runGwsCommand.ts`, `src/tools/admin/adminHealth.ts`, `src/config/appConfig.ts` |
| 3 | Especificar contrato de adapter (`input`, `output`, errores, limites) | Complete | Definido en `documentation/specs/platform/code-review-graph-integration/*.md` con defaults de seguridad |
| 4 | Implementar adapter + wiring runtime con feature flag | Complete | Nuevo tool `src/tools/admin/codeReviewGraph.ts` + bridge `scripts/admin/code-review-graph-adapter.py` + wiring en `src/index.ts` y `src/runtime/conversationProcessor.ts` |
| 5 | Endurecer seguridad operacional (allowlist, timeout, redaction defaults) | Complete | Validacion de repo/path, timeout, summary truncation y sanitizacion/redaction en adapter |
| 6 | Validar (unit + smoke local seguro) y documentar runbook de operacion | Complete | Unit + smoke dedicado + security scan en verde; `npm run test:smoke-integration:summary` completado en mock con 0 fallos |
| 7 | Cierre de plan y sincronizacion final index/handoff | Complete | Plan/spec/index/handoff final sincronizados |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Integrar como herramienta externa (CLI/MCP adapter) y no submodulo embebido | Minimiza acoplamiento y reduce riesgo de drift/repos duplicados | 2026-03-24 |
| Default seguro: `include_source=false` en OpenClaw | Reduce exposicion accidental de snippets sensibles | 2026-03-24 |
| Mantener `code-review-graph` con remote canonico propio | Permite ciclo de release independiente y actualizaciones controladas | 2026-03-24 |

## Validation
- Tests a ejecutar:
  - `npm run lint`
  - `CI=1 npm test -- --run <tests_adapter_crg>`
  - `python3 -m pytest -q` (en repo `code-review-graph`, para baseline de integracion)
  - `npm run smoke:integration` (o smoke especifico de adapter en modo seguro/local)
- Criterio de aceptacion:
  - OpenClaw puede invocar `code-review-graph` de forma determinista bajo feature flag.
  - No hay acceso a rutas fuera de allowlist ni exposicion de secretos en respuestas.
  - Documentacion operativa habilita reproduccion local sin tocar integraciones live.

## Outcome
Integracion CRG cerrada en estado listo para integracion controlada: adapter seguro + wiring runtime bajo feature flag + pruebas unitarias/runtime + smoke dedicado (`smoke:code-review-graph`) + gate global `test:smoke-integration:summary` en verde (mock, 0 fallos). Se agrego ademas la mejora reusable `external-tool-adapter-safety` en `.codex/skills/`.
