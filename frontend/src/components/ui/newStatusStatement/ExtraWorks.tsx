import { useMutation } from "@tanstack/react-query";
import styles from "./ExtraWorks.module.css";
import { useState } from "react";
import toast from "react-hot-toast";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import {
	PlusCircle,
	MinusCircle,
	Save,
	FileText,
	Package,
	DollarSign,
	Hash,
	Trash2,
	Copy,
	AlertCircle,
	Loader2,
	TrendingUp,
	Calculator,
} from "lucide-react";

type WBSItem = {
	description: string;
	quantity: number;
	unit: string;
	unit_price: number;
};

type NewExtraWorksPayload = {
	contract_number: string;
	items: WBSItem[];
};

type ApiError = {
	status: number;
	message: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const StatusExtraWorks_URL = `${API_URL}/management/contracts/status-statement/extra-works/`;

export default function ExtraWorks() {
	const [form, setForm] = useState<NewExtraWorksPayload>({
		contract_number: "",
		items: [
			{
				description: "",
				quantity: 0,
				unit: "",
				unit_price: 0,
			},
		],
	});
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	const addRow = () => {
		setForm((prev) => ({
			...prev,
			items: [
				...prev.items,
				{ description: "", quantity: 0, unit: "", unit_price: 0 },
			],
		}));
	};

	const removeRow = (index: number) => {
		if (form.items.length <= 1) {
			toast.error("حداقل یک آیتم باید وجود داشته باشد");
			return;
		}

		setForm((prev) => ({
			...prev,
			items: prev.items.filter((_, i) => i !== index),
		}));
	};

	const handleItemChange = (
		index: number,
		field: keyof WBSItem,
		value: string,
	) => {
		setForm((prev) => {
			const items = [...prev.items];
			items[index] = {
				...items[index],
				[field]:
					field === "quantity" || field === "unit_price"
						? Number(value) || 0
						: value,
			};
			return { ...prev, items };
		});
	};

	const duplicateRow = (index: number) => {
		const itemToDuplicate = form.items[index];
		setForm((prev) => ({
			...prev,
			items: [
				...prev.items.slice(0, index + 1),
				{ ...itemToDuplicate },
				...prev.items.slice(index + 1),
			],
		}));
	};

	const clearAllRows = () => {
		setForm({
			contract_number: form.contract_number,
			items: [{ description: "", quantity: 0, unit: "", unit_price: 0 }],
		});
		toast.success("تمامی سطرها پاک شدند");
	};

	const calculateTotals = () => {
		let totalQuantity = 0;
		let totalAmount = 0;

		form.items.forEach((item) => {
			totalQuantity += item.quantity || 0;
			totalAmount += (item.quantity || 0) * (item.unit_price || 0);
		});

		return {
			totalQuantity,
			totalAmount,
			formattedAmount:
				new Intl.NumberFormat("fa-IR").format(totalAmount) + " ریال",
			itemsCount: form.items.length,
		};
	};

	const mutation = useMutation({
		mutationFn: async (payload: NewExtraWorksPayload) => {
			const token = localStorage.getItem("usr-token");

			const res = await fetch(StatusExtraWorks_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});

			const data = await res.json();

			if (!res.ok) {
				throw {
					status: res.status,
					message: data?.message || "خطای ناشناخته",
				} as ApiError;
			}

			return data;
		},
		onSuccess: () => {
			toast.success("کارهای اضافه با موفقیت ثبت شد");
		},
		onError: (error: unknown) => {
			const err = error as ApiError;
			toast.error(err.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Validate all items
		const invalidItems = form.items.filter(
			(item) =>
				!item.description.trim() ||
				item.quantity <= 0 ||
				!item.unit.trim() ||
				item.unit_price <= 0,
		);

		if (invalidItems.length > 0) {
			toast.error("لطفا تمامی فیلدهای همه آیتم‌ها را پر کنید");
			return;
		}

		mutation.mutate(form);
	};

	const totals = calculateTotals();

	return (
		<div className={styles.Container}>
			<div className={styles.Header}>
				<div className={styles.HeaderLeft}>
					<div className={styles.TitleSection}>
						<div className={styles.TitleIcon}>
							<TrendingUp size={24} />
						</div>
						<div>
							<h3 className={styles.Title}>کارهای اضافه و دستور کارها</h3>
							<p className={styles.Subtitle}>
								ثبت کارهای اضافی، تغییرات و دستور کارهای جدید
							</p>
						</div>
					</div>
				</div>
				<div className={styles.HeaderActions}>
					<button
						className={styles.PrintButton}
						onClick={() => window.print()}
						title='چاپ'
					>
						<FileText size={18} />
					</button>
					<button
						className={styles.CalculateButton}
						onClick={() => {
							// Auto-calculate prices based on quantity
							const updatedItems = form.items.map((item) => ({
								...item,
								unit_price:
									item.quantity > 0 ? Math.round(item.quantity * 1000) : 0,
							}));
							setForm((prev) => ({ ...prev, items: updatedItems }));
						}}
						title='محاسبه خودکار'
					>
						<Calculator size={18} />
					</button>
					<button
						className={styles.SaveButton}
						onClick={handleSubmit}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? (
							<>
								<Loader2
									size={18}
									className={styles.Loader}
								/>
								در حال ثبت...
							</>
						) : (
							<>
								<Save size={18} />
								ثبت کارهای اضافه
							</>
						)}
					</button>
				</div>
			</div>

			<div className={styles.ControlPanel}>
				<div className={styles.RowManagement}>
					<button
						className={styles.AddRowButton}
						onClick={addRow}
					>
						<PlusCircle size={18} />
						افزودن سطر جدید
					</button>
					<button
						className={styles.ClearAllButton}
						onClick={clearAllRows}
					>
						<Trash2 size={18} />
						پاک کردن همه
					</button>
				</div>
			</div>

			<div className={styles.TableWrapper}>
				<div className={styles.TableContainer}>
					<div className={styles.TableHeader}>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "5%" }}
						>
							<Hash size={14} />
							<span>ردیف</span>
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "35%" }}
						>
							<FileText size={14} />
							<span>شرح فعالیت</span>
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "15%" }}
						>
							<span>مقدار کار</span>
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "15%" }}
						>
							<Package size={14} />
							<span>واحد</span>
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "20%" }}
						>
							<DollarSign size={14} />
							<span>قیمت واحد (ریال)</span>
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "10%" }}
						>
							<span>عملیات</span>
						</div>
					</div>

					<div className={styles.TableBody}>
						{form.items.map((item, index) => {
							const itemTotal = (item.quantity || 0) * (item.unit_price || 0);

							return (
								<div
									key={index}
									className={`${styles.TableRow} ${index % 2 === 0 ? styles.EvenRow : styles.OddRow} ${editingIndex === index ? styles.EditingRow : ""}`}
									onClick={() =>
										setEditingIndex(editingIndex === index ? null : index)
									}
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
										<input
											type='text'
											placeholder='شرح کار اضافه یا دستور کار'
											value={item.description}
											onChange={(e) =>
												handleItemChange(index, "description", e.target.value)
											}
											className={styles.DescriptionInput}
											onClick={(e) => e.stopPropagation()}
										/>
									</div>

									<div
										className={styles.TableCell}
										data-label='مقدار کار'
									>
										<input
											type='number'
											placeholder='0'
											value={item.quantity || ""}
											onChange={(e) =>
												handleItemChange(index, "quantity", e.target.value)
											}
											className={styles.QuantityInput}
											min='0'
											step='0.01'
											onClick={(e) => e.stopPropagation()}
										/>
									</div>

									<div
										className={styles.TableCell}
										data-label='واحد'
									>
										<input
											type='text'
											placeholder='مثال: متر، عدد'
											value={item.unit}
											onChange={(e) =>
												handleItemChange(index, "unit", e.target.value)
											}
											className={styles.UnitInput}
											onClick={(e) => e.stopPropagation()}
										/>
									</div>

									<div
										className={styles.TableCell}
										data-label='قیمت واحد'
									>
										<div className={styles.PriceInputWrapper}>
											<input
												type='number'
												placeholder='0'
												value={item.unit_price || ""}
												onChange={(e) =>
													handleItemChange(index, "unit_price", e.target.value)
												}
												className={styles.PriceInput}
												min='0'
												step='1000'
												onClick={(e) => e.stopPropagation()}
											/>
											{itemTotal > 0 && (
												<div className={styles.ItemTotal}>
													{toPersianDigits(itemTotal.toLocaleString())} ریال
												</div>
											)}
										</div>
									</div>

									<div
										className={styles.TableCell}
										data-label='عملیات'
									>
										<div className={styles.RowActions}>
											<button
												className={styles.ActionButton}
												onClick={(e) => {
													e.stopPropagation();
													duplicateRow(index);
												}}
												title='تکثیر سطر'
											>
												<Copy size={14} />
											</button>
											<button
												className={styles.ActionButton}
												onClick={(e) => {
													e.stopPropagation();
													removeRow(index);
												}}
												title='حذف سطر'
												disabled={form.items.length <= 1}
											>
												<Trash2 size={14} />
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
						<span>خلاصه کارهای اضافه</span>
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
								<FileText size={16} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>تعداد آیتم‌ها</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(totals.itemsCount)}
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
								<span className={styles.TotalLabel}>مجموع مقدار</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(totals.totalQuantity)}
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
								<DollarSign size={16} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>جمع ریالی</span>
								<span
									className={styles.TotalValue}
									style={{ color: "#059669" }}
								>
									{totals.formattedAmount}
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
						<span>
							کارهای اضافه شامل تغییرات، اصلاحات و کارهای جدید خارج از قرارداد
							می‌شوند.
						</span>
					</div>
					<div className={styles.FooterNote}>
						<AlertCircle size={14} />
						<span>
							تمامی فیلدها الزامی هستند. قیمت کل هر سطر به صورت خودکار محاسبه
							می‌شود.
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
