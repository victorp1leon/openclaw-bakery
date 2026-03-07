# Phase 2 - Bot Persona and Telegram UX

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-06`
> **Last Updated:** `2026-03-07`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Runtime persona | `src/runtime/persona.ts` | Catalogo de mensajes por tono |
| Conversation runtime | `src/runtime/conversationProcessor.ts` | Integracion de copy configurable |
| App config | `src/config/appConfig.ts` | Nuevo flag `BOT_PERSONA` |
| Telegram channel | `src/channel/telegramChannel.ts` | Teclado rapido `confirmar/cancelar` |
| Runtime tests | `src/runtime/conversationProcessor.test.ts` | Cobertura de personalidad y shortcuts |

## Contexto
Se necesita cambiar la personalidad del bot sin romper la seguridad ni los flujos transaccionales existentes (`gasto/pedido/web`). Tambien se busca mejorar la apariencia en Telegram durante el paso de confirmacion.

## Alcance
### In Scope
- Introducir personalidades de respuesta configurables por entorno.
- Centralizar textos de runtime en un modulo reutilizable.
- Agregar UX visual en Telegram para `confirmar/cancelar`.
- Mantener compatibilidad con comportamiento actual por default.
- Extender tests para cubrir los nuevos comportamientos.

### Out of Scope
- Cambiar contratos externos de tools/adapters.
- Reemplazar estrategia de parseo OpenClaw.
- Rediseño completo de prompts de extracción.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Crear modulo de persona runtime | Completed | `neutral`, `bakery_warm`, `concise` |
| 2 | Conectar `BOT_PERSONA` en config + runtime | Completed | Default `neutral` |
| 3 | Mejorar UX Telegram con teclado contextual | Completed | Teclado rapido y remocion al finalizar |
| 4 | Extender comandos de control | Completed | `sí/ok/dale` y `no/stop` en pending |
| 5 | Actualizar y ejecutar tests | Completed | Suite focal en verde |
| 6 | Hotfix de `ayuda` en modo estricto | Completed | Bypass local determinista antes de OpenClaw |
| 7 | Hotfix parseo `pedido` con strings vacios | Completed | Sanitizado previo a schema en parse OpenClaw |
| 8 | Hotfix coercion numerica en payload OpenClaw | Completed | `monto/cantidad/total` string -> number |
| 9 | Indicador de escritura en Telegram | Completed | `sendChatAction(typing)` durante procesamiento largo |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Mantener `neutral` como default con textos equivalentes al estado previo | Evita regresiones en UX y pruebas existentes | 2026-03-06 |
| Mostrar teclado solo cuando el texto contiene `confirmar | cancelar` | Mejora UX sin acoplarse a un intent concreto | 2026-03-06 |
| Permitir atajos de confirmacion/cancelacion solo por coincidencia exacta normalizada | Reduce ambiguedad de comandos largos en lenguaje natural | 2026-03-06 |
| Priorizar `ayuda/help` local antes de OpenClaw | Evita falsos `unknown` cuando OpenClaw clasifica mal en `OPENCLAW_STRICT=1` | 2026-03-06 |
| Limpiar strings vacios en payload OpenClaw antes del schema | Evita rechazos estrictos por `""` en campos opcionales como `sabor_relleno` | 2026-03-06 |
| Coercer numeric strings en campos numericos conocidos | Evita errores estrictos `expected number, received string` para payloads OpenClaw | 2026-03-06 |
| Heartbeat de `typing` cada 4s por defecto (min 500ms) | Hace visible que el bot sigue procesando en esperas de 40s sin saturar la API de Telegram | 2026-03-07 |

## Validation
- `npm test -- src/runtime/conversationProcessor.test.ts src/guards/confirmationGuard.test.ts src/config/appConfig.test.ts src/channel/telegramChannel.test.ts src/health/healthcheck.test.ts`
- `npm test -- src/skills/intentRouter.test.ts src/runtime/conversationProcessor.test.ts`
- `npm test -- src/skills/parser.test.ts`
- `npm test -- src/channel/telegramChannel.test.ts src/runtime/channelRuntimeState.integration.test.ts`
- `npm run -s healthcheck`
- Resultado: `46 passed` (suite focal inicial), `26 passed` (hotfix router), `14 passed` (parser focal), `7 passed` (telegram + runtime integration) y `144 passed` en suite completa. Healthcheck `status=warn` esperado por `web_publish_connector` en dry-run.

## Outcome
Se habilito una capa de personalidad configurable y una mejora visual para Telegram sin afectar reglas de negocio:
- Nuevo `BOT_PERSONA` (`neutral|bakery_warm|concise`).
- Runtime usa copy centralizado por personalidad.
- Telegram muestra teclado de accion para confirmar/cancelar en mensajes de resumen.
- Atajos de control (`sí/no`) soportados en operaciones pendientes.
- `ayuda/help` queda determinista en modo estricto, sin depender de la clasificación de OpenClaw.
- Parseo de `pedido` en estricto ahora tolera payloads OpenClaw con campos opcionales vacios sin romper el flujo.
- Parseo en estricto ahora convierte `monto/cantidad/total` cuando OpenClaw los entrega como string.
- Telegram ahora muestra estado de "escribiendo..." mientras el bot procesa cada mensaje.
