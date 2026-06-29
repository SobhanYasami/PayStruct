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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/stores/auth";
import { useSidebarStore } from "@/lib/stores/sidebar";
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

const NAV_GROUPS: {
  label: string | null;
  items: { href: string; label: string; icon: React.ElementType }[];
}[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "داشبورد", icon: LayoutDashboard }],
  },
  {
    label: "عملیات",
    items: [
      { href: "/projects", label: "پروژه‌ها", icon: FolderKanban },
      { href: "/contracts", label: "قراردادها", icon: ScrollText },
      { href: "/contractors", label: "پیمانکاران", icon: UserCheck },
      { href: "/consultants", label: "مشاوران", icon: HardHat },
    ],
  },
  {
    label: "سازمان",
    items: [
      { href: "/employees", label: "کارمندان", icon: Users },
      { href: "/companies", label: "شرکت‌ها", icon: Building2 },
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
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebarStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
    : "؟";

  const roleLabel = user?.roles?.[0]
    ? (ROLE_LABELS[user.roles[0]] ?? user.roles[0])
    : "";

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          // Base styles
          "flex flex-col bg-primary text-primary-foreground border-l border-white/8 select-none",
          // Mobile: fixed overlay on the right, transitions in/out
          "fixed inset-y-0 right-0 z-40 w-72 transition-transform duration-200 ease-in-out",
          // Desktop: back to normal flex flow, smooth width transition
          "md:relative md:inset-auto md:z-auto md:transition-all md:duration-200",
          // Mobile visibility
          mobileOpen ? "translate-x-0" : "translate-x-full",
          // Desktop always visible, width depends on collapsed state
          collapsed ? "md:w-16 md:translate-x-0" : "md:w-64 md:translate-x-0"
        )}
      >
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            "shrink-0 border-b border-white/8 flex items-center gap-3",
            collapsed ? "px-0 py-4 justify-center" : "px-4 py-4"
          )}
        >
          {collapsed ? (
            <button
              onClick={toggle}
              title="باز کردن منو"
              className="cursor-pointer rounded-xl overflow-hidden w-10 h-10 ring-2 ring-white/10 hover:ring-white/30 transition-all flex items-center justify-center"
            >
              <Image
                src={logo}
                alt="logo"
                width={40}
                height={40}
                className="object-cover w-full h-full"
                priority
              />
            </button>
          ) : (
            <>
              <div className="shrink-0 rounded-xl overflow-hidden w-10 h-10 ring-2 ring-white/10">
                <Image
                  src={logo}
                  alt="logo"
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                  priority
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                  بایگان من
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  مدیریت مالی قراردادها
                </p>
              </div>
              {/* Desktop collapse button */}
              <button
                onClick={toggle}
                title="بستن منو"
                className="hidden md:flex shrink-0 p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
              {/* Mobile close button */}
              <button
                onClick={closeMobile}
                title="بستن"
                className="md:hidden shrink-0 p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-1" : ""}>
              {group.label && !collapsed && (
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-white/35 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              {collapsed && gi > 0 && (
                <div className="my-2 mx-auto w-6 h-px bg-white/10" />
              )}
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMobile}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 group",
                      collapsed
                        ? "px-0 py-2.5 justify-center"
                        : "px-3 py-2.5",
                      active
                        ? "bg-white/15 text-white"
                        : "text-white/60 hover:bg-white/10 hover:text-white/90"
                    )}
                  >
                    <Icon
                      size={collapsed ? 20 : 16}
                      className={cn(
                        "shrink-0 transition-colors",
                        active
                          ? "text-accent"
                          : "text-white/40 group-hover:text-white/70"
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{label}</span>
                        {active && (
                          <span className="w-1.5 h-4 rounded-full bg-accent shrink-0" />
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapsed expand button */}
        {collapsed && (
          <button
            onClick={toggle}
            title="باز کردن منو"
            className="hidden md:flex mx-auto mb-2 p-2 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* User section */}
        <div className="border-t border-white/8 p-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="w-8 h-8 rounded-full bg-accent/25 ring-1 ring-accent/30 flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                title="خروج"
                className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-accent/25 ring-1 ring-accent/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/90 truncate">
                  {user?.name ?? "کاربر"}
                </p>
                {roleLabel && (
                  <p className="text-[11px] text-white/35 truncate">
                    {roleLabel}
                  </p>
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
          )}
        </div>
      </aside>
    </>
  );
}
