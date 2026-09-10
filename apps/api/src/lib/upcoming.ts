import { RecurringFrequency } from "@worthlane/db";

const DAY_MS = 86_400_000;

/** Parses a date-only API value without letting the server timezone shift it. */
export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Expected YYYY-MM-DD");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Invalid date");
  }
  return date;
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
/** A date-only comparison value for the caller's local calendar day. */
export function householdCalendarDay(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return parseDateOnly(`${value("year")}-${value("month")}-${value("day")}`);
}

export function obligationStatus(dueDate: Date, isPaid: boolean, now = new Date(), timeZone = "UTC") {
  if (isPaid) return "PAID" as const;
  const delta = Math.round((startOfUtcDay(dueDate).getTime() - householdCalendarDay(now, timeZone).getTime()) / DAY_MS);
  if (delta < 0) return "OVERDUE" as const;
  if (delta === 0) return "DUE_TODAY" as const;
  return "UPCOMING" as const;
}

function addMonthsClamped(date: Date, months: number, anchorDay = date.getUTCDate()): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(anchorDay, lastDay)));
}

export function nextObligationDate(dueDate: Date, frequency: RecurringFrequency, anchorDay = dueDate.getUTCDate()): Date {
  switch (frequency) {
    case RecurringFrequency.WEEKLY:
      return new Date(dueDate.getTime() + 7 * DAY_MS);
    case RecurringFrequency.BIWEEKLY:
      return new Date(dueDate.getTime() + 14 * DAY_MS);
    case RecurringFrequency.MONTHLY:
      return addMonthsClamped(dueDate, 1, anchorDay);
    case RecurringFrequency.QUARTERLY:
      return addMonthsClamped(dueDate, 3, anchorDay);
    case RecurringFrequency.YEARLY:
      return addMonthsClamped(dueDate, 12, anchorDay);
  }
}

/** Advances from the scheduled due date, preserving month-end intent. */
export function nextFutureObligationDate(dueDate: Date, frequency: RecurringFrequency, now = new Date(), timeZone = "UTC", anchorDay = dueDate.getUTCDate()): Date {
  let next = nextObligationDate(dueDate, frequency, anchorDay);
  const today = householdCalendarDay(now, timeZone);
  while (next.getTime() <= today.getTime()) next = nextObligationDate(next, frequency, anchorDay);
  return next;
}
