# Token Efficiency Codex Rule v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-23`
> **Last Updated:** `2026-03-23`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Gate de aprobacion | `AGENTS.md` | Confirmacion de cambios con `apruebo` |
| Tips origen | `.codex/token-optimizacion-tips.md` | Fuente de recomendaciones a adaptar |
| Catalogo de reglas | `.codex/rules/README.md` | Registro de la nueva regla |
| Registro operativo | `.codex/skill-registry.md` | Trazabilidad de artefactos locales |

## Contexto
Se detecto una oportunidad reusable para reducir consumo de tokens en sesiones de Codex sin perder trazabilidad ni calidad operativa. El objetivo fue aterrizar recomendaciones utiles en una regla local compatible con `AGENTS.md` y con el flujo spec-first.

## Alcance
### In Scope
- Crear regla local `.codex/rules/token-efficiency-codex.md`.
- Registrar la regla en `.codex/rules/README.md`.
- Sincronizar `.codex/skill-registry.md` por adicion de regla.
- Cerrar artefactos de colaboracion (plan/index/handoff).

### Out of Scope
- Cambios en runtime, tools o integraciones externas.
- Automatizacion de metricas de tokens en CI.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir regla token-aware con guardrails de seguridad/calidad | Complete | Incluye anti-patrones para evitar degradaciones |
| 2 | Registrar regla en catalogo local | Complete | `README` de reglas actualizado |
| 3 | Sincronizar skill registry | Complete | Registro regenerado de forma deterministica |
| 4 | Cerrar artefactos de colaboracion | Complete | Plan/index/handoff consistentes |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Regla safety-first (no "code-only" obligatorio) | Evita conflicto con validacion, trazabilidad y reporting exigidos por el repo | 2026-03-23 |
| Mantener verificacion ligera (docs-only) | El cambio no afecta comportamiento runtime | 2026-03-23 |

## Validation
- Verificaciones ejecutadas:
  - `npm run codex:skill-registry`
  - `rg -n "token-efficiency-codex" .codex/rules/README.md .codex/skill-registry.md`
- Criterio de aceptacion:
  - Regla creada, catalogada y visible en skill registry.

## Outcome
Se agrego una regla reusable de optimizacion de tokens adaptada al flujo de OpenClaw Bakery, evitando recomendaciones incompatibles con las politicas de seguridad, validacion y continuidad documental del repositorio.
