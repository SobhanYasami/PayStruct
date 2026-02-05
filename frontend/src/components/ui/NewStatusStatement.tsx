"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./NewStatusStatement.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import ContractInformation from "./newStatusStatement/ContractInfo";
import WorksDone from "./newStatusStatement/WorksDone";
import ExtraWorks from "./newStatusStatement/ExtraWorks";

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
	const [form, setForm] = useState<NewWBSPayload>({
		contract_number: "",
		items: [{ description: "", quantity: 0, unit: "", unit_price: 0 }],
	});

	const mutation = useMutation({
		mutationFn: async (payload: NewWBSPayload) => {
			const token = localStorage.getItem("usr-token");

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
			setIsPopOpen(false);
		},
		onError: (error: unknown) => {
			const err = error as ApiError;
			toast.error(`${err.status} | ${err.message}`);
		},
	});

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target as HTMLInputElement;

		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!form.contract_number) {
			toast.error("شماره قرارداد الزامی است");
			return;
		}

		mutation.mutate(form);
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
						required
						className={styles.searchInput}
					/>
					<button
						type='submit'
						className={styles.SearchBtn}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "در حال جست و جو..." : "تایید"}
					</button>
				</div>
			</form>

			<ContractInformation />
			<WorksDone />
			<ExtraWorks />
		</div>
	);
}
