import {
  createReportOrdersTool,
  type OrderReportInconsistency,
  type OrderReportItem,
  type OrderReportPeriod,
  type OrderReportPeriodFilter,
  type OrderReportResult,
  type ReportOrdersToolConfig
} from "./reportOrders";

export type ReportReminderStatus = "overdue" | "due_soon" | "upcoming";

export type OrderReminderItem = OrderReportItem & {
  reminder_status: ReportReminderStatus;
  minutes_to_delivery: number;
};

export type OrderReminderResult = {
  period: OrderReportPeriodFilter;
  timezone: string;
  generated_at: string;
  total: number;
  reminders: OrderReminderItem[];
  inconsistencies: OrderReportInconsistency[];
  trace_ref: string;
  detail: string;
};

export type ReportRemindersToolConfig = ReportOrdersToolConfig & {
  executeOrderReportFn?: (args: {
    chat_id: string;
    period: OrderReportPeriod;
    limit?: number;
  }) => Promise<OrderReportResult>;
  dueSoonMinutes?: number;
  queryLimit?: number;
};

function parseAttempt(traceRef: string): number {
  const match = traceRef.match(/:a(\d+)$/);
  const value = match?.[1] ? Number(match[1]) : 1;
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function buildTraceRef(period: OrderReportPeriodFilter, attempt: number): string {
  const token = period.type === "day"
    ? `day-${period.dateKey}`
    : period.type === "week"
      ? `week-${period.anchorDateKey}`
      : period.type === "month"
        ? `month-${period.year}-${String(period.month).padStart(2, "0")}`
        : `year-${period.year}`;
  return `report-reminders:${token}:a${attempt}`;
}

function parseDeliveryMs(order: OrderReportItem): number | undefined {
  const iso = order.fecha_hora_entrega_iso?.trim();
  if (iso) {
    const parsed = Date.parse(iso);
    if (Number.isFinite(parsed)) return parsed;
  }

  const fallback = order.fecha_hora_entrega?.trim();
  if (fallback) {
    const parsed = Date.parse(fallback);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function buildReminderStatus(args: {
  deliveryMs: number;
  nowMs: number;
  dueSoonMinutes: number;
}): ReportReminderStatus {
  const diffMinutes = Math.round((args.deliveryMs - args.nowMs) / 60_000);
  if (diffMinutes < 0) return "overdue";
  if (diffMinutes <= args.dueSoonMinutes) return "due_soon";
  return "upcoming";
}

function sortReminderRows(a: OrderReminderItem, b: OrderReminderItem): number {
  const rank = (value: ReportReminderStatus): number => {
    if (value === "overdue") return 0;
    if (value === "due_soon") return 1;
    return 2;
  };

  const rankA = rank(a.reminder_status);
  const rankB = rank(b.reminder_status);
  if (rankA !== rankB) return rankA - rankB;

  if (a.reminder_status === "overdue" && b.reminder_status === "overdue") {
    return b.minutes_to_delivery - a.minutes_to_delivery;
  }
  return a.minutes_to_delivery - b.minutes_to_delivery;
}

function dedupeInconsistencies(values: OrderReportInconsistency[]): OrderReportInconsistency[] {
  const seen = new Set<string>();
  const out: OrderReportInconsistency[] = [];

  for (const value of values) {
    const key = `${value.reference}|${value.reason}|${value.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }

  return out;
}

export function createReportRemindersTool(config: ReportRemindersToolConfig = {}) {
  const executeOrderReportFn = config.executeOrderReportFn ?? createReportOrdersTool(config);
  const now = config.now ?? (() => new Date());
  const dueSoonMinutes = Number.isFinite(config.dueSoonMinutes) && (config.dueSoonMinutes ?? 0) > 0
    ? Math.trunc(config.dueSoonMinutes!)
    : 120;
  const limit = Number.isFinite(config.limit) && (config.limit ?? 0) > 0 ? Math.trunc(config.limit!) : 10;
  const queryLimit = Number.isFinite(config.queryLimit) && (config.queryLimit ?? 0) > 0 ? Math.trunc(config.queryLimit!) : 200;

  return async function reportReminders(args: {
    chat_id: string;
    period: OrderReportPeriod;
    limit?: number;
  }): Promise<OrderReminderResult> {
    const report = await executeOrderReportFn({
      chat_id: args.chat_id,
      period: args.period,
      limit: queryLimit
    });

    const nowMs = now().getTime();
    const extraInconsistencies: OrderReportInconsistency[] = [];
    const reminders = report.orders
      .map((order) => {
        const deliveryMs = parseDeliveryMs(order);
        if (deliveryMs == null) {
          extraInconsistencies.push({
            reference: order.folio || order.operation_id || "sin_referencia",
            reason: "delivery_date_missing_or_invalid",
            detail: order.fecha_hora_entrega_iso || order.fecha_hora_entrega || "sin fecha"
          });
          return undefined;
        }

        const minutesToDelivery = Math.round((deliveryMs - nowMs) / 60_000);
        return {
          ...order,
          reminder_status: buildReminderStatus({
            deliveryMs,
            nowMs,
            dueSoonMinutes
          }),
          minutes_to_delivery: minutesToDelivery
        };
      })
      .filter((value): value is OrderReminderItem => Boolean(value))
      .sort(sortReminderRows);

    const maxRows = Number.isFinite(args.limit) && (args.limit ?? 0) > 0 ? Math.trunc(args.limit!) : limit;
    const finalInconsistencies = dedupeInconsistencies([...report.inconsistencies, ...extraInconsistencies]);

    return {
      period: report.period,
      timezone: report.timezone,
      generated_at: now().toISOString(),
      total: reminders.length,
      reminders: reminders.slice(0, maxRows),
      inconsistencies: finalInconsistencies,
      trace_ref: buildTraceRef(report.period, parseAttempt(report.trace_ref)),
      detail: `report-reminders executed (source_total=${report.total}, reminders=${reminders.length}, inconsistencies=${finalInconsistencies.length})`
    };
  };
}

export const reportRemindersTool = createReportRemindersTool();
