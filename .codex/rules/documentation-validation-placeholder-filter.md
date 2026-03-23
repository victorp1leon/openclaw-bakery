# Rule: Documentation Validation Placeholder Filter

## Policy
- En validaciones de rutas/links de documentacion, tratar placeholders como `...` (por ejemplo `documentation/...`) como tokens no resolubles y no como rutas reales faltantes.
- Registrar placeholders detectados como deuda informativa (`non-blocking`) separada de enlaces realmente rotos.
- No bloquear cierre de validaciones integrales por placeholders en templates o ejemplos historicos.

## Required Behavior
- Diferenciar resultados en dos categorias:
  1. `broken_path` real (debe existir y no existe).
  2. `placeholder_path` (token de ejemplo; no aplica resolucion real).
- Mantener chequeo estricto para rutas reales en documentos activos de plan/hubs.
- Permitir mayor tolerancia en snapshots legacy/historicos sin ocultar hallazgos reales.

## Verification
- Ignorar en path checks tokens que incluyan:
  - `...`
  - comodines (`*`)
  - placeholders tipicos (`<...>`, `{...}`)
- Reportar conteo de:
  - rutas reales validadas
  - rutas rotas reales
  - placeholders omitidos

## Notes
- Esta regla aplica a auditorias documentales de consistencia (ejemplo: cierre de olas de migracion SDD).
- No sustituye validacion de enlaces reales; solo evita falsos positivos por placeholders.
