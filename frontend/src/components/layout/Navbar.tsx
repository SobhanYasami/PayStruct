"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

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
			className='w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50'
		>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
				<div className='flex items-center justify-between h-14'>
					{/* Logo */}
					<div className='text-xl font-bold text-gray-800 select-none'>
						PayStruct
					</div>

					{/* Desktop Menu */}
					<div className='hidden md:flex items-center gap-6'>
						{navItems.map((item) => {
							const isActive = pathname === item.href;
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`flex items-center gap-2 text-sm font-medium transition-colors ${
										isActive
											? "text-blue-600"
											: "text-gray-600 hover:text-blue-500"
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
						className='relative'
						ref={dropdownRef}
					>
						<button
							onClick={() => setDropdownOpen(!dropdownOpen)}
							className='flex items-center gap-2 focus:outline-none'
						>
							<Image
								src='/avatar.png'
								alt='User Avatar'
								width={36}
								height={36}
								className='rounded-full border border-gray-300'
							/>
							<span className='hidden sm:block text-sm font-medium text-gray-700'>
								مدیر سیستم
							</span>
						</button>

						<AnimatePresence>
							{dropdownOpen && (
								<motion.div
									initial={{ opacity: 0, y: -5 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -5 }}
									transition={{ duration: 0.2 }}
									className='absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50'
								>
									<Link
										href='/profile'
										className='flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
										onClick={() => setDropdownOpen(false)}
									>
										<User size={16} />
										<span>پروفایل</span>
									</Link>
									<button
										className='flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100'
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
						className='md:hidden flex items-center justify-center text-gray-700'
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
							className='md:hidden mt-2 flex flex-col gap-2 pb-4 border-t border-gray-100 pt-3 overflow-hidden'
						>
							{navItems.map((item) => {
								const isActive = pathname === item.href;
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`flex items-center gap-3 text-sm font-medium px-2 py-2 rounded-md ${
											isActive
												? "bg-blue-50 text-blue-600"
												: "text-gray-600 hover:bg-gray-50 hover:text-blue-500"
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
