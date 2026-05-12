import { cn } from "@/lib/utils/cn";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "پیش‌نویس", className: "text-status-draft bg-status-draft/10" },
  submitted: { label: "ارسال شده", className: "text-status-submitted bg-status-submitted/10" },
  finance_review: { label: "بررسی مالی", className: "text-status-finance bg-status-finance/10" },
  pm_review: { label: "بررسی پروژه", className: "text-status-pm bg-status-pm/10" },
  director_review: { label: "بررسی ارشد", className: "text-status-director bg-status-director/10" },
  approved: { label: "تأیید شده", className: "text-status-approved bg-status-approved/10" },
  rejected: { label: "رد شده", className: "text-status-rejected bg-status-rejected/10" },
  planning: { label: "برنامه‌ریزی", className: "text-status-submitted bg-status-submitted/10" },
  active: { label: "فعال", className: "text-status-approved bg-status-approved/10" },
  on_hold: { label: "متوقف", className: "text-status-finance bg-status-finance/10" },
  completed: { label: "تکمیل شده", className: "text-status-approved bg-status-approved/10" },
  cancelled: { label: "لغو شده", className: "text-status-rejected bg-status-rejected/10" },
  signed: { label: "امضاشده", className: "text-status-approved bg-status-approved/10" },
  closed: { label: "بسته شده", className: "text-status-draft bg-status-draft/10" },
  lump_sum: { label: "مقطوع", className: "text-primary bg-primary/10" },
  unit_rate: { label: "واحد بها", className: "text-primary bg-primary/10" },
  cost_plus: { label: "هزینه به‌علاوه", className: "text-primary bg-primary/10" },
  time_material: { label: "زمان و مواد", className: "text-primary bg-primary/10" },
  individual: { label: "حقیقی", className: "text-accent bg-accent/10" },
  company: { label: "حقوقی", className: "text-saffron bg-saffron/10" },
};

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  const entry = STATUS_MAP[status] ?? { label: status, className: "text-muted-foreground bg-muted" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        entry.className,
        className
      )}
    >
      {entry.label}
    </span>
  );
}
