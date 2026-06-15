const JALALI_FMT = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
} as Intl.DateTimeFormatOptions);

/**
 * Convert an ISO date string or Date to a Jalali (Persian) formatted string
 * using Persian digit numerals, e.g. ۱۴۰۴/۰۳/۲۵
 */
export function toJalali(dateStr?: string | null | Date): string {
  if (!dateStr) return "—";
  try {
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return JALALI_FMT.format(date);
  } catch {
    return "—";
  }
}

/**
 * Format a number with Persian digits and comma separators.
 * e.g. 1234567 → "۱٬۲۳۴٬۵۶۷"
 */
export function fmtNum(
  v: string | number | undefined | null,
  decimals = 0
): string {
  if (v === undefined || v === null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return n.toLocaleString("fa-IR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage with Persian digits.
 * e.g. 12.5 → "۱۲٫۵٪"
 */
export function fmtPct(
  v: string | number | undefined | null,
  decimals = 1
): string {
  if (v === undefined || v === null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return (
    n.toLocaleString("fa-IR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + "٪"
  );
}

/**
 * Format a monetary value with Persian digits.
 * e.g. (1234567, "IRR") → "۱٬۲۳۴٬۵۶۷ ریال"
 */
export function fmtMoney(
  v: string | number | undefined | null,
  currency?: string
): string {
  if (v === undefined || v === null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  const numStr = n.toLocaleString("fa-IR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return currency ? `${numStr} ${currency}` : numStr;
}
