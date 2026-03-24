# Code Review Graph Integration - Analysis

> **Domain:** `platform`
> **Feature Slug:** `code-review-graph-integration`
> **Status:** `In Progress`
> **Created:** `2026-03-24`
> **Last Updated:** `2026-03-24`
> **Legacy Sources:** `N/A`

## Risks
- Risk: Path traversal para leer archivos fuera del repo objetivo.
- Mitigation: normalizar rutas y exigir que `target_file` resuelva dentro de `repo_root` allowlisted.

- Risk: Exposicion accidental de secretos por `include_source` o stdout crudo.
- Mitigation: `include_source=false` por default y redaction obligatoria antes de responder.

- Risk: Bloqueo del runtime por comandos lentos o repos grandes.
- Mitigation: timeout estricto + limite de salida + manejo de error controlado.

- Risk: Drift entre version de CRG esperada y binario/CLI disponible.
- Mitigation: verificacion de version en startup y error explicito de capacidad no disponible.

## Trade-offs
| Option | Pros | Cons | Decision |
|---|---|---|---|
| CLI local controlado | Menor complejidad inicial y despliegue rapido | Acopla ejecucion al host local | Chosen (v1) |
| Servicio remoto dedicado | Mejor aislamiento y escalado | Mayor costo operativo y auth adicional | Deferred |
| Incluir snippets de codigo por defecto | Mejor contexto para revision | Mayor riesgo de fuga de datos | Rejected |

## Residual Risk
- Aun con redaction, patrones nuevos de secretos pueden escapar si no se mantienen los tests negativos.
- El rendimiento en repos grandes puede requerir limites adaptativos (profundidad, fan-out) en v1.1.
