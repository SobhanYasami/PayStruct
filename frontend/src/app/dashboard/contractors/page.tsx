"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./page.module.css";
import {
	Building,
	FileText,
	DollarSign,
	Users,
	Calendar,
	TrendingUp,
	TrendingDown,
	Clock,
	CheckCircle,
	AlertCircle,
	ChevronRight,
	Plus,
	Search,
	Filter,
	Download,
	MoreVertical,
	Phone,
	Mail,
	MapPin,
	Briefcase,
	Shield,
	Award,
	BarChart3,
	Eye,
	Edit,
	Trash2,
	ExternalLink,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;

// Mock data types (replace with actual API response types)
interface Contractor {
	id: string;
	name: string;
	company: string;
	email: string;
	phone: string;
	location: string;
	status: "active" | "pending" | "suspended";
	contractsCount: number;
	totalValue: number;
	completedProjects: number;
	rating: number;
	specialization: string[];
	lastActivity: string;
	joinDate: string;
}

interface Contract {
	id: string;
	contractorId: string;
	title: string;
	value: number;
	status: "active" | "completed" | "pending" | "terminated";
	startDate: string;
	endDate: string;
	progress: number;
	documentsCount: number;
}

interface StatusStatement {
	id: string;
	contractorId: string;
	period: string;
	amount: number;
	status: "paid" | "pending" | "overdue";
	dueDate: string;
	submittedDate: string;
}

/* -------------------- API Functions -------------------- */
async function getAllContractors() {
	const token = localStorage.getItem("usr-token");
	if (!token) throw new Error("UnAuthorized");

	const res = await fetch(`${Contractor_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to fetch contractors!");
	}

	return res.json();
}

async function getContractorStats() {
	const token = localStorage.getItem("usr-token");
	if (!token) throw new Error("UnAuthorized");

	const res = await fetch(`${Contractor_URL}/stats`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to fetch statistics!");
	}

	return res.json();
}

/* -------------------- Stat Card Component -------------------- */
function StatCard({
	title,
	value,
	change,
	icon: Icon,
	color = "primary",
	format = "default",
}: {
	title: string;
	value: number | string;
	change?: number;
	icon: any;
	color?: "primary" | "success" | "warning" | "danger" | "info";
	format?: "default" | "currency" | "percentage";
}) {
	const formatValue = (val: number | string) => {
		if (format === "currency") {
			return new Intl.NumberFormat("fa-IR").format(Number(val)) + " تومان";
		}
		if (format === "percentage") {
			return `${val}%`;
		}
		return new Intl.NumberFormat("fa-IR").format(Number(val));
	};

	const colors = {
		primary: "var(--primary)",
		success: "var(--success)",
		warning: "var(--warning)",
		danger: "var(--danger)",
		info: "var(--info)",
	};

	return (
		<div className={styles.statCard}>
			<div
				className={styles.statIcon}
				style={{ backgroundColor: colors[color] + "15" }}
			>
				<Icon
					size={24}
					style={{ color: colors[color] }}
				/>
			</div>
			<div className={styles.statContent}>
				<span className={styles.statValue}>{formatValue(value)}</span>
				<span className={styles.statTitle}>{title}</span>
				{change !== undefined && (
					<div
						className={`${styles.statChange} ${change >= 0 ? styles.positive : styles.negative}`}
					>
						{change >= 0 ? (
							<TrendingUp size={14} />
						) : (
							<TrendingDown size={14} />
						)}
						<span>{Math.abs(change)}% نسبت به ماه قبل</span>
					</div>
				)}
			</div>
		</div>
	);
}

/* -------------------- Quick Access Card -------------------- */
function QuickAccessCard({
	title,
	description,
	icon: Icon,
	color,
	onClick,
	count,
}: {
	title: string;
	description: string;
	icon: any;
	color: string;
	onClick: () => void;
	count?: number;
}) {
	return (
		<div
			className={styles.quickAccessCard}
			onClick={onClick}
		>
			<div
				className={styles.quickAccessIcon}
				style={{ backgroundColor: color + "15" }}
			>
				<Icon
					size={24}
					style={{ color }}
				/>
			</div>
			<div className={styles.quickAccessContent}>
				<div className={styles.quickAccessHeader}>
					<h4>{title}</h4>
					{count !== undefined && (
						<span className={styles.quickAccessCount}>{count}</span>
					)}
				</div>
				<p>{description}</p>
				<div className={styles.quickAccessAction}>
					<span>مشاهده و مدیریت</span>
					<ChevronRight size={16} />
				</div>
			</div>
		</div>
	);
}

/* -------------------- Contractor Card -------------------- */
function ContractorCard({ contractor }: { contractor: Contractor }) {
	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "var(--success)";
			case "pending":
				return "var(--warning)";
			case "suspended":
				return "var(--danger)";
			default:
				return "var(--text-tertiary)";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "active":
				return "فعال";
			case "pending":
				return "در انتظار";
			case "suspended":
				return "تعلیق شده";
			default:
				return status;
		}
	};

	return (
		<div className={styles.contractorCard}>
			<div className={styles.contractorHeader}>
				<div className={styles.contractorAvatar}>
					<Building size={24} />
				</div>
				<div className={styles.contractorInfo}>
					<h4>{contractor.name}</h4>
					<p>{contractor.company}</p>
				</div>
				<div className={styles.contractorStatus}>
					<span style={{ backgroundColor: getStatusColor(contractor.status) }}>
						{getStatusText(contractor.status)}
					</span>
				</div>
			</div>

			<div className={styles.contractorDetails}>
				<div className={styles.detailRow}>
					<div className={styles.detailItem}>
						<Phone size={14} />
						<span>{contractor.phone}</span>
					</div>
					<div className={styles.detailItem}>
						<Mail size={14} />
						<span>{contractor.email}</span>
					</div>
				</div>
				<div className={styles.detailRow}>
					<div className={styles.detailItem}>
						<MapPin size={14} />
						<span>{contractor.location}</span>
					</div>
					<div className={styles.detailItem}>
						<Briefcase size={14} />
						<span>{contractor.specialization[0]}</span>
					</div>
				</div>
			</div>

			<div className={styles.contractorStats}>
				<div className={styles.contractorStat}>
					<span className={styles.statLabel}>قراردادها</span>
					<span className={styles.statValue}>{contractor.contractsCount}</span>
				</div>
				<div className={styles.contractorStat}>
					<span className={styles.statLabel}>ارزش کل</span>
					<span className={styles.statValue}>
						{new Intl.NumberFormat("fa-IR").format(contractor.totalValue)} تومان
					</span>
				</div>
				<div className={styles.contractorStat}>
					<span className={styles.statLabel}>رتبه</span>
					<span className={styles.statValue}>{contractor.rating}/5</span>
				</div>
			</div>

			<div className={styles.contractorActions}>
				<button className={styles.actionButton}>
					<Eye size={16} />
					<span>مشاهده</span>
				</button>
				<button className={styles.actionButton}>
					<Edit size={16} />
					<span>ویرایش</span>
				</button>
				<button className={styles.actionButton}>
					<FileText size={16} />
					<span>گزارش</span>
				</button>
			</div>
		</div>
	);
}

/* -------------------- Recent Activity -------------------- */
function RecentActivity({ activities }: { activities: any[] }) {
	const getActivityIcon = (type: string) => {
		switch (type) {
			case "contract":
				return <FileText size={16} />;
			case "payment":
				return <DollarSign size={16} />;
			case "meeting":
				return <Calendar size={16} />;
			case "status":
				return <BarChart3 size={16} />;
			default:
				return <Clock size={16} />;
		}
	};

	const getActivityColor = (type: string) => {
		switch (type) {
			case "contract":
				return "var(--primary)";
			case "payment":
				return "var(--success)";
			case "meeting":
				return "var(--warning)";
			case "status":
				return "var(--info)";
			default:
				return "var(--text-tertiary)";
		}
	};

	return (
		<div className={styles.recentActivity}>
			<div className={styles.sectionHeader}>
				<h3>فعالیت‌های اخیر</h3>
				<button className={styles.viewAllButton}>مشاهده همه</button>
			</div>
			<div className={styles.activityList}>
				{activities.map((activity, index) => (
					<div
						key={index}
						className={styles.activityItem}
					>
						<div
							className={styles.activityIcon}
							style={{
								backgroundColor: getActivityColor(activity.type) + "15",
							}}
						>
							{getActivityIcon(activity.type)}
						</div>
						<div className={styles.activityContent}>
							<p>{activity.description}</p>
							<div className={styles.activityMeta}>
								<span className={styles.activityTime}>{activity.time}</span>
								<span className={styles.activityContractor}>
									{activity.contractor}
								</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/* -------------------- Status Statement Card -------------------- */
function StatusStatementCard({ statement }: { statement: StatusStatement }) {
	const getStatusColor = (status: string) => {
		switch (status) {
			case "paid":
				return "var(--success)";
			case "pending":
				return "var(--warning)";
			case "overdue":
				return "var(--danger)";
			default:
				return "var(--text-tertiary)";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "paid":
				return "پرداخت شده";
			case "pending":
				return "در انتظار پرداخت";
			case "overdue":
				return "معوق";
			default:
				return status;
		}
	};

	return (
		<div className={styles.statementCard}>
			<div className={styles.statementHeader}>
				<h4>صورت وضعیت {statement.period}</h4>
				<span
					className={styles.statementStatus}
					style={{ backgroundColor: getStatusColor(statement.status) }}
				>
					{getStatusText(statement.status)}
				</span>
			</div>
			<div className={styles.statementDetails}>
				<div className={styles.statementDetail}>
					<span className={styles.detailLabel}>مبلغ:</span>
					<span className={styles.detailValue}>
						{new Intl.NumberFormat("fa-IR").format(statement.amount)} تومان
					</span>
				</div>
				<div className={styles.statementDetail}>
					<span className={styles.detailLabel}>تاریخ سررسید:</span>
					<span className={styles.detailValue}>{statement.dueDate}</span>
				</div>
				<div className={styles.statementDetail}>
					<span className={styles.detailLabel}>تاریخ ارسال:</span>
					<span className={styles.detailValue}>{statement.submittedDate}</span>
				</div>
			</div>
			<div className={styles.statementActions}>
				<button className={styles.statementActionButton}>
					<Eye size={16} />
					مشاهده
				</button>
				<button className={styles.statementActionButton}>
					<Download size={16} />
					دانلود
				</button>
			</div>
		</div>
	);
}

/* -------------------- Main Component -------------------- */
export default function Contractors() {
	const [searchTerm, setSearchTerm] = useState("");
	const [activeTab, setActiveTab] = useState("all");
	const [showAddContractor, setShowAddContractor] = useState(false);

	// Fetch contractors data
	const { data: contractorsData, isLoading: isLoadingContractors } = useQuery({
		queryKey: ["contractors"],
		queryFn: getAllContractors,
	});

	// Fetch statistics
	const { data: statsData, isLoading: isLoadingStats } = useQuery({
		queryKey: ["contractorStats"],
		queryFn: getContractorStats,
	});

	// Mock data (replace with actual API data)
	const mockContractors: Contractor[] = [
		{
			id: "1",
			name: "علی محمدی",
			company: "سازه‌گستر ایرانیان",
			email: "ali.mohammadi@sazegostar.com",
			phone: "09123456789",
			location: "تهران",
			status: "active",
			contractsCount: 12,
			totalValue: 2500000000,
			completedProjects: 8,
			rating: 4.7,
			specialization: ["اسکلت فلزی", "بتن ریزی"],
			lastActivity: "2 ساعت پیش",
			joinDate: "1402/05/15",
		},
		{
			id: "2",
			name: "رضا کریمی",
			company: "آبادگران پایتخت",
			email: "reza.karimi@abadgaran.com",
			phone: "09129876543",
			location: "مشهد",
			status: "active",
			contractsCount: 8,
			totalValue: 1800000000,
			completedProjects: 5,
			rating: 4.5,
			specialization: ["نقشه برداری", "عملیات خاکی"],
			lastActivity: "1 روز پیش",
			joinDate: "1402/03/22",
		},
		{
			id: "3",
			name: "محمد حسینی",
			company: "ساختمان‌سازی نوین",
			email: "m.hosseini@novin.com",
			phone: "09361234567",
			location: "اصفهان",
			status: "pending",
			contractsCount: 3,
			totalValue: 750000000,
			completedProjects: 2,
			rating: 4.2,
			specialization: ["نما کاری", "تاسیسات"],
			lastActivity: "3 روز پیش",
			joinDate: "1402/06/10",
		},
	];

	const mockActivities = [
		{
			type: "contract",
			description: "قرارداد جدید با پیمانکار علی محمدی منعقد شد",
			time: "2 ساعت پیش",
			contractor: "علی محمدی",
		},
		{
			type: "payment",
			description: "صورت وضعیت شماره ۴۵ پرداخت شد",
			time: "1 روز پیش",
			contractor: "رضا کریمی",
		},
		{
			type: "status",
			description: "صورت وضعیت ماهانه ارسال شد",
			time: "2 روز پیش",
			contractor: "محمد حسینی",
		},
		{
			type: "meeting",
			description: "جلسه هماهنگی پروژه برگزار شد",
			time: "3 روز پیش",
			contractor: "علی محمدی",
		},
	];

	const mockStatements: StatusStatement[] = [
		{
			id: "1",
			contractorId: "1",
			period: "مهر ۱۴۰۲",
			amount: 250000000,
			status: "paid",
			dueDate: "1402/07/15",
			submittedDate: "1402/07/10",
		},
		{
			id: "2",
			contractorId: "2",
			period: "مهر ۱۴۰۲",
			amount: 180000000,
			status: "pending",
			dueDate: "1402/07/20",
			submittedDate: "1402/07/12",
		},
		{
			id: "3",
			contractorId: "3",
			period: "شهریور ۱۴۰۲",
			amount: 75000000,
			status: "overdue",
			dueDate: "1402/06/30",
			submittedDate: "1402/06/25",
		},
	];

	const quickAccessLinks = [
		{
			title: "افزودن پیمانکار جدید",
			description: "ثبت اطلاعات پیمانکار جدید در سیستم",
			icon: Plus,
			color: "var(--primary)",
			onClick: () => setShowAddContractor(true),
		},
		{
			title: "مدیریت قراردادها",
			description: "مشاهده و مدیریت کلیه قراردادهای پیمانکاران",
			icon: FileText,
			color: "var(--success)",
			onClick: () => toast.error("صفحه قراردادها به زودی اضافه خواهد شد"),
			count: 24,
		},
		{
			title: "صورت‌های وضعیت",
			description: "ثبت و پیگیری صورت‌های وضعیت پیمانکاران",
			icon: BarChart3,
			color: "var(--warning)",
			onClick: () => toast.error("صفحه صورت‌های وضعیت به زودی اضافه خواهد شد"),
			count: 12,
		},
		{
			title: "گزارش‌های مالی",
			description: "گزارش‌های مالی و پرداخت‌های پیمانکاران",
			icon: DollarSign,
			color: "var(--info)",
			onClick: () => toast.error("صفحه گزارش‌های مالی به زودی اضافه خواهد شد"),
			count: 8,
		},
	];

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleExport = () => {
		toast.success("گزارش با موفقیت آماده شد");
	};

	return (
		<main className={styles.page}>
			<div className={styles.container}>
				{/* Header */}
				<header className={styles.header}>
					<div className={styles.headerContent}>
						<div className={styles.headerTitle}>
							<h1>مدیریت پیمانکاران</h1>
							<p>سیستم جامع مدیریت پیمانکاران و قراردادهای پروژه</p>
						</div>
						<div className={styles.headerActions}>
							<button
								className={styles.exportButton}
								onClick={handleExport}
							>
								<Download size={18} />
								خروجی گزارش
							</button>
							<button
								className={styles.addButton}
								onClick={() => setShowAddContractor(true)}
							>
								<Plus size={18} />
								افزودن پیمانکار
							</button>
						</div>
					</div>

					{/* Search and Filters */}
					<div className={styles.searchSection}>
						<div className={styles.searchBox}>
							<Search
								size={20}
								className={styles.searchIcon}
							/>
							<input
								type='text'
								placeholder='جستجوی پیمانکار، شرکت یا تخصص...'
								value={searchTerm}
								onChange={handleSearch}
								className={styles.searchInput}
							/>
						</div>
						<div className={styles.filters}>
							<button
								className={`${styles.filterTab} ${activeTab === "all" ? styles.active : ""}`}
								onClick={() => setActiveTab("all")}
							>
								همه پیمانکاران
							</button>
							<button
								className={`${styles.filterTab} ${activeTab === "active" ? styles.active : ""}`}
								onClick={() => setActiveTab("active")}
							>
								پیمانکاران فعال
							</button>
							<button
								className={`${styles.filterTab} ${activeTab === "pending" ? styles.active : ""}`}
								onClick={() => setActiveTab("pending")}
							>
								در انتظار تایید
							</button>
							<button className={styles.filterButton}>
								<Filter size={18} />
								فیلتر پیشرفته
							</button>
						</div>
					</div>
				</header>

				{/* Content */}
				<div className={styles.content}>
					{/* Statistics Section */}
					<section className={styles.statsSection}>
						<StatCard
							title='کل پیمانکاران'
							value={24}
							change={12}
							icon={Users}
							color='primary'
						/>
						<StatCard
							title='قراردادهای فعال'
							value={18}
							change={8}
							icon={FileText}
							color='success'
						/>
						<StatCard
							title='ارزش کل قراردادها'
							value={12500000000}
							change={15}
							icon={DollarSign}
							color='warning'
							format='currency'
						/>
						<StatCard
							title='میانگین رضایت'
							value={4.6}
							change={5}
							icon={Award}
							color='info'
						/>
					</section>

					{/* Quick Access Section */}
					<section className={styles.quickAccessSection}>
						<h2>دسترسی سریع</h2>
						<div className={styles.quickAccessGrid}>
							{quickAccessLinks.map((link, index) => (
								<QuickAccessCard
									key={index}
									{...link}
								/>
							))}
						</div>
					</section>

					{/* Main Content Grid */}
					<div className={styles.mainGrid}>
						{/* Contractors List */}
						<section className={styles.contractorsSection}>
							<div className={styles.sectionHeader}>
								<h2>پیمانکاران</h2>
								<button className={styles.viewAllButton}>
									مشاهده همه
									<ChevronRight size={16} />
								</button>
							</div>
							<div className={styles.contractorsGrid}>
								{mockContractors.map((contractor) => (
									<ContractorCard
										key={contractor.id}
										contractor={contractor}
									/>
								))}
							</div>
						</section>

						{/* Right Sidebar */}
						<aside className={styles.sidebar}>
							{/* Recent Activity */}
							<RecentActivity activities={mockActivities} />

							{/* Status Statements */}
							<div className={styles.statementsSection}>
								<div className={styles.sectionHeader}>
									<h3>صورت‌های وضعیت اخیر</h3>
									<button className={styles.viewAllButton}>مشاهده همه</button>
								</div>
								<div className={styles.statementsList}>
									{mockStatements.map((statement) => (
										<StatusStatementCard
											key={statement.id}
											statement={statement}
										/>
									))}
								</div>
							</div>

							{/* Performance Summary */}
							<div className={styles.performanceSummary}>
								<div className={styles.sectionHeader}>
									<h3>خلاصه عملکرد</h3>
								</div>
								<div className={styles.performanceMetrics}>
									<div className={styles.metric}>
										<span className={styles.metricLabel}>تکمیل پروژه‌ها</span>
										<div className={styles.metricBar}>
											<div
												className={styles.metricFill}
												style={{ width: "85%" }}
											></div>
										</div>
										<span className={styles.metricValue}>85%</span>
									</div>
									<div className={styles.metric}>
										<span className={styles.metricLabel}>پرداخت به موقع</span>
										<div className={styles.metricBar}>
											<div
												className={styles.metricFill}
												style={{ width: "92%" }}
											></div>
										</div>
										<span className={styles.metricValue}>92%</span>
									</div>
									<div className={styles.metric}>
										<span className={styles.metricLabel}>رضایت مشتری</span>
										<div className={styles.metricBar}>
											<div
												className={styles.metricFill}
												style={{ width: "88%" }}
											></div>
										</div>
										<span className={styles.metricValue}>88%</span>
									</div>
								</div>
							</div>
						</aside>
					</div>
				</div>
			</div>
		</main>
	);
}
