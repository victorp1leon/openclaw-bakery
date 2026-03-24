---
name: admin.code_review_graph
description: Use when admin requests code-review-graph operations (build, impact, context) under repository allowlist and safe output constraints.
---

# skill: admin.code_review_graph

## Overview
Ejecuta capacidades de Code Review Graph en modo admin con guardrails: allowlist de repos, timeouts y salida sanitizada/truncada.

## When To Use
- El admin solicita `crg`/`code review graph` para build, impact radius o review context.
- Ejemplos: `admin crg build`, `admin crg impact src/file.ts depth 2`, `admin crg context src/file.ts line 120`.

## When Not To Use
- Consultas de negocio (pedidos/reportes/pagos).
- Operaciones fuera de repos allowlisted.
- Solicitudes que requieren mutar configuracion runtime.

## Input Contract
- Texto admin con operacion CRG (`build_or_update_graph|get_impact_radius|get_review_context`).
- Para `impact/context`: `target_file` requerido; `line_number` solo en context.

## Output Contract
- Respuesta textual con estado (`OK|ERROR`), resumen, repo, tiempo y `Ref`.
- En errores: mensaje controlado con `Ref`.

## Workflow
1. Parsear comando CRG y validar operacion requerida.
2. Validar precondiciones (feature flag, archivo requerido en impact/context).
3. Ejecutar adapter CRG con guardrails activos.
4. Formatear salida resumida y trazable.

## Safety Constraints
- Respetar allowlist de repos y validacion de paths.
- No exponer stderr crudo ni contenido sensible en respuesta.
- Aplicar timeouts y truncation de salida.

## Common Mistakes
- Ejecutar CRG con feature flag deshabilitado.
- No pedir `target_file` en `impact/context`.
- Retornar diagnostico interno sin sanitizar.
