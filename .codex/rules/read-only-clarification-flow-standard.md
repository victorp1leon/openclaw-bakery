# Rule: Read-Only Clarification Flow Standard

## Policy
- Todo intent read-only que requiera una referencia de consulta debe pedir aclaracion explicita cuando esa referencia falte o sea ambigua.
- La aclaracion debe pedir exactamente un dato accionable por turno (ej. `folio|operation_id|cliente|producto`), sin inventar contexto previo.
- El flujo de aclaracion debe mantener el mismo contrato de trazabilidad (`Ref`) en la respuesta final (exito/no-encontrado/falla).

## Scope
- Aplica a intents read-only del runtime con busqueda de pedidos o filtros (por ejemplo: `order.lookup`, `order.status`, `report.orders`, `schedule.day_view`, `shopping.list.generate` cuando use lookup textual).
- Aplica en:
  - `src/runtime/conversationProcessor.ts` (deteccion + pending + mensajes)
  - `src/runtime/persona.ts` (prompt `askFor` para aclaracion)
  - specs/skills relacionadas

## Implementation Checklist
1. Detectar request ambiguo/sin query con guard dedicado (no mezclar con deteccion del happy path).
2. Crear `pending` con `intent` correcto y `asked` especifico (`<intent>_query` o equivalente).
3. Resolver la aclaracion en rama `pending` del mismo intent antes de volver al router global.
4. Reintentar `askFor` si la aclaracion sigue invalida (`*_query_invalid`).
5. Mantener respuesta final con `Ref` y falla controlada.

## Mandatory Validation
1. Ejecutar tests focalizados de runtime:
   - `npm test -- src/runtime/conversationProcessor.test.ts`
2. Si se modifica tool/config de ese intent, ejecutar tests focalizados adicionales.
3. Ejecutar cobertura de skills:
   - `npm run check:intent-skills`
4. Incluir al menos un test de no-interferencia entre intents vecinos.

## Reporting
- En cierre de tarea/commit, declarar:
  - intents read-only con aclaracion implementada/ajustada
  - prompt de aclaracion usado
  - tests de pending + no-interferencia ejecutados.
