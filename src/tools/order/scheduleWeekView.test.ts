import { describe, expect, it, vi } from "vitest";

import { createScheduleWeekViewTool } from "./scheduleWeekView";

describe("schedule-week-view tool", () => {
  it("fails when anchor week date is invalid", async () => {
    const executeScheduleDayViewFn = vi.fn();
    const tool = createScheduleWeekViewTool({
      executeScheduleDayViewFn
    });

    await expect(
      tool({
        chat_id: "chat-1",
        week: { type: "week", anchorDateKey: "2026-99-99", label: "esta semana" }
      })
    ).rejects.toThrow("schedule_week_view_week_invalid");

    expect(executeScheduleDayViewFn).not.toHaveBeenCalled();
  });

  it("aggregates the week from day views and keeps Monday-Sunday order", async () => {
    const executeScheduleDayViewFn = vi.fn(async ({ day }: { day: { dateKey: string; label: string } }) => {
      const totalOrdersByDay: Record<string, number> = {
        "2026-03-23": 1,
        "2026-03-24": 2,
        "2026-03-25": 0,
        "2026-03-26": 0,
        "2026-03-27": 0,
        "2026-03-28": 0,
        "2026-03-29": 0
      };
      const totalOrders = totalOrdersByDay[day.dateKey] ?? 0;

      return {
        day: {
          type: "day" as const,
          dateKey: day.dateKey,
          label: day.label
        },
        timezone: "America/Mexico_City",
        trace_ref: `schedule-day-view:${day.dateKey}:a1`,
        totalOrders,
        deliveries: totalOrders > 0
          ? [
            {
              folio: `op-${day.dateKey}`,
              fecha_hora_entrega: `${day.dateKey} 10:00`,
              nombre_cliente: "Ana",
              producto: day.dateKey === "2026-03-24" ? "pastel" : "cupcakes",
              cantidad: totalOrders
            }
          ]
          : [],
        preparation: totalOrders > 0
          ? [
            {
              product: day.dateKey === "2026-03-24" ? "pastel" : "cupcakes",
              quantity: totalOrders,
              orders: totalOrders
            }
          ]
          : [],
        suggestedPurchases: totalOrders > 0
          ? [
            {
              item: "harina",
              unit: "g",
              amount: 100 * totalOrders,
              sourceProducts: [day.dateKey === "2026-03-24" ? "pastel" : "cupcakes"],
              source: "catalog" as const
            }
          ]
          : [],
        inconsistencies: [],
        assumptions: [],
        detail: "schedule-day-view mock"
      };
    });

    const tool = createScheduleWeekViewTool({
      executeScheduleDayViewFn,
      timezone: "America/Mexico_City"
    });

    const result = await tool({
      chat_id: "chat-1",
      week: { type: "week", anchorDateKey: "2026-03-25", label: "esta semana" }
    });

    expect(result.trace_ref).toBe("schedule-week-view:2026-03-23:a1");
    expect(result.totalOrders).toBe(3);
    expect(result.days).toHaveLength(7);
    expect(result.days.map((item) => item.day.dateKey)).toEqual([
      "2026-03-23",
      "2026-03-24",
      "2026-03-25",
      "2026-03-26",
      "2026-03-27",
      "2026-03-28",
      "2026-03-29"
    ]);
    expect(result.reminders).toHaveLength(2);
    expect(result.preparation).toEqual([
      {
        product: "pastel",
        quantity: 2,
        orders: 2
      },
      {
        product: "cupcakes",
        quantity: 1,
        orders: 1
      }
    ]);
    expect(result.suggestedPurchases).toEqual([
      {
        item: "harina",
        unit: "g",
        amount: 300,
        sourceProducts: ["cupcakes", "pastel"],
        source: "catalog"
      }
    ]);
  });

  it("propagates day inconsistencies and assumptions with date key", async () => {
    const executeScheduleDayViewFn = vi.fn(async ({ day }: { day: { dateKey: string; label: string } }) => ({
      day: {
        type: "day" as const,
        dateKey: day.dateKey,
        label: day.label
      },
      timezone: "America/Mexico_City",
      trace_ref: `schedule-day-view:${day.dateKey}:a2`,
      totalOrders: day.dateKey === "2026-03-24" ? 1 : 0,
      deliveries: day.dateKey === "2026-03-24"
        ? [
          {
            folio: "op-bad",
            fecha_hora_entrega: "2026-03-24 09:00",
            nombre_cliente: "Luis",
            producto: "pastel",
            cantidad: 0,
            cantidad_invalida: true
          }
        ]
        : [],
      preparation: [],
      suggestedPurchases: [],
      inconsistencies: day.dateKey === "2026-03-24"
        ? [
          {
            reference: "op-bad",
            reason: "quantity_invalid" as const,
            affects: "preparation_and_purchases" as const,
            detail: "cantidad invalida"
          }
        ]
        : [],
      assumptions: day.dateKey === "2026-03-24" ? ["cantidad inválida excluida"] : [],
      detail: "schedule-day-view mock"
    }));

    const tool = createScheduleWeekViewTool({
      executeScheduleDayViewFn,
      timezone: "America/Mexico_City"
    });

    const result = await tool({
      chat_id: "chat-1",
      week: { type: "week", anchorDateKey: "2026-03-24", label: "esta semana" }
    });

    expect(result.trace_ref).toBe("schedule-week-view:2026-03-23:a2");
    expect(result.inconsistencies.some((item) => item.dateKey === "2026-03-24" && item.reference === "op-bad")).toBe(true);
    expect(result.assumptions).toContain("2026-03-24: cantidad inválida excluida");
  });

  it("fails when one day resolution fails", async () => {
    const executeScheduleDayViewFn = vi.fn(async ({ day }: { day: { dateKey: string } }) => {
      if (day.dateKey === "2026-03-23") {
        throw new Error("schedule_day_view_gws_failed");
      }

      return {
        day: { type: "day" as const, dateKey: day.dateKey, label: day.dateKey },
        timezone: "America/Mexico_City",
        trace_ref: `schedule-day-view:${day.dateKey}:a1`,
        totalOrders: 0,
        deliveries: [],
        preparation: [],
        suggestedPurchases: [],
        inconsistencies: [],
        assumptions: [],
        detail: "schedule-day-view mock"
      };
    });

    const tool = createScheduleWeekViewTool({
      executeScheduleDayViewFn,
      timezone: "America/Mexico_City"
    });

    await expect(
      tool({
        chat_id: "chat-1",
        week: { type: "week", anchorDateKey: "2026-03-25", label: "esta semana" }
      })
    ).rejects.toThrow("schedule_week_view_day_failed:2026-03-23:schedule_day_view_gws_failed");
  });
});
