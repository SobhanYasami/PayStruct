"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  ScrollText,
  UserCheck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "داشبورد",    icon: LayoutDashboard },
  { href: "/projects",    label: "پروژه‌ها",   icon: FolderKanban },
  { href: "/contracts",   label: "قراردادها",  icon: ScrollText },
  { href: "/contractors", label: "پیمانکاران", icon: UserCheck },
  { href: "/reports",     label: "گزارشات",    icon: FileText },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 flex bg-primary text-primary-foreground border-t border-white/8"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="ناوبری اصلی"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-14 transition-colors duration-150 cursor-pointer",
              active
                ? "text-white"
                : "text-white/45 hover:text-white/80 active:text-white"
            )}
          >
            <Icon
              size={22}
              className={cn(
                "transition-colors",
                active ? "text-accent" : "text-white/45"
              )}
            />
            <span className={cn("text-[10px] font-medium leading-none", active ? "text-white" : "text-white/45")}>
              {label}
            </span>
            {active && (
              <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-accent" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
