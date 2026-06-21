import { cn } from "@/lib/utils/cn";

const STATUS_MAP: Record<string, { label: string; className: string; dot: string }> = {
  draft:           { label: "پیش‌نویس",      className: "text-status-draft bg-status-draft/10 ring-status-draft/20",          dot: "bg-status-draft" },
  submitted:       { label: "ارسال شده",      className: "text-status-submitted bg-status-submitted/10 ring-status-submitted/20", dot: "bg-status-submitted" },
  finance_review:  { label: "بررسی مالی",     className: "text-status-finance bg-status-finance/10 ring-status-finance/20",     dot: "bg-status-finance" },
  pm_review:       { label: "بررسی پروژه",    className: "text-status-pm bg-status-pm/10 ring-status-pm/20",                   dot: "bg-status-pm" },
  director_review: { label: "بررسی ارشد",     className: "text-status-director bg-status-director/10 ring-status-director/20", dot: "bg-status-director" },
  approved:        { label: "تأیید شده",      className: "text-status-approved bg-status-approved/10 ring-status-approved/20", dot: "bg-status-approved" },
  rejected:        { label: "رد شده",         className: "text-status-rejected bg-status-rejected/10 ring-status-rejected/20", dot: "bg-status-rejected" },
  planning:        { label: "برنامه‌ریزی",    className: "text-status-submitted bg-status-submitted/10 ring-status-submitted/20", dot: "bg-status-submitted" },
  active:          { label: "فعال",           className: "text-status-approved bg-status-approved/10 ring-status-approved/20", dot: "bg-status-approved" },
  on_hold:         { label: "متوقف",          className: "text-status-finance bg-status-finance/10 ring-status-finance/20",     dot: "bg-status-finance" },
  completed:       { label: "تکمیل شده",      className: "text-status-approved bg-status-approved/10 ring-status-approved/20", dot: "bg-status-approved" },
  cancelled:       { label: "لغو شده",        className: "text-status-rejected bg-status-rejected/10 ring-status-rejected/20", dot: "bg-status-rejected" },
  signed:               { label: "امضاشده",              className: "text-status-approved bg-status-approved/10 ring-status-approved/20", dot: "bg-status-approved" },
  closed:               { label: "بسته شده",            className: "text-status-draft bg-status-draft/10 ring-status-draft/20",          dot: "bg-status-draft" },
  pending_engineering:  { label: "در انتظار مهندسی",    className: "text-status-pm bg-status-pm/10 ring-status-pm/20",                   dot: "bg-status-pm" },
  pending_finance:      { label: "در انتظار مالی",       className: "text-status-finance bg-status-finance/10 ring-status-finance/20",     dot: "bg-status-finance" },
  pending_legal:        { label: "در انتظار حقوقی",      className: "text-status-director bg-status-director/10 ring-status-director/20", dot: "bg-status-director" },
  pending_ceo:          { label: "در انتظار مدیریت",    className: "text-status-submitted bg-status-submitted/10 ring-status-submitted/20", dot: "bg-status-submitted" },
  ready_to_print:       { label: "آماده چاپ",           className: "text-status-approved bg-status-approved/10 ring-status-approved/20", dot: "bg-status-approved" },
  lump_sum:                { label: "مقطوع",             className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  unit_rate:               { label: "فهرست‌بها",         className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  cost_plus:               { label: "امانی",             className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  time_material:           { label: "زمان و مواد",       className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  construction_management: { label: "مدیریت پیمان",      className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  design_bid_build:        { label: "طراحی-مناقصه-ساخت", className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  design_build:            { label: "طراحی-ساخت / EPC",  className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  labor_only:              { label: "دستمزدی",           className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  turnkey:                 { label: "کلید در دست",       className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  percentage:              { label: "درصدی",             className: "text-primary bg-primary/10 ring-primary/20", dot: "bg-primary" },
  individual:      { label: "حقیقی",          className: "text-accent bg-accent/10 ring-accent/20",                            dot: "bg-accent" },
  company:         { label: "حقوقی",          className: "text-saffron bg-saffron/10 ring-saffron/20",                         dot: "bg-saffron" },
};

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  const entry = STATUS_MAP[status] ?? {
    label: status,
    className: "text-muted-foreground bg-muted ring-muted-foreground/20",
    dot: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        entry.className,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 opacity-80", entry.dot)} />
      {entry.label}
    </span>
  );
}
