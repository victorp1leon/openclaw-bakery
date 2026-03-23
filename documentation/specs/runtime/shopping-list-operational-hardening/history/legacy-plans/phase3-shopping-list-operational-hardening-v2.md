# Phase 3 - shopping.list.generate operational hardening v2

> **Type:** `Implementation`
> **Status:** `Complete`
> **Created:** `2026-03-21`
> **Last Updated:** `2026-03-21`

## Cross-References
| Documento | Ruta | Uso |
|---|---|---|
| Plan base shopping list | `documentation/ai_collaboration/plans/runtime/implementation/phase3-shopping-list-generate-v1.md` | Contexto funcional inicial |
| Tool spec | `documentation/specs/contracts/components/shopping-list-generate.spec.md` | Contrato actualizado de reglas operativas |
| Runtime spec | `documentation/specs/contracts/components/conversation-processor.spec.md` | Reglas de respuesta conversacional read-only |

## Contexto
Durante sesión de `grill-me` se detectaron riesgos operativos en `shopping.list.generate`: supuestos silenciosos de cantidad (`1`), productos sin receta mezclados en compras y falla dura cuando `CatalogoRecetas` (`gws`) está vacío o con errores. Se acordó endurecer el comportamiento para priorizar confiabilidad operativa y continuidad.

## Alcance
### In Scope
- Excluir del cálculo pedidos con `cantidad` inválida (vacía, no numérica, decimal o `<= 0`).
- Excluir de `supplies` productos sin receta y exponer bloque de intervención manual requerida.
- Activar fallback a recetas `inline` cuando falle lectura de recetas `gws` o catálogo válido quede vacío.
- Cambiar límite default del tool a top 10 pedidos (más próximos primero).
- Actualizar tests, specs y artefactos de colaboración.

### Out of Scope
- Cambios de estructura en hojas `Pedidos` o `CatalogoRecetas`.
- Automatización de alertas externas (Slack/Telegram) por fallback.
- Cambios en `inventory.consume`.

## Approach
| # | Paso | Estado | Notas |
|---|---|---|---|
| 1 | Endurecer parsing/cálculo en tool | Complete | `cantidad` inválida se omite y se registra intervención manual |
| 2 | Ajustar agregación de insumos sin fallback genérico | Complete | producto sin receta ya no agrega `empaque_generico` |
| 3 | Implementar fallback `gws -> inline` en recetas | Complete | aplica para `shopping_list_recipes_catalog_empty` y `shopping_list_recipes_gws_*` |
| 4 | Exponer intervención manual en runtime reply | Complete | bloque explícito en `formatShoppingListReply` |
| 5 | Validar con tests y actualizar specs | Complete | tests tool/runtime en verde + specs C4 actualizadas |

## Decisions & Trade-offs
| Decision | Rationale | Date |
|---|---|---|
| Excluir cantidades inválidas en vez de asumir `1` | Reduce sobre/subestimación silenciosa de compras | 2026-03-21 |
| Lista parcial + intervención manual para productos sin receta | Mantiene continuidad operativa sin inventar insumos | 2026-03-21 |
| Fallback a `inline` para fallas/empty en recetas `gws` | Evita caída total de operación read-only | 2026-03-21 |
| Top 10 pedidos por defecto | Controla volumen y prioriza lo inmediato | 2026-03-21 |

## Validation
- `npx vitest run src/tools/order/shoppingListGenerate.test.ts`
- `npx vitest run src/runtime/conversationProcessor.test.ts -t "resuelve lista de insumos sin pasar por intent router|muestra bloque de intervención manual en lista de insumos cuando aplica|pide alcance faltante para lista de insumos y luego responde"`
- `npx vitest run src/runtime/conversationProcessor.test.ts`
- `npm run check:intent-skills`

## Outcome
`shopping.list.generate` quedó más robusto para operación real:
- cálculo de insumos sin cantidades dudosas;
- fallback seguro a recetas base cuando recetas `gws` no están disponibles;
- señalización visible de intervención manual requerida;
- límite default top 10 para resultados manejables.
