import { z } from "zod";

import { createOpenClawJsonRuntime, type OpenClawJsonRuntime } from "../openclaw/runtime";
import { firstOpenClawPayloadText, parseJsonFromText, unwrapOpenClawPayloadJson } from "../openclaw/jsonExtract";
import type { OrderReportPeriod } from "../tools/order/reportOrders";
import type { ScheduleDayFilter } from "../tools/order/scheduleDayView";
import type { ScheduleWeekFilter } from "../tools/order/scheduleWeekView";
import type { ShoppingListScope } from "../tools/order/shoppingListGenerate";

export type ReadOnlyIntent =
  | "admin.health"
  | "admin.config.view"
  | "report.orders"
  | "report.reminders"
  | "order.lookup"
  | "order.status"
  | "schedule.day_view"
  | "schedule.week_view"
  | "shopping.list.generate"
  | "quote.order"
  | "unknown";

export type ReadOnlyIntentSource = "openclaw" | "fallback" | "custom";

export type ReadOnlyRoutedIntent = {
  intent: ReadOnlyIntent;
  source: ReadOnlyIntentSource;
  strict_mode: boolean;
  openclaw_error?: string;
  period?: OrderReportPeriod;
  query?: string;
  day?: ScheduleDayFilter;
  week?: ScheduleWeekFilter;
  scope?: ShoppingListScope;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const RawIntentSchema = z.object({
  intent: z.enum([
    "admin.health",
    "admin.config.view",
    "report.orders",
    "report.reminders",
    "order.lookup",
    "order.status",
    "schedule.day_view",
    "schedule.week_view",
    "shopping.list.generate",
    "quote.order",
    "unknown"
  ]),
  needs_clarification: z.boolean().optional(),
  query: z.string().optional(),
  period: z.object({
    kind: z.enum(["today", "tomorrow", "week", "day", "month", "year"]).optional(),
    date_key: z.string().optional(),
    anchor_date_key: z.string().optional(),
    year: z.number().int().optional(),
    month: z.number().int().optional()
  }).optional(),
  day: z.object({
    date_key: z.string().optional()
  }).optional(),
  scope: z.object({
    type: z.enum(["day", "week", "order_ref", "lookup"]).optional(),
    date_key: z.string().optional(),
    anchor_date_key: z.string().optional(),
    reference: z.string().optional(),
    query: z.string().optional()
  }).optional()
}).passthrough();

function isStrictMode(): boolean {
  return process.env.OPENCLAW_STRICT === "1";
}

function normalizeText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const out = value.trim();
  return out.length > 0 ? out : undefined;
}

function isDateKey(value: string | undefined): value is string {
  return typeof value === "string" && DATE_KEY_RE.test(value);
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

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

function buildReportPeriod(args: {
  raw: z.infer<typeof RawIntentSchema>;
}): OrderReportPeriod | undefined {
  const kind = args.raw.period?.kind;
  if (kind === "today") return "today";
  if (kind === "tomorrow") return "tomorrow";
  if (kind === "week") {
    const anchorDateKey = args.raw.period?.anchor_date_key;
    if (isDateKey(anchorDateKey)) {
      return {
        type: "week",
        anchorDateKey,
        label: `semana de ${anchorDateKey}`
      };
    }
    return "week";
  }

  const periodDateKey = args.raw.period?.date_key;
  if ((kind === "day" || !kind) && isDateKey(periodDateKey)) {
    return {
      type: "day",
      dateKey: periodDateKey,
      label: `el ${periodDateKey}`
    };
  }

  const anchorDateKey = args.raw.period?.anchor_date_key;
  if (!kind && isDateKey(anchorDateKey)) {
    return {
      type: "week",
      anchorDateKey,
      label: `semana de ${anchorDateKey}`
    };
  }

  const year = args.raw.period?.year;
  const month = args.raw.period?.month;
  if (kind === "month" && Number.isInteger(year) && Number.isInteger(month) && month! >= 1 && month! <= 12) {
    return {
      type: "month",
      year: year!,
      month: month!,
      label: `${month}/${year}`
    };
  }

  if (kind === "year" && Number.isInteger(year)) {
    return {
      type: "year",
      year: year!,
      label: `${year}`
    };
  }

  return undefined;
}

function buildScheduleDay(args: {
  raw: z.infer<typeof RawIntentSchema>;
  now: Date;
  timezone: string;
}): ScheduleDayFilter | undefined {
  const directDateKey = args.raw.day?.date_key;
  if (isDateKey(directDateKey)) {
    return {
      type: "day",
      dateKey: directDateKey,
      label: `el ${directDateKey}`
    };
  }

  const periodKind = args.raw.period?.kind;
  if (periodKind === "today") {
    const dateKey = toDateKeyFromDate(args.now, args.timezone);
    return {
      type: "day",
      dateKey,
      label: "hoy"
    };
  }

  if (periodKind === "tomorrow") {
    const dateKey = toDateKeyFromDate(addDays(args.now, 1), args.timezone);
    return {
      type: "day",
      dateKey,
      label: "mañana"
    };
  }

  return undefined;
}

function buildScheduleWeek(args: {
  raw: z.infer<typeof RawIntentSchema>;
  now: Date;
  timezone: string;
}): ScheduleWeekFilter | undefined {
  const anchorDateKey = args.raw.period?.anchor_date_key;
  if (isDateKey(anchorDateKey)) {
    return {
      type: "week",
      anchorDateKey,
      label: `semana de ${anchorDateKey}`
    };
  }

  if (args.raw.period?.kind === "week") {
    const dateKey = toDateKeyFromDate(args.now, args.timezone);
    return {
      type: "week",
      anchorDateKey: dateKey,
      label: "esta semana"
    };
  }

  return undefined;
}

function buildShoppingScope(args: {
  raw: z.infer<typeof RawIntentSchema>;
  now: Date;
  timezone: string;
}): ShoppingListScope | undefined {
  const scopeType = args.raw.scope?.type;
  if (scopeType === "day" && isDateKey(args.raw.scope?.date_key)) {
    return {
      type: "day",
      dateKey: args.raw.scope!.date_key!,
      label: `el ${args.raw.scope!.date_key!}`
    };
  }

  if (scopeType === "week" && isDateKey(args.raw.scope?.anchor_date_key)) {
    return {
      type: "week",
      anchorDateKey: args.raw.scope!.anchor_date_key!,
      label: `semana de ${args.raw.scope!.anchor_date_key!}`
    };
  }

  if (scopeType === "order_ref") {
    const reference = normalizeText(args.raw.scope?.reference);
    if (reference) {
      return {
        type: "order_ref",
        reference,
        label: `pedido ${reference}`
      };
    }
  }

  if (scopeType === "lookup") {
    const query = normalizeText(args.raw.scope?.query ?? args.raw.query);
    if (query) {
      return {
        type: "lookup",
        query,
        label: `"${query.toLowerCase()}"`
      };
    }
  }

  const periodKind = args.raw.period?.kind;
  if (periodKind === "today") {
    const dateKey = toDateKeyFromDate(args.now, args.timezone);
    return {
      type: "day",
      dateKey,
      label: "hoy"
    };
  }

  if (periodKind === "tomorrow") {
    const dateKey = toDateKeyFromDate(addDays(args.now, 1), args.timezone);
    return {
      type: "day",
      dateKey,
      label: "mañana"
    };
  }

  if (periodKind === "week") {
    const anchorDateKey = toDateKeyFromDate(args.now, args.timezone);
    return {
      type: "week",
      anchorDateKey,
      label: "esta semana"
    };
  }

  return undefined;
}

function buildPrompt(text: string, enableQuote: boolean): string {
  const quoteOption = enableQuote ? "quote.order" : "unknown";
  return [
    "Clasifica el mensaje del usuario en un intent read-only del bot.",
    "Responde SOLO JSON valido. No agregues texto extra.",
    "Intents validos: admin.health, admin.config.view, report.orders, report.reminders, order.lookup, order.status, schedule.day_view, schedule.week_view, shopping.list.generate, quote.order, unknown.",
    `Si detectas cotizacion y quote esta deshabilitado, usa ${quoteOption}.`,
    "Schema exacto esperado:",
    "{\"intent\":\"...\",\"needs_clarification\":false,\"query\":\"...\",\"period\":{\"kind\":\"today|tomorrow|week|day|month|year\",\"date_key\":\"YYYY-MM-DD\",\"anchor_date_key\":\"YYYY-MM-DD\",\"year\":2026,\"month\":3},\"day\":{\"date_key\":\"YYYY-MM-DD\"},\"scope\":{\"type\":\"day|week|order_ref|lookup\",\"date_key\":\"YYYY-MM-DD\",\"anchor_date_key\":\"YYYY-MM-DD\",\"reference\":\"op-123\",\"query\":\"ana\"}}",
    "Reglas:",
    "- admin.health: solo para salud/estado operativo del bot o del sistema.",
    "- admin.config.view: solo para consultar configuracion operativa sanitizada del bot/sistema (sin secretos).",
    "- order.lookup/order.status/quote.order: usa query cuando haya referencia o busqueda libre.",
    "- report.orders: usa period.",
    "- report.reminders: usa period para recordatorios de entregas proximas.",
    "- schedule.day_view: usa day.date_key o period.kind=today|tomorrow.",
    "- schedule.week_view: usa period.kind=week y opcional period.anchor_date_key.",
    "- shopping.list.generate: usa scope.",
    "- Si faltan datos minimos, marca needs_clarification=true.",
    `Mensaje: ${text}`
  ].join("\n");
}

export async function routeReadOnlyIntentDetailed(args: {
  text: string;
  runtime?: OpenClawJsonRuntime;
  enableQuote?: boolean;
  now?: Date;
  timezone?: string;
}): Promise<ReadOnlyRoutedIntent> {
  const strict_mode = isStrictMode();
  const runtime = args.runtime ?? createOpenClawJsonRuntime();
  const enableQuote = args.enableQuote ?? true;
  const now = args.now ?? new Date();
  const timezone = args.timezone?.trim() || "America/Mexico_City";
  const prompt = buildPrompt(args.text, enableQuote);

  try {
    const raw = await runtime.completeJson(prompt);
    const payloadText = firstOpenClawPayloadText(raw);
    const normalized = unwrapOpenClawPayloadJson(raw);
    const parsed = RawIntentSchema.safeParse(normalized);

    if (!parsed.success) {
      if (payloadText) {
        try {
          parseJsonFromText(payloadText);
        } catch {
          return {
            intent: "unknown",
            source: "openclaw",
            strict_mode,
            openclaw_error: `openclaw_non_json_payload:${payloadText}`
          };
        }
      }

      return {
        intent: "unknown",
        source: "openclaw",
        strict_mode,
        openclaw_error: `openclaw_parse_invalid_json:${parsed.error.issues[0]?.message ?? "invalid"}`
      };
    }

    const candidate = parsed.data;
    if (candidate.intent === "quote.order" && !enableQuote) {
      return {
        intent: "unknown",
        source: "openclaw",
        strict_mode,
        openclaw_error: "openclaw_quote_disabled"
      };
    }

    if (candidate.intent === "admin.health" || candidate.intent === "admin.config.view") {
      return {
        intent: candidate.intent,
        source: "openclaw",
        strict_mode
      };
    }

    if (candidate.intent === "report.orders") {
      return {
        intent: "report.orders",
        source: "openclaw",
        strict_mode,
        period: buildReportPeriod({ raw: candidate })
      };
    }

    if (candidate.intent === "report.reminders") {
      return {
        intent: "report.reminders",
        source: "openclaw",
        strict_mode,
        period: buildReportPeriod({ raw: candidate })
      };
    }

    if (candidate.intent === "schedule.day_view") {
      return {
        intent: "schedule.day_view",
        source: "openclaw",
        strict_mode,
        day: buildScheduleDay({ raw: candidate, now, timezone })
      };
    }

    if (candidate.intent === "schedule.week_view") {
      return {
        intent: "schedule.week_view",
        source: "openclaw",
        strict_mode,
        week: buildScheduleWeek({ raw: candidate, now, timezone })
      };
    }

    if (candidate.intent === "shopping.list.generate") {
      return {
        intent: "shopping.list.generate",
        source: "openclaw",
        strict_mode,
        scope: buildShoppingScope({ raw: candidate, now, timezone })
      };
    }

    if (candidate.intent === "order.lookup" || candidate.intent === "order.status" || candidate.intent === "quote.order") {
      return {
        intent: candidate.intent,
        source: "openclaw",
        strict_mode,
        query: normalizeText(candidate.query)
      };
    }

    return {
      intent: "unknown",
      source: "openclaw",
      strict_mode
    };
  } catch (err) {
    return {
      intent: "unknown",
      source: "openclaw",
      strict_mode,
      openclaw_error: err instanceof Error ? err.message : "openclaw_readonly_route_failed"
    };
  }
}
