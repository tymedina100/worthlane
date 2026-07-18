export function formatCurrencyMinor(
  valueMinor: number,
  currency = "USD",
  options: { compact?: boolean; hideCents?: boolean } = {}
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: options.compact ? "compact" : "standard",
    maximumFractionDigits: options.hideCents || options.compact ? 0 : 2,
    minimumFractionDigits: options.hideCents || options.compact ? 0 : 2,
  }).format(valueMinor / 100);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value / 100);
}

export function formatShortDate(value: string | null) {
  if (!value) return "No date set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatUpdatedTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function dollarsToMinorUnits(value: string) {
  const normalized = value.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;

  const [whole, fractional = ""] = normalized.split(".");
  const amountMinor = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  return amountMinor;
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
