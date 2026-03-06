# AI / Developer Implementation Instructions (Spec-First)

Status: MVP
Last Updated: 2026-02-26

## Objetivo
Implementar nuevas capacidades del bot siguiendo specs como fuente de verdad.

Tracking operacional de cobertura DDD por fase:
- `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md`

## Proceso obligatorio por feature/skill
1. Actualizar `documentation/bot-bakery.roadmap.md` (si cambia alcance/prioridad).
2. Actualizar `documentation/c4/ComponentSpecs/system.description.md` si cambia arquitectura.
3. Crear/editar `component.description.md` del modulo afectado.
4. Crear/editar `*.spec.md` por pieza a implementar.
5. Definir casos de prueba en la spec.
6. Implementar codigo.
7. Implementar tests derivando nombres/escenarios de la spec.
8. Actualizar diagrama C4 si cambia flujo/componentes.

## Convenciones para specs
- Un archivo por unidad relevante (servicio/adapter/guard/parser/tool).
- Secciones minimas:
  - Objetivo
  - Entradas/Salidas
  - Reglas de negocio
  - Errores y comportamiento esperado
  - Casos de prueba
- Mantener lenguaje preciso y verificable.

## Prioridad actual (siguiente fase)
Fase 2 - `expense.add` E2E (en curso):
- `append-expense` con connector HTTP configurable (dry-run safe por default)
- mapper de payload de gasto a contrato externo
- retry/timeout bounded implementado
- tests unitarios de adapter y runtime en confirm flow
- pendiente: smoke test con endpoint real y hardening operativo

## Entregables por feature
- Specs actualizadas
- Codigo implementado
- Tests pasando
- Healthcheck/observabilidad ajustados si aplica
