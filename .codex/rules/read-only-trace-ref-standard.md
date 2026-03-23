# Rule: Read-Only Trace Ref Standard

## Policy
- Todo intent read-only que responda datos operativos debe incluir una referencia visible `Ref: <trace_ref>` en la salida al usuario.
- Si el tool read-only falla, runtime debe responder mensaje controlado + `Ref` soporte (sin exponer detalle crudo de proveedor).
- El `trace_ref` debe ser deterministico por ejecucion y mantenerse tambien en trazas internas (`onTrace`) para correlacion.

## Scope
- Applies to intents read-only del runtime (por ejemplo: `order.lookup`, `order.status`, `report.orders`, `schedule.day_view`, `shopping.list.generate` cuando aplique soporte operativo).
- Aplica en:
  - `src/tools/**` (resultado del tool)
  - `src/runtime/conversationProcessor.ts` (formato de respuesta y fallos)
  - contratos canonicos `documentation/specs/contracts/components/**` relacionados

## Implementation Checklist
1. Tool contract incluye `trace_ref` en su resultado estructurado.
2. Runtime muestra `Ref` en:
   - respuesta exitosa (incluyendo no-encontrado)
   - falla controlada
3. `onTrace` conserva `trace_ref` o `ref` para soporte.
4. Tests cubren exito/no-encontrado/falla con `Ref`.
5. Skill funcional del intent refleja la politica de trazabilidad visible.

## Guardrails
- Nunca mostrar stack trace, stderr crudo, tokens o secretos al usuario.
- `Ref` no reemplaza logs internos; ambos son obligatorios para diagnostico.
- Si un intent read-only no puede generar `trace_ref`, bloquear merge/commit hasta resolver.
