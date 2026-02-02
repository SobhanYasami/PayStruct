"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import styles from "./NewWBS.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";

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
	start_date: string;
	end_date: string;
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
const WBS_URL = `${API_URL}/management/contracts/wbs`;

// ------------------------------------------------
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
export default function NewWBS({
	setIsPopOpen,
	apiUrl,
}: {
	setIsPopOpen: (value: boolean) => void;
	apiUrl: string;
}) {
	const { data: projects, isLoading: projectsLoading } = useQuery({
		queryKey: ["projects"],
		queryFn: fetchProjects,
	});
	const [numberOfItems, setNumberOfItems] = useState(1);
	const [form, setForm] = useState<NewContractForm>({
		contractor_id: "",
		project_id: "",
		contract_number: "",
		gross_budget: "",
		insurance_rate: "",
		performance_bond: "",
		added_value_tax: "",
		start_date: "",
		end_date: "",
		scanned_file: null,
	});

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
		const { name, value, files } = e.target as HTMLInputElement;

		if (name === "scanned_file" && files) {
			setForm((prev) => ({ ...prev, scanned_file: files[0] }));
			return;
		}

		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!form.scanned_file) {
			toast.error("فایل قرارداد الزامی است");
			return;
		}

		const fd = new FormData();

		fd.append("contractor_id", form.contractor_id);
		fd.append("project_id", form.project_id);
		fd.append("contract_number", form.contract_number);
		fd.append("gross_budget", form.gross_budget);
		fd.append("insurance_rate", form.insurance_rate);
		fd.append("performance_bond", form.performance_bond);
		fd.append("added_value_tax", form.added_value_tax);
		fd.append("start_date", new Date(form.start_date).toISOString());
		fd.append("end_date", new Date(form.end_date).toISOString());
		fd.append("scanned_file", form.scanned_file);

		mutation.mutate(fd);
	};

	return (
		<div className={styles.Container}>
			<button
				onClick={() => setIsPopOpen(false)}
				className={styles.CloseBtn}
			>
				×
			</button>

			<h2 className={styles.Title}>ایجاد ساختار شکست جدید</h2>

			<form
				className={styles.FormContainer}
				onSubmit={handleSubmit}
			>
				<div className={styles.TableHeader}>
					<p className={styles.col1}>ردیف</p>
					<p className={styles.col2}>شرح</p>
					<p className={styles.col3}>مقدار کار</p>
					<p className={styles.col4}>واحد</p>
					<p className={styles.col5}>قیمت واحد (ریال)</p>
				</div>

				{Array.from({ length: numberOfItems }).map((_, i) => (
					<div className={styles.RowsContainer}>
						<p className={styles.col1}>{toPersianDigits(i + 1)}</p>
						<input
							name='description'
							placeholder='شرح'
							onChange={handleChange}
							required
							className={styles.descriptionInput}
						/>
						<input
							name='quantity'
							placeholder='مقدار کار'
							onChange={handleChange}
							required
							className={styles.quantityInput}
						/>
						<input
							name='unit'
							placeholder='واحد'
							onChange={handleChange}
							required
							className={styles.unitInput}
						/>
						<input
							name='unit_price'
							placeholder='قیمت واحد (ریال)'
							onChange={handleChange}
							required
							className={styles.unitPriceInput}
						/>
					</div>
				))}

				<button
					type='submit'
					className={styles.SubmitBtn}
					disabled={mutation.isPending}
				>
					{mutation.isPending ? "در حال ثبت..." : "ثبت قرارداد"}
				</button>
			</form>
			<div className={styles.AddRowContainer}>
				<button
					className={styles.AddRowBtn}
					onClick={() => setNumberOfItems((prev) => prev + 1)}
				>
					+
				</button>
				<button
					className={styles.RemoveRowBtn}
					onClick={() => setNumberOfItems((prev) => Math.max(1, prev - 1))}
				>
					-
				</button>
			</div>
		</div>
	);
}
