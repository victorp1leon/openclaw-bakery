# AI / Developer Implementation Instructions (Spec-First)

Status: MVP
Last Updated: 2026-03-17

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

## Prioridad actual
Consultar siempre la matriz viva:
- `documentation/ai_implementation/ddd-roadmap-coverage-matrix.md`

Resumen operativo al 2026-03-17:
- Fase 3 (order lifecycle, quote, shopping list, inventory consume): implementada y documentada.
- Fase 4 (web): implementacion funcional disponible con controles operativos.
- Backlog pendiente principal: fase 5 (analytics) y fase 6 (admin skills/hardening adicional).

## Entregables por feature
- Specs actualizadas
- Codigo implementado
- Tests pasando
- Healthcheck/observabilidad ajustados si aplica
