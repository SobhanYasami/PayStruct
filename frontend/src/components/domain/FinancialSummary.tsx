import { formatMoney } from "@/lib/utils/money";

interface Card {
  label: string;
  amount: string | undefined;
  variant?: "in" | "out" | "neutral";
}

interface Props {
  currency: string;
  gross: string;
  extra: string;
  retention: string;
  advance: string;
  vat: string;
  socialSecurity: string;
  ld: string;
  net: string;
}

export function FinancialSummary({ currency, gross, extra, retention, advance, vat, socialSecurity, ld, net }: Props) {
  const cards: Card[] = [
    { label: "کارکرد ناخالص", amount: gross, variant: "in" },
    { label: "کارهای اضافه", amount: extra, variant: "in" },
    { label: "کسر حسن انجام کار", amount: retention, variant: "out" },
    { label: "کسر پیش‌پرداخت", amount: advance, variant: "out" },
    { label: "مالیات بر ارزش افزوده", amount: vat, variant: "neutral" },
    { label: "بیمه تأمین اجتماعی", amount: socialSecurity, variant: "out" },
    { label: "خسارت تأخیر (LD)", amount: ld, variant: "out" },
    { label: "خالص قابل پرداخت", amount: net, variant: "in" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map(({ label, amount, variant }) => (
        <div
          key={label}
          className="bg-white border rounded-xl p-4 shadow-sm"
        >
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p
            className={
              variant === "in"
                ? "text-lg font-bold text-money-in"
                : variant === "out"
                ? "text-lg font-bold text-money-out"
                : "text-lg font-bold text-foreground"
            }
          >
            {amount ? formatMoney(amount, currency) : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
