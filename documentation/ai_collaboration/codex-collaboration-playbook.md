# Codex AI Collaboration Playbook (OpenClaw Bakery)

Status: Active
Last Updated: 2026-02-27

## Objetivo
Definir un sistema estable de colaboracion entre desarrollador y Codex para reducir contexto repetido, mantener continuidad entre sesiones y mejorar calidad de implementacion.

## Problema que resolvemos
- Cada sesion de IA arranca sin memoria local del proyecto.
- Sin estructura, se repite contexto y se toman decisiones inconsistentes.
- Los cambios complejos quedan sin trazabilidad si no hay plan y handoff.

## Sistema en capas (adaptado a Codex)
| Capa | Contenido | Mecanismo en Codex | Costo |
|---|---|---|---|
| Reglas base | Flujo y convenciones de trabajo | `AGENTS.md` en raiz | Muy bajo |
| Mapa del sistema | Vista transversal del proyecto | `documentation/ai_collaboration/system-map.md` | Bajo |
| Guias del repo | Arquitectura y specs existentes | `documentation/README.md` + C4/ADR | Bajo |
| Planes de trabajo | Contexto por tarea | `documentation/ai_collaboration/plans/*` | Medio |
| Session handoff | Estado al cierre de sesion | `documentation/ai_collaboration/plans/**/sessions/*` | Muy bajo |

## Flujo operativo obligatorio
### 1. Research
1. Revisar `documentation/ai_collaboration/plans/_index.md`.
2. Revisar el ultimo handoff de la tarea (si existe).
3. Revisar `AGENTS.md` y docs tecnicas relevantes (`documentation/`).
4. Inspeccionar codigo antes de proponer cambios.

### 2. Plan
1. Si la tarea es multi-archivo o multi-sesion, crear/actualizar plan en `plans/`.
2. Definir alcance, pasos y criterios de cierre.

### 3. Implement
1. Ejecutar cambios respetando specs y patrones existentes.
2. Agregar/actualizar pruebas cuando cambie logica de negocio.
3. Validar localmente lo que sea posible (tests/lint/smoke).

### 4. Close
1. Actualizar estado del plan y `plans/_index.md`.
2. Escribir handoff corto con estado real y siguientes pasos.

## Criterio para crear plan
Crear plan cuando:
- El trabajo requiere mas de una sesion.
- Hay cambios de arquitectura o contratos.
- Hay refactor con riesgo de regresion.
- Se hace review formal con hallazgos.

No crear plan cuando:
- Es un fix pequeno y autocontenido.
- Es una consulta puntual sin cambios.

## Estructura estandar en este repo
```text
documentation/ai_collaboration/
├── codex-collaboration-playbook.md
├── system-map.md
└── plans/
    ├── _index.md
    ├── _plan-template.md
    ├── _session-handoff-template.md
    ├── platform/
    │   ├── implementation/
    │   ├── investigations/
    │   ├── reviews/
    │   └── sessions/
    └── runtime/
        ├── implementation/
        ├── investigations/
        ├── reviews/
        └── sessions/
```

## Integracion con la metodologia existente
- Este playbook no reemplaza `documentation/ai_collaboration/references/framework/documentation-driven-development.md`.
- La implementacion tecnica sigue siendo spec-first.
- El playbook agrega continuidad de sesion y control del trabajo de IA.

## Reglas de mantenimiento
- Mantener `system-map.md` actualizado cuando cambie arquitectura.
- Mover planes completados a seccion de completados en `_index.md`.
- Mantener handoffs cortos (10-15 lineas).
- Eliminar handoffs obsoletos cuando ya no aporten continuidad.
