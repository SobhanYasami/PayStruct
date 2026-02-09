"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./NewContract.module.css";
import {
	PersianDatePickerCustom,
	PersianDate,
} from "./persianDatePicker/PersianDatePicker";
import {
	FileText,
	Building,
	FolderOpen,
	Calendar,
	Percent,
	Upload,
	X,
	Loader2,
	AlertCircle,
	CheckCircle,
	FileCheck,
	DollarSign,
	Hash,
	Shield,
	Clock,
	CalendarCheck,
} from "lucide-react";

type Contractor = {
	ID: string;
	first_name: string;
	last_name: string;
};

type Project = {
	ID: string;
	name: string;
	phase: number;
};

type NewContractForm = {
	contractor_id: string;
	project_id: string;
	contract_number: string;
	gross_budget: string;
	insurance_rate: string;
	performance_bond: string;
	added_value_tax: string;
	start_date: PersianDate | null;
	end_date: PersianDate | null;
	scanned_file: File | null;
};

type ApiError = {
	status: number;
	message: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;
const Projects_URL = `${API_URL}/management/projects/`;
const Contract_URL = `${API_URL}/management/contracts/`;

// ------------------------------------------------
const fetchContractors = async (): Promise<Contractor[]> => {
	const token = localStorage.getItem("usr-token");

	const res = await fetch(Contractor_URL, {
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) throw new Error("Failed to load contractors");
	const data = await res.json();
	return data.data ?? data;
};

const fetchProjects = async (): Promise<Project[]> => {
	const token = localStorage.getItem("usr-token");

	const res = await fetch(Projects_URL, {
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) throw new Error("Failed to load projects");
	const data = await res.json();
	return data.data ?? data;
};

/// ------------------------------
export default function NewContract({
	setIsPopOpen,
	apiUrl,
}: {
	setIsPopOpen: (value: boolean) => void;
	apiUrl: string;
}) {
	const { data: contractors, isLoading: contractorsLoading } = useQuery({
		queryKey: ["contractors"],
		queryFn: fetchContractors,
	});

	const { data: projects, isLoading: projectsLoading } = useQuery({
		queryKey: ["projects"],
		queryFn: fetchProjects,
	});

	const [form, setForm] = useState<NewContractForm>({
		contractor_id: "",
		project_id: "",
		contract_number: "",
		gross_budget: "",
		insurance_rate: "",
		performance_bond: "",
		added_value_tax: "",
		start_date: null,
		end_date: null,
		scanned_file: null,
	});

	const [isSubmitted, setIsSubmitted] = useState(false);

	const mutation = useMutation({
		mutationFn: async (payload: FormData) => {
			const token = localStorage.getItem("usr-token");

			const res = await fetch(apiUrl, {
				method: "POST",
				headers: {
					Authorization: `bearer ${token}`,
				},
				body: payload,
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
			toast.success("قرارداد با موفقیت ثبت شد");
			setIsSubmitted(true);
		},
		onError: (error: unknown) => {
			const err = error as ApiError;
			toast.error(err.message);
		},
	});

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value, files } = e.target as HTMLInputElement;

		if (name === "scanned_file" && files) {
			setForm((prev) => ({ ...prev, scanned_file: files[0] }));
			return;
		}

		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleDateChange =
		(name: keyof NewContractForm) => (date: PersianDate | null) => {
			setForm((prev) => ({ ...prev, [name]: date }));
		};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// Validate required fields
		const requiredFields = [
			{ field: form.contractor_id, message: "انتخاب پیمانکار الزامی است" },
			{ field: form.project_id, message: "انتخاب پروژه الزامی است" },
			{ field: form.contract_number, message: "شماره قرارداد الزامی است" },
			{ field: form.gross_budget, message: "مبلغ ناخالص کل الزامی است" },
			{ field: form.start_date, message: "تاریخ شروع الزامی است" },
			{ field: form.end_date, message: "تاریخ پایان الزامی است" },
			{ field: form.scanned_file, message: "فایل قرارداد الزامی است" },
		];

		for (const { field, message } of requiredFields) {
			if (!field) {
				toast.error(message);
				return;
			}
		}

		// Prepare FormData for submission
		const fd = new FormData();
		fd.append("contractor_id", form.contractor_id);
		fd.append("project_id", form.project_id);
		fd.append("contract_number", form.contract_number);
		fd.append("gross_budget", form.gross_budget);
		fd.append("insurance_rate", form.insurance_rate || "");
		fd.append("performance_bond", form.performance_bond || "");
		fd.append("added_value_tax", form.added_value_tax || "");

		// Append dates in Persian format (YYYY-MM-DD)
		if (form.start_date) {
			fd.append(
				"start_date",
				`${form.start_date.year}-${form.start_date.month.toString().padStart(2, "0")}-${form.start_date.day.toString().padStart(2, "0")}T00:00:00Z`,
			);
		}

		if (form.end_date) {
			fd.append(
				"end_date",
				`${form.end_date.year}-${form.end_date.month.toString().padStart(2, "0")}-${form.end_date.day.toString().padStart(2, "0")}T00:00:00Z`,
			);
		}

		fd.append("scanned_file", form.scanned_file!);

		mutation.mutate(fd);
	};

	const handleReset = () => {
		setForm({
			contractor_id: "",
			project_id: "",
			contract_number: "",
			gross_budget: "",
			insurance_rate: "",
			performance_bond: "",
			added_value_tax: "",
			start_date: null,
			end_date: null,
			scanned_file: null,
		});
		setIsSubmitted(false);
	};

	const formatBudget = (value: string) => {
		if (!value) return "";
		const num = parseFloat(value);
		return num.toLocaleString("fa-IR") + " ریال";
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
					<h2 className={styles.SuccessTitle}>قرارداد ثبت شد</h2>
					<p className={styles.SuccessMessage}>
						قرارداد جدید با موفقیت در سیستم ثبت شد.
					</p>
					<div className={styles.SuccessDetails}>
						<div className={styles.SuccessDetailItem}>
							<Hash size={16} />
							<span>شماره قرارداد:</span>
							<strong>{form.contract_number}</strong>
						</div>
						<div className={styles.SuccessDetailItem}>
							<Building size={16} />
							<span>پیمانکار:</span>
							<strong>
								{
									contractors?.find((c) => c.ID === form.contractor_id)
										?.first_name
								}{" "}
								{
									contractors?.find((c) => c.ID === form.contractor_id)
										?.last_name
								}
							</strong>
						</div>
						<div className={styles.SuccessDetailItem}>
							<FolderOpen size={16} />
							<span>پروژه:</span>
							<strong>
								{projects?.find((p) => p.ID === form.project_id)?.name}
							</strong>
						</div>
						<div className={styles.SuccessDetailItem}>
							<DollarSign size={16} />
							<span>مبلغ قرارداد:</span>
							<strong>{formatBudget(form.gross_budget)}</strong>
						</div>
					</div>
					<div className={styles.SuccessActions}>
						<button
							onClick={handleReset}
							className={styles.NewContractButton}
						>
							ایجاد قرارداد جدید
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
					<FileText size={28} />
				</div>
				<h2 className={styles.Title}>ایجاد قرارداد جدید</h2>
				<p className={styles.Subtitle}>اطلاعات قرارداد جدید را وارد کنید</p>
			</div>

			<form
				className={styles.FormContainer}
				onSubmit={handleSubmit}
				onReset={handleReset}
				noValidate
			>
				{/* Contractor & Project Selection */}
				<div className={styles.Section}>
					<div className={styles.SectionHeader}>
						<Building size={18} />
						<span>پیمانکار و پروژه</span>
					</div>
					<div className={styles.Grid}>
						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								پیمانکار <span className={styles.Required}>*</span>
							</label>
							<div className={styles.SelectWrapper}>
								<select
									name='contractor_id'
									value={form.contractor_id}
									onChange={handleChange}
									required
									disabled={contractorsLoading || mutation.isPending}
									className={`${styles.Select} ${contractorsLoading ? styles.Loading : ""}`}
								>
									<option value=''>
										{contractorsLoading
											? "در حال بارگذاری..."
											: "انتخاب پیمانکار"}
									</option>
									{contractors?.map((c) => (
										<option
											key={c.ID}
											value={c.ID}
										>
											{c.first_name} {c.last_name}
										</option>
									))}
								</select>
								<Building
									size={16}
									className={styles.SelectIcon}
								/>
							</div>
						</div>

						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								پروژه <span className={styles.Required}>*</span>
							</label>
							<div className={styles.SelectWrapper}>
								<select
									name='project_id'
									value={form.project_id}
									onChange={handleChange}
									required
									disabled={projectsLoading || mutation.isPending}
									className={`${styles.Select} ${projectsLoading ? styles.Loading : ""}`}
								>
									<option value=''>
										{projectsLoading ? "در حال بارگذاری..." : "انتخاب پروژه"}
									</option>
									{projects?.map((p) => (
										<option
											key={p.ID}
											value={p.ID}
										>
											{p.name} - فاز {p.phase}
										</option>
									))}
								</select>
								<FolderOpen
									size={16}
									className={styles.SelectIcon}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Contract Details */}
				<div className={styles.Section}>
					<div className={styles.SectionHeader}>
						<Hash size={18} />
						<span>مشخصات قرارداد</span>
					</div>
					<div className={styles.Grid}>
						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								شماره قرارداد <span className={styles.Required}>*</span>
							</label>
							<div className={styles.InputWrapper}>
								<input
									name='contract_number'
									placeholder='مثال: 1403/123'
									value={form.contract_number}
									onChange={handleChange}
									required
									disabled={mutation.isPending}
									className={styles.Input}
								/>
								<Hash
									size={16}
									className={styles.InputIcon}
								/>
							</div>
						</div>

						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								مبلغ ناخالص کل <span className={styles.Required}>*</span>
							</label>
							<div className={styles.InputWrapper}>
								<input
									name='gross_budget'
									placeholder='مبلغ به ریال'
									value={form.gross_budget}
									onChange={handleChange}
									required
									disabled={mutation.isPending}
									type='number'
									min='0'
									className={styles.Input}
								/>
								<DollarSign
									size={16}
									className={styles.InputIcon}
								/>
							</div>
							{form.gross_budget && (
								<div className={styles.InputHint}>
									{formatBudget(form.gross_budget)}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Dates */}
				<div className={styles.Section}>
					<div className={styles.SectionHeader}>
						<Calendar size={18} />
						<span>تاریخ‌ها</span>
					</div>
					<div className={styles.Grid}>
						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								تاریخ شروع <span className={styles.Required}>*</span>
							</label>
							<div className={styles.DateInputWrapper}>
								<PersianDatePickerCustom
									name='start_date'
									value={form.start_date}
									onChange={handleDateChange("start_date")}
									placeholder='انتخاب تاریخ'
									required
								/>
								<Calendar
									size={16}
									className={styles.DateIcon}
								/>
							</div>
						</div>

						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								تاریخ پایان <span className={styles.Required}>*</span>
							</label>
							<div className={styles.DateInputWrapper}>
								<PersianDatePickerCustom
									name='end_date'
									value={form.end_date}
									onChange={handleDateChange("end_date")}
									placeholder='انتخاب تاریخ'
									required
								/>
								<CalendarCheck
									size={16}
									className={styles.DateIcon}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Rates & Bonds */}
				<div className={styles.Section}>
					<div className={styles.SectionHeader}>
						<Shield size={18} />
						<span>نرخ‌ها و ضمانت‌ها</span>
					</div>
					<div className={styles.Grid}>
						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>نرخ بیمه (%)</label>
							<div className={styles.InputWrapper}>
								<input
									name='insurance_rate'
									placeholder='0.00'
									value={form.insurance_rate}
									onChange={handleChange}
									disabled={mutation.isPending}
									type='number'
									min='0'
									max='100'
									step='0.01'
									className={styles.Input}
								/>
								<Percent
									size={16}
									className={styles.InputIcon}
								/>
							</div>
						</div>

						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>حسن انجام کار (%)</label>
							<div className={styles.InputWrapper}>
								<input
									name='performance_bond'
									placeholder='0.00'
									value={form.performance_bond}
									onChange={handleChange}
									disabled={mutation.isPending}
									type='number'
									min='0'
									max='100'
									step='0.01'
									className={styles.Input}
								/>
								<Shield
									size={16}
									className={styles.InputIcon}
								/>
							</div>
						</div>
					</div>
					<div className={styles.Grid}>
						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								مالیات ارزش افزوده (%)
							</label>
							<div className={styles.InputWrapper}>
								<input
									name='added_value_tax'
									placeholder='0.00'
									value={form.added_value_tax}
									onChange={handleChange}
									disabled={mutation.isPending}
									type='number'
									min='0'
									max='100'
									step='0.01'
									className={styles.Input}
								/>
								<Percent
									size={16}
									className={styles.InputIcon}
								/>
							</div>
						</div>

						<div className={styles.InputGroup}>
							<label className={styles.InputLabel}>
								فایل قرارداد <span className={styles.Required}>*</span>
							</label>
							<div className={styles.FileUploadWrapper}>
								<label className={styles.FileUploadLabel}>
									<input
										type='file'
										name='scanned_file'
										accept='.pdf,.jpg,.jpeg,.png'
										onChange={handleChange}
										required
										disabled={mutation.isPending}
										className={styles.FileInput}
									/>
									<div className={styles.FileUploadContent}>
										<Upload size={20} />
										<span>انتخاب فایل</span>
									</div>
								</label>
								{form.scanned_file && (
									<div className={styles.FileInfo}>
										<FileCheck size={16} />
										<span className={styles.FileName}>
											{form.scanned_file.name}
										</span>
										<button
											type='button'
											onClick={() =>
												setForm((prev) => ({ ...prev, scanned_file: null }))
											}
											className={styles.RemoveFile}
											aria-label='حذف فایل'
										>
											<X size={14} />
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{mutation.isError && (
					<div className={styles.ErrorAlert}>
						<AlertCircle size={18} />
						<span>خطا در ثبت قرارداد</span>
					</div>
				)}

				<div className={styles.FormActions}>
					<button
						type='reset'
						className={styles.CancelButton}
						disabled={mutation.isPending}
					>
						پاک کردن فرم
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
								<FileText size={18} />
								ثبت قرارداد
							</>
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
