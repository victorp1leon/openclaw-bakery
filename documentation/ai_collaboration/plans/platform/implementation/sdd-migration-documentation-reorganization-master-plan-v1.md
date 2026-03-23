# SDD Migration + Documentation Reorganization Master Plan v1

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-21`
> **Last Updated:** `2026-03-23`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Consolidated source notes | `documentation/specs/migration-manifest.md` | Inventario consolidado de origen legacy y avance por ola |
| Canonical flow reference | `documentation/ai_collaboration/spec-driven-flow-v1.md` | Base del flujo Spec-Driven adaptado |
| Plans index | `documentation/ai_collaboration/plans/_index.md` | Registro de estado del plan maestro |
| AGENTS policy | `AGENTS.md` | Guardrails (`apruebo`, plan/index/handoff) |
| C4 component contracts | `documentation/c4/ComponentSpecs/` | Contratos legacy a migrar al nuevo arbol de specs |

## Contexto
Queremos consolidar en una sola ruta la adopcion de Spec-Driven Development (SDD) y la reorganizacion documental del repositorio. El objetivo es evitar dispersion entre artefactos legacy y establecer una estructura clara para specs de feature, manteniendo compatibilidad con guardrails operativos actuales. La migracion sera total pero gradual, con control de avance por manifiesto.

## Alcance
### In Scope
- Definir `documentation/specs` como hogar canonico de specs de feature.
- Migrar contratos de `documentation/c4/ComponentSpecs/**` al nuevo arbol canonico de specs.
- Mantener `documentation/c4` como referencia temporal durante la transicion, con enlaces al destino migrado.
- Mantener `documentation/ai_collaboration/plans/*/sessions` como bitacora operativa (sin mover sesiones).
- Crear marco de migracion global (de -> a) con reglas de normalizacion y olas A-D.
- Definir estandar SDD local por feature: `spec`, `clarify`, `plan`, `tasks`, `analyze` (+ opcionales).
- Establecer entregable de control: `documentation/specs/migration-manifest.md`.

### Out of Scope
- Ejecutar en este plan maestro la migracion completa archivo por archivo.
- Cambiar contratos de runtime/plataforma por fuera del alcance documental.
- Eliminar de inmediato historico legacy sin verificaciones por ola.
- Introducir dependencia externa de `specify-cli` (la estrategia es local en repo).

## Estructura objetivo
- `documentation/specs/_index.md`
- `documentation/specs/_feature-template.md`
- `documentation/specs/migration-manifest.md`
- `documentation/specs/runtime/<feature-slug>/`
- `documentation/specs/platform/<feature-slug>/`
- `documentation/specs/contracts/components/<component-slug>.spec.md`
- Artefactos estandar por feature:
  - `spec.md`
  - `clarify.md`
  - `plan.md`
  - `tasks.md`
  - `analyze.md`
  - `research.md` (si aplica)
  - `data-model.md` (si aplica)
  - `contracts/` (si aplica)
  - `checklists/` (si aplica)

## Mapa Global de Migracion (de -> a)
### Alcance cuantificado
1. `runtime implementation`: 40 archivos.
2. `platform implementation`: 38 archivos.
3. `sessions` (runtime + platform): 94 archivos (se mantienen en origen).
4. `c4 ComponentSpecs`: 39 contratos (a migrar gradualmente al nuevo arbol canonico).

### Mapeo de rutas
| Tipo | Desde | Hacia | Politica |
|---|---|---|---|
| Specs de feature runtime | `documentation/ai_collaboration/plans/runtime/implementation/*.md` | `documentation/specs/runtime/<feature-slug>/plan.md` | Migracion gradual, consolidando por feature |
| Specs de feature platform | `documentation/ai_collaboration/plans/platform/implementation/*.md` | `documentation/specs/platform/<feature-slug>/plan.md` | Migracion gradual, consolidando por feature |
| Artefactos nuevos SDD | N/A | `documentation/specs/{runtime|platform}/<feature-slug>/{spec,clarify,plan,tasks,analyze}.md` | Nuevo estandar |
| Handoffs de sesion | `documentation/ai_collaboration/plans/*/sessions/*.md` | Se mantienen en origen + links desde `documentation/specs` | No mover |
| Contratos C4 de componentes | `documentation/c4/ComponentSpecs/**` | `documentation/specs/contracts/components/**` | Migrar gradual con validacion de links y alias temporal en C4 |

### Reglas de normalizacion
1. `feature-slug` se deriva del nombre legacy removiendo prefijos `phase*` y sufijos de version (`-v1`, `-v2`), conservando nombre funcional.
2. Si hay multiples planes legacy para la misma feature, se consolida en un unico `plan.md` y el resto queda en `history/legacy-plans/` dentro de esa feature.
3. `documentation/specs/_index.md` sera la navegacion principal de features migradas.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear foundation de `documentation/specs` (index, template, convenciones) | Complete | 2026-03-23: creados `_index.md`, `_feature-template.md` y arbol base (`runtime`, `platform`, `contracts/components`) |
| 2 | Crear `migration-manifest.md` inicial con inventario completo de origen legacy | Complete | 2026-03-23: creado manifiesto inicial con 117 entradas (40 runtime, 38 platform, 39 contracts) |
| 3 | Definir/ajustar comandos locales SDD (`speckit.*`) a rutas `documentation/specs` | Complete | 2026-03-23: definidos `.codex/commands/speckit.{index,template,manifest,validate}.md` sobre rutas canonicas; unit/smoke `N/A` (cambio documental sin runtime/scripts ejecutables) |
| 4 | Ola A: migrar features activas/recientes de mayor uso | Complete | 2026-03-23: migradas 18 features (13 runtime + 5 platform) a paquetes canonicos con snapshot legacy; unit/smoke `N/A` (solo cambios documentales) |
| 5 | Ola B: migrar resto de `runtime implementation` | Complete | 2026-03-23: migradas 27 features runtime de Wave B a paquetes canonicos; manifiesto actualizado (`B pending=0`, `B migrated=27`), unit/smoke `N/A` (solo cambios documentales) |
| 6 | Ola C: migrar resto de `platform implementation` | Complete | 2026-03-23: migradas 33 features platform de Wave C a paquetes canonicos; manifiesto actualizado (`C pending=0`, `C migrated=33`), unit/smoke `N/A` (solo cambios documentales) |
| 7 | Ola C.1: migrar `c4/ComponentSpecs` hacia `documentation/specs/contracts/components` | Complete | 2026-03-23: migrados 39 contratos C4 (copy+trace) a `documentation/specs/contracts/components`; manifiesto actualizado (`C.1 pending=0`, `C.1 migrated=39`), unit/smoke `N/A` (solo cambios documentales) |
| 8 | Ola D: cierre 100%, verificacion final y limpieza de referencias legacy | Complete | 2026-03-23: verificacion global completada (`117` entradas, `0` faltantes de source/target); manifiesto actualizado a `verified` (`pending=0`, `migrated=0`, `verified=117`); cleanup aplicado sin mover sesiones, manteniendo C4 como referencia temporal |
| 9 | Alinear documentacion operativa (`ai_collaboration`) y C4 con nuevos enlaces canonicos | Complete | 2026-03-23: alineados hubs operativos y C4 (`system-map`, `codex-collaboration-playbook`, `spec-driven-flow-v1`, `c4/README`, `c4-instructions`, `ComponentSpecs/system.description`) para declarar `documentation/specs/**` como ruta canonica y C4 como referencia temporal sin contradicciones |
| 10 | Ejecutar validacion integral de consistencia de estructura y links | Complete | 2026-03-23: validacion integral `OK` (`117` manifest rows, `0` source/target faltantes, `78` features verified con paquete minimo, `39` contratos C4 con equivalencia 1:1, consistencia `_index`=`manifest`); referencias legacy faltantes resueltas con archivos puente (`documentation/*`, `.codex/audit-prompt.md`) |
| 11 | Cierre administrativo: actualizar index + handoff final del plan maestro | Complete | 2026-03-23: plan maestro marcado `Complete`; `plans/_index.md` actualizado (movido de Active a Completed) y handoff final registrado para cierre administrativo |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Usar `documentation/specs` como casa de specs de feature | Separa lifecycle de feature de bitacora operativa y de arquitectura | 2026-03-21 |
| Migrar `c4/ComponentSpecs` al arbol canonico de specs | Alinea objetivo de migracion total y evita doble fuente de verdad | 2026-03-21 |
| Mantener sesiones en `ai_collaboration/plans/*/sessions` | Conserva continuidad historica de colaboracion multi-sesion | 2026-03-21 |
| Migracion total pero gradual por olas | Reduce riesgo operativo y permite verificacion incremental | 2026-03-21 |
| Estrategia local sin `specify-cli` | Evita dependencia externa y mantiene control dentro del repo | 2026-03-21 |

## Plan de Pruebas
### Matriz por etapa
| Etapa | Objetivo de prueba | Comandos/chequeos base | Evidencia esperada | Gate de salida |
|---|---|---|---|---|
| Foundation | Validar estructura canonica inicial en `documentation/specs` | `rg --files documentation/specs` | Existen `_index.md`, `_feature-template.md`, `migration-manifest.md` y arbol por dominio | Estructura base completa y navegable |
| Tooling local SDD | Verificar que flujo `speckit.*` apunta a rutas nuevas y no a legacy | revisar definiciones en `.codex/commands/*` + `rg -n "documentation/specs|ai_collaboration/specs|FeatureSpecs" .codex documentation` | Rutas de lectura/escritura consistentes con `documentation/specs` | No hay referencias activas a rutas antiguas para nuevas features |
| Ola A/B/C (features) | Validar migracion por feature y consolidacion de planes legacy | muestreo por feature migrada + verificacion de `plan.md` y `history/legacy-plans/` cuando aplique | Cada feature migrada tiene paquete minimo (`spec/clarify/plan/tasks/analyze`) o backlog explicito | 100% de features de la ola en estado `migrated` o `verified` en manifiesto |
| Ola C.1 (ComponentSpecs) | Validar migracion de contratos C4 a `documentation/specs/contracts/components` | `rg --files documentation/specs/contracts/components` + chequeo de correspondencia 1:1 con origen | Contratos migrados con contenido equivalente y trazabilidad al origen | 39 contratos en `verified` y enlaces temporales en C4 funcionando |
| Ola D (cierre) | Validar consistencia global de enlaces y cobertura del manifiesto | `rg -n "documentation/specs|ComponentSpecs|migration-manifest" documentation` + revision manual de links rotos | Sin enlaces huerfanos criticos y manifiesto al 100% | Cierre formal del plan con estado `Complete` |

### Casos minimos obligatorios por feature migrada
| Caso | Verificacion |
|---|---|
| Creacion/catastro de feature en indice | Entrada presente en `documentation/specs/_index.md` con estado y dominio |
| Trazabilidad legacy -> nuevo | Referencia cruzada al/los archivo(s) de origen y estrategia aplicada (`consolidate/copy/link`) |
| Integridad del paquete SDD | Archivos minimos esperados presentes o razon explicita de excepcion |
| Sesiones preservadas | Link hacia handoff/sessions correspondiente sin mover archivos de `ai_collaboration` |

### Regla de evidencia para cierre por ola
1. Actualizar `documentation/specs/migration-manifest.md` con estado por entrada (`pending/migrated/verified`).
2. Registrar resumen de resultados (conteos migrados/verificados y pendientes) en el handoff de la sesion.
3. No avanzar de ola si la anterior no tiene evidencia minima completa.

### Gates de validacion tecnica (unit/smoke)
| Tipo de cambio en la ola | Unit tests | Smoke tests | Regla |
|---|---|---|---|
| Solo cambios documentales (`documentation/**`) sin tocar runtime/scripts/comandos | `N/A` permitido | `N/A` permitido | Debe registrarse justificacion explicita en handoff y plan |
| Cambios en `.codex/commands/**`, scripts o wiring de flujo SDD ejecutable | Ejecutar `npx vitest run` (o subset justificado) | Ejecutar smoke(s) del area impactada (`npm run smoke:report`, `npm run smoke:lookup`, `npm run smoke:status`, etc.) | No cerrar ola sin evidencia de resultado o limitacion real documentada |
| Cambios en runtime/producto durante la migracion (si ocurrieran) | Ejecutar `npx vitest run` | Ejecutar smoke(s) funcionales correspondientes al intent/capacidad afectada | Requiere evidencia en handoff + actualizacion de estado en manifiesto |

## Validation
- Verificaciones a ejecutar durante implementacion:
  - `rg --files documentation/specs`
  - `rg -n "documentation/specs|FeatureSpecs|ai_collaboration/plans/.*/implementation" documentation`
  - revision de enlaces cruzados entre `documentation/specs/_index.md`, `documentation/c4/**` y handoffs activos.
  - validacion del `migration-manifest.md` (sin filas huerfanas y con estado por entrada).
  - cuando aplique por tipo de cambio:
    - `npx vitest run`
    - smoke(s) relevantes (`npm run smoke:report`, `npm run smoke:lookup`, `npm run smoke:status`, u otros del dominio afectado)
- Criterios de aceptacion:
  - Existe estructura base operativa en `documentation/specs`.
  - Existe manifiesto global completo con estrategia y ola por cada entrada legacy.
  - Nuevas features no triviales pueden seguir flujo SDD completo en ruta canonica.
  - Sesiones permanecen en `ai_collaboration` y los contratos C4 quedan migrados al arbol canonico con enlaces consistentes.
  - Para cada ola, la decision `unit/smoke` queda explicita como `executed` o `N/A justificado`.

## Outcome
Plan maestro completado para ejecutar la migracion SDD + reorganizacion documental de forma controlada, trazable y gradual, incluyendo migracion de `c4/ComponentSpecs`. Se alcanzo cierre formal con validacion integral y cobertura completa del manifiesto (`117/117` entradas en `verified`).
