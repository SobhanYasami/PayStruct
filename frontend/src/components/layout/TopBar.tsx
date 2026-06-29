"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { ChevronLeft, Menu, LogOut } from "lucide-react";
import { useSidebarStore } from "@/lib/stores/sidebar";
import { useAuthStore } from "@/lib/stores/auth";

const CRUMB_MAP: Record<string, string> = {
  dashboard:   "داشبورد",
  projects:    "پروژه‌ها",
  contractors: "پیمانکاران",
  consultants: "مشاوران",
  employees:   "کارمندان",
  reports:     "گزارشات",
  contracts:   "قراردادها",
  companies:   "شرکت‌ها",
  statements:  "صورت وضعیت‌ها",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobile } = useSidebarStore();
  const { user, logout } = useAuthStore();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((s) =>
    CRUMB_MAP[s] ?? (UUID_RE.test(s) ? "جزئیات" : s)
  );

  const currentPage = crumbs[crumbs.length - 1] ?? "داشبورد";

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
    : "؟";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b bg-white/80 backdrop-blur-sm">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggleMobile}
        aria-label="باز کردن منو"
        className="md:hidden p-2 -mr-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
      >
        <Menu size={20} />
      </button>

      {/* Mobile page title */}
      <span className="md:hidden text-sm font-semibold text-foreground flex-1 truncate">
        {currentPage}
      </span>

      {/* Desktop breadcrumbs */}
      <nav
        className="hidden md:flex flex-1 items-center gap-1 text-sm"
        aria-label="مسیر صفحه"
      >
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

      {/* Mobile: user avatar + logout */}
      <div className="md:hidden flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
          {initials}
        </div>
        <button
          onClick={handleLogout}
          aria-label="خروج"
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
