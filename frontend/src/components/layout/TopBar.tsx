"use client";

import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const CRUMB_MAP: Record<string, string> = {
  dashboard:   "داشبورد",
  projects:    "پروژه‌ها",
  contractors: "پیمانکاران",
  employees:   "کارمندان",
  reports:     "گزارشات",
  contracts:   "قراردادها",
  companies:   "شرکت‌ها",
  statements:  "صورت وضعیت‌ها",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function TopBar() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((s) =>
    CRUMB_MAP[s] ?? (UUID_RE.test(s) ? "جزئیات" : s)
  );

  return (
    <header className="h-14 shrink-0 flex items-center px-6 border-b bg-white/80 backdrop-blur-sm">
      <nav className="flex items-center gap-1 text-sm" aria-label="مسیر صفحه">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronLeft
                size={14}
                className="text-muted-foreground/40 shrink-0"
                aria-hidden
              />
            )}
            <span
              className={
                i === crumbs.length - 1
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }
            >
              {c}
            </span>
          </span>
        ))}
      </nav>
    </header>
  );
}
