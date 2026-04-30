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

type Company = {
	id: string;
	name: string;
	reg_num: string;
	parent_id?: string;
};

type PaginatedCompanies = {
	data: Company[];
	total: number;
	page: number;
	limit: number;
	total_pages: number;
};

// --------------- API ---------------

async function fetchCompanies(
	page: number,
	limit: number,
	search: string
): Promise<PaginatedCompanies> {
	const params = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		...(search ? { search } : {}),
	});
	const res = await fetch(`${API_URL}/company/management?${params}`, {
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error("Failed to fetch companies");
	const json = await res.json();
	return json.data;
}

async function createCompany(body: {
	name: string;
	reg_num: string;
	parent_id?: string;
}): Promise<Company> {
	const res = await fetch(`${API_URL}/company/management`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to create company");
	}
	const json = await res.json();
	return json.data;
}

async function deleteCompany(id: string): Promise<void> {
	const res = await fetch(`${API_URL}/company/management/${id}`, {
		method: "DELETE",
		headers: authHeaders(),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to delete company");
	}
}

// --------------- Create Modal ---------------

function CreateCompanyModal({
	onClose,
	onCreated,
}: {
	onClose: () => void;
	onCreated: () => void;
}) {
	const [name, setName] = useState("");
	const [regNum, setRegNum] = useState("");
	const [parentId, setParentId] = useState("");

	const mutation = useMutation({
		mutationFn: createCompany,
		onSuccess: () => {
			toast.success("شرکت با موفقیت ایجاد شد");
			onCreated();
			onClose();
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		mutation.mutate({
			name,
			reg_num: regNum,
			...(parentId ? { parent_id: parentId } : {}),
		});
	};

	return (
		<div
			style={overlay}
			dir='rtl'
		>
			<div style={modal}>
				<div style={modalHeader}>
					<h2 style={{ margin: 0, fontSize: 18 }}>ایجاد شرکت جدید</h2>
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
					<div style={fieldGroup}>
						<label style={labelStyle}>
							نام شرکت <span style={{ color: "#ef4444" }}>*</span>
						</label>
						<input
							style={inputStyle}
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							placeholder='نام شرکت'
						/>
					</div>

					<div style={fieldGroup}>
						<label style={labelStyle}>
							شماره ثبت <span style={{ color: "#ef4444" }}>*</span>
						</label>
						<input
							style={inputStyle}
							value={regNum}
							onChange={(e) => setRegNum(e.target.value)}
							required
							placeholder='شماره ثبت شرکت'
						/>
					</div>

					<div style={fieldGroup}>
						<label style={labelStyle}>شناسه شرکت مادر (اختیاری)</label>
						<input
							style={inputStyle}
							value={parentId}
							onChange={(e) => setParentId(e.target.value)}
							placeholder='UUID شرکت مادر'
						/>
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
							style={primaryBtn}
						>
							{mutation.isPending ? "در حال ایجاد..." : "ایجاد شرکت"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// --------------- Page ---------------

export default function CompaniesPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const qc = useQueryClient();

	const { data, isLoading, isError } = useQuery({
		queryKey: ["companies", page, search],
		queryFn: () => fetchCompanies(page, 10, search),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteCompany,
		onSuccess: () => {
			toast.success("شرکت حذف شد");
			qc.invalidateQueries({ queryKey: ["companies"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const handleDelete = (id: string, name: string) => {
		if (confirm(`آیا از حذف شرکت "${name}" مطمئن هستید؟ تمام کارمندان نیز حذف می‌شوند.`)) {
			deleteMutation.mutate(id);
		}
	};

	return (
		<div
			style={pageWrap}
			dir='rtl'
		>
			<div style={pageHeader}>
				<h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>مدیریت شرکت‌ها</h1>
				<button
					style={primaryBtn}
					onClick={() => setShowCreate(true)}
				>
					+ شرکت جدید
				</button>
			</div>

			<div style={{ marginBottom: 16 }}>
				<input
					style={{ ...inputStyle, width: "100%", maxWidth: 320 }}
					placeholder='جستجو بر اساس نام...'
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
				/>
			</div>

			{isLoading && <p style={{ padding: 20 }}>در حال بارگذاری...</p>}
			{isError && (
				<p style={{ padding: 20, color: "#ef4444" }}>خطا در دریافت اطلاعات</p>
			)}

			{data && (
				<>
					<div style={tableWrap}>
						<table style={tableStyle}>
							<thead>
								<tr style={theadRow}>
									<th style={th}>نام شرکت</th>
									<th style={th}>شماره ثبت</th>
									<th style={th}>شرکت مادر</th>
									<th style={th}>عملیات</th>
								</tr>
							</thead>
							<tbody>
								{data.data.map((co) => (
									<tr
										key={co.id}
										style={tbodyRow}
									>
										<td style={td}>{co.name}</td>
										<td style={td}>{co.reg_num}</td>
										<td style={td}>{co.parent_id ?? "—"}</td>
										<td style={td}>
											<button
												style={dangerBtn}
												onClick={() => handleDelete(co.id, co.name)}
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
							onClick={() =>
								setPage((p) => Math.min(data.total_pages, p + 1))
							}
							disabled={page >= data.total_pages}
						>
							بعدی
						</button>
					</div>
				</>
			)}

			{showCreate && (
				<CreateCompanyModal
					onClose={() => setShowCreate(false)}
					onCreated={() => qc.invalidateQueries({ queryKey: ["companies"] })}
				/>
			)}
		</div>
	);
}

// --------------- Styles ---------------

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
const primaryBtn: React.CSSProperties = {
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
	width: "min(480px, 95vw)",
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
