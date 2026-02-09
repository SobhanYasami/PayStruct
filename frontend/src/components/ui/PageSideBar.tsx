import { useState } from "react";
import styles from "./PageSideBar.module.css";
import Link from "next/link";
import { DashboardFormName } from "@/providers/context/DashboardContext";
import {
	LayoutDashboard,
	Users,
	FileText,
	FolderKanban,
	ChevronRight,
	PlusCircle,
	Briefcase,
	Receipt,
	Settings,
	BarChart3,
	FolderOpen,
	Building2,
	Home,
	Menu,
	X,
	ChevronLeft,
	UserPlus,
	FilePlus,
	Layers,
	TrendingUp,
	Shield,
	Calendar,
} from "lucide-react";

interface SidebarProps {
	isPopOpen: boolean;
	setIsPopOpen: (value: boolean) => void;
	formName: DashboardFormName;
	setFormName: React.Dispatch<React.SetStateAction<DashboardFormName>>;
	isMobile?: boolean;
}

export default function PageSideBar({
	isPopOpen,
	setIsPopOpen,
	formName,
	setFormName,
	isMobile = false,
}: SidebarProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [activeMenu, setActiveMenu] = useState<string>("dashboard");
	const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
		contractors: false,
		contracts: false,
		statements: false,
	});

	const handleBtnClick = (formName: DashboardFormName, menu: string) => {
		setFormName(formName);
		setIsPopOpen(true);
		setActiveMenu(menu);
	};

	const toggleMenu = (menu: string) => {
		setExpandedMenus((prev) => ({
			...prev,
			[menu]: !prev[menu],
		}));
	};

	const toggleCollapse = () => {
		setIsCollapsed(!isCollapsed);
	};

	const menuItems = [
		{
			id: "dashboard",
			title: "داشبورد",
			icon: <LayoutDashboard size={20} />,
			path: "",
			color: "#3b82f6",
			items: [],
		},
		{
			id: "contractors",
			title: "پیمانکاران",
			icon: <Users size={20} />,
			path: "contractor",
			color: "#8b5cf6",
			items: [
				{
					id: "new-contractor",
					title: "پیمانکار جدید",
					icon: <UserPlus size={16} />,
					action: () => handleBtnClick("new-contractor", "contractors"),
				},
				{
					id: "contractor-list",
					title: "لیست پیمانکاران",
					icon: <Users size={16} />,
					path: "contractor",
				},
			],
		},
		{
			id: "contracts",
			title: "قراردادها",
			icon: <FileText size={20} />,
			path: "contract",
			color: "#10b981",
			items: [
				{
					id: "new-contract",
					title: "قرارداد جدید",
					icon: <FilePlus size={16} />,
					action: () => handleBtnClick("new-contract", "contracts"),
				},
				{
					id: "new-wbs",
					title: "ساختار شکست کار",
					icon: <Layers size={16} />,
					action: () => handleBtnClick("new-wbs", "contracts"),
				},
				{
					id: "contract-list",
					title: "لیست قراردادها",
					icon: <FileText size={16} />,
					path: "contract",
				},
			],
		},
		{
			id: "statements",
			title: "صورت وضعیت‌ها",
			icon: <Receipt size={20} />,
			path: "status-statement",
			color: "#f59e0b",
			items: [
				{
					id: "new-statement",
					title: "صورت وضعیت جدید",
					icon: <TrendingUp size={16} />,
					action: () => handleBtnClick("new-status-sttmnt", "statements"),
				},
				{
					id: "statement-list",
					title: "آرشیو صورت وضعیت‌ها",
					icon: <Receipt size={16} />,
					path: "status-statement",
				},
			],
		},
		{
			id: "projects",
			title: "پروژه‌ها",
			icon: <FolderOpen size={20} />,
			path: "../projects",
			color: "#ef4444",
			items: [],
		},
		{
			id: "reports",
			title: "گزارش‌ها",
			icon: <BarChart3 size={20} />,
			path: "reports",
			color: "#06b6d4",
			items: [],
		},
		{
			id: "settings",
			title: "تنظیمات",
			icon: <Settings size={20} />,
			path: "settings",
			color: "#64748b",
			items: [],
		},
	];

	const SidebarContent = () => (
		<>
			{/* Logo & Brand */}
			<div className={styles.LogoSection}>
				<div className={styles.Logo}>
					<div className={styles.LogoIcon}>
						<Building2 size={24} />
					</div>
					{!isCollapsed && (
						<div className={styles.LogoText}>
							<span className={styles.LogoTitle}>سیستم مدیریت</span>
							<span className={styles.LogoSubtitle}>
								قراردادها و پیمانکاران
							</span>
						</div>
					)}
				</div>
				<button
					className={styles.CollapseToggle}
					onClick={toggleCollapse}
					aria-label={isCollapsed ? "باز کردن منو" : "بستن منو"}
				>
					{isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
				</button>
			</div>

			{/* Navigation */}
			<nav className={styles.Navigation}>
				{menuItems.map((menu) => (
					<div
						key={menu.id}
						className={styles.MenuGroup}
					>
						{isCollapsed ? (
							<Link
								href={`/dashboard/contractors/${menu.path}`}
								className={`${styles.MenuHeaderCollapsed} ${
									activeMenu === menu.id ? styles.Active : ""
								}`}
								onClick={() => setActiveMenu(menu.id)}
								title={menu.title}
							>
								<div
									className={styles.MenuIcon}
									style={{ color: menu.color }}
								>
									{menu.icon}
								</div>
							</Link>
						) : (
							<>
								<div
									className={`${styles.MenuHeader} ${
										activeMenu === menu.id ? styles.Active : ""
									}`}
									onClick={() => {
										setActiveMenu(menu.id);
										if (menu.items.length > 0) {
											toggleMenu(menu.id);
										} else {
											// Navigate to main page if no subitems
											window.location.href = `/dashboard/contractors/${menu.path}`;
										}
									}}
								>
									<div className={styles.MenuHeaderContent}>
										<div
											className={styles.MenuIcon}
											style={{ color: menu.color }}
										>
											{menu.icon}
										</div>
										<span className={styles.MenuTitle}>{menu.title}</span>
									</div>
									{menu.items.length > 0 && (
										<ChevronRight
											size={16}
											className={`${styles.MenuChevron} ${
												expandedMenus[menu.id] ? styles.Rotated : ""
											}`}
										/>
									)}
								</div>
								{!isCollapsed &&
									expandedMenus[menu.id] &&
									menu.items.length > 0 && (
										<div className={styles.SubMenu}>
											{menu.items.map((item) => (
												<div
													key={item.id}
													className={styles.SubMenuItem}
												>
													{item.action ? (
														<button
															className={styles.SubMenuButton}
															onClick={() => {
																item.action?.();
																setActiveMenu(menu.id);
															}}
														>
															<div className={styles.SubMenuIcon}>
																{item.icon}
															</div>
															<span>{item.title}</span>
														</button>
													) : (
														<Link
															href={`/dashboard/contractors/${item.path}`}
															className={styles.SubMenuLink}
															onClick={() => setActiveMenu(menu.id)}
														>
															<div className={styles.SubMenuIcon}>
																{item.icon}
															</div>
															<span>{item.title}</span>
														</Link>
													)}
												</div>
											))}
										</div>
									)}
							</>
						)}
					</div>
				))}
			</nav>

			{/* Quick Stats (Visible only when expanded) */}
			{!isCollapsed && (
				<div className={styles.QuickStats}>
					<div className={styles.StatItem}>
						<div className={styles.StatIcon}>
							<Users size={16} />
						</div>
						<div className={styles.StatInfo}>
							<span className={styles.StatValue}>۲۴</span>
							<span className={styles.StatLabel}>پیمانکار</span>
						</div>
					</div>
					<div className={styles.StatItem}>
						<div className={styles.StatIcon}>
							<FileText size={16} />
						</div>
						<div className={styles.StatInfo}>
							<span className={styles.StatValue}>۱۸</span>
							<span className={styles.StatLabel}>قرارداد</span>
						</div>
					</div>
				</div>
			)}

			{/* User Profile */}
			<div className={styles.UserSection}>
				<div className={styles.UserAvatar}>
					<Users size={20} />
				</div>
				{!isCollapsed && (
					<div className={styles.UserInfo}>
						<span className={styles.UserName}>مدیر سیستم</span>
						<span className={styles.UserRole}>ادمین</span>
					</div>
				)}
			</div>
		</>
	);

	return (
		<>
			{/* Mobile Toggle Button */}
			{isMobile && (
				<button
					className={styles.MobileToggle}
					onClick={toggleCollapse}
					aria-label={isCollapsed ? "باز کردن منو" : "بستن منو"}
				>
					{isCollapsed ? <Menu size={24} /> : <X size={24} />}
				</button>
			)}

			{/* Sidebar */}
			<div
				className={`${styles.Container} ${isCollapsed ? styles.Collapsed : ""} ${
					isMobile ? styles.Mobile : ""
				}`}
			>
				<SidebarContent />
			</div>

			{/* Mobile Overlay */}
			{isMobile && !isCollapsed && (
				<div
					className={styles.MobileOverlay}
					onClick={toggleCollapse}
				/>
			)}
		</>
	);
}

// Helper Components
function PartContainer({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <div className={styles.PartContainer}>{children}</div>;
}

function PartHeader({ title, path }: { title: string; path: string }) {
	return (
		<Link
			href={`/dashboard/contractors/${path}`}
			className={styles.PartHeader}
		>
			{title}
		</Link>
	);
}

function PartItems({ children }: { children: React.ReactNode }) {
	return <div className={styles.PartItems}>{children}</div>;
}
