# ECC Security-First Adoption for OpenClaw Bakery

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-03`
> **Last Updated:** `2026-03-03`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| System map | `documentation/ai_collaboration/system-map.md` | Contexto transversal de componentes |
| Threat model STRIDE | `documentation/security/threat-model-stride.md` | Riesgos actuales y prioridades de seguridad |
| Logging policy | `documentation/security/sensitive-payload-logging-policy.md` | Reglas de manejo de datos sensibles |
| Logging trace catalog | `documentation/operations/logging-trace-catalog.md` | Eventos y payloads de logs permitidos |
| Implementation instructions | `documentation/ai_implementation/implementation-instructions.md` | Flujo spec-first obligatorio |

## Contexto
Se evaluo `everything-claude-code` para reutilizar capacidades en `openclaw-bakery` sin introducir riesgos de fuga de datos, prompt injection persistente o supply-chain. El objetivo es adoptar solo practicas y tooling que eleven seguridad operativa y calidad, manteniendo las invariantes actuales del runtime.

## Alcance
### In Scope
- Definir matriz de adopcion segura (`adoptar`, `adaptar`, `no adoptar`).
- Priorizar quick wins de seguridad para el flujo local/CI.
- Proponer backlog incremental con validacion verificable.
- Mantener consistencia con el modelo actual (allowlist + confirmacion + idempotencia + redaccion).

### Out of Scope
- Integrar hooks de memoria de sesiones o aprendizaje continuo que persistan prompts/outputs crudos.
- Adoptar configuraciones MCP de terceros sin version pinning y sin aprobacion de seguridad.
- Cambios de arquitectura no relacionados a seguridad de colaboracion/dev tooling.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Auditar `everything-claude-code` con foco en seguridad | Completed | Riesgos detectados: fuga de contexto entre sesiones, logging de tool input/output, import remoto inseguro, sanitizacion incompleta de comandos |
| 2 | Mapear compatibilidad con controles actuales de `openclaw-bakery` | Completed | Base solida ya existente: allowlist, confirmation gate, idempotencia, redaccion y docs de threat model |
| 3 | Definir matriz de adopcion segura | Completed | Ver seccion Decisions & Trade-offs |
| 4 | Implementar quick wins de bajo riesgo (scripts/tests/policies) | Completed | `security:scan` agregado, tests de `loggingPolicy` agregados, checklist de seguridad documentado |
| 5 | Implementar mejoras runtime de riesgo medio (rate limiting por chat) | Completed | Guard de ventana deslizante + burst block integrado en runtime, config y healthcheck |
| 6 | Cerrar con validacion y handoff | Completed | Plan/index/handoff actualizados con resultados de validacion |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Adoptar solo componentes de ECC orientados a validacion y guardrails de desarrollo, no de memoria automatica | Evitar fuga de datos sensibles y prompt injection persistente entre sesiones/proyectos | 2026-03-03 |
| No adoptar hooks que persistan `tool_input`/`tool_output` por defecto | Incompatible con politica de logging sensible y principle of least data | 2026-03-03 |
| No adoptar imports remotos HTTP ni `npx @latest` en configuraciones operativas | Reducir riesgo de supply-chain y contenido no confiable | 2026-03-03 |
| Priorizar quick wins en CI/local antes de cambios runtime | Menor riesgo de regresion y mayor velocidad de mejora | 2026-03-03 |

### Matriz de adopcion (ECC -> OpenClaw Bakery)
| Componente/idea ECC | Decision | Aplicacion propuesta en Bakery |
|---|---|---|
| Validadores CI (estructura/consistencia de archivos) | Adoptar | Crear scripts de validacion de baseline de seguridad (secret scanning, patrones peligrosos, checks de docs/politicas) |
| Hook de typecheck/format post-edicion | Adoptar (acotado) | Integrar como tarea local opcional de DX, sin capturar payloads sensibles |
| Checklists de seguridad para PR/review | Adoptar | Formalizar checklist en docs y pruebas de regresion de redaccion/logging |
| Session memory auto-injection | No adoptar | Riesgo alto de mezcla de contexto entre proyectos |
| Observacion continua de tool IO | No adoptar | Riesgo alto de exfiltracion local de secretos |
| Import de contenido remoto por HTTP | No adoptar | Riesgo de MITM y poisoning de instrucciones |
| MCP configs con paquetes no pineados o `@latest` | Adaptar | Si se usa MCP, exigir version pinning + allowlist de servidores + aprobacion de seguridad |

## Validation
- Tests a ejecutar:
  - `npm test`
  - Nuevos tests de no-regresion para redaccion de logs y politicas de payload sensible.
  - Script de escaneo de secretos/patrones peligrosos en CI.
- Criterio de aceptacion:
  - Ninguna adopcion introduce logging de payloads sensibles por defecto.
  - No se habilitan features de memoria cross-session sin aislamiento por proyecto.
  - Las mejoras propuestas quedan documentadas y verificables en pipeline.

### Validacion ejecutada (2026-03-03)
- `npm run security:scan` -> OK
- `npm test` -> OK (19 files, 67 tests)
- `npm run verify:security` -> OK

## Outcome
Plan de adopcion security-first completado:
- Fase 4: quick wins de scripts/tests/policies.
- Fase 5: rate limiting por `chat_id` con burst protection, trazabilidad y controles operativos.
