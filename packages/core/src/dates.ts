export interface ZonedMonthRange {
  /** Inclusive UTC instant for local midnight on the first day of the month. */
  start: Date;
  /** Exclusive UTC instant for local midnight on the first day of the next month. */
  end: Date;
  year: number;
  /** One-based calendar month in the requested time zone. */
  month: number;
}

const zonedPartsFormatter = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = zonedPartsFormatter.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  zonedPartsFormatter.set(timeZone, formatter);
  return formatter;
}

function partsAt(instant: Date, timeZone: string) {
  const values: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }

  return {
    year: values.year!,
    month: values.month!,
    day: values.day!,
    hour: values.hour!,
    minute: values.minute!,
    second: values.second!,
  };
}

function offsetAt(instant: Date, timeZone: string): number {
  const parts = partsAt(instant, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return representedAsUtc - Math.trunc(instant.getTime() / 1000) * 1000;
}

function localMidnightToUtc(
  year: number,
  monthIndex: number,
  day: number,
  timeZone: string
): Date {
  const localAsUtc = Date.UTC(year, monthIndex, day);
  let result = localAsUtc - offsetAt(new Date(localAsUtc), timeZone);

  // Re-evaluate at the resulting instant. This second pass handles offset
  // changes between the UTC approximation and local midnight (for example,
  // months that begin close to a daylight-saving transition).
  result = localAsUtc - offsetAt(new Date(result), timeZone);
  return new Date(result);
}

/**
 * Returns an inclusive/exclusive UTC range for the calendar month containing
 * `instant` in `timeZone`. Keeping this rule in core prevents API hosts and
 * clients in different zones from calculating different household progress.
 */
export function monthRangeInTimeZone(
  instant: Date,
  timeZone: string
): ZonedMonthRange {
  if (Number.isNaN(instant.getTime())) throw new Error("instant must be a valid date");

  // Constructing the formatter validates the IANA time-zone identifier.
  const local = partsAt(instant, timeZone);
  const start = localMidnightToUtc(local.year, local.month - 1, 1, timeZone);
  const end = localMidnightToUtc(local.year, local.month, 1, timeZone);

  return { start, end, year: local.year, month: local.month };
}
