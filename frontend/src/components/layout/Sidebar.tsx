"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	LayoutDashboard,
	FolderOpen,
	Users,
	FileText,
	User,
	Building2,
	LogOut,
} from "lucide-react";
import styles from "./Sidebar.module.css";

const navItems = [
	{ id: "dashboard", label: "داشبورد", href: "/dashboard", icon: LayoutDashboard },
	{ id: "projects", label: "پروژه‌ها", href: "/dashboard/projects", icon: FolderOpen },
	{ id: "contractors", label: "پیمانکاران", href: "/dashboard/contractors", icon: Users },
	{ id: "contracts", label: "قراردادها", href: "/dashboard/contracts", icon: FileText },
	{ id: "employees", label: "کارکنان", href: "/dashboard/employees", icon: User },
	{ id: "companies", label: "شرکت‌ها", href: "/dashboard/companies", icon: Building2 },
];

export default function Sidebar() {
	const pathname = usePathname();
	const router = useRouter();

	const isActive = (href: string) => {
		if (href === "/dashboard") return pathname === "/dashboard";
		return pathname.startsWith(href);
	};

	const handleLogout = () => {
		localStorage.removeItem("usr-token");
		localStorage.removeItem("usr-roles");
		router.push("/auth");
	};

	return (
		<aside className={styles.sidebar}>
			<div className={styles.brand}>
				<div className={styles.brandIcon}>
					<Building2 size={20} />
				</div>
				<div className={styles.brandText}>
					<span className={styles.brandTitle}>پی‌استراکت</span>
					<span className={styles.brandSub}>مدیریت مالی</span>
				</div>
			</div>

			<nav className={styles.nav}>
				{navItems.map((item) => {
					const Icon = item.icon;
					const active = isActive(item.href);
					return (
						<Link
							key={item.id}
							href={item.href}
							className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
						>
							<Icon size={18} />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			<div className={styles.footer}>
				<button className={styles.logoutBtn} onClick={handleLogout}>
					<LogOut size={16} />
					<span>خروج</span>
				</button>
			</div>
		</aside>
	);
}
