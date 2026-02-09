import styles from "./WorksDone.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import { useState, useMemo } from "react";

interface ContractWBS {
	ID: string;
	description: string;
	quantity: number;
	unit: string;
	unit_price: number;
	total_price: number;
}

interface WorksDoneProps {
	wbsData: ContractWBS[] | null;
}

interface WorkItem {
	id: string;
	newQuantity: number;
}

export default function WorksDone({ wbsData }: WorksDoneProps) {
	const [workItems, setWorkItems] = useState<Record<string, WorkItem>>({});
	const [isSaving, setIsSaving] = useState(false);

	// Initialize work items when wbsData changes
	useMemo(() => {
		if (wbsData) {
			const initialWorkItems: Record<string, WorkItem> = {};
			wbsData.forEach((item) => {
				initialWorkItems[item.ID] = {
					id: item.ID,
					newQuantity: 0,
				};
			});
			setWorkItems(initialWorkItems);
		}
	}, [wbsData]);

	const handleQuantityChange = (id: string, value: string) => {
		const numValue = parseInt(value) || 0;
		setWorkItems((prev) => ({
			...prev,
			[id]: {
				...prev[id],
				newQuantity: numValue,
			},
		}));
	};

	const calculateTotals = () => {
		if (!wbsData) return { totalWork: 0, totalPrice: 0 };

		let totalWork = 0;
		let totalPrice = 0;

		wbsData.forEach((item) => {
			const workItem = workItems[item.ID];
			const newQuantity = workItem?.newQuantity || 0;
			totalWork += newQuantity;
			totalPrice += newQuantity * item.unit_price;
		});

		return {
			totalWork: toPersianDigits(totalWork),
			totalPrice: toPersianDigits(totalPrice.toLocaleString()),
			formattedPrice:
				new Intl.NumberFormat("fa-IR").format(totalPrice) + " ریال",
		};
	};

	const handleSave = () => {
		setIsSaving(true);
		// Simulate API call
		setTimeout(() => {
			setIsSaving(false);
			alert("کارکرد با موفقیت ذخیره شد");
		}, 1000);
	};

	// If no data is provided, show empty state
	if (!wbsData || wbsData.length === 0) {
		return (
			<div className={styles.Container}>
				<div className={styles.Header}>
					<h3 className={styles.Title}>
						<span className={styles.Icon}>📋</span>
						جدول کارکرد
					</h3>
					<div className={styles.HeaderActions}>
						<button
							className={styles.SaveButton}
							disabled
						>
							ذخیره
						</button>
					</div>
				</div>
				<div className={styles.EmptyState}>
					<div className={styles.EmptyIcon}>📄</div>
					<p className={styles.EmptyText}>هیچ آیتم WBS یافت نشد.</p>
					<p className={styles.EmptySubtext}>
						لطفاً ابتدا قرارداد را جستجو کنید
					</p>
				</div>
			</div>
		);
	}

	const totals = calculateTotals();

	return (
		<div className={styles.Container}>
			<div className={styles.Header}>
				<h3 className={styles.Title}>
					<span className={styles.Icon}>📋</span>
					جدول کارکرد
					<span className={styles.Subtitle}>
						({toPersianDigits(wbsData.length)} آیتم)
					</span>
				</h3>
				<div className={styles.HeaderActions}>
					<button
						className={styles.SaveButton}
						onClick={handleSave}
						disabled={isSaving}
					>
						{isSaving ? (
							<>
								<span className={styles.LoadingSpinner}></span>
								در حال ذخیره...
							</>
						) : (
							"💾 ذخیره کارکرد"
						)}
					</button>
				</div>
			</div>

			<div className={styles.TableWrapper}>
				<div className={styles.TableContainer}>
					<div className={styles.TableHeader}>
						<div
							className={styles.HeaderCell}
							style={{ width: "5%" }}
						>
							ردیف
						</div>
						<div
							className={styles.HeaderCell}
							style={{ width: "35%" }}
						>
							شرح فعالیت
						</div>
						<div
							className={styles.HeaderCell}
							style={{ width: "10%" }}
						>
							واحد
						</div>
						<div
							className={styles.HeaderCell}
							style={{ width: "12%" }}
						>
							مقدار کل
						</div>
						<div
							className={styles.HeaderCell}
							style={{ width: "12%" }}
						>
							کارکرد پیشین
						</div>
						<div
							className={styles.HeaderCell}
							style={{ width: "12%" }}
						>
							کارکرد جدید
						</div>
						<div
							className={styles.HeaderCell}
							style={{ width: "14%" }}
						>
							جمع (ریال)
						</div>
					</div>

					<div className={styles.TableBody}>
						{wbsData.map((item, index) => {
							const workItem = workItems[item.ID];
							const newQuantity = workItem?.newQuantity || 0;
							const rowTotal = newQuantity * item.unit_price;

							return (
								<div
									key={item.ID}
									className={`${styles.TableRow} ${index % 2 === 0 ? styles.EvenRow : styles.OddRow}`}
								>
									<div
										className={styles.BodyCell}
										data-label='ردیف'
									>
										<span className={styles.CellContent}>
											{toPersianDigits(index + 1)}
										</span>
									</div>
									<div
										className={styles.BodyCell}
										data-label='شرح فعالیت'
									>
										<span className={styles.CellContent}>
											{item.description}
										</span>
									</div>
									<div
										className={styles.BodyCell}
										data-label='واحد'
									>
										<span className={styles.CellContent}>{item.unit}</span>
									</div>
									<div
										className={styles.BodyCell}
										data-label='مقدار کل'
									>
										<span className={styles.CellContent}>
											{toPersianDigits(item.quantity)}
										</span>
									</div>
									<div
										className={styles.BodyCell}
										data-label='کارکرد پیشین'
									>
										<span className={styles.CellContent}>--</span>
									</div>
									<div
										className={styles.BodyCell}
										data-label='کارکرد جدید'
									>
										<div className={styles.InputWrapper}>
											<input
												type='number'
												value={newQuantity}
												onChange={(e) =>
													handleQuantityChange(item.ID, e.target.value)
												}
												className={styles.QuantityInput}
												min='0'
												max={item.quantity}
												placeholder='0'
											/>
											<span className={styles.MaxBadge}>
												حداکثر: {toPersianDigits(item.quantity)}
											</span>
										</div>
									</div>
									<div
										className={styles.BodyCell}
										data-label='جمع'
									>
										<span className={styles.TotalAmount}>
											{rowTotal > 0
												? toPersianDigits(rowTotal.toLocaleString())
												: "--"}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className={styles.TotalsCard}>
					<div className={styles.TotalsGrid}>
						<div className={styles.TotalItem}>
							<span className={styles.TotalLabel}>تعداد آیتم‌ها:</span>
							<span className={styles.TotalValue}>
								{toPersianDigits(wbsData.length)}
							</span>
						</div>
						<div className={styles.TotalItem}>
							<span className={styles.TotalLabel}>جمع کارکرد جدید:</span>
							<span className={styles.TotalValue}>{totals.totalWork}</span>
						</div>
						<div className={styles.TotalItem}>
							<span className={styles.TotalLabel}>جمع ریالی:</span>
							<span className={styles.TotalValue}>{totals.formattedPrice}</span>
						</div>
					</div>
					<div className={styles.TotalsActions}>
						<button
							className={styles.PrintButton}
							onClick={() => window.print()}
						>
							🖨️ چاپ گزارش
						</button>
					</div>
				</div>
			</div>

			<div className={styles.Footer}>
				<p className={styles.FooterNote}>
					توجه: مقادیر کارکرد جدید باید کمتر یا مساوی مقدار کل باشد.
				</p>
			</div>
		</div>
	);
}
