"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCheck,
  FileText,
  Building2,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/projects", label: "پروژه‌ها", icon: FolderKanban },
  { href: "/contracts", label: "قراردادها", icon: ScrollText },
  { href: "/contractors", label: "پیمانکاران", icon: UserCheck },
  { href: "/employees", label: "کارمندان", icon: Users },
  { href: "/companies", label: "شرکت‌ها", icon: Building2 },
  { href: "/reports", label: "گزارشات", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-primary text-primary-foreground flex flex-col">
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-lg font-bold tracking-tight">ContractLedger</span>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white border-r-2 border-accent"
                  : "text-white/70 hover:bg-white/10 hover:text-white"

              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
