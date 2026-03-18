# Rule: Mutation Clarification Flow Standard

## Policy
- Todo intent mutable que requiera referencia o payload parcial debe pedir aclaracion explicita cuando falte dato clave o la referencia sea ambigua.
- La aclaracion debe pedir exactamente un dato accionable por turno (ej. `folio|operation_id`, o "que campo quieres actualizar").
- Si se dispara lookup por texto libre y hay multiples coincidencias, se debe responder con lista corta (maximo 5) y solicitar seleccion explicita de `folio|operation_id`.
- Durante aclaracion/desambiguacion se debe conservar el mismo `operation_id`, `idempotency_key` y payload parcial.
- En fallos de ejecucion, la operacion queda reintentable por usuario (`confirmar`) con respuesta controlada.

## Scope
- Aplica a intents mutables con confirm flow y referencia de pedido (por ejemplo: `order.update`, `order.cancel`, `payment.record`, `inventory.consume` cuando use lookup textual).
- Aplica en:
  - `src/runtime/conversationProcessor.ts` (deteccion + pending + aclaracion/desambiguacion)
  - `src/runtime/persona.ts` (prompts de faltantes)
  - specs/skills de intents mutables relacionados

## Implementation Checklist
1. Detectar faltante o ambiguedad con guard dedicado del intent mutable (no mezclar con happy path).
2. Crear/actualizar `pending` del mismo intent con `asked` y `missing` precisos.
3. Reusar el mismo `operation_id` e `idempotency_key` hasta llegar al resumen de confirmacion.
4. Cuando haya ambiguedad por lookup, devolver lista acotada de opciones y pedir seleccion por `folio|operation_id`.
5. Si falta patch/cambio en mutaciones tipo update, pedir el faltante en lugar de fallar parseo inmediatamente.
6. Mantener mensajes de fallo controlados y permitir reintento por confirmacion.

## Mandatory Validation
1. Ejecutar tests focalizados de runtime:
   - `npm test -- src/runtime/conversationProcessor.test.ts`
2. Si se modifican tools/config del intent mutable, ejecutar tests focalizados adicionales.
3. Ejecutar cobertura intent-skill:
   - `npm run check:intent-skills`
4. Incluir al menos un test de ambiguedad y uno de faltante para el intent mutable afectado.

## Reporting
- En cierre de tarea/commit, declarar:
  - intents mutables con aclaracion/desambiguacion implementada o ajustada
  - prompts de faltantes usados
  - tests de pending/ambiguedad ejecutados
