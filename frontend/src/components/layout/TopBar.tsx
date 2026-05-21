"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth";

const crumbMap: Record<string, string> = {
	dashboard: "داشبورد",
	projects: "پروژه‌ها",
	contractors: "پیمانکاران",
	employees: "کارمندان",
	reports: "گزارشات",
	contracts: "قراردادها",
	statements: "صورت وضعیت‌ها",
};

export function TopBar() {
	const pathname = usePathname();
	const router = useRouter();
	const { user, logout } = useAuthStore();

	const segments = pathname.split("/").filter(Boolean);
	const crumbs = segments.map((s) => crumbMap[s] ?? s);

	const handleLogout = () => {
		logout();
		router.push("/login");
	};

	return (
		<header className='h-14 flex items-center justify-between px-6 border-b bg-white/80 backdrop-blur-sm'>
			<nav className='flex items-center gap-2 text-sm text-muted-foreground'>
				{crumbs.map((c, i) => (
					<span
						key={i}
						className='flex items-center gap-2'
					>
						{i > 0 && <span>/</span>}
						<span
							className={
								i === crumbs.length - 1 ? "text-foreground font-medium" : ""
							}
						>
							{c}
						</span>
					</span>
				))}
			</nav>

			<div className='flex items-center gap-3'>
				{user && (
					<span className='text-sm text-muted-foreground'>{user.name}</span>
				)}
				<button
					onClick={handleLogout}
					className='flex items-center gap-1.5 text-sm text-muted-foreground border rounded border-gray-600 hover:text-red-500 hover:border-red-500 transition px-3 py-1'
				>
					<LogOut size={16} />
					خروج
				</button>
			</div>
		</header>
	);
}
