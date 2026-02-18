// Updated ContractInformation.tsx:
import {
	formatCurrency,
	NumberConverter,
	toPersianDigits,
} from "@/utils/PersianNumberCoverter";
import styles from "./ContractInfo.module.css";
import {
	Building2,
	User,
	Hash,
	DollarSign,
	FolderOpen,
	TrendingUp,
	FileText,
	Calendar,
} from "lucide-react";
import PersianDatePickerCustom, {
	formatToRFC3339,
	PersianDate,
} from "../persianDatePicker/PersianDatePicker";
import { useState, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// Interfaces:
interface InvoiceStatistics {
	invoice_count: number;
	last_physical_progress: number;
	average_monthly_progress: number;
}

interface StatusStatementForm {
	contract_id: string;
	statement_date_from: PersianDate | null;
	statement_date_to: PersianDate | null;
}

interface StatusStatementResponse {
	success: boolean;
	message: string;
	data?: any;
}

// API functions
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STATUS_STATEMENT_URL = `${API_URL}/management/status-statement/`;

const fetchInvoiceStatistics = async (
	contractId: string,
): Promise<InvoiceStatistics> => {
	const response = await fetch(
		`${API_URL}/contracts/${contractId}/invoice-statistics/`,
	);

	if (!response.ok) {
		throw new Error("Failed to fetch invoice statistics");
	}

	const data = await response.json();
	return {
		invoice_count: data.invoice_count || 0,
		last_physical_progress: data.last_physical_progress || 0,
		average_monthly_progress: data.average_monthly_progress || 0,
	};
};

const submitStatusStatement = async (data: {
	contract_id: string;
	statement_date_from: string | null;
	statement_date_to: string | null;
}): Promise<StatusStatementResponse> => {
	const token = localStorage.getItem("usr-token");

	const response = await fetch(`${STATUS_STATEMENT_URL}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `bearer ${token}`,
		},
		body: JSON.stringify(data),
	});

	const responseData: StatusStatementResponse = await response.json();

	if (!response.ok) {
		throw new Error(responseData.message || "خطا در ثبت صورت وضعیت");
	}

	return responseData;
};

// Query keys
const queryKeys = {
	invoiceStatistics: (contractId: string) => ["invoiceStatistics", contractId],
};

// --
// Main Component
// --------------
export default function ContractInformation({
	contract_id,
	first_name,
	last_name,
	legal_entity,
	preferential_id,
	national_id,
	contract_budget,
	project_name,
	project_phase,
}: {
	contract_id: string;
	first_name: string;
	last_name: string;
	legal_entity: boolean;
	preferential_id: string;
	national_id: string;
	contract_budget: number;
	project_name: string;
	project_phase: number;
}) {
	const queryClient = useQueryClient();

	// State for form
	const [formData, setFormData] = useState<StatusStatementForm>({
		contract_id: contract_id,
		statement_date_from: null,
		statement_date_to: null,
	});

	// Fetch invoice statistics with React Query
	const {
		data: invoiceStats,
		isLoading: loadingStats,
		error: statsError,
		refetch: refetchStats,
	} = useQuery({
		queryKey: queryKeys.invoiceStatistics(contract_id),
		queryFn: () => fetchInvoiceStatistics(contract_id),
		enabled: !!contract_id,
	});

	// Submit status statement mutation
	const submitMutation = useMutation({
		mutationFn: submitStatusStatement,
		onSuccess: async (data: any) => {
			// Invalidate and refetch invoice statistics
			await queryClient.invalidateQueries({
				queryKey: queryKeys.invoiceStatistics(contract_id),
			});

			localStorage.setItem(
				"previous_status_statement",
				JSON.stringify(data.data.previous_status_statement.ID),
			);
			localStorage.setItem(
				"current_status_statement",
				JSON.stringify(data.data.current_status_statement.ID),
			);

			localStorage.setItem(
				"contract_id",
				data.data.current_status_statement.contract_id,
			);
			toast.success("ثبت اولیه موفق!");

			// Reset form
			setFormData({
				contract_id: "",
				statement_date_from: null,
				statement_date_to: null,
			});

			// Reset success message after 3 seconds
			setTimeout(() => {
				submitMutation.reset();
			}, 3000);
		},
	});

	// Handle date change
	const handleDateChange =
		(field: keyof StatusStatementForm) => (date: PersianDate | null) => {
			setFormData((prev) => ({
				...prev,
				[field]: date,
			}));
			// Reset mutation state when form changes
			if (submitMutation.isSuccess || submitMutation.isError) {
				submitMutation.reset();
			}
		};

	// Handle form submission
	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Validate form
		if (!formData.statement_date_from || !formData.statement_date_to) {
			submitMutation.error = new Error("لطفا تاریخ شروع و پایان را وارد کنید");
			return;
		}

		submitMutation.mutate({
			contract_id,
			statement_date_from: formatToRFC3339(formData.statement_date_from),
			statement_date_to: formatToRFC3339(formData.statement_date_to),
		});
	};

	// Format progress values
	const formatProgress = (value: number) => {
		return value ? `${toPersianDigits(value.toFixed(1))}%` : "---";
	};

	return (
		<div className={styles.Container}>
			<div className={styles.SectionHeader}>
				<FileText size={20} />
				<span>اطلاعات قرارداد</span>
			</div>

			<div className={styles.InfoGrid}>
				<div className={styles.InfoCard}>
					<div className={styles.InfoCardHeader}>
						<div
							className={styles.InfoIcon}
							style={{
								background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
							}}
						>
							{legal_entity ? <Building2 size={18} /> : <User size={18} />}
						</div>
						<h4 className={styles.InfoTitle}>پیمانکار</h4>
					</div>
					<div className={styles.InfoContent}>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>نوع:</span>
							<span
								className={`${styles.InfoValue} ${legal_entity ? styles.Legal : styles.Natural}`}
							>
								{legal_entity ? "حقوقی" : "حقیقی"}
							</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>نام کامل:</span>
							<span className={styles.InfoValue}>
								{first_name} {last_name}
							</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>شناسه ملی:</span>
							<span className={styles.InfoValue}>
								{toPersianDigits(national_id)}
							</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>شناسه تفضیلی:</span>
							<span className={styles.InfoValue}>
								{preferential_id ? toPersianDigits(preferential_id) : "---"}
							</span>
						</div>
					</div>
				</div>

				<div className={styles.InfoCard}>
					<div className={styles.InfoCardHeader}>
						<div
							className={styles.InfoIcon}
							style={{
								background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
							}}
						>
							<FolderOpen size={18} />
						</div>
						<h4 className={styles.InfoTitle}>پروژه</h4>
					</div>
					<div className={styles.InfoContent}>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>نام پروژه:</span>
							<span className={styles.InfoValue}>{project_name}</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>فاز:</span>
							<span className={styles.InfoValue}>
								{toPersianDigits(project_phase)}
							</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>مبلغ قرارداد:</span>
							<span className={styles.InfoValue}>
								{NumberConverter.formatCurrency(contract_budget)} ریال
							</span>
						</div>
					</div>
				</div>

				<div className={styles.InfoCard}>
					<div className={styles.InfoCardHeader}>
						<div
							className={styles.InfoIcon}
							style={{
								background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
							}}
						>
							<TrendingUp size={18} />
						</div>
						<h4 className={styles.InfoTitle}>آمار صورتحساب</h4>
					</div>
					<div className={styles.InfoContent}>
						{loadingStats ? (
							<div className={styles.InfoItem}>
								<span className={styles.InfoLabel}>در حال بارگذاری...</span>
							</div>
						) : statsError ? (
							<div className={styles.InfoItem}>
								<span
									className={styles.InfoLabel}
									style={{ color: "#ef4444" }}
								>
									{statsError instanceof Error
										? statsError.message
										: "خطا در دریافت آمار"}
								</span>
							</div>
						) : (
							<>
								<div className={styles.InfoItem}>
									<span className={styles.InfoLabel}>تعداد صورت وضعیت‌ها:</span>
									<span className={styles.InfoValue}>
										{toPersianDigits(invoiceStats?.invoice_count || 0)}
									</span>
								</div>
								<div className={styles.InfoItem}>
									<span className={styles.InfoLabel}>آخرین پیشرفت فیزیکی:</span>
									<span className={styles.InfoValue}>
										{formatProgress(invoiceStats?.last_physical_progress || 0)}
									</span>
								</div>
								<div className={styles.InfoItem}>
									<span className={styles.InfoLabel}>
										میانگین پیشرفت ماهانه:
									</span>
									<span className={styles.InfoValue}>
										{formatProgress(
											invoiceStats?.average_monthly_progress || 0,
										)}
									</span>
								</div>
							</>
						)}
					</div>
				</div>

				{/* status statement */}
				<form
					className={styles.InfoCard}
					onSubmit={handleSubmit}
				>
					<div className={styles.InfoCardHeader}>
						<div
							className={styles.InfoIcon}
							style={{
								background: "linear-gradient(135deg, #f6ab3b 0%, #d8741d 100%)",
							}}
						>
							<DollarSign size={18} />
						</div>
						<h4 className={styles.InfoTitle}>ثبت اولیه صورت وضعیت </h4>
					</div>

					{submitMutation.isSuccess && (
						<div className={styles.SuccessMessage}>
							{submitMutation.data?.message || "صورت وضعیت با موفقیت ثبت شد"}
						</div>
					)}

					{submitMutation.isError && (
						<div className={styles.ErrorMessage}>
							{submitMutation.error instanceof Error
								? submitMutation.error.message
								: "خطا در ثبت صورت وضعیت"}
						</div>
					)}

					<div className={styles.InfoContent}>
						<div className={styles.InfoItem}>
							<div className={styles.InputGroup}>
								<label className={styles.InputLabel}>
									تاریخ کارکرد از: <span className={styles.Required}>*</span>
								</label>
								<div className={styles.DateInputWrapper}>
									<PersianDatePickerCustom
										name='statement_date_from'
										value={formData.statement_date_from}
										onChange={handleDateChange("statement_date_from")}
										placeholder='انتخاب تاریخ'
										required
									/>
									<Calendar
										size={16}
										className={styles.DateIcon}
									/>
								</div>
							</div>
						</div>
						<div className={styles.InfoItem}>
							<div className={styles.InputGroup}>
								<label className={styles.InputLabel}>
									تاریخ کارکرد تا: <span className={styles.Required}>*</span>
								</label>
								<div className={styles.DateInputWrapper}>
									<PersianDatePickerCustom
										name='statement_date_to'
										value={formData.statement_date_to}
										onChange={handleDateChange("statement_date_to")}
										placeholder='انتخاب تاریخ'
										required
									/>
									<Calendar
										size={16}
										className={styles.DateIcon}
									/>
								</div>
							</div>
						</div>
						<div className={styles.InfoItem}>
							<button
								type='submit'
								className={styles.SubmitBtn}
								disabled={submitMutation.isPending}
							>
								{submitMutation.isPending ? "در حال ثبت..." : "ثبت اولیه"}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
