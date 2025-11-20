"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

import {
	Home,
	Users,
	Building2,
	Wallet,
	BarChart3,
	Settings,
	Menu,
	X,
	User,
	LogOut,
} from "lucide-react";

import styles from "./Navbar.module.css";

interface NavItem {
	title: string;
	href: string;
	icon: React.ReactNode;
}

const navItems: NavItem[] = [
	{ title: "داشبورد", href: "/dashboard/", icon: <Home size={20} /> },
	{
		title: "پروژه‌ها",
		href: "/dashboard/projects",
		icon: <Building2 size={20} />,
	},
	{ title: "مشتریان", href: "/dashboard/customers", icon: <Users size={20} /> },
	{
		title: "پیمانکاران",
		href: "/dashboard/contractors",
		icon: <Wallet size={20} />,
	},
	{
		title: "گزارش‌ها",
		href: "/dashboard/reports",
		icon: <BarChart3 size={20} />,
	},
	{
		title: "تنظیمات",
		href: "/dashboard/settings",
		icon: <Settings size={20} />,
	},
];

export default function Navbar() {
	const pathname = usePathname();
	const [menuOpen, setMenuOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<nav
			dir='rtl'
			className={styles.navbar}
		>
			<div className={styles.container}>
				<div className={styles.navInner}>
					<div className={styles.logo}>PayStruct</div>

					{/* Desktop Menu */}
					<div className={styles.desktopMenu}>
						{navItems.map((item) => {
							const isActive = pathname === item.href;
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`${styles.navItem} ${
										isActive ? styles.active : ""
									}`}
								>
									{item.icon}
									<span>{item.title}</span>
								</Link>
							);
						})}
					</div>

					{/* Avatar Dropdown */}
					<div
						className={styles.avatarWrapper}
						ref={dropdownRef}
					>
						<button
							onClick={() => setDropdownOpen(!dropdownOpen)}
							className={styles.avatarButton}
						>
							<Image
								src='/avatar.png'
								alt='User Avatar'
								width={36}
								height={36}
								className={styles.avatarImage}
							/>
							<span className={styles.avatarName}>مدیر سیستم</span>
						</button>

						<AnimatePresence>
							{dropdownOpen && (
								<motion.div
									initial={{ opacity: 0, y: -5 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -5 }}
									transition={{ duration: 0.2 }}
									className={styles.dropdown}
								>
									<Link
										href='/profile'
										className={styles.dropdownItem}
										onClick={() => setDropdownOpen(false)}
									>
										<User size={16} />
										<span>پروفایل</span>
									</Link>

									<button
										className={`${styles.dropdownItem} ${styles.logout}`}
										onClick={() => alert("خروج از حساب")}
									>
										<LogOut size={16} />
										<span>خروج</span>
									</button>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

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
							{navItems.map((item) => {
								const isActive = pathname === item.href;
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`${styles.mobileItem} ${
											isActive ? styles.mobileActive : ""
										}`}
										onClick={() => setMenuOpen(false)}
									>
										{item.icon}
										<span>{item.title}</span>
									</Link>
								);
							})}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</nav>
	);
}
