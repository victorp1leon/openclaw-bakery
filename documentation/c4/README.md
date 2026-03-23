# C4 and Specs

Status: MVP  
Last Updated: 2026-03-23

## Purpose
Referencia de arquitectura tecnica (C4) y apoyo para diagramas.
Los contratos canonicos de implementacion viven en `documentation/specs/contracts/components/**`.

## Contents
- `ComponentSpecs/system.description.md`: vista de contenedores (C4 L2).
- `ComponentSpecs/*/component.description.md`: vista de componentes (C4 L3).
- `bot-bakery-c4.drawio`: diagrama C4 editable.
- `c4-instructions-bot-bakery.md`: prompt/instrucciones para regenerar diagramas.
- `documentation/specs/contracts/components/`: contratos canonicos activos por componente.

## Rule
Si cambia arquitectura, actualizar C4 (`documentation/c4/**`).
Si cambia contrato de comportamiento, actualizar primero el contrato canonico en `documentation/specs/contracts/components/**`; C4 mantiene foco arquitectonico (no contractual) y debe alinearse en descripciones/diagramas.
