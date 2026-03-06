# Phase 1 - Help Message and tipo_envio Normalization

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-06`
> **Last Updated:** `2026-03-06`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Runtime | `src/runtime/conversationProcessor.ts` | Mensaje de ayuda y captura de faltantes |
| Runtime tests | `src/runtime/conversationProcessor.test.ts` | Cobertura de regresion |
| Roadmap | `documentation/bot-bakery.roadmap.md` | UX conversacional MVP |

## Contexto
En pruebas Telegram se detectaron dos problemas UX: ayuda demasiado minima y rechazo de respuesta natural (`recoger en tienda`) cuando el campo faltante es `tipo_envio`. Se corregira sin cambiar contratos internos (`envio_domicilio|recoger_en_tienda`).

## Alcance
### In Scope
- Mejorar mensaje de `ayuda` con ejemplos mas utiles y claros.
- Normalizar respuestas naturales de `tipo_envio` al completar campo faltante.
- Agregar tests de regresion en runtime.

### Out of Scope
- Cambios de arquitectura runtime.
- Cambios de contratos en adapters externos.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Ajustar help text en conversation processor | Completed | Ayuda con ejemplos y notas de flujo |
| 2 | Normalizar `tipo_envio` desde input natural | Completed | Acepta frases como `recoger en tienda` |
| 3 | Agregar tests de regresion runtime | Completed | Cobertura para ayuda y campo faltante |
| 4 | Ejecutar tests y cerrar tracking | Completed | `conversationProcessor.test.ts` OK |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener valor canonical interno (`recoger_en_tienda`) | Evita romper validaciones/adapters existentes | 2026-03-06 |

## Validation
- `npm test -- src/runtime/conversationProcessor.test.ts`
- Resultado: `16 passed`.

## Outcome
Se mejoro la UX del runtime para pruebas Telegram:
- Mensaje `ayuda` ampliado con ejemplos mas claros y recordatorio de confirmacion.
- Captura de `tipo_envio` ahora normaliza input natural a enum canonical.
- Cobertura de regresion agregada para ambos casos.
