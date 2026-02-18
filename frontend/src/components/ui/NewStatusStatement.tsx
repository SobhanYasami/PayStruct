"use client";

import { useEffect, useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./NewStatusStatement.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import ContractInformation from "./newStatusStatement/ContractInfo";
import WorksDone from "./newStatusStatement/WorksDone";
import ExtraWorks from "./newStatusStatement/ExtraWorks";
import {
	FileText,
	Search,
	X,
	Loader2,
	AlertCircle,
	Building2,
	User,
	Hash,
	Calendar,
	Percent,
	DollarSign,
	TrendingUp,
	Layers,
	CheckCircle,
} from "lucide-react";

// Types moved to separate interface declarations
interface ContractWBSPayload {
	contract_number: string;
}

interface Contract {
	ID: string;
	contract_number: string;
	gross_budget: number;
}
interface Contractor {
	ID: string;
	first_name: string;
	last_name: string;
	legal_entity: boolean;
	national_id: string;
	preferential_id: string;
}

interface Project {
	ID: string;
	name: string;
	phase: number;
}

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

interface ApiError {
	status: number;
	message: string;
}

interface ContractResponse {
	data: any;
}

interface WBSResponse {
	data: {
		contract: Contract;
		contractor: Contractor;
		project: Project;
		contractWbs: ContractWBS[];
	};
}

// Constants
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WBS_URL = `${API_URL}/management/wbs/`;
const StatusStatement_URL = `${API_URL}/management/status-statement/`;

// Helper functions
const fetchWithAuth = async (url: string, options?: RequestInit) => {
	const token = localStorage.getItem("usr-token");

	const headers = {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
		...options?.headers,
	};

	const response = await fetch(url, { ...options, headers });

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw {
			status: response.status,
			message: errorData?.message || "خطای ناشناخته",
		} as ApiError;
	}

	return response.json();
};

export default function NewStatusStatement({
	setIsPopOpen,
	apiUrl,
}: {
	setIsPopOpen: (value: boolean) => void;
	apiUrl: string;
}) {
	const [contractNumber, setContractNumber] = useState("");
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [showContractInfo, setShowContractInfo] = useState(false);

	// todo:
	// 1. Fetch contract gross budget from API and display it in the contract info section.
	// 2. Fetch invoice statistics (number of invoices, last physical progress, average monthly progress) from API and display them in the contract info section.

	// Fetch WBS data
	const {
		data: wbsData,
		isSuccess: isWbsSuccess,
		isError: isWbsError,
		mutate: fetchWBS,
		isPending: isWbsPending,
	} = useMutation<WBSResponse, ApiError, ContractWBSPayload>({
		mutationFn: (payload) =>
			fetchWithAuth(`${WBS_URL}${payload.contract_number}`),
		onSuccess: (data) => {
			toast.success("قرارداد یافت شد");
			setShowContractInfo(true);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	// Submit Status Statement Mutation
	const { mutate: submitStatusStatement, isPending: isSubmitPending } =
		useMutation<any, ApiError, string>({
			mutationFn: (ssid: string) =>
				fetchWithAuth(`${StatusStatement_URL}submit/${ssid}`, {
					method: "POST",
				}),
			onSuccess: () => {
				toast.success("صورت وضعیت با موفقیت ثبت شد");
				setIsSubmitted(true);

				// Optional: clear local storage
				localStorage.removeItem("current_status_statement");
			},
			onError: (error) => {
				toast.error(error.message || "خطا در ثبت صورت وضعیت");
			},
		});

	// Derived state
	const contractData = wbsData?.data.contract || null;
	const contractorData = wbsData?.data.contractor || null;
	const projectData = wbsData?.data.project || null;
	const wbsItems = wbsData?.data.contractWbs || null;

	// debug:
	console.log("Contract Data:", contractData);

	useEffect(() => {
		if (isWbsError) {
			// Error is already handled in mutation onError
		}
	}, [isWbsError]);

	// Form handlers
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			setContractNumber(e.target.value);
		},
		[],
	);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();

			if (!contractNumber.trim()) {
				toast.error("شماره قرارداد الزامی است");
				return;
			}
			try {
				// Then fetch WBS data
				fetchWBS({ contract_number: contractNumber });
			} catch (error) {
				console.error("Failed to process request:", error);
				// Error is handled by query/mutation error handlers
			}
		},
		[contractNumber, fetchWBS],
	);

	const handleReset = () => {
		setContractNumber("");
		setShowContractInfo(false);
		setIsSubmitted(false);
	};

	const isLoading = isWbsPending;

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
					<h2 className={styles.SuccessTitle}>صورت وضعیت ثبت شد</h2>
					<p className={styles.SuccessMessage}>
						صورت وضعیت جدید با موفقیت در سیستم ثبت شد.
					</p>
					<div className={styles.SuccessDetails}>
						<div className={styles.SuccessDetailItem}>
							<Hash size={16} />
							<span>شماره قرارداد:</span>
							<strong>{contractNumber}</strong>
						</div>
						<div className={styles.SuccessDetailItem}>
							<Building2 size={16} />
							<span>پیمانکار:</span>
							<strong>
								{contractorData?.first_name} {contractorData?.last_name}
							</strong>
						</div>
						<div className={styles.SuccessDetailItem}>
							<Layers size={16} />
							<span>پروژه:</span>
							<strong>
								{projectData?.name} - فاز {projectData?.phase}
							</strong>
						</div>
					</div>
					<div className={styles.SuccessActions}>
						<button
							onClick={handleReset}
							className={styles.NewStatementButton}
						>
							ایجاد صورت وضعیت جدید
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
				<h2 className={styles.Title}>ایجاد صورت وضعیت جدید</h2>
				<p className={styles.Subtitle}>
					شماره قرارداد را وارد کنید تا اطلاعات آن بارگذاری شود
				</p>
			</div>

			<form
				className={styles.SearchFormContainer}
				onSubmit={handleSubmit}
				noValidate
			>
				<div className={styles.SearchSection}>
					<div className={styles.SearchHeader}>
						<Search size={20} />
						<span>جستجوی قرارداد</span>
					</div>
					<div className={styles.SearchInputGroup}>
						<label className={styles.SearchLabel}>
							شماره قرارداد <span className={styles.Required}>*</span>
						</label>
						<div className={styles.SearchInputWrapper}>
							<input
								name='contract_number'
								placeholder='مثال: 1403/123'
								onChange={handleInputChange}
								value={contractNumber}
								required
								className={styles.searchInput}
								disabled={isLoading}
								aria-label='شماره قرارداد'
							/>
						</div>
						<div className={styles.SearchHint}>
							<AlertCircle size={14} />
							<span>اعداد را به انگلیسی وارد نمایید</span>
						</div>
					</div>
					<button
						type='submit'
						className={styles.SearchBtn}
						disabled={isLoading}
						aria-busy={isLoading}
					>
						{isLoading ? (
							<>
								<Loader2
									className={styles.Loader}
									size={18}
								/>
								در حال جست و جو...
							</>
						) : (
							<>
								<Search size={18} />
								جستجوی قرارداد
							</>
						)}
					</button>
				</div>
			</form>

			{/* Contract Information */}
			{showContractInfo && contractorData && contractData && projectData && (
				<ContractInformation
					contract_id={contractData.ID}
					first_name={contractorData.first_name}
					last_name={contractorData.last_name}
					legal_entity={contractorData.legal_entity}
					preferential_id={contractorData.preferential_id}
					national_id={contractorData.national_id}
					contract_budget={contractData.gross_budget}
					project_name={projectData.name}
					project_phase={projectData.phase}
				/>
			)}

			{/* Works Done Section */}
			{wbsItems && showContractInfo && (
				<div className={styles.WorksSection}>
					<div className={styles.SectionHeader}>
						<Layers size={20} />
						<span>کارکرد پروژه</span>
					</div>
					<WorksDone wbsData={wbsItems} />
				</div>
			)}

			{/* Extra Works Section */}
			{showContractInfo && (
				<div className={styles.ExtraWorksSection}>
					<div className={styles.SectionHeader}>
						<TrendingUp size={20} />
						<span>کارهای اضافه</span>
					</div>
					<ExtraWorks />
				</div>
			)}

			{/* Submit Button (when contract is loaded) */}
			{showContractInfo && (
				<div className={styles.SubmitSection}>
					<button
						className={styles.SubmitButton}
						onClick={() => {
							const raw = localStorage.getItem("current_status_statement");

							if (!raw) {
								toast.error("شناسه صورت وضعیت یافت نشد");
								return;
							}

							const ssid = JSON.parse(raw);

							submitStatusStatement(ssid);
						}}
						disabled={isSubmitPending}
					>
						{isSubmitPending ? (
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
								ثبت صورت وضعیت
							</>
						)}
					</button>

					<button
						className={styles.CancelButton}
						onClick={handleReset}
					>
						شروع مجدد
					</button>
				</div>
			)}

			<div className={styles.Footer}>
				<p className={styles.FooterNote}>
					<AlertCircle size={14} />
					پس از جستجوی قرارداد، می‌توانید کارکرد و کارهای اضافه را وارد کنید.
				</p>
			</div>
		</div>
	);
}
