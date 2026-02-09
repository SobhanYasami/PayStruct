"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import styles from "./NewContractor.module.css";
import toast from "react-hot-toast";
import {
	Building2,
	User,
	CheckCircle,
	AlertCircle,
	Loader2,
} from "lucide-react";

type NewContractorPayload = {
	legal_entity: boolean;
	first_name: string;
	last_name: string;
	national_id: string;
	preferential_id: string;
};

export default function NewContractor({
	setIsPopOpen,
	apiUrl,
}: {
	setIsPopOpen: (value: boolean) => void;
	apiUrl: string;
}) {
	const [isLegalEntity, setIsLegalEntity] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const [form, setForm] = useState<NewContractorPayload>({
		legal_entity: isLegalEntity,
		first_name: "",
		last_name: "",
		national_id: "",
		preferential_id: "",
	});

	/* Auto-fill fname when legal entity */
	useEffect(() => {
		if (isLegalEntity) {
			setForm((prev) => ({
				...prev,
				first_name: "شرکت",
				legal_entity: true,
			}));
		} else {
			setForm((prev) => ({
				...prev,
				first_name: "",
				legal_entity: false,
			}));
		}
	}, [isLegalEntity]);

	/* React Query mutation */
	const createContractorMutation = useMutation({
		mutationFn: async (payload: NewContractorPayload) => {
			console.log("Creating contractor with payload:", payload);
			const token = localStorage.getItem("usr-token");
			const res = await fetch(`${apiUrl}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `bearer ${token}`,
				},
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "خطا در ایجاد پیمانکار");
			}

			return res.json();
		},
		onSuccess: () => {
			toast.success("پیمانکار با موفقیت ثبت شد");
			setIsSubmitted(true);
			setTimeout(() => {
				setIsPopOpen(false);
			}, 1500);
		},
		onError: (error: Error) => {
			toast.error(error.message || "خطا در ثبت پیمانکار");
		},
	});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createContractorMutation.mutate(form);
	};

	// Reset form
	const handleReset = () => {
		setForm({
			legal_entity: false,
			first_name: "",
			last_name: "",
			national_id: "",
			preferential_id: "",
		});
		setIsLegalEntity(false);
		setIsSubmitted(false);
	};

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
					<h2 className={styles.SuccessTitle}>ثبت موفق</h2>
					<p className={styles.SuccessMessage}>
						پیمانکار جدید با موفقیت در سیستم ثبت شد.
					</p>
					<div className={styles.SuccessDetails}>
						<p>
							<strong>نام:</strong> {form.first_name} {form.last_name}
						</p>
						<p>
							<strong>شماره ملی:</strong> {form.national_id}
						</p>
						{form.preferential_id && (
							<p>
								<strong>شناسه تفضیلی:</strong> {form.preferential_id}
							</p>
						)}
					</div>
					<div className={styles.SuccessActions}>
						<button
							onClick={handleReset}
							className={styles.NewContractorButton}
						>
							ثبت پیمانکار جدید
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
					{isLegalEntity ? <Building2 size={24} /> : <User size={24} />}
				</div>
				<h2 className={styles.Title}>ایجاد پیمانکار جدید</h2>
				<p className={styles.Subtitle}>اطلاعات پیمانکار جدید را وارد کنید</p>
			</div>

			<form
				className={styles.FormContainer}
				onSubmit={handleSubmit}
				onReset={handleReset}
			>
				{/* Legal Entity Toggle */}
				<div className={styles.ToggleGroup}>
					<div className={styles.ToggleLabel}>نوع پیمانکار</div>
					<div className={styles.ToggleButtons}>
						<button
							type='button'
							className={`${styles.ToggleButton} ${!isLegalEntity ? styles.ToggleActive : ""}`}
							onClick={() => setIsLegalEntity(false)}
						>
							<User size={16} />
							حقیقی
						</button>
						<button
							type='button'
							className={`${styles.ToggleButton} ${isLegalEntity ? styles.ToggleActive : ""}`}
							onClick={() => setIsLegalEntity(true)}
						>
							<Building2 size={16} />
							حقوقی
						</button>
					</div>
				</div>

				<div className={styles.FormSection}>
					<label className={styles.SectionLabel}>مشخصات</label>
					<div className={styles.InputGrid}>
						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								نام{" "}
								{isLegalEntity && <span className={styles.Hint}>(شرکت)</span>}
							</label>
							<input
								name='first_name'
								placeholder={isLegalEntity ? "شرکت" : "نام"}
								value={form.first_name}
								onChange={handleChange}
								disabled={isLegalEntity}
								required
								className={styles.Input}
							/>
						</div>

						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								نام خانوادگی{" "}
								{isLegalEntity && (
									<span className={styles.Hint}>(نام شرکت)</span>
								)}
							</label>
							<input
								name='last_name'
								placeholder={isLegalEntity ? "نام شرکت" : "نام خانوادگی"}
								value={form.last_name}
								onChange={handleChange}
								required
								className={styles.Input}
							/>
						</div>
					</div>
				</div>

				<div className={styles.FormSection}>
					<label className={styles.SectionLabel}>شناسه‌ها</label>
					<div className={styles.InputGrid}>
						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								شماره ملی <span className={styles.Required}>*</span>
							</label>
							<input
								name='national_id'
								placeholder='کد ملی / شناسه ملی'
								value={form.national_id}
								onChange={handleChange}
								required
								pattern='[0-9]*'
								maxLength={11}
								className={styles.Input}
							/>
							<div className={styles.InputHint}>اعداد انگلیسی وارد شود</div>
						</div>

						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>شناسه تفضیلی</label>
							<input
								name='preferential_id'
								placeholder='اختیاری'
								value={form.preferential_id}
								onChange={handleChange}
								className={styles.Input}
							/>
							<div className={styles.InputHint}>در صورت وجود وارد کنید</div>
						</div>
					</div>
				</div>

				{createContractorMutation.isError && (
					<div className={styles.ErrorAlert}>
						<AlertCircle size={18} />
						<span>خطا در ثبت پیمانکار</span>
					</div>
				)}

				<div className={styles.FormActions}>
					<button
						type='reset'
						className={styles.CancelButton}
						disabled={createContractorMutation.isPending}
					>
						پاک کردن فرم
					</button>
					<button
						type='submit'
						disabled={createContractorMutation.isPending}
						className={styles.SubmitBtn}
					>
						{createContractorMutation.isPending ? (
							<>
								<Loader2
									className={styles.Loader}
									size={18}
								/>
								در حال ثبت...
							</>
						) : (
							"ثبت پیمانکار"
						)}
					</button>
				</div>
			</form>

			<div className={styles.Footer}>
				<p className={styles.FooterNote}>
					<AlertCircle size={14} />
					فیلدهای ستاره‌دار الزامی هستند.
				</p>
			</div>
		</div>
	);
}
