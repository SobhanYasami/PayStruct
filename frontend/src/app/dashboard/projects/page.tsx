"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Link from "next/link";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, FileText } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
	const token = typeof window !== "undefined" ? localStorage.getItem("usr-token") : "";
	return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// --------------- Types ---------------

type Project = {
	id: string;
	company_id: string;
	code: string;
	name: string;
	description?: string;
	category?: string;
	status: string;
	priority: string;
	start_date?: string;
	end_date?: string;
	budget_estimate: string;
	budget_actual: string;
	currency: string;
	tags: string[];
};

type CreateProjectBody = {
	code: string;
	name: string;
	description?: string;
	category?: string;
	status?: string;
	priority?: string;
	start_date?: string;
	end_date?: string;
	budget_estimate?: string;
	currency?: string;
	tags?: string[];
};

type ListResponse = {
	data: { data: Project[]; total: number; page: number; limit: number };
};

// --------------- API ---------------

async function fetchProjects(page: number, status: string): Promise<{ items: Project[]; total: number }> {
	const params = new URLSearchParams({ page: String(page), limit: "15" });
	if (status) params.set("status", status);
	const res = await fetch(`${API_URL}/projects?${params}`, { headers: authHeaders() });
	if (!res.ok) throw new Error("Failed to fetch projects");
	const json: ListResponse = await res.json();
	return { items: json.data.data ?? [], total: json.data.total ?? 0 };
}

async function createProject(body: CreateProjectBody): Promise<Project> {
	const res = await fetch(`${API_URL}/projects`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to create project");
	}
	const json = await res.json();
	return json.data;
}

async function updateProject({ id, body }: { id: string; body: Partial<CreateProjectBody> }): Promise<Project> {
	const res = await fetch(`${API_URL}/projects/${id}`, {
		method: "PUT",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to update project");
	}
	const json = await res.json();
	return json.data;
}

async function deleteProject(id: string): Promise<void> {
	const res = await fetch(`${API_URL}/projects/${id}`, { method: "DELETE", headers: authHeaders() });
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to delete project");
	}
}

// --------------- Labels ---------------

const statusLabel: Record<string, string> = {
	planning: "برنامه‌ریزی",
	active: "فعال",
	on_hold: "معلق",
	completed: "تکمیل‌شده",
	cancelled: "لغو‌شده",
};
const statusColor: Record<string, { bg: string; color: string }> = {
	planning: { bg: "#dbeafe", color: "#1e40af" },
	active: { bg: "#dcfce7", color: "#166534" },
	on_hold: { bg: "#fef3c7", color: "#92400e" },
	completed: { bg: "#e0e7ff", color: "#3730a3" },
	cancelled: { bg: "#fee2e2", color: "#991b1b" },
};
const priorityLabel: Record<string, string> = {
	low: "پایین",
	medium: "متوسط",
	high: "بالا",
	critical: "بحرانی",
};

// --------------- Empty form ---------------
const emptyForm: CreateProjectBody = {
	code: "", name: "", description: "", category: "",
	status: "planning", priority: "medium", start_date: "", end_date: "",
	budget_estimate: "", currency: "IRR",
};

// --------------- Page ---------------

export default function ProjectsPage() {
	const qc = useQueryClient();
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<CreateProjectBody>(emptyForm);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["projects", page, statusFilter],
		queryFn: () => fetchProjects(page, statusFilter),
	});

	const createMut = useMutation({
		mutationFn: createProject,
		onSuccess: () => {
			toast.success("پروژه ایجاد شد");
			closeModal();
			qc.invalidateQueries({ queryKey: ["projects"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const updateMut = useMutation({
		mutationFn: updateProject,
		onSuccess: () => {
			toast.success("پروژه به‌روزرسانی شد");
			closeModal();
			qc.invalidateQueries({ queryKey: ["projects"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const deleteMut = useMutation({
		mutationFn: deleteProject,
		onSuccess: () => {
			toast.success("پروژه حذف شد");
			setDeleteConfirm(null);
			qc.invalidateQueries({ queryKey: ["projects"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
	const openEdit = (p: Project) => {
		setForm({
			code: p.code, name: p.name, description: p.description ?? "",
			category: p.category ?? "", status: p.status, priority: p.priority,
			start_date: p.start_date ? p.start_date.slice(0, 10) : "",
			end_date: p.end_date ? p.end_date.slice(0, 10) : "",
			budget_estimate: p.budget_estimate, currency: p.currency,
		});
		setEditingId(p.id);
		setShowModal(true);
	};
	const closeModal = () => { setShowModal(false); setEditingId(null); };

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingId) {
			updateMut.mutate({ id: editingId, body: form });
		} else {
			createMut.mutate(form);
		}
	};

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 15) || 1;
	const isPending = createMut.isPending || updateMut.isPending;

	return (
		<div style={wrap} dir="rtl">
			<div style={header}>
				<h1 style={title}>پروژه‌ها</h1>
				<div style={{ display: "flex", gap: 10, alignItems: "center" }}>
					<select
						value={statusFilter}
						onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
						style={selectStyle}
					>
						<option value="">همه وضعیت‌ها</option>
						{Object.entries(statusLabel).map(([v, l]) => (
							<option key={v} value={v}>{l}</option>
						))}
					</select>
					<button style={primaryBtn} onClick={openCreate}>
						<Plus size={16} /> افزودن پروژه
					</button>
				</div>
			</div>

			{isLoading ? (
				<p style={loading}>در حال بارگذاری...</p>
			) : items.length === 0 ? (
				<p style={empty}>هیچ پروژه‌ای یافت نشد.</p>
			) : (
				<div style={tableWrap}>
					<table style={table}>
						<thead>
							<tr>
								{["کد", "نام", "وضعیت", "اولویت", "بودجه تخمینی", "ارز", "عملیات"].map((h) => (
									<th key={h} style={th}>{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{items.map((p) => {
								const sc = statusColor[p.status] ?? { bg: "#f3f4f6", color: "#374151" };
								return (
									<tr key={p.id} style={tr}>
										<td style={td}><code style={{ fontSize: 12 }}>{p.code}</code></td>
										<td style={td}>
											<Link href={`/dashboard/projects/${p.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
												{p.name}
											</Link>
										</td>
										<td style={td}>
											<span style={{ ...badge, background: sc.bg, color: sc.color }}>
												{statusLabel[p.status] ?? p.status}
											</span>
										</td>
										<td style={td}>{priorityLabel[p.priority] ?? p.priority}</td>
										<td style={td}>{Number(p.budget_estimate).toLocaleString()}</td>
										<td style={td}>{p.currency}</td>
										<td style={td}>
											<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
											<Link href={`/dashboard/contracts?project_id=${p.id}`} style={{ ...iconBtn, color: "#2563eb", textDecoration: "none" }} title="قراردادها">
												<FileText size={15} />
											</Link>
												<button style={iconBtn} onClick={() => openEdit(p)} title="ویرایش">
													<Pencil size={15} />
												</button>
												<button style={{ ...iconBtn, color: "#ef4444" }} onClick={() => setDeleteConfirm(p.id)} title="حذف">
													<Trash2 size={15} />
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div style={pagination}>
					<button style={pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
						<ChevronRight size={16} />
					</button>
					<span style={{ fontSize: 13, color: "#6b7280" }}>صفحه {page} از {totalPages}</span>
					<button style={pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
						<ChevronLeft size={16} />
					</button>
				</div>
			)}

			{/* Create / Edit Modal */}
			{showModal && (
				<div style={overlay} onClick={closeModal}>
					<div style={modal} onClick={(e) => e.stopPropagation()} dir="rtl">
						<h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>
							{editingId ? "ویرایش پروژه" : "پروژه جدید"}
						</h2>
						<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							<div style={grid2}>
								<Field label="کد پروژه *" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} />
								<Field label="نام پروژه *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
							</div>
							<Field label="توضیحات" value={form.description ?? ""} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
							<div style={grid2}>
								<Field label="دسته‌بندی" value={form.category ?? ""} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
								<div style={fieldGroup}>
									<label style={labelStyle}>وضعیت</label>
									<select style={inputStyle} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
										{Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
									</select>
								</div>
							</div>
							<div style={grid2}>
								<div style={fieldGroup}>
									<label style={labelStyle}>اولویت</label>
									<select style={inputStyle} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
										{Object.entries(priorityLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
									</select>
								</div>
								<Field label="ارز (3 حرف)" value={form.currency ?? "IRR"} onChange={(v) => setForm((f) => ({ ...f, currency: v }))} />
							</div>
							<div style={grid2}>
								<Field label="تاریخ شروع" type="date" value={form.start_date ?? ""} onChange={(v) => setForm((f) => ({ ...f, start_date: v }))} />
								<Field label="تاریخ پایان" type="date" value={form.end_date ?? ""} onChange={(v) => setForm((f) => ({ ...f, end_date: v }))} />
							</div>
							<Field label="بودجه تخمینی" value={form.budget_estimate ?? ""} onChange={(v) => setForm((f) => ({ ...f, budget_estimate: v }))} />
							<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
								<button type="button" style={cancelBtn} onClick={closeModal}>انصراف</button>
								<button type="submit" style={primaryBtn} disabled={isPending}>
									{isPending ? "در حال ذخیره..." : editingId ? "ذخیره تغییرات" : "ایجاد پروژه"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete confirmation */}
			{deleteConfirm && (
				<div style={overlay} onClick={() => setDeleteConfirm(null)}>
					<div style={{ ...modal, maxWidth: 380 }} onClick={(e) => e.stopPropagation()} dir="rtl">
						<h3 style={{ margin: "0 0 12px", fontSize: 16 }}>حذف پروژه</h3>
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
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 };
const title: React.CSSProperties = { fontSize: 22, fontWeight: 700, margin: 0 };
const loading: React.CSSProperties = { textAlign: "center", color: "#6b7280", padding: 40 };
const empty: React.CSSProperties = { textAlign: "center", color: "#6b7280", padding: 40 };
const tableWrap: React.CSSProperties = { overflowX: "auto", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: React.CSSProperties = { padding: "12px 16px", textAlign: "right", fontSize: 13, color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #f3f4f6", background: "#f9fafb" };
const td: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid #f9fafb", verticalAlign: "middle" };
const tr: React.CSSProperties = {};
const badge: React.CSSProperties = { padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 };
const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, display: "flex", alignItems: "center" };
const pagination: React.CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 };
const pageBtn: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modal: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151" };
const inputStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit", outline: "none" };
const primaryBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
const cancelBtn: React.CSSProperties = { padding: "8px 18px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
const selectStyle: React.CSSProperties = { padding: "7px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit" };
