"use client";
import { useEffect, useRef } from "react";
import { Layers, Users, Wallet, BarChart3 } from "lucide-react";
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
);

export default function Dashboard() {
	const lineRef = useRef(null);
	const pieRef = useRef(null);

	useEffect(() => {
		const lineCtx = lineRef.current.getContext("2d");
		const lineChart = new Chart(lineCtx, {
			type: "line",
			data: {
				labels: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور"],
				datasets: [
					{
						label: "بودجه",
						data: [120, 200, 150, 300, 250, 400],
						borderColor: "#2563eb",
						backgroundColor: "rgba(37,99,235,0.2)",
						fill: true,
					},
				],
			},
			options: { responsive: true, plugins: { legend: { display: false } } },
		});

		const pieCtx = pieRef.current.getContext("2d");
		const pieChart = new Chart(pieCtx, {
			type: "pie",
			data: {
				labels: ["در حال اجرا", "تکمیل شده", "متوقف شده"],
				datasets: [
					{
						data: [8, 5, 2],
						backgroundColor: ["#2563eb", "#10b981", "#f59e0b"],
					},
				],
			},
			options: {
				responsive: true,
				plugins: { legend: { position: "bottom" } },
			},
		});

		return () => {
			lineChart.destroy();
			pieChart.destroy();
		};
	}, []);

	return (
		<main
			className={styles.page}
			dir='rtl'
		>
			<div className={styles.wrapper}>
				<h1 className={styles.title}>داشبورد مدیریتی</h1>
				<p className={styles.subtitle}>
					خلاصه وضعیت پروژه‌ها، مالی و پیمانکاران
				</p>

				<div className={styles.kpiGrid}>
					<div className={styles.kpiCard}>
						<Layers
							size={28}
							className={styles.kpiIcon}
						/>
						<div>
							<h3 className={styles.kpiValue}>15</h3>
							<p className={styles.kpiLabel}>پروژه فعال</p>
						</div>
					</div>
					<div className={styles.kpiCard}>
						<Wallet
							size={28}
							className={styles.kpiIcon}
						/>
						<div>
							<h3 className={styles.kpiValue}>8.3M</h3>
							<p className={styles.kpiLabel}>کل بودجه</p>
						</div>
					</div>
					<div className={styles.kpiCard}>
						<Users
							size={28}
							className={styles.kpiIcon}
						/>
						<div>
							<h3 className={styles.kpiValue}>22</h3>
							<p className={styles.kpiLabel}>پیمانکار فعال</p>
						</div>
					</div>
					<div className={styles.kpiCard}>
						<BarChart3
							size={28}
							className={styles.kpiIcon}
						/>
						<div>
							<h3 className={styles.kpiValue}>12</h3>
							<p className={styles.kpiLabel}>گزارش جدید</p>
						</div>
					</div>
				</div>

				<div className={styles.chartGrid}>
					<div className={styles.chartCard}>
						<h3 className={styles.chartTitle}>روند بودجه پروژه‌ها</h3>
						<canvas ref={lineRef} />
					</div>
					<div className={styles.chartCard}>
						<h3 className={styles.chartTitle}>وضعیت پروژه‌ها</h3>
						<canvas ref={pieRef} />
					</div>
				</div>

				<div className={styles.tableCard}>
					<h3 className={styles.chartTitle}>آخرین پروژه‌ها</h3>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>نام پروژه</th>
								<th>فاز</th>
								<th>بودجه</th>
								<th>تاریخ شروع</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>برج آسمان</td>
								<td>اسکلت</td>
								<td>1.2M</td>
								<td>1403/01/10</td>
							</tr>
							<tr>
								<td>مجتمع ساحلی</td>
								<td>نازک‌کاری</td>
								<td>2.4M</td>
								<td>1403/03/05</td>
							</tr>
							<tr>
								<td>پل بزرگراهی</td>
								<td>زیرسازی</td>
								<td>4.2M</td>
								<td>1403/02/20</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</main>
	);
}
