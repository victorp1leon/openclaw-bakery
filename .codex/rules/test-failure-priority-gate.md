# test-failure-priority-gate

## Objetivo
Forzar disciplina de calidad: si fallan tests unitarios o smoke/integration, el siguiente objetivo obligatorio es corregir esos fallos antes de cualquier commit o avance de feature.

## Regla
- Cuando se ejecute validacion y exista cualquier fallo (`failed > 0`), se activa bloqueo de progreso.
- Validaciones cubiertas por esta regla:
  - unit tests (`npm test`, `vitest`, `npm run test -- ...`)
  - smoke o smoke-integration (incluye `npm run test:smoke-integration:summary` y variantes `smoke:*`)
- Con bloqueo activo:
  - no hacer commit
  - no marcar plan/feature como cerrado/completo
  - no iniciar siguiente feature
  - el siguiente objetivo debe ser diagnosticar y corregir las fallas reportadas

## Criterio de salida del bloqueo
- El bloqueo solo se levanta cuando la misma validacion relevante para el cambio vuelve a ejecutarse y termina sin fallos.

## Notas operativas
- Si el resumen smoke/integration reporta `Failed > 0` (ej. `Total 25, Passed 5, Failed 20`), se considera bloqueo activo inmediato.
- Si existen fallas historicas fuera del alcance, primero se debe alinear con negocio un plan explicito de remediacion; aun asi, no se debe commitear como "feature cerrada" sin declarar esa deuda.
