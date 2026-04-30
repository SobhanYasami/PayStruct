"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
	const token = typeof window !== "undefined" ? localStorage.getItem("usr-token") : "";
	return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// --------------- Types ---------------

type Contractor = {
	id: string;
	type: string;
	first_name: string;
	last_name: string;
	detailed_id: string;
	national_id: string;
	phone?: string;
	address?: string;
	specialty?: string;
	rating?: number;
};

type CreateContractorBody = {
	type: string;
	first_name: string;
	last_name: string;
	detailed_id: string;
	national_id: string;
	phone?: string;
	address?: string;
	specialty?: string;
	rating?: number;
};

type ListResponse = {
	data: { data: Contractor[]; total: number; page: number; limit: number };
};

// --------------- API ---------------

async function fetchContractors(page: number, search: string): Promise<{ items: Contractor[]; total: number }> {
	const params = new URLSearchParams({ page: String(page), limit: "15" });
	if (search) params.set("search", search);
	const res = await fetch(`${API_URL}/contractors?${params}`, { headers: authHeaders() });
	if (!res.ok) throw new Error("Failed to fetch contractors");
	const json: ListResponse = await res.json();
	return { items: json.data.data ?? [], total: json.data.total ?? 0 };
}

async function createContractor(body: CreateContractorBody): Promise<Contractor> {
	const res = await fetch(`${API_URL}/contractors`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to create contractor");
	}
	const json = await res.json();
	return json.data;
}

async function updateContractor({ id, body }: { id: string; body: Partial<CreateContractorBody> }): Promise<Contractor> {
	const res = await fetch(`${API_URL}/contractors/${id}`, {
		method: "PUT",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to update contractor");
	}
	const json = await res.json();
	return json.data;
}

async function deleteContractor(id: string): Promise<void> {
	const res = await fetch(`${API_URL}/contractors/${id}`, { method: "DELETE", headers: authHeaders() });
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to delete contractor");
	}
}

// --------------- Empty form ---------------

const emptyForm: CreateContractorBody = {
	type: "individual", first_name: "", last_name: "", detailed_id: "", national_id: "",
	phone: "", address: "", specialty: "",
};

// --------------- Page ---------------

export default function ContractorsPage() {
	const qc = useQueryClient();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<CreateContractorBody>(emptyForm);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["contractors", page, search],
		queryFn: () => fetchContractors(page, search),
	});

	const createMut = useMutation({
		mutationFn: createContractor,
		onSuccess: () => {
			toast.success("پیمانکار ایجاد شد");
			closeModal();
			qc.invalidateQueries({ queryKey: ["contractors"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const updateMut = useMutation({
		mutationFn: updateContractor,
		onSuccess: () => {
			toast.success("پیمانکار به‌روزرسانی شد");
			closeModal();
			qc.invalidateQueries({ queryKey: ["contractors"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const deleteMut = useMutation({
		mutationFn: deleteContractor,
		onSuccess: () => {
			toast.success("پیمانکار حذف شد");
			setDeleteConfirm(null);
			qc.invalidateQueries({ queryKey: ["contractors"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
	const openEdit = (c: Contractor) => {
		setForm({
			type: c.type, first_name: c.first_name, last_name: c.last_name,
			detailed_id: c.detailed_id, national_id: c.national_id,
			phone: c.phone ?? "", address: c.address ?? "", specialty: c.specialty ?? "",
			rating: c.rating,
		});
		setEditingId(c.id);
		setShowModal(true);
	};
	const closeModal = () => { setShowModal(false); setEditingId(null); };

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingId) updateMut.mutate({ id: editingId, body: form });
		else createMut.mutate(form);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setSearch(searchInput);
		setPage(1);
	};

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 15) || 1;
	const isPending = createMut.isPending || updateMut.isPending;

	return (
		<div style={wrap} dir="rtl">
			<div style={header}>
				<h1 style={titleStyle}>پیمانکاران</h1>
				<button style={primaryBtn} onClick={openCreate}>
					<Plus size={16} /> افزودن پیمانکار
				</button>
			</div>

			{/* Search bar */}
			<form onSubmit={handleSearch} style={searchBar}>
				<input
					style={{ ...inputStyle, flex: 1 }}
					placeholder="جستجو بر اساس نام، کدملی، تخصص..."
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
				/>
				<button type="submit" style={primaryBtn}><Search size={16} /> جستجو</button>
				{search && (
					<button type="button" style={cancelBtn} onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
						پاک کردن
					</button>
				)}
			</form>

			{isLoading ? (
				<p style={loadingStyle}>در حال بارگذاری...</p>
			) : items.length === 0 ? (
				<p style={emptyStyle}>هیچ پیمانکاری یافت نشد.</p>
			) : (
				<div style={tableWrap}>
					<table style={table}>
						<thead>
							<tr>
								{["نوع", "نام", "کد ملی / شناسه", "شناسه تفصیلی", "تلفن", "تخصص", "امتیاز", "عملیات"].map((h) => (
									<th key={h} style={th}>{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{items.map((c) => (
								<tr key={c.id}>
									<td style={td}>
										<span style={{ ...badge, background: c.type === "company" ? "#dbeafe" : "#dcfce7", color: c.type === "company" ? "#1e40af" : "#166534" }}>
											{c.type === "company" ? "شرکتی" : "حقیقی"}
										</span>
									</td>
									<td style={td}>{c.first_name} {c.last_name}</td>
									<td style={td}><code style={{ fontSize: 12 }}>{c.national_id}</code></td>
									<td style={td}><code style={{ fontSize: 12 }}>{c.detailed_id}</code></td>
									<td style={td}>{c.phone || "—"}</td>
									<td style={td}>{c.specialty || "—"}</td>
									<td style={td}>{c.rating != null ? `${c.rating} / 5` : "—"}</td>
									<td style={td}>
										<div style={{ display: "flex", gap: 8 }}>
											<button style={iconBtn} onClick={() => openEdit(c)} title="ویرایش">
												<Pencil size={15} />
											</button>
											<button style={{ ...iconBtn, color: "#ef4444" }} onClick={() => setDeleteConfirm(c.id)} title="حذف">
												<Trash2 size={15} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div style={paginationStyle}>
					<button style={pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronRight size={16} /></button>
					<span style={{ fontSize: 13, color: "#6b7280" }}>صفحه {page} از {totalPages}</span>
					<button style={pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronLeft size={16} /></button>
				</div>
			)}

			{/* Create / Edit Modal */}
			{showModal && (
				<div style={overlay} onClick={closeModal}>
					<div style={modal} onClick={(e) => e.stopPropagation()} dir="rtl">
						<h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>
							{editingId ? "ویرایش پیمانکار" : "پیمانکار جدید"}
						</h2>
						<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							<div style={fieldGroup}>
								<label style={labelStyle}>نوع</label>
								<select style={inputStyle} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
									<option value="individual">حقیقی</option>
									<option value="company">شرکتی</option>
								</select>
							</div>
							<div style={grid2}>
								<Field label="نام *" value={form.first_name} onChange={(v) => setForm((f) => ({ ...f, first_name: v }))} />
								<Field label="نام خانوادگی *" value={form.last_name} onChange={(v) => setForm((f) => ({ ...f, last_name: v }))} />
							</div>
							<div style={grid2}>
								<Field label="کد ملی *" value={form.national_id} onChange={(v) => setForm((f) => ({ ...f, national_id: v }))} />
								<Field label="شناسه تفصیلی *" value={form.detailed_id} onChange={(v) => setForm((f) => ({ ...f, detailed_id: v }))} />
							</div>
							<div style={grid2}>
								<Field label="تلفن" value={form.phone ?? ""} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
								<Field label="تخصص" value={form.specialty ?? ""} onChange={(v) => setForm((f) => ({ ...f, specialty: v }))} />
							</div>
							<Field label="آدرس" value={form.address ?? ""} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
							<Field
								label="امتیاز (0 تا 5)"
								value={form.rating != null ? String(form.rating) : ""}
								onChange={(v) => setForm((f) => ({ ...f, rating: v ? parseFloat(v) : undefined }))}
								type="number"
							/>
							<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
								<button type="button" style={cancelBtn} onClick={closeModal}>انصراف</button>
								<button type="submit" style={primaryBtn} disabled={isPending}>
									{isPending ? "در حال ذخیره..." : editingId ? "ذخیره تغییرات" : "ایجاد پیمانکار"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete confirm */}
			{deleteConfirm && (
				<div style={overlay} onClick={() => setDeleteConfirm(null)}>
					<div style={{ ...modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()} dir="rtl">
						<h3 style={{ margin: "0 0 12px", fontSize: 16 }}>حذف پیمانکار</h3>
						<p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>آیا مطمئن هستید؟ این عملیات قابل بازگشت نیست.</p>
						<div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
							<button style={cancelBtn} onClick={() => setDeleteConfirm(null)}>انصراف</button>
							<button
								style={{ ...primaryBtn, background: "#ef4444" }}
								disabled={deleteMut.isPending}
								onClick={() => deleteMut.mutate(deleteConfirm!)}
							>
								{deleteMut.isPending ? "در حال حذف..." : "حذف"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// --------------- Sub-components ---------------

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
	return (
		<div style={fieldGroup}>
			<label style={labelStyle}>{label}</label>
			<input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
		</div>
	);
}

// --------------- Styles ---------------

const wrap: React.CSSProperties = { padding: "24px", maxWidth: 1100, margin: "0 auto" };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
const titleStyle: React.CSSProperties = { fontSize: 22, fontWeight: 700, margin: 0 };
const searchBar: React.CSSProperties = { display: "flex", gap: 10, marginBottom: 20, alignItems: "center" };
const loadingStyle: React.CSSProperties = { textAlign: "center", color: "#6b7280", padding: 40 };
const emptyStyle: React.CSSProperties = { textAlign: "center", color: "#6b7280", padding: 40 };
const tableWrap: React.CSSProperties = { overflowX: "auto", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: React.CSSProperties = { padding: "12px 16px", textAlign: "right", fontSize: 13, color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #f3f4f6", background: "#f9fafb" };
const td: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid #f9fafb", verticalAlign: "middle" };
const badge: React.CSSProperties = { padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 };
const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, display: "flex", alignItems: "center" };
const paginationStyle: React.CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 };
const pageBtn: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modal: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151" };
const inputStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit", outline: "none" };
const primaryBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
const cancelBtn: React.CSSProperties = { padding: "8px 18px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
