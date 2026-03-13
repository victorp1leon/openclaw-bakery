# Phase 3 - sheets schema validation hardening

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-13`
> **Last Updated:** `2026-03-13`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Follow-up origen | `documentation/ai_collaboration/plans/runtime/implementation/phase3-sheets-schema-bootstrap-foundation.md` | Cierra pendiente de validacion de schemas JSON |
| Schema validator | `scripts/sheets/validate-tabs-schemas.ts` | Reglas de validacion para `*.tabs.json` |
| Command wiring | `package.json` | Script `sheets:tabs:validate:schema` |
| Operative docs | `README.md`, `documentation/operations/config-matrix.md` | Uso operativo del comando |

## Contexto
El bootstrap schema-driven de Sheets quedo funcionando, pero faltaba un guardrail para detectar errores estructurales en `scripts/sheets/schemas/*.tabs.json` antes de ejecutar un `init`/`apply`. Este hardening agrega validacion estandarizada para reducir fallos en runtime y errores de configuracion.

## Alcance
### In Scope
- Crear validador local para todos los schemas `*.tabs.json`.
- Exponer comando npm para ejecucion manual/CI.
- Documentar uso operativo en README y config matrix.
- Validar ejecucion sobre schemas existentes.

### Out of Scope
- Cambios a datos live en Google Sheets.
- Cambios de logica de negocio en tools (`shopping.list.generate`, `inventory.consume`).
- Integracion CI obligatoria en workflows (se deja comando disponible).

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Implementar `validate-tabs-schemas.ts` | Completed | Reglas para root/tabs/headers/rows/placeholders y duplicados |
| 2 | Exponer script npm | Completed | `sheets:tabs:validate:schema` |
| 3 | Actualizar documentacion operativa | Completed | README + config matrix |
| 4 | Ejecutar validacion real | Completed | Resultado `ok: true`, sin issues |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Validacion implementada en TypeScript sin dependencia externa | Evita agregar librerias nuevas y mantiene coherencia con scripts existentes | 2026-03-13 |
| Formato de salida JSON con `ok/issues` | Facilita consumo en automatizacion y debugging | 2026-03-13 |

## Validation
- `npm run sheets:tabs:validate:schema`
- Criterio de aceptacion: salida `tabs_schema_validate_result` con `ok: true` y `issues: []` en schemas actuales.

## Outcome
Se agrego una barrera preventiva para mantener consistentes los manifiestos de tabs Sheets antes de bootstrap. El comando ya esta disponible en scripts y documentado para uso manual/CI.
