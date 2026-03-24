import {
  createScheduleDayViewTool,
  type ScheduleDayDeliveryItem,
  type ScheduleDayFilter,
  type ScheduleDayInconsistencyItem,
  type ScheduleDayPreparationItem,
  type ScheduleDayPurchaseItem,
  type ScheduleDayViewResult,
  type ScheduleDayViewToolConfig
} from "./scheduleDayView";

export type ScheduleWeekFilter = {
  type: "week";
  anchorDateKey: string;
  label: string;
};

export type ScheduleWeekDayItem = {
  day: ScheduleDayFilter;
  totalOrders: number;
  deliveries: ScheduleDayDeliveryItem[];
  preparation: ScheduleDayPreparationItem[];
  suggestedPurchases: ScheduleDayPurchaseItem[];
  inconsistencies: ScheduleDayInconsistencyItem[];
  trace_ref: string;
  detail: string;
};

export type ScheduleWeekReminderItem = {
  dateKey: string;
  label: string;
  totalOrders: number;
  firstDelivery?: string;
  lastDelivery?: string;
};

export type ScheduleWeekInconsistencyItem = ScheduleDayInconsistencyItem & {
  dateKey: string;
};

export type ScheduleWeekViewResult = {
  week: ScheduleWeekFilter;
  timezone: string;
  trace_ref: string;
  totalOrders: number;
  days: ScheduleWeekDayItem[];
  reminders: ScheduleWeekReminderItem[];
  preparation: ScheduleDayPreparationItem[];
  suggestedPurchases: ScheduleDayPurchaseItem[];
  inconsistencies: ScheduleWeekInconsistencyItem[];
  assumptions: string[];
  detail: string;
};

export type ScheduleWeekViewToolConfig = ScheduleDayViewToolConfig & {
  executeScheduleDayViewFn?: (args: { chat_id: string; day: ScheduleDayFilter }) => Promise<ScheduleDayViewResult>;
};

const DAY_MS = 86_400_000;
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dateFromDateKey(dateKey: string): Date | undefined {
  const match = dateKey.match(DATE_KEY_RE);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return undefined;
  }

  return candidate;
}

function toDateKeyFromDate(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function weekdayIndex(date: Date, timezone: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  }).format(date);

  if (wd === "Sun") return 0;
  if (wd === "Mon") return 1;
  if (wd === "Tue") return 2;
  if (wd === "Wed") return 3;
  if (wd === "Thu") return 4;
  if (wd === "Fri") return 5;
  return 6;
}

function buildWeekDateKeys(anchor: Date, timezone: string): string[] {
  const weekday = weekdayIndex(anchor, timezone);
  const offsetToMonday = (weekday + 6) % 7;
  const out: string[] = [];

  for (let i = -offsetToMonday; i <= 6 - offsetToMonday; i += 1) {
    out.push(toDateKeyFromDate(new Date(anchor.getTime() + i * DAY_MS), timezone));
  }

  return out;
}

function buildDayLabel(dateKey: string, timezone: string): string {
  const date = dateFromDateKey(dateKey);
  if (!date) return `el ${dateKey}`;
  const weekday = new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    weekday: "long"
  }).format(date);

  return `${weekday} ${dateKey}`;
}

function parseAttempt(traceRef: string): number {
  const match = traceRef.match(/:a(\d+)$/);
  const value = match?.[1] ? Number(match[1]) : 1;
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function aggregatePreparation(days: ScheduleWeekDayItem[]): ScheduleDayPreparationItem[] {
  const byProduct = new Map<string, ScheduleDayPreparationItem>();

  for (const day of days) {
    for (const prep of day.preparation) {
      const key = prep.product.trim().toLowerCase();
      const existing = byProduct.get(key);
      if (!existing) {
        byProduct.set(key, {
          product: prep.product,
          quantity: prep.quantity,
          orders: prep.orders
        });
        continue;
      }

      existing.quantity += prep.quantity;
      existing.orders += prep.orders;
    }
  }

  return [...byProduct.values()].sort((a, b) => {
    if (a.quantity !== b.quantity) return b.quantity - a.quantity;
    return a.product.localeCompare(b.product);
  });
}

function roundAmount(amount: number, unit: string): number {
  if (unit === "g" || unit === "ml") return Math.round(amount);
  if (unit === "pza") return Math.round(amount * 100) / 100;
  return Math.round(amount * 100) / 100;
}

function aggregateSuggestedPurchases(days: ScheduleWeekDayItem[]): ScheduleDayPurchaseItem[] {
  const byItem = new Map<string, {
    item: string;
    unit: string;
    amount: number;
    source: "catalog" | "inline" | "fallback_generic";
    sourceProducts: Set<string>;
  }>();

  for (const day of days) {
    for (const purchase of day.suggestedPurchases) {
      const key = `${purchase.item.toLowerCase()}|${purchase.unit}|${purchase.source}`;
      if (!byItem.has(key)) {
        byItem.set(key, {
          item: purchase.item,
          unit: purchase.unit,
          amount: 0,
          source: purchase.source,
          sourceProducts: new Set<string>()
        });
      }

      const target = byItem.get(key)!;
      target.amount += purchase.amount;
      purchase.sourceProducts.forEach((product) => target.sourceProducts.add(product));
    }
  }

  return [...byItem.values()]
    .map((value) => ({
      item: value.item,
      unit: value.unit,
      amount: roundAmount(value.amount, value.unit),
      source: value.source,
      sourceProducts: [...value.sourceProducts].sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => a.item.localeCompare(b.item) || a.unit.localeCompare(b.unit));
}

function dedupeAssumptions(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function buildTraceRef(weekStartDateKey: string, attempt: number): string {
  return `schedule-week-view:${weekStartDateKey}:a${attempt}`;
}

export function createScheduleWeekViewTool(config: ScheduleWeekViewToolConfig = {}) {
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const executeScheduleDayViewFn = config.executeScheduleDayViewFn ?? createScheduleDayViewTool(config);

  return async function scheduleWeekView(args: {
    chat_id: string;
    week: ScheduleWeekFilter;
  }): Promise<ScheduleWeekViewResult> {
    if (!dateFromDateKey(args.week.anchorDateKey)) {
      throw new Error("schedule_week_view_week_invalid");
    }

    const weekDateKeys = buildWeekDateKeys(dateFromDateKey(args.week.anchorDateKey)!, timezone);
    const assumptions: string[] = [];
    const inconsistencies: ScheduleWeekInconsistencyItem[] = [];
    const days: ScheduleWeekDayItem[] = [];

    let maxAttempt = 1;

    for (const dateKey of weekDateKeys) {
      const day: ScheduleDayFilter = {
        type: "day",
        dateKey,
        label: buildDayLabel(dateKey, timezone)
      };

      let dayResult: ScheduleDayViewResult;
      try {
        dayResult = await executeScheduleDayViewFn({
          chat_id: args.chat_id,
          day
        });
      } catch (err) {
        const safeDetail = err instanceof Error ? err.message : String(err);
        throw new Error(`schedule_week_view_day_failed:${dateKey}:${safeDetail}`);
      }

      maxAttempt = Math.max(maxAttempt, parseAttempt(dayResult.trace_ref));
      dayResult.assumptions.forEach((assumption) => assumptions.push(`${dateKey}: ${assumption}`));
      dayResult.inconsistencies.forEach((item) => inconsistencies.push({ ...item, dateKey }));

      days.push({
        day,
        totalOrders: dayResult.totalOrders,
        deliveries: dayResult.deliveries,
        preparation: dayResult.preparation,
        suggestedPurchases: dayResult.suggestedPurchases,
        inconsistencies: dayResult.inconsistencies,
        trace_ref: dayResult.trace_ref,
        detail: dayResult.detail
      });
    }

    const reminders = days
      .filter((day) => day.totalOrders > 0)
      .map((day) => {
        const ordered = [...day.deliveries].sort((a, b) => {
          const keyA = a.fecha_hora_entrega_iso ?? a.fecha_hora_entrega;
          const keyB = b.fecha_hora_entrega_iso ?? b.fecha_hora_entrega;
          return keyA.localeCompare(keyB);
        });

        return {
          dateKey: day.day.dateKey,
          label: day.day.label,
          totalOrders: day.totalOrders,
          firstDelivery: ordered[0]?.fecha_hora_entrega,
          lastDelivery: ordered[ordered.length - 1]?.fecha_hora_entrega
        };
      });

    const totalOrders = days.reduce((acc, day) => acc + day.totalOrders, 0);
    const preparation = aggregatePreparation(days);
    const suggestedPurchases = aggregateSuggestedPurchases(days);
    const dedupedAssumptions = dedupeAssumptions(assumptions);

    return {
      week: args.week,
      timezone,
      trace_ref: buildTraceRef(weekDateKeys[0] ?? args.week.anchorDateKey, maxAttempt),
      totalOrders,
      days,
      reminders,
      preparation,
      suggestedPurchases,
      inconsistencies,
      assumptions: dedupedAssumptions,
      detail: `schedule-week-view executed (days=${days.length}, orders=${totalOrders}, inconsistencies=${inconsistencies.length})`
    };
  };
}

export const scheduleWeekViewTool = createScheduleWeekViewTool();
