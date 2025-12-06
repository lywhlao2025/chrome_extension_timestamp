// Utility functions for timestamp parsing/formatting and color accents.
export type ParseStringSet = {
  errTimestampEmpty: string;
  errTimestampNaN: string;
  errTimestampInvalid: string;
  errDateFormat: string;
};

export type ParseTimestampResult = { millis: number } | { error: string };

/**
 * Parse timestamp text (seconds or milliseconds).
 * @param raw user input string
 * @param strings localized error strings
 * @returns { millis } on success, otherwise { error }
 */
export function parseTimestampInput(raw: string, strings: ParseStringSet): ParseTimestampResult {
  const trimmed = raw.trim();
  if (!trimmed) return { error: strings.errTimestampEmpty };
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return { error: strings.errTimestampNaN };
  const isSeconds = trimmed.length <= 10;
  const millis = isSeconds ? numeric * 1000 : numeric;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return { error: strings.errTimestampInvalid };
  return { millis };
}

/**
 * Format offset minutes to UTC±HH:mm string.
 */
export function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${hours}${mins ? `:${String(mins).padStart(2, "0")}` : ""}`;
}

export function toParts(timestampMs: number, offsetMinutes: number) {
  const d = new Date(timestampMs + offsetMinutes * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds()
  };
}

/**
 * Format UTC ms + offset into "YYYY-MM-DD HH:mm:ss".
 */
export function formatDateString(timestampMs: number, offsetMinutes: number) {
  const { year, month, day, hour, minute, second } = toParts(timestampMs, offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

/**
 * Parse a date string "YYYY-MM-DD HH:mm:ss" or "YYYY/MM/DD HH:mm:ss".
 * @returns parts on success, or { error }
 */
export function parseDateString(str: string, strings: ParseStringSet) {
  const trimmed = str.trim();
  const re = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const m = trimmed.match(re);
  if (!m) return { error: strings.errDateFormat };
  const [, y, mo, d, h, mi, s] = m;
  return {
    parts: {
      year: Number(y),
      month: Number(mo),
      day: Number(d),
      hour: Number(h),
      minute: Number(mi),
      second: Number(s)
    }
  };
}

/**
 * Convert parsed date fields + offset back to UTC milliseconds.
 * @param parts date parts from parseDateString
 * @param offsetMinutes timezone offset in minutes
 */
export function partsToTimestamp(parts: ReturnType<typeof parseDateString>["parts"], offsetMinutes: number) {
  const { year, month, day, hour, minute, second } = parts!;
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return baseUtc - offsetMinutes * 60 * 1000;
}

/**
 * Return accent colors based on day segment (morning/afternoon/evening/night).
 */
export function getTimeColors(timestampMs: number, offsetMinutes: number) {
  const d = new Date(timestampMs + offsetMinutes * 60 * 1000);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;

  if (hour >= 6 && hour < 12) {
    return { color1: "rgba(255, 122, 122, 0.32)", color2: "rgba(255, 122, 122, 0.12)" };
  }
  if (hour >= 12 && hour < 18) {
    return { color1: "rgba(255, 204, 102, 0.32)", color2: "rgba(255, 204, 102, 0.12)" };
  }
  if (hour >= 18 && hour < 21) {
    return { color1: "rgba(255, 170, 102, 0.28)", color2: "rgba(255, 150, 80, 0.1)" };
  }
  return { color1: "rgba(36, 42, 58, 0.38)", color2: "rgba(20, 24, 35, 0.18)" };
}
