"use client";

import { useEffect, useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./NewStatusStatement.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import ContractInformation from "./newStatusStatement/ContractInfo";
import WorksDone from "./newStatusStatement/WorksDone";
import ExtraWorks from "./newStatusStatement/ExtraWorks";

// Types moved to separate interface declarations
interface ContractWBSPayload {
	contract_number: string;
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
	data: any; // Consider defining a proper type
}

interface WBSResponse {
	data: {
		contractor: Contractor;
		project: Project;
		contractWbs: ContractWBS[];
	};
}

// Constants
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const CONTRACTOR_URL = `${API_URL}/management/contractors/`;
const CONTRACT_URL = `${API_URL}/management/contracts/`;
const WBS_URL = `${API_URL}/management/wbs/`;
const STATUS_STATEMENT_URL = `${API_URL}/management/contracts/status-statement/`;
const STATUS_EXTRA_WORKS_URL = `${API_URL}/management/contracts/status-statement/extra-works/`;
const STATUS_REDUCTIONS_URL = `${API_URL}/management/contracts/status-statement/reductions/`;

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

	// Fetch contract data
	const {
		data: contractData,
		isSuccess: isContractSuccess,
		isError: isContractError,
		refetch: refetchContract,
		isFetching: isContractFetching,
	} = useQuery<ContractResponse>({
		queryKey: ["contract", contractNumber],
		queryFn: () =>
			fetchWithAuth(`${CONTRACT_URL}?contract_number=${contractNumber}`),
		enabled: false, // Manual fetch
		retry: 1,
	});

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
			console.log("contract wbs:", data);
		},
		onError: (error) => {
			toast.error(`${error.status} | ${error.message}`);
		},
	});

	// Derived state
	const contractorData = wbsData?.data.contractor || null;
	const projectData = wbsData?.data.project || null;
	const wbsItems = wbsData?.data.contractWbs || null;

	// Handle errors
	useEffect(() => {
		if (isContractError) {
			toast.error("خطا در دریافت اطلاعات قرارداد");
		}
	}, [isContractError]);

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
				// Fetch contract first
				const contractResult = await refetchContract();

				if (contractResult.isSuccess) {
					// Then fetch WBS data
					fetchWBS({ contract_number: contractNumber });
				}
			} catch (error) {
				console.error("Failed to process request:", error);
				// Error is handled by query/mutation error handlers
			}
		},
		[contractNumber, refetchContract, fetchWBS],
	);

	const isLoading = isContractFetching || isWbsPending;

	return (
		<div className={styles.Container}>
			<button
				onClick={() => setIsPopOpen(false)}
				className={styles.CloseBtn}
				aria-label='بستن فرم'
			>
				×
			</button>

			<h2 className={styles.Title}>ایجاد صورت وضعیت جدید</h2>

			<form
				className={styles.SearchFormContainer}
				onSubmit={handleSubmit}
				noValidate
			>
				<p className={styles.searchPara}>
					شماره قرارداد مربوطه را وارد کنید:
					<span>(اعداد را به انگلیسی وارد نمایید)</span>
				</p>
				<div className={styles.SearchInputBtnContainer}>
					<input
						name='contract_number'
						placeholder='شماره قرارداد'
						onChange={handleInputChange}
						value={contractNumber}
						required
						className={styles.searchInput}
						disabled={isLoading}
						aria-label='شماره قرارداد'
					/>
					<button
						type='submit'
						className={styles.SearchBtn}
						disabled={isLoading}
						aria-busy={isLoading}
					>
						{isLoading ? "در حال جست و جو..." : "تایید"}
					</button>
				</div>
			</form>

			{/* Pass data to child components */}
			{contractorData && projectData && (
				<ContractInformation
					first_name={contractorData.first_name}
					last_name={contractorData.last_name}
					legal_entity={contractorData.legal_entity}
					preferential_id={contractorData.preferential_id}
					national_id={contractorData.national_id}
					project_name={projectData.name}
					project_phase={projectData.phase}
				/>
			)}

			{wbsData && <WorksDone wbsData={wbsItems} />}
			<ExtraWorks />
		</div>
	);
}
