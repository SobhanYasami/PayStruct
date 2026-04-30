"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import {
	Home,
	Users,
	Building2,
	Wallet,
	BarChart3,
	Menu,
	X,
	User,
	LogOut,
	Settings,
	ChevronDown,
} from "lucide-react";

import styles from "./Navbar.module.css";

interface NavItem {
	title: string;
	href: string;
	icon: React.ReactNode;
	sudoerOnly?: boolean;
}

const navItems: NavItem[] = [
	{ title: "داشبورد", href: "/dashboard/", icon: <Home size={20} /> },
	{ title: "پروژه‌ها", href: "/dashboard/projects", icon: <Building2 size={20} /> },
	{ title: "مشتریان", href: "/dashboard/customers", icon: <Users size={20} /> },
	{ title: "پیمانکاران", href: "/dashboard/contractors", icon: <Wallet size={20} /> },
	{ title: "کارمندان", href: "/dashboard/employees", icon: <User size={20} />, sudoerOnly: true },
	{ title: "شرکت‌ها", href: "/dashboard/companies", icon: <BarChart3 size={20} />, sudoerOnly: true },
];

function useAuth() {
	const [token, setToken] = useState<string | null>(null);
	const [roles, setRoles] = useState<string[]>([]);

	useEffect(() => {
		const t = localStorage.getItem("usr-token");
		const r = localStorage.getItem("usr-roles");
		setToken(t);
		try {
			setRoles(r ? JSON.parse(r) : []);
		} catch {
			setRoles([]);
		}
	}, []);

	const isSudoer = roles.includes("sudoer");
	const isLoggedIn = Boolean(token);
	return { isLoggedIn, isSudoer, roles };
}

export default function Navbar() {
	const pathname = usePathname();
	const router = useRouter();
	const [menuOpen, setMenuOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { isLoggedIn, isSudoer } = useAuth();

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleLogout = () => {
		localStorage.removeItem("usr-token");
		localStorage.removeItem("usr-roles");
		router.push("/auth");
	};

	const visibleItems = navItems.filter(
		(item) => !item.sudoerOnly || isSudoer
	);

	return (
		<nav dir='rtl' className={styles.navbar}>
			<div className={styles.container}>
				<div className={styles.navInner}>
					<div className={styles.logo}>PayStruct</div>

					{/* Desktop Menu */}
					<div className={styles.desktopMenu}>
						{visibleItems.map((item) => {
							const isActive = pathname === item.href;
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`${styles.navItem} ${isActive ? styles.active : ""}`}
								>
									{item.icon}
									<span>{item.title}</span>
								</Link>
							);
						})}
					</div>

					{/* Right side */}
					{isLoggedIn ? (
						<div ref={dropdownRef} style={{ position: "relative" }}>
							<button
								onClick={() => setDropdownOpen((v) => !v)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 6,
									padding: "6px 12px",
									borderRadius: 8,
									border: "1px solid #e5e7eb",
									background: "#fff",
									cursor: "pointer",
									fontSize: 14,
									color: "#374151",
								}}
							>
								<User size={16} />
								<span>حساب من</span>
								<ChevronDown size={14} />
							</button>

							<AnimatePresence>
								{dropdownOpen && (
									<motion.div
										initial={{ opacity: 0, y: -6 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -6 }}
										transition={{ duration: 0.15 }}
										style={{
											position: "absolute",
											top: "calc(100% + 8px)",
											right: 0,
											background: "#fff",
											border: "1px solid #e5e7eb",
											borderRadius: 10,
											boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
											minWidth: 180,
											zIndex: 50,
											overflow: "hidden",
										}}
									>
										<Link
											href='/dashboard/profile'
											onClick={() => setDropdownOpen(false)}
											style={dropdownItem}
										>
											<User size={16} />
											<span>پروفایل من</span>
										</Link>
										<Link
											href='/dashboard/settings'
											onClick={() => setDropdownOpen(false)}
											style={dropdownItem}
										>
											<Settings size={16} />
											<span>تنظیمات</span>
										</Link>
										<div style={{ borderTop: "1px solid #f3f4f6" }} />
										<button
											onClick={handleLogout}
											style={{ ...dropdownItem, color: "#ef4444", width: "100%" }}
										>
											<LogOut size={16} />
											<span>خروج</span>
										</button>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					) : (
						<div className={styles.SignIn}>
							<Link href='/auth'>
								<span>ورود</span>
								<span className={styles.separator}>|</span>
								<span>ثبت نام</span>
							</Link>
						</div>
					)}

					{/* Mobile Hamburger */}
					<button
						className={styles.hamburger}
						onClick={() => setMenuOpen(!menuOpen)}
					>
						{menuOpen ? <X size={24} /> : <Menu size={24} />}
					</button>
				</div>

				{/* Mobile Menu */}
				<AnimatePresence>
					{menuOpen && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.25 }}
							className={styles.mobileMenu}
						>
							{visibleItems.map((item) => {
								const isActive = pathname === item.href;
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`${styles.mobileItem} ${isActive ? styles.mobileActive : ""}`}
										onClick={() => setMenuOpen(false)}
									>
										{item.icon}
										<span>{item.title}</span>
									</Link>
								);
							})}
							{isLoggedIn && (
								<>
									<Link
										href='/dashboard/profile'
										className={styles.mobileItem}
										onClick={() => setMenuOpen(false)}
									>
										<User size={20} />
										<span>پروفایل من</span>
									</Link>
									<button
										onClick={handleLogout}
										className={styles.mobileItem}
										style={{ color: "#ef4444", background: "none", border: "none", width: "100%", textAlign: "right", cursor: "pointer" }}
									>
										<LogOut size={20} />
										<span>خروج</span>
									</button>
								</>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</nav>
	);
}

const dropdownItem: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 10,
	padding: "10px 16px",
	fontSize: 14,
	color: "#374151",
	textDecoration: "none",
	cursor: "pointer",
	background: "none",
	border: "none",
	fontFamily: "inherit",
};
