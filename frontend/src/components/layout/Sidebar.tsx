"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCheck,
  FileText,
  Building2,
  ScrollText,
  LogOut,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/stores/auth";
import logo from "@/../public/main-logo.jpg";

const ROLE_LABELS: Record<string, string> = {
  manager: "مدیر",
  sudoer: "مدیر ارشد",
  admin: "ادمین",
  finance_head: "رئیس مالی",
  juridical_head: "رئیس حقوقی",
  engineering_head: "رئیس فنی",
  security_head: "رئیس امنیت",
  finance: "مالی",
  engineering: "فنی",
  security: "امنیت",
};

const NAV_GROUPS: { label: string | null; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "داشبورد", icon: LayoutDashboard }],
  },
  {
    label: "عملیات",
    items: [
      { href: "/projects",     label: "پروژه‌ها",   icon: FolderKanban },
      { href: "/contracts",    label: "قراردادها",  icon: ScrollText },
      { href: "/contractors",  label: "پیمانکاران", icon: UserCheck },
      { href: "/consultants", label: "مشاوران",    icon: HardHat },
    ],
  },
  {
    label: "سازمان",
    items: [
      { href: "/employees",  label: "کارمندان",  icon: Users },
      { href: "/companies",  label: "شرکت‌ها",   icon: Building2 },
    ],
  },
  {
    label: null,
    items: [{ href: "/reports", label: "گزارشات", icon: FileText }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("")
    : "؟";

  const roleLabel = user?.roles?.[0] ? (ROLE_LABELS[user.roles[0]] ?? user.roles[0]) : "";

  return (
    <aside className="w-64 shrink-0 bg-primary text-primary-foreground flex flex-col border-l border-white/[0.08] select-none">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-xl overflow-hidden w-10 h-10 ring-2 ring-white/10">
            <Image src={logo} alt="logo" width={40} height={40} className="object-cover w-full h-full" priority />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">بایگان من</p>
            <p className="text-[11px] text-white/40 mt-0.5">مدیریت مالی قراردادها</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-1" : ""}>
            {group.label && (
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-white/35 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/[0.07] hover:text-white/90"
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(
                      "shrink-0 transition-colors",
                      active ? "text-accent" : "text-white/40 group-hover:text-white/70"
                    )}
                  />
                  <span className="flex-1">{label}</span>
                  {active && (
                    <span className="w-1.5 h-4 rounded-full bg-accent shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.08] p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-accent/25 ring-1 ring-accent/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/90 truncate">{user?.name ?? "کاربر"}</p>
            {roleLabel && (
              <p className="text-[11px] text-white/35 truncate">{roleLabel}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="خروج"
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
