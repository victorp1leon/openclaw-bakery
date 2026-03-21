# Session Handoff: Phase 3 - shopping.list.generate operational hardening v2 - 2026-03-21

> **Plan:** `documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-operational-hardening-v2.md`
> **Date:** `2026-03-21`
> **Owner:** `Codex + Dev`

## What Was Done
- Se endureció `src/tools/order/shoppingListGenerate.ts` para excluir pedidos con `cantidad` inválida (vacía/no numérica/decimal/`<=0`) del cálculo de compras.
- Se removió fallback de `empaque_generico` para productos sin receta; ahora se marcan como intervención manual requerida.
- Se agregó fallback de recetas `gws` a `inline` cuando falla lectura `shopping_list_recipes_gws_*` o catálogo queda vacío.
- Se cambió límite default a top 10 pedidos (más próximos primero).
- Se ajustó `formatShoppingListReply` para mostrar bloque explícito de intervención manual.
- Se actualizaron tests de tool/runtime y specs C4.
- Se agregó regla reusable `.codex/rules/read-only-partial-intervention-standard.md` y se sincronizó `.codex/skill-registry.md`.

## Current State
- Tool y runtime de shopping list con comportamiento operativo endurecido y cobertura de tests en verde.
- Respuesta conversacional muestra claramente qué parte requiere intervención manual.
- No se ejecutó commit en esta sesión.

## Open Issues
- No hay alerta externa automática cuando se activa fallback `inline`; hoy queda visible en respuesta/supuestos y `detail`.

## Next Steps
1. Validar en Telegram casos reales: pedidos con cantidad inválida y producto nuevo sin receta.
2. Si el comportamiento es correcto, crear commit con cambios de código + docs de esta iteración.

## Key Decisions
- Priorizar precisión operativa sobre “rellenar” faltantes con supuestos implícitos.
- Mantener continuidad de servicio con fallback a recetas base en fallas de catálogo `gws`.
