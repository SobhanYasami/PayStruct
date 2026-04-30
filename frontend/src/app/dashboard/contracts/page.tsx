"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, FileText } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
	const token = typeof window !== "undefined" ? localStorage.getItem("usr-token") : "";
	return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// --------------- Types ---------------

type Contract = {
	id: string;
	project_id: string;
	contractor_id: string;
	code: string;
	title: string;
	description?: string;
	status: string;
	total_amount: string;
	currency: string;
	signed_at?: string;
	starts_on?: string;
	ends_on?: string;
};

type Project = { id: string; code: string; name: string };
type Contractor = { id: string; first_name: string; last_name: string; national_id: string };

type CreateContractBody = {
	project_id: string;
	contractor_id: string;
	code: string;
	title: string;
	description?: string;
	status?: string;
	total_amount?: string;
	currency?: string;
	signed_at?: string;
	starts_on?: string;
	ends_on?: string;
};

// --------------- API ---------------

async function fetchContracts(projectId: string, page: number): Promise<{ items: Contract[]; total: number }> {
	const params = new URLSearchParams({ page: String(page), limit: "20" });
	if (projectId) params.set("project_id", projectId);
	const res = await fetch(`${API_URL}/contracts?${params}`, { headers: authHeaders() });
	if (!res.ok) throw new Error("Failed to fetch contracts");
	const json = await res.json();
	return { items: json.data.data ?? [], total: json.data.total ?? 0 };
}

async function fetchProjects(): Promise<Project[]> {
	const res = await fetch(`${API_URL}/projects?limit=100`, { headers: authHeaders() });
	if (!res.ok) return [];
	const json = await res.json();
	return json.data.data ?? [];
}

async function fetchContractors(): Promise<Contractor[]> {
	const res = await fetch(`${API_URL}/contractors?limit=100`, { headers: authHeaders() });
	if (!res.ok) return [];
	const json = await res.json();
	return json.data.data ?? [];
}

async function createContract(body: CreateContractBody): Promise<Contract> {
	const res = await fetch(`${API_URL}/contracts`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to create contract");
	}
	return (await res.json()).data;
}

async function deleteContract(id: string): Promise<void> {
	const res = await fetch(`${API_URL}/contracts/${id}`, { method: "DELETE", headers: authHeaders() });
	if (!res.ok) throw new Error("Failed to delete contract");
}

// --------------- Labels ---------------

const statusLabel: Record<string, string> = {
	draft: "پیش‌نویس",
	signed: "امضا شده",
	active: "فعال",
	closed: "بسته",
	cancelled: "لغو شده",
};
const statusColor: Record<string, { bg: string; color: string }> = {
	draft: { bg: "#f3f4f6", color: "#374151" },
	signed: { bg: "#dbeafe", color: "#1e40af" },
	active: { bg: "#dcfce7", color: "#166534" },
	closed: { bg: "#e0e7ff", color: "#3730a3" },
	cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

const emptyForm: CreateContractBody = {
	project_id: "", contractor_id: "", code: "", title: "",
	description: "", status: "draft", total_amount: "", currency: "IRR",
	signed_at: "", starts_on: "", ends_on: "",
};

// --------------- Inner page (uses search params) ---------------

function ContractsInner() {
	const searchParams = useSearchParams();
	const projectId = searchParams.get("project_id") ?? "";
	const qc = useQueryClient();
	const [page, setPage] = useState(1);
	const [showModal, setShowModal] = useState(false);
	const [form, setForm] = useState<CreateContractBody>({ ...emptyForm, project_id: projectId });
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	useEffect(() => {
		setForm((f) => ({ ...f, project_id: projectId }));
		setPage(1);
	}, [projectId]);

	const { data, isLoading } = useQuery({
		queryKey: ["contracts", projectId, page],
		queryFn: () => fetchContracts(projectId, page),
	});
	const { data: projects = [] } = useQuery({ queryKey: ["projects-list"], queryFn: fetchProjects });
	const { data: contractors = [] } = useQuery({ queryKey: ["contractors-list"], queryFn: fetchContractors });

	const createMut = useMutation({
		mutationFn: createContract,
		onSuccess: () => {
			toast.success("قرارداد ایجاد شد");
			setShowModal(false);
			qc.invalidateQueries({ queryKey: ["contracts"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const deleteMut = useMutation({
		mutationFn: deleteContract,
		onSuccess: () => {
			toast.success("قرارداد حذف شد");
			setDeleteConfirm(null);
			qc.invalidateQueries({ queryKey: ["contracts"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createMut.mutate(form);
	};

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 20) || 1;

	const projectName = projectId
		? projects.find((p) => p.id === projectId)?.name ?? "پروژه"
		: null;

	return (
		<div style={wrap} dir="rtl">
			<div style={header}>
				<div>
					<h1 style={titleStyle}>قراردادها</h1>
					{projectName && (
						<p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
							پروژه: {projectName}
						</p>
					)}
				</div>
				<button style={primaryBtn} onClick={() => { setForm({ ...emptyForm, project_id: projectId }); setShowModal(true); }}>
					<Plus size={16} /> افزودن قرارداد
				</button>
			</div>

			{isLoading ? (
				<p style={loadingStyle}>در حال بارگذاری...</p>
			) : items.length === 0 ? (
				<div style={emptyBox}>
					<FileText size={40} color="#d1d5db" />
					<p style={{ margin: "12px 0 0", color: "#6b7280" }}>هیچ قراردادی یافت نشد.</p>
				</div>
			) : (
				<div style={tableWrap}>
					<table style={table}>
						<thead>
							<tr>
								{["کد", "عنوان", "وضعیت", "مبلغ کل", "ارز", "تاریخ امضا", "عملیات"].map((h) => (
									<th key={h} style={th}>{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{items.map((ct) => {
								const sc = statusColor[ct.status] ?? { bg: "#f3f4f6", color: "#374151" };
								return (
									<tr key={ct.id}>
										<td style={td}><code style={{ fontSize: 12 }}>{ct.code}</code></td>
										<td style={td}>
											<Link href={`/dashboard/contracts/${ct.id}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
												{ct.title}
											</Link>
										</td>
										<td style={td}>
											<span style={{ ...badge, background: sc.bg, color: sc.color }}>
												{statusLabel[ct.status] ?? ct.status}
											</span>
										</td>
										<td style={td}>{Number(ct.total_amount).toLocaleString()}</td>
										<td style={td}>{ct.currency}</td>
										<td style={td}>{ct.signed_at ? ct.signed_at.slice(0, 10) : "—"}</td>
										<td style={td}>
											<button style={{ ...iconBtn, color: "#ef4444" }} onClick={() => setDeleteConfirm(ct.id)} title="حذف">
												<Trash2 size={15} />
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			{totalPages > 1 && (
				<div style={pagination}>
					<button style={pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronRight size={16} /></button>
					<span style={{ fontSize: 13, color: "#6b7280" }}>صفحه {page} از {totalPages}</span>
					<button style={pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronLeft size={16} /></button>
				</div>
			)}

			{/* Create modal */}
			{showModal && (
				<div style={overlay} onClick={() => setShowModal(false)}>
					<div style={modal} onClick={(e) => e.stopPropagation()} dir="rtl">
						<h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>قرارداد جدید</h2>
						<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							<div style={grid2}>
								<div style={fieldGroup}>
									<label style={labelStyle}>پروژه *</label>
									<select style={inputStyle} value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}>
										<option value="">انتخاب پروژه...</option>
										{projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
									</select>
								</div>
								<div style={fieldGroup}>
									<label style={labelStyle}>پیمانکار *</label>
									<select style={inputStyle} value={form.contractor_id} onChange={(e) => setForm((f) => ({ ...f, contractor_id: e.target.value }))}>
										<option value="">انتخاب پیمانکار...</option>
										{contractors.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
									</select>
								</div>
							</div>
							<div style={grid2}>
								<Field label="کد قرارداد *" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} />
								<Field label="عنوان *" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
							</div>
							<Field label="توضیحات" value={form.description ?? ""} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
							<div style={grid2}>
								<div style={fieldGroup}>
									<label style={labelStyle}>وضعیت</label>
									<select style={inputStyle} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
										{Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
									</select>
								</div>
								<Field label="ارز" value={form.currency ?? "IRR"} onChange={(v) => setForm((f) => ({ ...f, currency: v }))} />
							</div>
							<Field label="مبلغ کل" value={form.total_amount ?? ""} onChange={(v) => setForm((f) => ({ ...f, total_amount: v }))} />
							<div style={grid2}>
								<Field label="تاریخ امضا" type="date" value={form.signed_at ?? ""} onChange={(v) => setForm((f) => ({ ...f, signed_at: v }))} />
								<Field label="تاریخ شروع" type="date" value={form.starts_on ?? ""} onChange={(v) => setForm((f) => ({ ...f, starts_on: v }))} />
							</div>
							<Field label="تاریخ پایان" type="date" value={form.ends_on ?? ""} onChange={(v) => setForm((f) => ({ ...f, ends_on: v }))} />
							<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
								<button type="button" style={cancelBtn} onClick={() => setShowModal(false)}>انصراف</button>
								<button type="submit" style={primaryBtn} disabled={createMut.isPending}>
									{createMut.isPending ? "در حال ذخیره..." : "ایجاد قرارداد"}
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
						<h3 style={{ margin: "0 0 12px", fontSize: 16 }}>حذف قرارداد</h3>
						<p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b7280" }}>آیا مطمئن هستید؟</p>
						<div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
							<button style={cancelBtn} onClick={() => setDeleteConfirm(null)}>انصراف</button>
							<button style={{ ...primaryBtn, background: "#ef4444" }} disabled={deleteMut.isPending}
								onClick={() => deleteMut.mutate(deleteConfirm!)}>
								{deleteMut.isPending ? "در حال حذف..." : "حذف"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
	return (
		<div style={fieldGroup}>
			<label style={labelStyle}>{label}</label>
			<input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
		</div>
	);
}

export default function ContractsPage() {
	return (
		<Suspense fallback={<div style={loadingStyle}>در حال بارگذاری...</div>}>
			<ContractsInner />
		</Suspense>
	);
}

// --------------- Styles ---------------

const wrap: React.CSSProperties = { padding: "24px", maxWidth: 1100, margin: "0 auto" };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 };
const titleStyle: React.CSSProperties = { fontSize: 22, fontWeight: 700, margin: 0 };
const loadingStyle: React.CSSProperties = { textAlign: "center", color: "#6b7280", padding: 40 };
const emptyBox: React.CSSProperties = { textAlign: "center", padding: "60px 0", color: "#9ca3af" };
const tableWrap: React.CSSProperties = { overflowX: "auto", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: React.CSSProperties = { padding: "12px 16px", textAlign: "right", fontSize: 13, color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #f3f4f6", background: "#f9fafb" };
const td: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid #f9fafb", verticalAlign: "middle" };
const badge: React.CSSProperties = { padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 };
const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4, display: "flex", alignItems: "center" };
const pagination: React.CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 };
const pageBtn: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modal: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151" };
const inputStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit", outline: "none" };
const primaryBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
const cancelBtn: React.CSSProperties = { padding: "8px 18px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
