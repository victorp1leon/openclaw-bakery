const DAY_MS = 86_400_000;

function normalizeForMatch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

export function normalizeDeliveryDateTime(args: {
  value: string;
  timezone: string;
  now?: Date;
}): string | undefined {
  const raw = args.value.trim();
  if (!raw) return undefined;

  const timezone = args.timezone.trim() || "America/Mexico_City";
  const now = args.now ?? new Date();
  const normalized = normalizeForMatch(raw);

  const explicitDateKey = parseExplicitDateKey(normalized);
  const relativeDateKey = parseRelativeDateKey(normalized, now, timezone);
  const parsedInstant = Date.parse(raw);
  const dateKey =
    explicitDateKey ??
    relativeDateKey ??
    (Number.isFinite(parsedInstant) ? toDateKeyFromDate(new Date(parsedInstant), timezone) : undefined);

  if (!dateKey) return undefined;

  const explicitTime = parseTimeParts(normalized);
  const timeParts =
    explicitTime ??
    (Number.isFinite(parsedInstant) ? toLocalTimeParts(new Date(parsedInstant), timezone) : { hour: 0, minute: 0 });

  return `${dateKey}T${pad2(timeParts.hour)}:${pad2(timeParts.minute)}:00`;
}
