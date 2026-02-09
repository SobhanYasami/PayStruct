"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./NewWBS.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import {
	PlusCircle,
	MinusCircle,
	Save,
	FileText,
	Hash,
	Layers,
	Package,
	DollarSign,
	X,
	Loader2,
	AlertCircle,
	CheckCircle,
	Trash2,
	Copy,
	Calculator,
	TrendingUp,
} from "lucide-react";

type WBSItem = {
	description: string;
	quantity: number;
	unit: string;
	unit_price: number;
};

type NewWBSPayload = {
	contract_number: string;
	items: WBSItem[];
};

type ApiError = {
	status: number;
	message: string;
};

// ------------------------------
export default function NewWBS({
	setIsPopOpen,
	apiUrl,
}: {
	setIsPopOpen: (value: boolean) => void;
	apiUrl: string;
}) {
	const [contractNumber, setContractNumber] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [form, setForm] = useState<NewWBSPayload>({
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

	const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setContractNumber(value);
		setForm((prev) => ({ ...prev, contract_number: value }));
	};

	const calculateTotals = () => {
		let totalQuantity = 0;
		let totalPrice = 0;
		let totalAmount = 0;

		form.items.forEach((item) => {
			totalQuantity += item.quantity || 0;
			totalPrice += item.unit_price || 0;
			totalAmount += (item.quantity || 0) * (item.unit_price || 0);
		});

		return {
			totalQuantity,
			totalPrice,
			totalAmount,
			avgUnitPrice: form.items.length > 0 ? totalPrice / form.items.length : 0,
			itemsCount: form.items.length,
		};
	};

	const clearAllRows = () => {
		setForm((prev) => ({
			...prev,
			items: [{ description: "", quantity: 0, unit: "", unit_price: 0 }],
		}));
		toast.success("تمامی سطرها پاک شدند");
	};

	const mutation = useMutation({
		mutationFn: async (payload: NewWBSPayload) => {
			const token = localStorage.getItem("usr-token");

			console.log("wbs payload", payload);

			const res = await fetch(apiUrl, {
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
			toast.success("ساختار شکست با موفقیت ثبت شد");
			setIsSubmitted(true);
		},
		onError: (error: unknown) => {
			const err = error as ApiError;
			toast.error(err.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!form.contract_number.trim()) {
			toast.error("شماره قرارداد الزامی است");
			return;
		}

		// Validate items
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

	const handleReset = () => {
		setContractNumber("");
		setForm({
			contract_number: "",
			items: [{ description: "", quantity: 0, unit: "", unit_price: 0 }],
		});
		setIsSubmitted(false);
	};

	const totals = calculateTotals();

	if (isSubmitted) {
		return (
			<div className={styles.Container}>
				<button
					onClick={() => setIsPopOpen(false)}
					className={styles.CloseBtn}
					aria-label='بستن پنجره'
				>
					×
				</button>

				<div className={styles.SuccessContainer}>
					<div className={styles.SuccessIcon}>
						<CheckCircle size={64} />
					</div>
					<h2 className={styles.SuccessTitle}>WBS ثبت شد</h2>
					<p className={styles.SuccessMessage}>
						ساختار شکست کار با موفقیت در سیستم ثبت شد.
					</p>
					<div className={styles.SuccessDetails}>
						<div className={styles.SuccessDetailItem}>
							<Hash size={16} />
							<span>شماره قرارداد:</span>
							<strong>{form.contract_number}</strong>
						</div>
						<div className={styles.SuccessDetailItem}>
							<Layers size={16} />
							<span>تعداد آیتم‌ها:</span>
							<strong>{toPersianDigits(form.items.length)}</strong>
						</div>
						<div className={styles.SuccessDetailItem}>
							<Calculator size={16} />
							<span>مجموع مقدار:</span>
							<strong>{toPersianDigits(totals.totalQuantity)}</strong>
						</div>
						<div className={styles.SuccessDetailItem}>
							<DollarSign size={16} />
							<span>مجموع ریالی:</span>
							<strong>
								{toPersianDigits(totals.totalAmount.toLocaleString())} ریال
							</strong>
						</div>
					</div>
					<div className={styles.SuccessActions}>
						<button
							onClick={handleReset}
							className={styles.NewWBSButton}
						>
							ایجاد WBS جدید
						</button>
						<button
							onClick={() => setIsPopOpen(false)}
							className={styles.CloseButton}
						>
							بستن پنجره
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.Container}>
			<button
				onClick={() => setIsPopOpen(false)}
				className={styles.CloseBtn}
				aria-label='بستن پنجره'
			>
				×
			</button>

			<div className={styles.Header}>
				<div className={styles.HeaderIcon}>
					<Layers size={28} />
				</div>
				<h2 className={styles.Title}>ایجاد ساختار شکست جدید</h2>
				<p className={styles.Subtitle}>آیتم‌های ساختار شکست کار را وارد کنید</p>
			</div>

			<form
				className={styles.FormContainer}
				onSubmit={handleSubmit}
				noValidate
			>
				{/* Contract Info */}
				<div className={styles.ContractInfoSection}>
					<div className={styles.ContractInfoHeader}>
						<FileText size={18} />
						<span>اطلاعات قرارداد</span>
					</div>
					<div className={styles.ContractInputWrapper}>
						<div className={styles.ContractInputGroup}>
							<label className={styles.ContractInputLabel}>
								شماره قرارداد <span className={styles.Required}>*</span>
							</label>
							<div className={styles.ContractInputContainer}>
								<input
									type='text'
									placeholder='مثال: 1403/123'
									value={contractNumber}
									onChange={handleContractChange}
									required
									disabled={mutation.isPending}
									className={styles.ContractNumberInput}
								/>
								<Hash
									size={16}
									className={styles.ContractInputIcon}
								/>
							</div>
							<div className={styles.ContractInputHint}>
								اعداد را به انگلیسی وارد نمایید
							</div>
						</div>
					</div>
				</div>

				{/* WBS Items Table */}
				<div className={styles.TableSection}>
					<div className={styles.TableHeader}>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "5%" }}
						>
							ردیف
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "35%" }}
						>
							<FileText size={14} />
							شرح
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "15%" }}
						>
							<TrendingUp size={14} />
							مقدار کار
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "15%" }}
						>
							<Package size={14} />
							واحد
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "20%" }}
						>
							<DollarSign size={14} />
							قیمت واحد (ریال)
						</div>
						<div
							className={styles.TableHeaderCell}
							style={{ width: "10%" }}
						>
							عملیات
						</div>
					</div>

					<div className={styles.TableBody}>
						{form.items.map((item, index) => {
							const itemTotal = (item.quantity || 0) * (item.unit_price || 0);

							return (
								<div
									key={index}
									className={`${styles.TableRow} ${index % 2 === 0 ? styles.EvenRow : styles.OddRow}`}
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
										data-label='شرح'
									>
										<input
											type='text'
											placeholder='شرح فعالیت'
											value={item.description}
											onChange={(e) =>
												handleItemChange(index, "description", e.target.value)
											}
											required
											disabled={mutation.isPending}
											className={styles.DescriptionInput}
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
											required
											disabled={mutation.isPending}
											min='0'
											step='0.01'
											className={styles.QuantityInput}
										/>
									</div>

									<div
										className={styles.TableCell}
										data-label='واحد'
									>
										<input
											type='text'
											placeholder='مثال: متر'
											value={item.unit}
											onChange={(e) =>
												handleItemChange(index, "unit", e.target.value)
											}
											required
											disabled={mutation.isPending}
											className={styles.UnitInput}
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
												required
												disabled={mutation.isPending}
												min='0'
												step='1000'
												className={styles.PriceInput}
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
												type='button'
												onClick={() => duplicateRow(index)}
												className={styles.DuplicateButton}
												title='تکثیر سطر'
												disabled={mutation.isPending}
											>
												<Copy size={14} />
											</button>
											<button
												type='button'
												onClick={() => removeRow(index)}
												className={styles.DeleteButton}
												title='حذف سطر'
												disabled={mutation.isPending || form.items.length <= 1}
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

				{/* Totals Section */}
				<div className={styles.TotalsCard}>
					<div className={styles.TotalsGrid}>
						<div className={styles.TotalItem}>
							<div className={styles.TotalIcon}>
								<Layers size={20} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>تعداد آیتم‌ها</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(totals.itemsCount)}
								</span>
							</div>
						</div>

						<div className={styles.TotalItem}>
							<div className={styles.TotalIcon}>
								<TrendingUp size={20} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>مجموع مقدار</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(totals.totalQuantity)}
								</span>
							</div>
						</div>

						<div className={styles.TotalItem}>
							<div className={styles.TotalIcon}>
								<DollarSign size={20} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>میانگین قیمت واحد</span>
								<span className={styles.TotalValue}>
									{toPersianDigits(
										Math.round(totals.avgUnitPrice).toLocaleString(),
									)}{" "}
									ریال
								</span>
							</div>
						</div>

						<div className={styles.TotalItem}>
							<div className={styles.TotalIcon}>
								<Calculator size={20} />
							</div>
							<div className={styles.TotalContent}>
								<span className={styles.TotalLabel}>جمع کل ریالی</span>
								<span
									className={styles.TotalValue}
									style={{ color: "#059669" }}
								>
									{toPersianDigits(totals.totalAmount.toLocaleString())} ریال
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Row Management */}
				<div className={styles.RowManagement}>
					<div className={styles.RowActionsGroup}>
						<button
							type='button'
							onClick={addRow}
							className={styles.AddRowButton}
							disabled={mutation.isPending}
						>
							<PlusCircle size={18} />
							افزودن سطر جدید
						</button>
						<button
							type='button'
							onClick={clearAllRows}
							className={styles.ClearAllButton}
							disabled={mutation.isPending}
						>
							<X size={18} />
							پاک کردن همه
						</button>
					</div>
				</div>

				{mutation.isError && (
					<div className={styles.ErrorAlert}>
						<AlertCircle size={18} />
						<span>خطا در ثبت ساختار شکست</span>
					</div>
				)}

				<div className={styles.FormActions}>
					<button
						type='button'
						onClick={() => setIsPopOpen(false)}
						className={styles.CancelButton}
						disabled={mutation.isPending}
					>
						انصراف
					</button>
					<button
						type='submit'
						disabled={mutation.isPending}
						className={styles.SubmitBtn}
					>
						{mutation.isPending ? (
							<>
								<Loader2
									className={styles.Loader}
									size={18}
								/>
								در حال ثبت...
							</>
						) : (
							<>
								<Save size={18} />
								ثبت ساختار شکست
							</>
						)}
					</button>
				</div>
			</form>

			<div className={styles.Footer}>
				<p className={styles.FooterNote}>
					<AlertCircle size={14} />
					همه فیلدها الزامی هستند. برای هر سطر، قیمت کل به صورت خودکار محاسبه
					می‌شود.
				</p>
			</div>
		</div>
	);
}
