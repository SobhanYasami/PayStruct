"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import styles from "./NewContractor.module.css";
import toast from "react-hot-toast";

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
				toast.error("خطا در ایجاد پیمانکار");
				throw new Error("Failed to create contractor");
			}

			return res.json();
		},
		onSuccess: () => {
			toast.success("پیمانکار با موفقیت ثبت شد");
			setIsPopOpen(false);
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

	return (
		<div className={styles.Container}>
			<button
				onClick={() => setIsPopOpen(false)}
				className={styles.CloseBtn}
			>
				×
			</button>

			<h2 className={styles.Title}>ایجاد پیمانکار جدید</h2>

			<form
				className={styles.FormContainer}
				onSubmit={handleSubmit}
			>
				{/* Legal Entity Radio */}
				<div className={styles.RadioGroup}>
					<label>
						<input
							type='radio'
							checked={!isLegalEntity}
							onChange={() => setIsLegalEntity(false)}
						/>
						حقیقی
					</label>

					<label>
						<input
							type='radio'
							checked={isLegalEntity}
							onChange={() => setIsLegalEntity(true)}
						/>
						حقوقی
					</label>
				</div>

				<div className={styles.FullNameContainer}>
					<input
						name='first_name'
						placeholder='نام'
						value={form.first_name}
						onChange={handleChange}
						disabled={isLegalEntity}
						required
					/>

					{/* Last Name */}
					<input
						name='last_name'
						placeholder='نام خانوادگی یا نام شرکت'
						value={form.last_name}
						onChange={handleChange}
						required
					/>
				</div>

				<div className={styles.IDsContainer}>
					{/* National ID */}
					<input
						name='national_id'
						placeholder='شماره ملی'
						value={form.national_id}
						onChange={handleChange}
						required
					/>

					{/* Preferential ID */}
					<input
						name='preferential_id'
						placeholder='شناسه تفضیلی'
						value={form.preferential_id}
						onChange={handleChange}
					/>
				</div>

				<button
					type='submit'
					disabled={createContractorMutation.isPending}
					className={styles.SubmitBtn}
				>
					{createContractorMutation.isPending ? "در حال ثبت..." : "ثبت"}
				</button>

				{createContractorMutation.isError && (
					<p className={styles.Error}>خطا در ثبت پیمانکار</p>
				)}
			</form>
		</div>
	);
}
