import { useMutation } from "@tanstack/react-query";
import styles from "./ExtraWorks.module.css";
import { useState } from "react";
import toast from "react-hot-toast";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";

type WBSItem = {
	description: string;
	quantity: number;
	unit: string;
	unit_price: number;
};

type NewExtraWorksPayload = {
	contract_number: string;
	items: WBSItem[];
};

type ApiError = {
	status: number;
	message: string;
};

////

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const StatusExtraWorks_URL = `${API_URL}/management/contracts/status-statement/extra-works/`;

////
export default function ExtraWorks() {
	const [form, setForm] = useState<NewExtraWorksPayload>({
		contract_number: "",
		items: [{ description: "", quantity: 0, unit: "", unit_price: 0 }],
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

	const removeRow = () => {
		setForm((prev) => ({
			...prev,
			items: prev.items.length > 1 ? prev.items.slice(0, -1) : prev.items,
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
						? Number(value)
						: value,
			};
			return { ...prev, items };
		});
	};

	const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((prev) => ({ ...prev, contract_number: e.target.value }));
	};

	const mutation = useMutation({
		mutationFn: async (payload: NewExtraWorksPayload) => {
			const token = localStorage.getItem("usr-token");

			console.log("wbs payload", payload);

			const res = await fetch(StatusExtraWorks_URL, {
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

		if (!form.contract_number) {
			toast.error("شماره قرارداد الزامی است");
			return;
		}

		mutation.mutate(form);
	};
	return (
		<>
			<form className={styles.FormContainer}>
				<h4>جدول اضافه کاری و دستور کارها و ...</h4>
				<div className={styles.TableHeader}>
					<p className={styles.col1}>ردیف</p>
					<p className={styles.col2}>شرح</p>
					<p className={styles.col3}>مقدار کار</p>
					<p className={styles.col4}>واحد</p>
					<p className={styles.col5}>قیمت واحد (ریال)</p>
				</div>

				{form.items.map((item, i) => (
					<div
						key={i}
						className={styles.RowsContainer}
					>
						<p className={styles.col1}>{toPersianDigits(i + 1)}</p>

						<input
							placeholder='شرح'
							value={item.description}
							onChange={(e) =>
								handleItemChange(i, "description", e.target.value)
							}
							required
							className={styles.descriptionInput}
						/>

						<input
							placeholder='مقدار کار'
							value={item.quantity}
							onChange={(e) => handleItemChange(i, "quantity", e.target.value)}
							required
							className={styles.quantityInput}
						/>

						<input
							placeholder='واحد'
							value={item.unit}
							onChange={(e) => handleItemChange(i, "unit", e.target.value)}
							required
							className={styles.unitInput}
						/>

						<input
							placeholder='قیمت واحد (ریال)'
							value={item.unit_price}
							onChange={(e) =>
								handleItemChange(i, "unit_price", e.target.value)
							}
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
					{mutation.isPending ? "در حال ثبت..." : "ثبت"}
				</button>
			</form>
			<div className={styles.AddRowContainer}>
				<button
					className={styles.AddRowBtn}
					onClick={addRow}
				>
					+
				</button>
				<button
					className={styles.RemoveRowBtn}
					onClick={removeRow}
				>
					-
				</button>
			</div>
		</>
	);
}
