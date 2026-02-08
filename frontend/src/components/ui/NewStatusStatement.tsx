"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./NewStatusStatement.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import ContractInformation from "./newStatusStatement/ContractInfo";
import WorksDone from "./newStatusStatement/WorksDone";
import ExtraWorks from "./newStatusStatement/ExtraWorks";

type ContractWBSPayload = {
	contract_number: string;
};

type ApiError = {
	status: number;
	message: string;
};

//
//
//
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;
const Contract_URL = `${API_URL}/management/contracts/`;
const WBS_URL = `${API_URL}/management/contracts/wbs/`;
const StatusStatement_URL = `${API_URL}/management/contracts/status-statement/`;
const StatusExtraWorks_URL = `${API_URL}/management/contracts/status-statement/extra-works/`;
const StatusReductions_URL = `${API_URL}/management/contracts/status-statement/reductions/`;
// ------------------------------------------------

/// ------------------------------
export default function NewStatusStatement({
	setIsPopOpen,
	apiUrl,
}: {
	setIsPopOpen: (value: boolean) => void;
	apiUrl: string;
}) {
	const [form, setForm] = useState<ContractWBSPayload>({
		contract_number: "",
	});

	const [contractData, setContractData] = useState(null);
	const [wbsData, setWbsData] = useState(null);

	const mutation = useMutation({
		mutationFn: async (payload: ContractWBSPayload) => {
			const token = localStorage.getItem("usr-token");

			const res = await fetch(`${WBS_URL}${payload.contract_number}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
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
		onSuccess: (data) => {
			toast.success("قرارداد یافت شد");
			console.log("contract wbs:", data);
			setWbsData(data.data);
		},
		onError: (error: unknown) => {
			const err = error as ApiError;
			toast.error(`${err.status} | ${err.message}`);
		},
	});

	// Optional: Add a query to fetch contract information
	// Using queryOptions for v5 compatibility
	const contractQuery = useQuery({
		queryKey: ["contract", form.contract_number],
		queryFn: async () => {
			const token = localStorage.getItem("usr-token");
			const res = await fetch(
				`${Contract_URL}?contract_number=${form.contract_number}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (!res.ok) {
				throw new Error("Failed to fetch contract");
			}

			return res.json();
		},
		enabled: false, // We'll trigger this manually
	});

	// Handle query success/error with useEffect or useQuery callbacks
	useEffect(() => {
		if (contractQuery.isSuccess && contractQuery.data) {
			setContractData(contractQuery.data.data);
		}
	}, [contractQuery.isSuccess, contractQuery.data]);

	useEffect(() => {
		if (contractQuery.isError) {
			toast.error("خطا در دریافت اطلاعات قرارداد");
		}
	}, [contractQuery.isError]);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target as HTMLInputElement;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!form.contract_number) {
			toast.error("شماره قرارداد الزامی است");
			return;
		}

		// First fetch contract data (optional, if needed)
		try {
			await contractQuery.refetch();

			// Then fetch WBS data only if contract fetch was successful
			if (contractQuery.isSuccess) {
				mutation.mutate(form);
			}
		} catch (error) {
			console.error("Failed to fetch contract:", error);
			toast.error("خطا در دریافت اطلاعات قرارداد");
		}
	};

	return (
		<div className={styles.Container}>
			<button
				onClick={() => setIsPopOpen(false)}
				className={styles.CloseBtn}
			>
				×
			</button>

			<h2 className={styles.Title}>ایجاد صورت وضعیت جدید</h2>

			<form
				className={styles.SearchFormContainer}
				onSubmit={handleSubmit}
			>
				<p className={styles.searchPara}>
					شماره قرارداد مربوطه را وارد کنید:
					<span>(اعداد را به انگلیسی وارد نمایید)</span>
				</p>
				<div className={styles.SearchInputBtnContainer}>
					<input
						name='contract_number'
						placeholder='شماره قرارداد'
						onChange={handleChange}
						value={form.contract_number}
						required
						className={styles.searchInput}
					/>
					<button
						type='submit'
						className={styles.SearchBtn}
						disabled={mutation.isPending || contractQuery.isFetching}
					>
						{mutation.isPending || contractQuery.isFetching
							? "در حال جست و جو..."
							: "تایید"}
					</button>
				</div>
			</form>

			{/* Pass data to child components */}
			<ContractInformation />
			<WorksDone />
			<ExtraWorks />
		</div>
	);
}
