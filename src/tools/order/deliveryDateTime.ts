const DAY_MS = 86_400_000;
const CANONICAL_LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

const WEEKDAY_TOKEN_TO_INDEX: Record<string, number> = {
  domingo: 0,
  dom: 0,
  lunes: 1,
  lun: 1,
  martes: 2,
  mar: 2,
  miercoles: 3,
  mie: 3,
  jueves: 4,
  jue: 4,
  viernes: 5,
  vie: 5,
  sabado: 6,
  sab: 6
};

function normalizeForMatch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function toPositiveInt(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function isValidDateParts(args: { year: number; month: number; day: number }): boolean {
  if (args.year < 1900 || args.year > 9999) return false;
  if (args.month < 1 || args.month > 12) return false;
  if (args.day < 1 || args.day > 31) return false;

  const utc = new Date(Date.UTC(args.year, args.month - 1, args.day));
  return (
    utc.getUTCFullYear() === args.year &&
    utc.getUTCMonth() === args.month - 1 &&
    utc.getUTCDate() === args.day
  );
}

export function isCanonicalDeliveryDateTime(value: string): boolean {
  const match = value.match(CANONICAL_LOCAL_DATETIME);
  if (!match) return false;

  const year = toPositiveInt(match[1]);
  const month = toPositiveInt(match[2]);
  const day = toPositiveInt(match[3]);
  const hour = toPositiveInt(match[4]);
  const minute = toPositiveInt(match[5]);
  const second = toPositiveInt(match[6]);
  if (
    year == null ||
    month == null ||
    day == null ||
    hour == null ||
    minute == null ||
    second == null
  ) {
    return false;
  }

  if (!isValidDateParts({ year, month, day })) return false;
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;
  return true;
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
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short"
  }).format(date).toLowerCase();

  if (weekday.startsWith("sun")) return 0;
  if (weekday.startsWith("mon")) return 1;
  if (weekday.startsWith("tue")) return 2;
  if (weekday.startsWith("wed")) return 3;
  if (weekday.startsWith("thu")) return 4;
  if (weekday.startsWith("fri")) return 5;
  return 6;
}

function toLocalTimeParts(date: Date, timezone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const hourRaw = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minuteRaw = parts.find((part) => part.type === "minute")?.value ?? "00";
  return {
    hour: Number(hourRaw),
    minute: Number(minuteRaw)
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function to24h(hourRaw: string, meridiemRaw?: string): number | undefined {
  const hour = Number(hourRaw);
  if (!Number.isInteger(hour)) return undefined;
  const meridiem = meridiemRaw?.toLowerCase();

  if (!meridiem) {
    if (hour < 0 || hour > 23) return undefined;
    return hour;
  }

  if (hour < 1 || hour > 12) return undefined;
  if (meridiem === "am") return hour === 12 ? 0 : hour;
  if (meridiem === "pm") return hour === 12 ? 12 : hour + 12;
  return undefined;
}

function parseExplicitDateKey(value: string): string | undefined {
  const ymd = value.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const dmy = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return undefined;
}

function parseRelativeDateKey(value: string, now: Date, timezone: string): string | undefined {
  if (/\bpasado\s+manana\b/.test(value)) {
    return toDateKeyFromDate(new Date(now.getTime() + 2 * DAY_MS), timezone);
  }

  if (/\bhoy\b/.test(value)) {
    return toDateKeyFromDate(now, timezone);
  }

  if (/\bmanana\b/.test(value)) {
    return toDateKeyFromDate(new Date(now.getTime() + DAY_MS), timezone);
  }

  if (/\bayer\b/.test(value)) {
    return toDateKeyFromDate(new Date(now.getTime() - DAY_MS), timezone);
  }

  return undefined;
}

function parseWeekdayDateKey(value: string, now: Date, timezone: string): string | undefined {
  const weekdayToken = value.match(/\b(domingo|dom|lunes|lun|martes|mar|miercoles|mie|jueves|jue|viernes|vie|sabado|sab)\b/)?.[1];
  if (!weekdayToken) return undefined;

  const weekday = WEEKDAY_TOKEN_TO_INDEX[weekdayToken];
  if (weekday == null) return undefined;

  const normalized = value.trim();
  const hasNextQualifier = new RegExp(`\\b(?:proximo|siguiente)\\s+${weekdayToken}\\b`).test(normalized);
  const current = weekdayIndex(now, timezone);
  let delta = (weekday - current + 7) % 7;
  if (hasNextQualifier && delta === 0) delta = 7;

  return toDateKeyFromDate(new Date(now.getTime() + delta * DAY_MS), timezone);
}

function parseTimeParts(value: string): { hour: number; minute: number } | undefined {
  const hhmmAmPm = value.match(/(?:^|[^0-9])(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)\b/i);
  if (hhmmAmPm) {
    const hour = to24h(hhmmAmPm[1], hhmmAmPm[3]);
    const minute = Number(hhmmAmPm[2]);
    if (hour !== undefined && Number.isInteger(minute) && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  const hhmm = value.match(/(?:^|[^0-9])(\d{1,2})\s*:\s*(\d{2})\b/);
  if (hhmm) {
    const hour = to24h(hhmm[1]);
    const minute = Number(hhmm[2]);
    if (hour !== undefined && Number.isInteger(minute) && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  const hAmPm = value.match(/(?:^|[^0-9])(\d{1,2})\s*(am|pm)\b/i);
  if (hAmPm) {
    const hour = to24h(hAmPm[1], hAmPm[2]);
    if (hour !== undefined) {
      return { hour, minute: 0 };
    }
  }

  return undefined;
}

function hasOffsetOrZulu(value: string): boolean {
  return /(?:z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
}

export function normalizeDeliveryDateTime(args: {
  value: string;
  timezone: string;
  now?: Date;
  requireTime?: boolean;
}): string | undefined {
  const raw = args.value.trim();
  if (!raw) return undefined;

  if (isCanonicalDeliveryDateTime(raw)) {
    return raw;
  }

  const timezone = args.timezone.trim() || "America/Mexico_City";
  const now = args.now ?? new Date();
  const requireTime = args.requireTime ?? false;
  const normalized = normalizeForMatch(raw);
  const parsedInstant = Date.parse(raw);

  const explicitDateKey = parseExplicitDateKey(normalized);
  const relativeDateKey = parseRelativeDateKey(normalized, now, timezone);
  const weekdayDateKey = parseWeekdayDateKey(normalized, now, timezone);
  const dateKey =
    explicitDateKey ??
    relativeDateKey ??
    weekdayDateKey ??
    (Number.isFinite(parsedInstant) ? toDateKeyFromDate(new Date(parsedInstant), timezone) : undefined);

  if (!dateKey) return undefined;

  const explicitTime = parseTimeParts(normalized);
  const canUseInstantTime = Number.isFinite(parsedInstant) && hasOffsetOrZulu(raw);
  if (requireTime && !explicitTime && !canUseInstantTime) {
    return undefined;
  }

  const timeParts = explicitTime ?? (canUseInstantTime ? toLocalTimeParts(new Date(parsedInstant), timezone) : { hour: 0, minute: 0 });

  return `${dateKey}T${pad2(timeParts.hour)}:${pad2(timeParts.minute)}:00`;
}
