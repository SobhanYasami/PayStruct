"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import styles from "./TopBar.module.css";

const breadcrumbMap: Record<string, string> = {
	"/dashboard": "داشبورد",
	"/dashboard/projects": "پروژه‌ها",
	"/dashboard/contractors": "پیمانکاران",
	"/dashboard/contracts": "قراردادها",
	"/dashboard/employees": "کارکنان",
	"/dashboard/companies": "شرکت‌ها",
	"/dashboard/profile": "پروفایل",
	"/dashboard/settings": "تنظیمات",
};

function getLabel(pathname: string): string {
	if (breadcrumbMap[pathname]) return breadcrumbMap[pathname];
	if (pathname.includes("/statements/")) return "صورت‌وضعیت";
	if (pathname.startsWith("/dashboard/contracts/")) return "جزئیات قرارداد";
	if (pathname.startsWith("/dashboard/projects/")) return "جزئیات پروژه";
	if (pathname.startsWith("/dashboard/contractors/contractor")) return "پیمانکاران";
	if (pathname.startsWith("/dashboard/contractors/contract")) return "قراردادها";
	if (pathname.startsWith("/dashboard/contractors/status-statement")) return "صورت‌وضعیت‌ها";
	return "داشبورد";
}

export default function TopBar() {
	const pathname = usePathname();
	const [userName, setUserName] = useState("");

	useEffect(() => {
		const token = localStorage.getItem("usr-token");
		if (token) {
			try {
				const payload = JSON.parse(atob(token.split(".")[1]));
				const name = payload.user_name || payload.name || payload.email || "کاربر";
				setUserName(name);
			} catch {
				setUserName("کاربر");
			}
		}
	}, []);

	return (
		<header className={styles.topbar}>
			<span className={styles.pageTitle}>{getLabel(pathname)}</span>
			<div className={styles.user}>
				<div className={styles.avatar}>
					<User size={14} />
				</div>
				{userName && <span className={styles.userName}>{userName}</span>}
			</div>
		</header>
	);
}
