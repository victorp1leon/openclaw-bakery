# Code Review Graph A/B Evaluation Template (5 Tasks)

Status: Active
Last Updated: 2026-03-24

## Purpose
Plantilla para medir impacto real de CRG comparando flujo manual (sin CRG) vs flujo guiado por impacto (con CRG) en 5 tareas/PRs.

## Protocol (Per Task)
1. Seleccionar archivo principal del cambio (`target`).
2. Ejecutar baseline A/B:
- `npm run test:crg-ab:summary -- --target <target> --depth 2`
3. Capturar resultados en la tabla.
4. Ejecutar implementacion/review normal del cambio.
5. Registrar outcome final (hallazgos y regresiones evitadas/detectadas).

## Metrics Table
| Task/PR | Target | Heuristic Refs | CRG Impacted Files | Overlap | Review Time (min) | Tests Added by CRG | High-Risk Findings | Regression After Merge (Y/N) | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 |  |  |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |  |  |

## Decision Thresholds (Suggested)
- Si `CRG Impacted Files` << `Heuristic Refs`, CRG mejora foco de revision.
- Si suben `Tests Added by CRG` y bajan regresiones, CRG mejora calidad.
- Si el tiempo de review no sube materialmente, CRG tiene ROI operativo positivo.

## Evidence Links
- Ultimo reporte A/B: `reports/crg-ab/latest-summary.md`
- Historial A/B: `reports/crg-ab/history/`
