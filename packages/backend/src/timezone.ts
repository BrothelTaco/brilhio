const TZ_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getTzFormatter(ianaTimezone: string) {
  const cached = TZ_FORMATTER_CACHE.get(ianaTimezone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: ianaTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  TZ_FORMATTER_CACHE.set(ianaTimezone, formatter);
  return formatter;
}

/**
 * Converts a naive local datetime string (e.g. "2024-12-20T15:00:00") in a given
 * IANA timezone to a UTC ISO string. DST transitions are handled by Intl.DateTimeFormat.
 */
export function localToUtc(localDatetime: string, ianaTimezone: string): string {
  const fakeUtc = new Date(localDatetime + "Z");
  const displayed = getTzFormatter(ianaTimezone).format(fakeUtc);
  const displayedAsUtc = new Date(displayed.replace(" ", "T") + "Z");
  const offsetMs = fakeUtc.getTime() - displayedAsUtc.getTime();
  return new Date(fakeUtc.getTime() + offsetMs).toISOString();
}

export function isValidIanaTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
