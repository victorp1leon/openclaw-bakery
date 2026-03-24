# Smoke Chat ID Isolation

## Objective
Evitar falsos negativos en smoke tests por estado conversacional residual (`pending`) en SQLite.

## Rule
1. Todo smoke manual debe ejecutarse con `SMOKE_CHAT_ID` unico por corrida cuando el script interactua con `conversationProcessor`.
2. Si no se define `SMOKE_CHAT_ID`, asumir riesgo de colision con estado previo y tratar el resultado como no concluyente.
3. En runners agregados de smoke summary, preferir generacion automatica de chat id aislado por escenario.

## Standard Pattern
- Manual:
  - `SMOKE_CHAT_ID=smoke-<feature>-<yyyymmddhhmmss> npm run smoke:<feature>`
- Lotes:
  - generar un `runId` y derivar chat ids por escenario.

## Validation
- Antes de marcar smoke como falla funcional, confirmar que `SMOKE_CHAT_ID` fue aislado.
- Si la falla fue por `operación pendiente` con chat id reutilizado, reintentar con chat id nuevo.
