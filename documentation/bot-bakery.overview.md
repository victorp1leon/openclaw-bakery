# OpenClaw Bakery Bot - Overview

Status: MVP
Last Updated: 2026-02-26

## What It Is
A conversational bot for a bakery business that receives chat messages (console/Telegram), interprets free-form text using OpenClaw + a local model, and safely executes business actions.

## Problem It Solves
It centralizes common business operations in natural language:
- record expenses
- capture orders
- check schedules/reports
- manage customers
- calculate costs/profit
- (later) update the website

## Design Principles
- The LLM model **interprets**; the local runtime **validates and controls**.
- No external integration runs without `confirmar`.
- Every action must be traceable (`operation_id`) and idempotent.
- The bot must tolerate incomplete/noisy model responses (fallback + sanitization).

## Current Scope (Implemented)
- Base conversational flow (`gasto`, `pedido`, `web`, `ayuda`)
- JSON parser with OpenClaw + local heuristics
- Zod validation + one missing field at a time
- Universal confirm/cancel flow
- SQLite state + dedupe/idempotency
- Channels: console and Telegram (long polling)

## Next Scope (Priority)
- `expense.add` end-to-end with a real Google Sheets connector (Apps Script)
- `order.create` end-to-end with Trello + Sheets
