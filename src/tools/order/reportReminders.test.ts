import { describe, expect, it, vi } from "vitest";

import { createReportRemindersTool } from "./reportReminders";

describe("report-reminders tool", () => {
  it("builds reminders sorted by urgency and delivery proximity", async () => {
    const executeOrderReportFn = vi.fn(async () => ({
      period: { type: "day", dateKey: "2026-03-24", label: "hoy" } as const,
      timezone: "America/Mexico_City",
      total: 4,
      orders: [
        {
          folio: "op-upcoming",
          fecha_hora_entrega: "2026-03-24 19:00",
          fecha_hora_entrega_iso: "2026-03-24T19:00:00.000Z",
          nombre_cliente: "Ana",
          producto: "pastel"
        },
        {
          folio: "op-soon",
          fecha_hora_entrega: "2026-03-24 13:00",
          fecha_hora_entrega_iso: "2026-03-24T13:00:00.000Z",
          nombre_cliente: "Luis",
          producto: "cupcakes"
        },
        {
          folio: "op-overdue",
          fecha_hora_entrega: "2026-03-24 11:00",
          fecha_hora_entrega_iso: "2026-03-24T11:00:00.000Z",
          nombre_cliente: "Eva",
          producto: "brownie"
        },
        {
          folio: "op-overdue-old",
          fecha_hora_entrega: "2026-03-24 08:00",
          fecha_hora_entrega_iso: "2026-03-24T08:00:00.000Z",
          nombre_cliente: "Iris",
          producto: "donas"
        }
      ],
      inconsistencies: [],
      trace_ref: "report-orders:day-2026-03-24:a2",
      detail: "report-orders executed"
    }));

    const tool = createReportRemindersTool({
      executeOrderReportFn,
      now: () => new Date("2026-03-24T12:00:00.000Z"),
      dueSoonMinutes: 120
    });

    const result = await tool({
      chat_id: "chat-1",
      period: { type: "day", dateKey: "2026-03-24", label: "hoy" }
    });

    expect(result.total).toBe(4);
    expect(result.trace_ref).toBe("report-reminders:day-2026-03-24:a2");
    expect(result.reminders.map((item) => item.folio)).toEqual([
      "op-overdue",
      "op-overdue-old",
      "op-soon",
      "op-upcoming"
    ]);
    expect(result.reminders.map((item) => item.reminder_status)).toEqual([
      "overdue",
      "overdue",
      "due_soon",
      "upcoming"
    ]);
  });

  it("keeps report inconsistencies and adds invalid reminder datetime inconsistencies", async () => {
    const executeOrderReportFn = vi.fn(async () => ({
      period: { type: "week", anchorDateKey: "2026-03-24", label: "esta semana" } as const,
      timezone: "America/Mexico_City",
      total: 2,
      orders: [
        {
          folio: "op-invalid",
          fecha_hora_entrega: "por definir",
          nombre_cliente: "Ana",
          producto: "pastel"
        },
        {
          folio: "op-valid",
          fecha_hora_entrega: "2026-03-25 10:00",
          fecha_hora_entrega_iso: "2026-03-25T10:00:00.000Z",
          nombre_cliente: "Luis",
          producto: "cupcakes"
        }
      ],
      inconsistencies: [
        {
          reference: "op-pre",
          reason: "delivery_date_missing_or_invalid" as const,
          detail: "fila previa invalida"
        }
      ],
      trace_ref: "report-orders:week-2026-03-24:a1",
      detail: "report-orders executed"
    }));

    const tool = createReportRemindersTool({
      executeOrderReportFn,
      now: () => new Date("2026-03-24T12:00:00.000Z")
    });

    const result = await tool({
      chat_id: "chat-1",
      period: { type: "week", anchorDateKey: "2026-03-24", label: "esta semana" }
    });

    expect(result.total).toBe(1);
    expect(result.reminders[0]?.folio).toBe("op-valid");
    expect(result.inconsistencies).toHaveLength(2);
    expect(result.inconsistencies.some((item) => item.reference === "op-pre")).toBe(true);
    expect(result.inconsistencies.some((item) => item.reference === "op-invalid")).toBe(true);
  });

  it("applies output limit while preserving total", async () => {
    const executeOrderReportFn = vi.fn(async () => ({
      period: { type: "month", year: 2026, month: 3, label: "marzo" } as const,
      timezone: "America/Mexico_City",
      total: 3,
      orders: [
        {
          folio: "op-1",
          fecha_hora_entrega: "2026-03-24 12:30",
          fecha_hora_entrega_iso: "2026-03-24T12:30:00.000Z",
          nombre_cliente: "Ana",
          producto: "pastel"
        },
        {
          folio: "op-2",
          fecha_hora_entrega: "2026-03-24 13:00",
          fecha_hora_entrega_iso: "2026-03-24T13:00:00.000Z",
          nombre_cliente: "Luis",
          producto: "cupcakes"
        },
        {
          folio: "op-3",
          fecha_hora_entrega: "2026-03-24 14:00",
          fecha_hora_entrega_iso: "2026-03-24T14:00:00.000Z",
          nombre_cliente: "Eva",
          producto: "galletas"
        }
      ],
      inconsistencies: [],
      trace_ref: "report-orders:month-2026-03:a1",
      detail: "report-orders executed"
    }));

    const tool = createReportRemindersTool({
      executeOrderReportFn,
      now: () => new Date("2026-03-24T12:00:00.000Z"),
      limit: 2
    });

    const result = await tool({
      chat_id: "chat-1",
      period: { type: "month", year: 2026, month: 3, label: "marzo" }
    });

    expect(result.total).toBe(3);
    expect(result.reminders).toHaveLength(2);
  });
});
