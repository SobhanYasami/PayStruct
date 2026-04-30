"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
	const token =
		typeof window !== "undefined" ? localStorage.getItem("usr-token") : "";
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

// --------------- Types ---------------

type Employee = {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	phone?: string;
	active: boolean;
	roles: string[];
	company_id: string;
};

type PaginatedEmployees = {
	data: Employee[];
	total: number;
	page: number;
	limit: number;
	total_pages: number;
};

type CreateEmployeeBody = {
	first_name: string;
	last_name: string;
	email: string;
	national_id: string;
	password: string;
	phone?: string;
	roles: string[];
	company_id: string;
	employment_type: string;
};

// --------------- API ---------------

async function fetchEmployees(page: number, limit: number): Promise<PaginatedEmployees> {
	const res = await fetch(
		`${API_URL}/users/employees/list?page=${page}&limit=${limit}`,
		{ headers: authHeaders() }
	);
	if (!res.ok) throw new Error("Failed to fetch employees");
	const json = await res.json();
	return json.data;
}

async function createEmployee(body: CreateEmployeeBody): Promise<Employee> {
	const res = await fetch(`${API_URL}/users/employees/create`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to create employee");
	}
	const json = await res.json();
	return json.data;
}

async function deleteEmployee(id: string): Promise<void> {
	const res = await fetch(`${API_URL}/users/employees/${id}`, {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to delete employee");
	}
}

// --------------- Modal ---------------

type CreateModalProps = {
	onClose: () => void;
	onCreated: () => void;
};

function CreateEmployeeModal({ onClose, onCreated }: CreateModalProps) {
	const [form, setForm] = useState<CreateEmployeeBody>({
		first_name: "",
		last_name: "",
		email: "",
		national_id: "",
		password: "",
		phone: "",
		roles: [],
		company_id: "",
		employment_type: "official",
	});
	const [rolesInput, setRolesInput] = useState("");

	const mutation = useMutation({
		mutationFn: createEmployee,
		onSuccess: () => {
			toast.success("کارمند با موفقیت ایجاد شد");
			onCreated();
			onClose();
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const set = (field: keyof CreateEmployeeBody, value: string) =>
		setForm((prev) => ({ ...prev, [field]: value }));

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const roles = rolesInput
			.split(",")
			.map((r) => r.trim())
			.filter(Boolean);
		mutation.mutate({ ...form, roles });
	};

	return (
		<div
			style={overlay}
			dir='rtl'
		>
			<div style={modal}>
				<div style={modalHeader}>
					<h2 style={{ margin: 0, fontSize: 18 }}>ایجاد کارمند جدید</h2>
					<button
						onClick={onClose}
						style={closeBtn}
					>
						✕
					</button>
				</div>

				<form
					onSubmit={handleSubmit}
					style={formStyle}
				>
					<div style={row}>
						<Field
							label='نام'
							value={form.first_name}
							onChange={(v) => set("first_name", v)}
							required
						/>
						<Field
							label='نام خانوادگی'
							value={form.last_name}
							onChange={(v) => set("last_name", v)}
							required
						/>
					</div>
					<Field
						label='ایمیل'
						type='email'
						value={form.email}
						onChange={(v) => set("email", v)}
						required
					/>
					<div style={row}>
						<Field
							label='کد ملی'
							value={form.national_id}
							onChange={(v) => set("national_id", v)}
							required
						/>
						<Field
							label='شماره تلفن'
							value={form.phone ?? ""}
							onChange={(v) => set("phone", v)}
						/>
					</div>
					<Field
						label='رمز عبور'
						type='password'
						value={form.password}
						onChange={(v) => set("password", v)}
						required
					/>
					<Field
						label='شناسه شرکت'
						value={form.company_id}
						onChange={(v) => set("company_id", v)}
						required
						placeholder='UUID شرکت'
					/>
					<Field
						label='نقش‌ها (با کاما جدا کنید)'
						value={rolesInput}
						onChange={setRolesInput}
						placeholder='مثال: manager, financial'
					/>

					<div style={fieldGroup}>
						<label style={labelStyle}>نوع استخدام</label>
						<select
							style={inputStyle}
							value={form.employment_type}
							onChange={(e) => set("employment_type", e.target.value)}
						>
							<option value='official'>رسمی</option>
							<option value='contractual'>قراردادی</option>
						</select>
					</div>

					<div style={modalFooter}>
						<button
							type='button'
							onClick={onClose}
							style={cancelBtn}
						>
							انصراف
						</button>
						<button
							type='submit'
							disabled={mutation.isPending}
							style={submitBtn}
						>
							{mutation.isPending ? "در حال ایجاد..." : "ایجاد کارمند"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function Field({
	label,
	value,
	onChange,
	type = "text",
	required,
	placeholder,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	type?: string;
	required?: boolean;
	placeholder?: string;
}) {
	return (
		<div style={fieldGroup}>
			<label style={labelStyle}>
				{label}
				{required && <span style={{ color: "#ef4444" }}> *</span>}
			</label>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				required={required}
				placeholder={placeholder}
				style={inputStyle}
			/>
		</div>
	);
}

// --------------- Page ---------------

export default function EmployeesPage() {
	const [page, setPage] = useState(1);
	const [showCreate, setShowCreate] = useState(false);
	const qc = useQueryClient();

	const { data, isLoading, isError } = useQuery({
		queryKey: ["employees", page],
		queryFn: () => fetchEmployees(page, 10),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteEmployee,
		onSuccess: () => {
			toast.success("کارمند حذف شد");
			qc.invalidateQueries({ queryKey: ["employees"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const handleDelete = (id: string, name: string) => {
		if (confirm(`آیا از حذف "${name}" مطمئن هستید؟`)) {
			deleteMutation.mutate(id);
		}
	};

	return (
		<div
			style={pageWrap}
			dir='rtl'
		>
			<div style={pageHeader}>
				<h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>مدیریت کارمندان</h1>
				<button
					style={submitBtn}
					onClick={() => setShowCreate(true)}
				>
					+ کارمند جدید
				</button>
			</div>

			{isLoading && <p style={{ padding: 20 }}>در حال بارگذاری...</p>}
			{isError && <p style={{ padding: 20, color: "#ef4444" }}>خطا در دریافت اطلاعات</p>}

			{data && (
				<>
					<div style={tableWrap}>
						<table style={tableStyle}>
							<thead>
								<tr style={theadRow}>
									<th style={th}>نام</th>
									<th style={th}>ایمیل</th>
									<th style={th}>نقش‌ها</th>
									<th style={th}>وضعیت</th>
									<th style={th}>عملیات</th>
								</tr>
							</thead>
							<tbody>
								{data.data.map((emp) => (
									<tr
										key={emp.id}
										style={tbodyRow}
									>
										<td style={td}>
											{emp.first_name} {emp.last_name}
										</td>
										<td style={td}>{emp.email}</td>
										<td style={td}>{(emp.roles ?? []).join(", ") || "—"}</td>
										<td style={td}>
											<span
												style={{
													...badge,
													background: emp.active ? "#dcfce7" : "#fee2e2",
													color: emp.active ? "#166534" : "#991b1b",
												}}
											>
												{emp.active ? "فعال" : "غیرفعال"}
											</span>
										</td>
										<td style={td}>
											<button
												style={dangerBtn}
												onClick={() =>
													handleDelete(emp.id, `${emp.first_name} ${emp.last_name}`)
												}
												disabled={deleteMutation.isPending}
											>
												حذف
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div style={paginationRow}>
						<button
							style={pageBtn}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
						>
							قبلی
						</button>
						<span style={{ fontSize: 14 }}>
							صفحه {page} از {data.total_pages}
						</span>
						<button
							style={pageBtn}
							onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
							disabled={page >= data.total_pages}
						>
							بعدی
						</button>
					</div>
				</>
			)}

			{showCreate && (
				<CreateEmployeeModal
					onClose={() => setShowCreate(false)}
					onCreated={() => qc.invalidateQueries({ queryKey: ["employees"] })}
				/>
			)}
		</div>
	);
}

// --------------- Inline styles ---------------

const pageWrap: React.CSSProperties = {
	padding: "24px",
	maxWidth: 1100,
	margin: "0 auto",
};
const pageHeader: React.CSSProperties = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	marginBottom: 24,
};
const tableWrap: React.CSSProperties = {
	overflowX: "auto",
	borderRadius: 8,
	border: "1px solid #e5e7eb",
};
const tableStyle: React.CSSProperties = {
	width: "100%",
	borderCollapse: "collapse",
	fontSize: 14,
};
const theadRow: React.CSSProperties = {
	background: "#f9fafb",
};
const tbodyRow: React.CSSProperties = {
	borderTop: "1px solid #f3f4f6",
};
const th: React.CSSProperties = {
	padding: "12px 16px",
	textAlign: "right",
	fontWeight: 600,
	color: "#374151",
};
const td: React.CSSProperties = {
	padding: "12px 16px",
	color: "#4b5563",
};
const badge: React.CSSProperties = {
	padding: "2px 10px",
	borderRadius: 999,
	fontSize: 12,
	fontWeight: 600,
};
const paginationRow: React.CSSProperties = {
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	gap: 16,
	marginTop: 20,
};
const pageBtn: React.CSSProperties = {
	padding: "6px 16px",
	borderRadius: 6,
	border: "1px solid #d1d5db",
	background: "#fff",
	cursor: "pointer",
	fontSize: 14,
};
const submitBtn: React.CSSProperties = {
	padding: "8px 20px",
	background: "#2563eb",
	color: "#fff",
	border: "none",
	borderRadius: 8,
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 14,
};
const cancelBtn: React.CSSProperties = {
	padding: "8px 20px",
	background: "#f3f4f6",
	color: "#374151",
	border: "none",
	borderRadius: 8,
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 14,
};
const dangerBtn: React.CSSProperties = {
	padding: "4px 12px",
	background: "#fee2e2",
	color: "#991b1b",
	border: "none",
	borderRadius: 6,
	cursor: "pointer",
	fontSize: 13,
};
const overlay: React.CSSProperties = {
	position: "fixed",
	inset: 0,
	background: "rgba(0,0,0,0.4)",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	zIndex: 100,
};
const modal: React.CSSProperties = {
	background: "#fff",
	borderRadius: 12,
	padding: 0,
	width: "min(560px, 95vw)",
	maxHeight: "90vh",
	overflowY: "auto",
};
const modalHeader: React.CSSProperties = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	padding: "16px 20px",
	borderBottom: "1px solid #e5e7eb",
};
const modalFooter: React.CSSProperties = {
	display: "flex",
	justifyContent: "flex-end",
	gap: 10,
	marginTop: 8,
};
const closeBtn: React.CSSProperties = {
	background: "none",
	border: "none",
	fontSize: 18,
	cursor: "pointer",
	color: "#6b7280",
};
const formStyle: React.CSSProperties = {
	padding: "20px",
	display: "flex",
	flexDirection: "column",
	gap: 14,
};
const row: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 14,
};
const fieldGroup: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: 4,
};
const labelStyle: React.CSSProperties = {
	fontSize: 13,
	fontWeight: 600,
	color: "#374151",
};
const inputStyle: React.CSSProperties = {
	padding: "8px 12px",
	borderRadius: 6,
	border: "1px solid #d1d5db",
	fontSize: 14,
	fontFamily: "inherit",
	outline: "none",
};
