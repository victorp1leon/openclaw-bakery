# Intent-to-Skill Coverage Gate Rule v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-17`
> **Last Updated:** `2026-03-17`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| AGENTS policy | `AGENTS.md` | Gate de mejora continua y aprobacion |
| Rules catalog | `.codex/rules/README.md` | Registro de reglas locales |
| Runtime intents | `src/runtime/conversationProcessor.ts` | Fuente de intents operativos |
| Functional skills | `skills/` | Destino de cobertura por intent |

## Contexto
Se detecto una brecha recurrente: intents activos en runtime sin skill funcional equivalente en `skills/`. Esto introduce deuda documental y friccion de onboarding/operacion entre sesiones.

## Alcance
### In Scope
- Agregar regla reusable de cobertura `intent -> skill`.
- Registrar regla en catalogo `.codex/rules/README.md`.
- Dejar handoff para continuidad.

### Out of Scope
- Implementar chequeo automatico en CI/healthcheck.
- Modificar logica runtime/tools.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Definir regla y mapeos canonicos | Complete | Incluye aliases `pedido`, `web`, `reporte` |
| 2 | Registrar regla en catalogo local | Complete | README actualizado |
| 3 | Cerrar artefactos de colaboracion | Complete | Plan/index/handoff |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Resolver aliases con mapeo canonico fijo | Evita falsos positivos por nombres legacy en runtime | 2026-03-17 |

## Validation
- Verificaciones ejecutadas:
  - lectura de `.codex/rules/intent-skill-coverage-gate.md`
  - lectura de `.codex/rules/README.md`
- Criterio de aceptacion:
  - Regla disponible y referenciada en catalogo.

## Outcome
Se incorporo la regla `.codex/rules/intent-skill-coverage-gate.md` para evitar futuras brechas entre intents activos y skills funcionales documentadas.
