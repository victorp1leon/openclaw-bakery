# Rule: Intent-to-Skill Coverage Gate

## Policy
- Todo intent operativo activo en runtime debe tener una skill funcional documentada en `skills/<intent>/SKILL.md` o un mapeo canonico equivalente.
- No cerrar implementaciones ni commits de intents nuevos sin validar esta cobertura.

## Canonical Mapping
- `gasto` -> `skills/expense.add/SKILL.md`
- `pedido` -> `skills/order.create/SKILL.md`
- `reporte` -> `skills/order.report/SKILL.md`
- `web` -> `skills/web.publish/SKILL.md`
- Resto: `intent` == carpeta (`order.update`, `payment.record`, etc.).

## When This Rule Applies
- Cambios en `src/runtime/conversationProcessor.ts` que agregan/modifican intents.
- Cambios en `src/skills/*` o `src/tools/*` que introducen intents nuevos de producto.
- Cambios en specs/roadmap que agregan intents implementables.

## Mandatory Check
1. Ejecutar verificacion automatica:
   - `npm run check:intent-skills`
2. Si el comando falla, revisar intents detectados en runtime:
   - `rg -o 'intent: "[^"]+"' src/runtime/conversationProcessor.ts | sed 's/intent: "//;s/"$//' | sort -u`
3. Si falta alguna cobertura, crear `skills/<intent-or-mapping>/SKILL.md` en el mismo ciclo.

## Reporting
- En cierre de tarea/commit, declarar:
  - intents revisados
  - skills presentes/faltantes
  - mapeos aplicados (si hubo alias como `web -> web.publish`).
