import Decimal from "decimal.js";

export function formatMoney(
  amount: string | number | Decimal,
  currency: string,
  locale = "fa-IR"
): string {
  const num = new Decimal(amount).toNumber();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function sumDecimals(...amounts: (string | number | undefined)[]): string {
  return amounts
    .reduce((acc, a) => acc.add(new Decimal(a ?? 0)), new Decimal(0))
    .toString();
}

export function bpsToPercent(bps: number): string {
  return new Decimal(bps).div(100).toFixed(2) + "%";
}
