"use client";
import styles from "./WorksDone.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Save,
	Printer,
	Layers,
	TrendingUp,
	Package,
	DollarSign,
	Hash,
	FileText,
	AlertCircle,
	Loader2,
	Calculator,
	Edit2,
	Trash2,
} from "lucide-react";

// -------
// Types
// --------------
interface ContractWBS {
	ID: string;
	contract_id: string;
	contractor_id: string;
	project_id: string;
	description: string;
	quantity: number;
	unit: string;
	unit_price: number;
	total_price: number;
}

interface TaskPerformed {
	ID: string;
	status_statement_id: string;
	description: string;
	quantity: number;
	unit: string;
	unit_price: number;
	total_price: number;
}

interface ApiResponse<T> {
	status: string;
	message: string;
	data: T;
	timestamp: string;
}

interface ApiError {
	status: number;
	message: string;
}

interface WorkItem {
	id: string;
	newQuantity: number;
	previousQuantity: number; // Make it required instead of optional
}

// ----------
// Helper functions
// --------------
async function FetchData(url: string) {
	const token = localStorage.getItem("usr-token");
	if (!token) throw new Error("UnAuthorized");

	const res = await fetch(url, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to fetch projects!");
	}

	return res.json();
}

// -----------
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TASK_PERFORMED_URL = `${API_URL}/management/status-statement/tasks-performed/`;
// ------------

// -------
// Main Component
// --------
interface WorksDoneProps {
	wbsData: ContractWBS[];
	onWorkDoneUpdate?: (workItems: Record<string, WorkItem>) => void;
}

export default function WorksDone({
	wbsData,
	onWorkDoneUpdate,
}: WorksDoneProps) {
	const [workItems, setWorkItems] = useState<Record<string, WorkItem>>({});
	const [isSaving, setIsSaving] = useState(false);
	const [editingRow, setEditingRow] = useState<string | null>(null);
	const [showPreviousQuantity, setShowPreviousQuantity] = useState(true);

	// Fetch last tasks performed
	const {
		isPending,
		isError,
		data: lastTaskedPerformed,
		error,
	} = useQuery<ApiResponse<TaskPerformed[]>, ApiError>({
		queryKey: ["tasks-performed", wbsData[0]?.contract_id],
		queryFn: () => FetchData(`${TASK_PERFORMED_URL}${wbsData[0]?.contract_id}`),
		enabled: !!wbsData?.[0]?.contract_id,
	});

	// Process previous tasks when data is fetched
	const previousTasksMap = useMemo(() => {
		if (!lastTaskedPerformed?.data || lastTaskedPerformed.data.length === 0) {
			return new Map();
		}

		// Create a map of description -> quantity for easy lookup
		const map = new Map<string, number>();
		lastTaskedPerformed.data.forEach((task) => {
			map.set(task.description, task.quantity);
		});

		return map;
	}, [lastTaskedPerformed]);

	// Initialize or update work items when wbsData or previous tasks change
	useEffect(() => {
		if (wbsData && wbsData.length > 0) {
			const initialWorkItems: Record<string, WorkItem> = {};

			wbsData.forEach((item) => {
				// Get previous quantity from map if available, otherwise 0
				const previousQuantity = previousTasksMap.get(item.description) || 0;

				initialWorkItems[item.ID] = {
					id: item.ID,
					newQuantity: 0,
					previousQuantity: previousQuantity,
				};
			});

			setWorkItems(initialWorkItems);
			if (onWorkDoneUpdate) {
				onWorkDoneUpdate(initialWorkItems);
			}
		}
	}, [wbsData, previousTasksMap, onWorkDoneUpdate]);

	const handleQuantityChange = (id: string, value: string) => {
		const numValue = Math.max(0, parseInt(value) || 0);
		const item = wbsData?.find((item) => item.ID === id);

		if (!item) return;

		const previousQuantity = workItems[id]?.previousQuantity || 0;
		const maxQuantity = Math.max(0, item.quantity - previousQuantity);

		const updatedItems = {
			...workItems,
			[id]: {
				...workItems[id],
				newQuantity: Math.min(numValue, maxQuantity),
				previousQuantity: previousQuantity, // Preserve previous quantity
			},
		};

		setWorkItems(updatedItems);
		if (onWorkDoneUpdate) {
			onWorkDoneUpdate(updatedItems);
		}
	};

	const calculateTotals = () => {
		if (!wbsData || wbsData.length === 0) {
			return {
				totalWork: 0,
				totalPrice: 0,
				previousTotal: 0,
				progress: 0,
				totalCompleted: 0,
				formattedPrice: "0 ریال",
				formattedTotalCompleted: "0",
			};
		}

		let totalWork = 0;
		let totalPrice = 0;
		let previousTotal = 0;
		let totalQuantity = 0;

		wbsData.forEach((item) => {
			const workItem = workItems[item.ID];
			const newQuantity = workItem?.newQuantity || 0;
			const previousQuantity = workItem?.previousQuantity || 0;

			totalWork += newQuantity;
			totalPrice += newQuantity * item.unit_price;
			previousTotal += previousQuantity;
			totalQuantity += item.quantity;
		});

		const totalCompleted = totalWork + previousTotal;
		const progress =
			totalQuantity > 0 ? (totalCompleted / totalQuantity) * 100 : 0;

		return {
			totalWork,
			totalPrice,
			previousTotal,
			progress: parseFloat(progress.toFixed(2)),
			totalCompleted,
			formattedPrice:
				new Intl.NumberFormat("fa-IR").format(totalPrice) + " ریال",
			formattedTotalCompleted: new Intl.NumberFormat("fa-IR").format(
				totalCompleted,
			),
		};
	};

	const handleSave = () => {
		setIsSaving(true);
		// Simulate API call
		setTimeout(() => {
			setIsSaving(false);
			console.log("Saving work items:", workItems);
		}, 1000);
	};

	const handlePrint = () => {
		window.print();
	};

	const handleEditRow = (id: string) => {
		setEditingRow(editingRow === id ? null : id);
	};

	const handleDeleteRow = (id: string) => {
		if (window.confirm("آیا از حذف این آیتم اطمینان دارید؟")) {
			const updatedItems = { ...workItems };
			delete updatedItems[id];
			setWorkItems(updatedItems);
			if (onWorkDoneUpdate) {
				onWorkDoneUpdate(updatedItems);
			}
		}
	};

	const handleAutoCalculate = () => {
		const updatedItems = { ...workItems };
		wbsData?.forEach((item) => {
			const workItem = updatedItems[item.ID];
			if (workItem) {
				const remaining = item.quantity - (workItem.previousQuantity || 0);
				if (remaining > 0) {
					updatedItems[item.ID] = {
						...workItem,
						newQuantity: Math.floor(remaining * 0.3), // 30% of remaining
					};
				}
			}
		});
		setWorkItems(updatedItems);
		if (onWorkDoneUpdate) {
			onWorkDoneUpdate(updatedItems);
		}
	};

	// Show loading state while fetching previous tasks
	if (isPending) {
		return (
			<div className={styles.Container}>
				<div className={styles.LoadingState}>
					<Loader2
						size={48}
						className={styles.Loader}
					/>
					<p>در حال بارگذاری کارکردهای قبلی...</p>
				</div>
			</div>
		);
	}

	// If no data is provided, show empty state
	if (!wbsData || wbsData.length === 0) {
		return (
			<div className={styles.Container}>
				<div className={styles.Header}>
					<div className={styles.HeaderLeft}>
						<div className={styles.TitleSection}>
							<div className={styles.TitleIcon}>
								<Layers size={24} />
							</div>
							<div>
								<h3 className={styles.Title}>جدول کارکرد پروژه</h3>
								<p className={styles.Subtitle}>
									کارهای انجام شده در این صورت وضعیت
								</p>
							</div>
						</div>
					</div>
					<div className={styles.HeaderActions}>
						<button
							className={styles.SaveButton}
							disabled
						>
							<Save size={18} />
							ذخیره
						</button>
					</div>
				</div>
				<div className={styles.EmptyState}>
					<div className={styles.EmptyIcon}>
						<FileText size={48} />
					</div>
					<p className={styles.EmptyText}>هیچ آیتم WBS یافت نشد</p>
					<p className={styles.EmptySubtext}>
						لطفاً ابتدا قرارداد را جستجو کنید تا کارها بارگذاری شوند
					</p>
				</div>
			</div>
		);
	}

	const totals = calculateTotals();

	return (
		<div className={styles.Container}>
			<div className={styles.Header}>
				<div className={styles.HeaderLeft}>
					<div className={styles.TitleSection}>
						<div className={styles.TitleIcon}>
							<Layers size={24} />
						</div>
						<div>
							<h3 className={styles.Title}>جدول کارکرد پروژه</h3>
							<p className={styles.Subtitle}>
								تعداد آیتم های ساختار شکست کار:{" "}
								{toPersianDigits(wbsData.length)}
							</p>
						</div>
					</div>
				</div>
				<div className={styles.HeaderActions}>
					<button
						className={styles.PrintButton}
						onClick={handlePrint}
						title='چاپ گزارش'
					>
						<Printer size={18} />
					</button>
					<button
						className={styles.CalculateButton}
						onClick={handleAutoCalculate}
						title='محاسبه خودکار'
					>
						<Calculator size={18} />
					</button>
					<button
						className={styles.SaveButton}
						onClick={handleSave}
						disabled={isSaving}
					>
						{isSaving ? (
							<>
								<Loader2
									size={18}
									className={styles.Loader}
								/>
								در حال ذخیره...
							</>
						) : (
							<>
								<Save size={18} />
								ذخیره کارکرد
							</>
						)}
					</button>
				</div>
			</div>

			<div className={styles.ControlPanel}>
				<div className={styles.ControlGroup}>
					<label className={styles.ControlLabel}>
						<input
							type='checkbox'
							checked={showPreviousQuantity}
							onChange={(e) => setShowPreviousQuantity(e.target.checked)}
							className={styles.Checkbox}
						/>
						نمایش کارکرد پیشین
					</label>
				</div>
			</div>

			<div className={styles.TableWrapper}>
				<div className={styles.TableContainer}>
					<div className={styles.TableHeader}>
						<div className={styles.TableHeaderCell}>
							<Hash size={14} />
							<span>ردیف</span>
						</div>
						<div className={styles.TableHeaderCell}>
							<FileText size={14} />
							<span>شرح فعالیت</span>
						</div>
						<div className={styles.TableHeaderCell}>
							<Package size={14} />
							<span>واحد</span>
						</div>
						<div className={styles.TableHeaderCell}>
							<span>مقدار کل</span>
						</div>
						{showPreviousQuantity && (
							<div className={styles.TableHeaderCell}>
								<TrendingUp size={14} />
								<span>کارکرد پیشین</span>
							</div>
						)}
						<div className={styles.TableHeaderCell}>
							<TrendingUp size={14} />
							<span>کارکرد جدید</span>
						</div>
						<div className={styles.TableHeaderCell}>
							<span>مانده</span>
						</div>
						<div className={styles.TableHeaderCell}>
							<DollarSign size={14} />
							<span>مبلغ (ریال)</span>
						</div>
						<div className={styles.TableHeaderCell}>
							<span>عملیات</span>
						</div>
					</div>

					<div className={styles.TableBody}>
						{wbsData.map((item, index) => {
							const workItem = workItems[item.ID] || {
								id: item.ID,
								newQuantity: 0,
								previousQuantity: 0,
							};
							const newQuantity = workItem.newQuantity || 0;
							const previousQuantity = workItem.previousQuantity || 0;
							const remaining = Math.max(
								0,
								item.quantity - previousQuantity - newQuantity,
							);
							const rowTotal = newQuantity * item.unit_price;
							const rowProgress =
								item.quantity > 0
									? ((previousQuantity + newQuantity) / item.quantity) * 100
									: 0;

							return (
								<div
									key={item.ID}
									className={`${styles.TableRow} ${index % 2 === 0 ? styles.EvenRow : styles.OddRow} ${editingRow === item.ID ? styles.EditingRow : ""}`}
								>
									<div
										className={styles.TableCell}
										data-label='ردیف'
									>
										<span className={styles.RowNumber}>
											{toPersianDigits(index + 1)}
										</span>
									</div>

									<div
										className={styles.TableCell}
										data-label='شرح فعالیت'
									>
										<div className={styles.DescriptionCell}>
											<span className={styles.DescriptionText}>
												{item.description}
											</span>
											<div className={styles.RowProgress}>
												<div className={styles.RowProgressTrack}>
													<div
														className={styles.RowProgressFill}
														style={{ width: `${rowProgress}%` }}
													/>
												</div>
												<span className={styles.RowProgressText}>
													{toPersianDigits(Math.round(rowProgress))}%
												</span>
											</div>
										</div>
									</div>

									<div
										className={styles.TableCell}
										data-label='واحد'
									>
										<span className={styles.UnitText}>{item.unit}</span>
									</div>

									<div
										className={styles.TableCell}
										data-label='مقدار کل'
									>
										<span className={styles.TotalQuantity}>
											{toPersianDigits(item.quantity)}
										</span>
									</div>

									{showPreviousQuantity && (
										<div
											className={styles.TableCell}
											data-label='کارکرد پیشین'
										>
											<div className={styles.PreviousQuantity}>
												{toPersianDigits(previousQuantity)}
											</div>
										</div>
									)}

									<div
										className={styles.TableCell}
										data-label='کارکرد جدید'
									>
										<div className={styles.QuantityInputWrapper}>
											<input
												type='number'
												value={newQuantity}
												onChange={(e) =>
													handleQuantityChange(item.ID, e.target.value)
												}
												className={styles.NewQuantityInput}
												min='0'
												max={item.quantity - previousQuantity}
												onClick={(e) => e.stopPropagation()}
											/>
											<div className={styles.MaxBadge}>
												حداکثر:{" "}
												{toPersianDigits(item.quantity - previousQuantity)}
											</div>
										</div>
									</div>

									<div
										className={styles.TableCell}
										data-label='مانده'
									>
										<span
											className={
												remaining < 0
													? styles.NegativeRemaining
													: styles.Remaining
											}
										>
											{toPersianDigits(remaining)}
										</span>
									</div>

									<div
										className={styles.TableCell}
										data-label='مبلغ'
									>
										<span
											className={
												rowTotal > 0 ? styles.TotalAmount : styles.ZeroAmount
											}
										>
											{rowTotal > 0
												? toPersianDigits(rowTotal.toLocaleString())
												: "--"}
										</span>
									</div>

									<div
										className={styles.TableCell}
										data-label='عملیات'
									>
										<div className={styles.ActionButtons}>
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleEditRow(item.ID);
												}}
												className={styles.ActionButton}
												title='ویرایش'
											>
												<Edit2 size={16} />
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteRow(item.ID);
												}}
												className={styles.ActionButton}
												title='حذف'
											>
												<Trash2 size={16} />
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className={styles.TotalsCard}>
					<div className={styles.TotalsHeader}>
						<Calculator size={20} />
						<span>خلاصه کارکرد</span>
					</div>
					<div className={styles.TotalsGrid}>
						<div className={styles.TotalItem}>
							<div
								className={styles.TotalIcon}
								style={{
									background:
										"linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
								}}
							>
								<Layers size={16} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>کل آیتم‌ها</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(wbsData.length)}
								</span>
							</div>
						</div>

						<div className={styles.TotalItem}>
							<div
								className={styles.TotalIcon}
								style={{
									background:
										"linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
								}}
							>
								<TrendingUp size={16} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>کارکرد پیشین</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(totals.previousTotal)}
								</span>
							</div>
						</div>

						<div className={styles.TotalItem}>
							<div
								className={styles.TotalIcon}
								style={{
									background:
										"linear-gradient(135deg, #10b981 0%, #059669 100%)",
								}}
							>
								<TrendingUp size={16} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>کارکرد جدید</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(totals.totalWork)}
								</span>
							</div>
						</div>

						<div className={styles.TotalItem}>
							<div
								className={styles.TotalIcon}
								style={{
									background:
										"linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
								}}
							>
								<Calculator size={16} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>جمع کل انجام شده</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(totals.totalCompleted)}
								</span>
							</div>
						</div>

						<div className={styles.TotalItem}>
							<div
								className={styles.TotalIcon}
								style={{
									background:
										"linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
								}}
							>
								<DollarSign size={16} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>جمع ریالی جدید</span>
								<span
									className={styles.TotalValue}
									style={{ color: "#059669" }}
								>
									{totals.formattedPrice}
								</span>
							</div>
						</div>

						<div className={styles.TotalItem}>
							<div
								className={styles.TotalIcon}
								style={{
									background:
										"linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)",
								}}
							>
								<TrendingUp size={16} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>پیشرفت کلی</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(totals.progress)}%
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className={styles.Footer}>
				<div className={styles.FooterNotes}>
					<div className={styles.FooterNote}>
						<AlertCircle size={14} />
						<span>مقادیر کارکرد جدید باید کمتر یا مساوی مقدار کل باشد.</span>
					</div>
					<div className={styles.FooterNote}>
						<AlertCircle size={14} />
						<span>کارکرد پیشین از صورت وضعیت‌های قبلی محاسبه شده است.</span>
					</div>
				</div>
			</div>
		</div>
	);
}
