"use client";
import { useEffect, useRef, useState } from "react";
import {
	Layers,
	Users,
	Wallet,
	BarChart3,
	TrendingUp,
	TrendingDown,
	Clock,
	CheckCircle,
	AlertCircle,
	MoreHorizontal,
	Download,
	Filter,
	Calendar,
	Search,
	ArrowUpRight,
	ArrowDownRight,
} from "lucide-react";
import {
	Chart,
	LineController,
	LineElement,
	PointElement,
	LinearScale,
	Title,
	CategoryScale,
	Tooltip,
	PieController,
	ArcElement,
	Legend,
	Filler,
} from "chart.js";
import styles from "./page.module.css";

Chart.register(
	LineController,
	LineElement,
	PointElement,
	LinearScale,
	Title,
	CategoryScale,
	Tooltip,
	PieController,
	ArcElement,
	Legend,
	Filler,
);

export default function Dashboard() {
	const lineRef = useRef<HTMLCanvasElement | null>(null);
	const pieRef = useRef<HTMLCanvasElement | null>(null);
	const [timeRange, setTimeRange] = useState("monthly");

	useEffect(() => {
		if (!lineRef.current || !pieRef.current) return;

		const lineCtx = lineRef.current.getContext("2d")!;
		const pieCtx = pieRef.current.getContext("2d")!;

		const lineChart = new Chart(lineCtx, {
			type: "line",
			data: {
				labels: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور"],
				datasets: [
					{
						label: "بودجه برنامه‌ریزی شده",
						data: [120, 200, 150, 300, 250, 400],
						borderColor: "#4f46e5",
						backgroundColor: "rgba(79, 70, 229, 0.08)",
						borderWidth: 3,
						pointBorderColor: "#fff",
						pointBackgroundColor: "#4f46e5",
						pointBorderWidth: 2,
						pointRadius: 4,
						pointHoverRadius: 6,
						fill: true,
						tension: 0.4,
					},
					{
						label: "هزینه واقعی",
						data: [100, 180, 140, 280, 230, 380],
						borderColor: "#94a3b8",
						backgroundColor: "rgba(148, 163, 184, 0.08)",
						borderWidth: 2,
						pointBorderColor: "#fff",
						pointBackgroundColor: "#94a3b8",
						pointBorderWidth: 2,
						pointRadius: 3,
						pointHoverRadius: 5,
						fill: true,
						tension: 0.4,
						borderDash: [5, 5],
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: true,
						position: "top",
						align: "end",
						labels: {
							usePointStyle: true,
							boxWidth: 6,
							boxHeight: 6,
							color: "#1e293b",
							font: { size: 12 },
						},
					},
					tooltip: {
						backgroundColor: "white",
						titleColor: "#1e293b",
						bodyColor: "#475569",
						borderColor: "#e2e8f0",
						borderWidth: 1,
						padding: 12,
						boxPadding: 6,
						usePointStyle: true,
					},
				},
				scales: {
					y: {
						beginAtZero: true,
						grid: {
							color: "#f1f5f9",
							// drawBorder: false,
						},
						ticks: {
							color: "#64748b",
							font: { size: 12 },
							callback: (value) => value + "K",
						},
					},
					x: {
						grid: {
							display: false,
						},
						ticks: {
							color: "#64748b",
							font: { size: 12 },
						},
					},
				},
			},
		});

		const pieChart = new Chart(pieCtx, {
			type: "pie",
			data: {
				labels: ["در حال اجرا", "تکمیل شده", "متوقف شده"],
				datasets: [
					{
						data: [8, 5, 2],
						backgroundColor: ["#4f46e5", "#10b981", "#f59e0b"],
						borderWidth: 0,
						hoverOffset: 4,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: "bottom",
						labels: {
							usePointStyle: true,
							boxWidth: 8,
							boxHeight: 8,
							padding: 20,
							color: "#1e293b",
							font: { size: 13 },
						},
					},
					tooltip: {
						backgroundColor: "white",
						titleColor: "#1e293b",
						bodyColor: "#475569",
						borderColor: "#e2e8f0",
						borderWidth: 1,
						callbacks: {
							label: (context) => {
								const value = context.raw as number;
								const total = context.dataset.data.reduce((a, b) => a + b, 0);
								const percentage = ((value / total) * 100).toFixed(1);
								return `${context.label}: ${value} پروژه (${percentage}%)`;
							},
						},
					},
				},
			},
		});

		return () => {
			lineChart.destroy();
			pieChart.destroy();
		};
	}, []);

	const recentProjects = [
		{
			name: "برج آسمان",
			phase: "اسکلت",
			budget: "1.2",
			startDate: "1403/01/10",
			status: "در حال اجرا",
			progress: 65,
		},
		{
			name: "مجتمع ساحلی",
			phase: "نازک‌کاری",
			budget: "2.4",
			startDate: "1403/03/05",
			status: "در حال اجرا",
			progress: 80,
		},
		{
			name: "پل بزرگراهی",
			phase: "زیرسازی",
			budget: "4.2",
			startDate: "1403/02/20",
			status: "در حال اجرا",
			progress: 45,
		},
		{
			name: "پروژه مسکونی نگین",
			phase: "فونداسیون",
			budget: "3.1",
			startDate: "1403/04/15",
			status: "تازه شروع",
			progress: 15,
		},
		{
			name: "بیمارستان تخصصی",
			phase: "ساخت",
			budget: "6.5",
			startDate: "1402/12/01",
			status: "تکمیل شده",
			progress: 100,
		},
	];

	return (
		<main
			className={styles.page}
			dir='rtl'
		>
			<div className={styles.container}>
				{/* Header Section */}
				<div className={styles.header}>
					<div>
						<h1 className={styles.title}>داشبورد مدیریت پروژه</h1>
						<p className={styles.subtitle}>
							خوش آمدید! آخرین وضعیت پروژه‌ها و فعالیت‌ها را در اینجا مشاهده
							می‌کنید
						</p>
					</div>

					<div className={styles.headerActions}>
						<div className={styles.searchBox}>
							<Search
								size={18}
								className={styles.searchIcon}
							/>
							<input
								type='text'
								placeholder='جستجو در پروژه‌ها...'
								className={styles.searchInput}
							/>
						</div>

						<div className={styles.dateRange}>
							<Calendar
								size={18}
								className={styles.calendarIcon}
							/>
							<span className={styles.dateText}>مهر ۱۴۰۳</span>
						</div>

						<button className={styles.exportButton}>
							<Download size={18} />
							<span>گزارش</span>
						</button>
					</div>
				</div>

				{/* KPI Cards */}
				<div className={styles.kpiGrid}>
					<div className={styles.kpiCard}>
						<div
							className={styles.kpiIconWrapper}
							style={{ background: "#eef2ff", color: "#4f46e5" }}
						>
							<Layers size={24} />
						</div>
						<div className={styles.kpiContent}>
							<div>
								<h3 className={styles.kpiValue}>۱۵</h3>
								<p className={styles.kpiLabel}>پروژه فعال</p>
							</div>
							<div className={styles.kpiTrend}>
								<ArrowUpRight
									size={16}
									className={styles.trendUp}
								/>
								<span className={styles.trendValue}>+۲</span>
							</div>
						</div>
					</div>

					<div className={styles.kpiCard}>
						<div
							className={styles.kpiIconWrapper}
							style={{ background: "#f0f9ff", color: "#0284c7" }}
						>
							<Wallet size={24} />
						</div>
						<div className={styles.kpiContent}>
							<div>
								<h3 className={styles.kpiValue}>۸.۳M</h3>
								<p className={styles.kpiLabel}>کل بودجه</p>
							</div>
							<div className={styles.kpiTrend}>
								<span className={styles.trendValue}>۱.۲M مصرف</span>
							</div>
						</div>
					</div>

					<div className={styles.kpiCard}>
						<div
							className={styles.kpiIconWrapper}
							style={{ background: "#f0fdf4", color: "#16a34a" }}
						>
							<Users size={24} />
						</div>
						<div className={styles.kpiContent}>
							<div>
								<h3 className={styles.kpiValue}>۲۲</h3>
								<p className={styles.kpiLabel}>پیمانکار فعال</p>
							</div>
							<div className={styles.kpiTrend}>
								<Users
									size={14}
									className={styles.trendIcon}
								/>
								<span className={styles.trendValue}>+۳</span>
							</div>
						</div>
					</div>

					<div className={styles.kpiCard}>
						<div
							className={styles.kpiIconWrapper}
							style={{ background: "#fff7ed", color: "#ea580c" }}
						>
							<BarChart3 size={24} />
						</div>
						<div className={styles.kpiContent}>
							<div>
								<h3 className={styles.kpiValue}>۱۲</h3>
								<p className={styles.kpiLabel}>گزارش جدید</p>
							</div>
							<div className={styles.kpiBadge}>
								<span>۵ خوانده نشده</span>
							</div>
						</div>
					</div>
				</div>

				{/* Charts Section */}
				<div className={styles.chartGrid}>
					<div className={styles.chartCard}>
						<div className={styles.chartHeader}>
							<div>
								<h3 className={styles.chartTitle}>روند بودجه پروژه‌ها</h3>
								<p className={styles.chartSubtitle}>
									مقایسه بودجه برنامه‌ریزی شده و هزینه واقعی
								</p>
							</div>
							<div className={styles.chartActions}>
								<button
									className={`${styles.timeRangeBtn} ${timeRange === "monthly" ? styles.active : ""}`}
									onClick={() => setTimeRange("monthly")}
								>
									ماهانه
								</button>
								<button
									className={`${styles.timeRangeBtn} ${timeRange === "weekly" ? styles.active : ""}`}
									onClick={() => setTimeRange("weekly")}
								>
									هفتگی
								</button>
								<button className={styles.moreBtn}>
									<MoreHorizontal size={18} />
								</button>
							</div>
						</div>
						<div className={styles.chartWrapper}>
							<canvas ref={lineRef} />
						</div>
					</div>

					<div className={styles.chartCard}>
						<div className={styles.chartHeader}>
							<div>
								<h3 className={styles.chartTitle}>وضعیت پروژه‌ها</h3>
								<p className={styles.chartSubtitle}>
									توزیع پروژه‌ها بر اساس وضعیت
								</p>
							</div>
							<button className={styles.filterBtn}>
								<Filter size={18} />
							</button>
						</div>
						<div className={styles.chartWrapper}>
							<canvas ref={pieRef} />
						</div>
					</div>
				</div>

				{/* Quick Stats */}
				<div className={styles.statsGrid}>
					<div className={styles.statItem}>
						<CheckCircle
							size={20}
							color='#10b981'
						/>
						<div>
							<span className={styles.statValue}>۸</span>
							<span className={styles.statLabel}>تکمیل شده امسال</span>
						</div>
					</div>
					<div className={styles.statItem}>
						<Clock
							size={20}
							color='#f59e0b'
						/>
						<div>
							<span className={styles.statValue}>۳</span>
							<span className={styles.statLabel}>در انتظار تأیید</span>
						</div>
					</div>
					<div className={styles.statItem}>
						<AlertCircle
							size={20}
							color='#ef4444'
						/>
						<div>
							<span className={styles.statValue}>۱</span>
							<span className={styles.statLabel}>دارای مشکل</span>
						</div>
					</div>
					<div className={styles.statItem}>
						<TrendingUp
							size={20}
							color='#4f46e5'
						/>
						<div>
							<span className={styles.statValue}>+۲۳٪</span>
							<span className={styles.statLabel}>رشد نسبت به ماه قبل</span>
						</div>
					</div>
				</div>

				{/* Projects Table */}
				<div className={styles.tableCard}>
					<div className={styles.tableHeader}>
						<div>
							<h3 className={styles.tableTitle}>آخرین پروژه‌ها</h3>
							<p className={styles.tableSubtitle}>۵ پروژه فعال و در حال اجرا</p>
						</div>
						<button className={styles.viewAllBtn}>
							مشاهده همه
							<ArrowUpRight size={16} />
						</button>
					</div>

					<div className={styles.tableWrapper}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>نام پروژه</th>
									<th>فاز</th>
									<th>بودجه</th>
									<th>پیشرفت</th>
									<th>وضعیت</th>
									<th>تاریخ شروع</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{recentProjects.map((project, index) => (
									<tr key={index}>
										<td className={styles.projectName}>{project.name}</td>
										<td>
											<span className={styles.phaseBadge}>{project.phase}</span>
										</td>
										<td className={styles.budget}>{project.budget}M</td>
										<td>
											<div className={styles.progressContainer}>
												<div className={styles.progressBar}>
													<div
														className={styles.progressFill}
														style={{ width: `${project.progress}%` }}
													/>
												</div>
												<span className={styles.progressText}>
													{project.progress}%
												</span>
											</div>
										</td>
										<td>
											<span
												className={`${styles.statusBadge} ${styles[`status${project.status}`]}`}
											>
												{project.status}
											</span>
										</td>
										<td className={styles.date}>{project.startDate}</td>
										<td>
											<button className={styles.actionBtn}>
												<MoreHorizontal size={18} />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</main>
	);
}
