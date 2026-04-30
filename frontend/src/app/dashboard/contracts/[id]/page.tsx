"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowRight, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

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
	retention_bps: number;
	insurance_rate_bps: number;
	added_value_rate_bps: number;
};

type Statement = {
	id: string;
	contract_id: string;
	sequence_no: number;
	period_start: string;
	period_end: string;
	issued_on: string;
	status: string;
	currency: string;
	gross_amount: string;
	extra_amount: string;
	deduction_amount: string;
	net_amount: string;
	notes?: string;
};

type CreateStatementBody = {
	period_start: string;
	period_end: string;
	issued_on: string;
	notes: string;
};

// --------------- API ---------------

async function fetchContract(id: string): Promise<Contract> {
	const res = await fetch(`${API_URL}/contracts/${id}`, { headers: authHeaders() });
	if (!res.ok) throw new Error("Failed to fetch contract");
	return (await res.json()).data;
}

async function fetchStatements(contractId: string, page: number): Promise<{ items: Statement[]; total: number }> {
	const params = new URLSearchParams({ page: String(page), limit: "20" });
	const res = await fetch(`${API_URL}/contracts/${contractId}/statements?${params}`, { headers: authHeaders() });
	if (!res.ok) throw new Error("Failed to fetch statements");
	const json = await res.json();
	return { items: json.data.data ?? [], total: json.data.total ?? 0 };
}

async function createStatement(contractId: string, body: CreateStatementBody): Promise<Statement> {
	const res = await fetch(`${API_URL}/contracts/${contractId}/statements`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to create statement");
	}
	return (await res.json()).data;
}

async function deleteStatement(id: string): Promise<void> {
	const res = await fetch(`${API_URL}/statements/${id}`, { method: "DELETE", headers: authHeaders() });
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to delete statement");
	}
}

// --------------- Labels ---------------

const stmtStatusLabel: Record<string, string> = {
	draft: "پیش‌نویس",
	submitted: "ارسال شده",
	approved: "تأیید شده",
	rejected: "رد شده",
	paid: "پرداخت شده",
};
const stmtStatusColor: Record<string, { bg: string; color: string }> = {
	draft: { bg: "#f3f4f6", color: "#374151" },
	submitted: { bg: "#fef3c7", color: "#92400e" },
	approved: { bg: "#dcfce7", color: "#166534" },
	rejected: { bg: "#fee2e2", color: "#991b1b" },
	paid: { bg: "#e0e7ff", color: "#3730a3" },
};
const contractStatusColor: Record<string, { bg: string; color: string }> = {
	draft: { bg: "#f3f4f6", color: "#374151" },
	signed: { bg: "#dbeafe", color: "#1e40af" },
	active: { bg: "#dcfce7", color: "#166534" },
	closed: { bg: "#e0e7ff", color: "#3730a3" },
	cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

const emptyForm: CreateStatementBody = {
	period_start: "", period_end: "", issued_on: "", notes: "",
};

// --------------- Page ---------------

export default function ContractDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const qc = useQueryClient();
	const [page, setPage] = useState(1);
	const [showModal, setShowModal] = useState(false);
	const [form, setForm] = useState<CreateStatementBody>(emptyForm);
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	const { data: contract, isLoading: loadingContract, isError } = useQuery({
		queryKey: ["contract", id],
		queryFn: () => fetchContract(id),
	});

	const { data: stmtsData, isLoading: loadingStmts } = useQuery({
		queryKey: ["statements", id, page],
		queryFn: () => fetchStatements(id, page),
		enabled: !!id,
	});

	const createMut = useMutation({
		mutationFn: (body: CreateStatementBody) => createStatement(id, body),
		onSuccess: () => {
			toast.success("صورت‌وضعیت ایجاد شد");
			setShowModal(false);
			setForm(emptyForm);
			qc.invalidateQueries({ queryKey: ["statements", id] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const deleteMut = useMutation({
		mutationFn: deleteStatement,
		onSuccess: () => {
			toast.success("صورت‌وضعیت حذف شد");
			setDeleteConfirm(null);
			qc.invalidateQueries({ queryKey: ["statements", id] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	if (loadingContract) return <div style={loading}>در حال بارگذاری...</div>;
	if (isError || !contract) return <div style={errorStyle}>خطا در دریافت اطلاعات قرارداد</div>;

	const stmts = stmtsData?.items ?? [];
	const total = stmtsData?.total ?? 0;
	const totalPages = Math.ceil(total / 20) || 1;
	const csc = contractStatusColor[contract.status] ?? { bg: "#f3f4f6", color: "#374151" };

	return (
		<div style={wrap} dir="rtl">
			{/* Breadcrumb */}
			<div style={breadcrumb}>
				<Link href="/dashboard/contracts" style={breadLink}>قراردادها</Link>
				<ChevronLeft size={14} color="#9ca3af" />
				<span style={{ color: "#374151" }}>{contract.code}</span>
			</div>

			{/* Contract info card */}
			<div style={card}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
					<div>
						<h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>{contract.title}</h1>
						<code style={{ fontSize: 13, color: "#6b7280" }}>{contract.code}</code>
					</div>
					<span style={{ ...badge, background: csc.bg, color: csc.color, fontSize: 13 }}>
						{contract.status}
					</span>
				</div>
				{contract.description && (
					<p style={{ margin: "14px 0 0", fontSize: 14, color: "#4b5563" }}>{contract.description}</p>
				)}
				<div style={infoGrid}>
					<InfoItem label="مبلغ کل" value={`${Number(contract.total_amount).toLocaleString()} ${contract.currency}`} />
					<InfoItem label="نگهداری" value={`${(contract.retention_bps / 100).toFixed(2)}٪`} />
					<InfoItem label="بیمه" value={`${(contract.insurance_rate_bps / 100).toFixed(2)}٪`} />
					<InfoItem label="ارزش افزوده" value={`${(contract.added_value_rate_bps / 100).toFixed(2)}٪`} />
					{contract.signed_at && <InfoItem label="تاریخ امضا" value={contract.signed_at.slice(0, 10)} />}
					{contract.starts_on && <InfoItem label="تاریخ شروع" value={contract.starts_on.slice(0, 10)} />}
					{contract.ends_on && <InfoItem label="تاریخ پایان" value={contract.ends_on.slice(0, 10)} />}
				</div>
			</div>

			{/* Statements */}
			<div style={{ marginTop: 28 }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
					<h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>صورت‌وضعیت‌ها</h2>
					<button style={primaryBtn} onClick={() => { setForm(emptyForm); setShowModal(true); }}>
						<Plus size={15} /> صورت‌وضعیت جدید
					</button>
				</div>

				{loadingStmts ? (
					<p style={loading}>در حال بارگذاری...</p>
				) : stmts.length === 0 ? (
					<p style={{ textAlign: "center", color: "#9ca3af", padding: "30px 0" }}>
						هنوز صورت‌وضعیتی ثبت نشده است.
					</p>
				) : (
					<div style={tableWrap}>
						<table style={table}>
							<thead>
								<tr>
									{["شماره", "دوره", "وضعیت", "ناخالص", "کسورات", "خالص", "ارز", "عملیات"].map((h) => (
										<th key={h} style={th}>{h}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{stmts.map((s) => {
									const sc = stmtStatusColor[s.status] ?? { bg: "#f3f4f6", color: "#374151" };
									return (
										<tr key={s.id} style={{ cursor: "pointer" }}
											onClick={() => router.push(`/dashboard/contracts/${id}/statements/${s.id}`)}>
											<td style={td}><strong>#{s.sequence_no}</strong></td>
											<td style={td} onClick={(e) => e.stopPropagation()}>
												{s.period_start.slice(0, 10)} — {s.period_end.slice(0, 10)}
											</td>
											<td style={td} onClick={(e) => e.stopPropagation()}>
												<span style={{ ...badge, background: sc.bg, color: sc.color }}>
													{stmtStatusLabel[s.status] ?? s.status}
												</span>
											</td>
											<td style={td}>{Number(s.gross_amount).toLocaleString()}</td>
											<td style={td}>{Number(s.deduction_amount).toLocaleString()}</td>
											<td style={{ ...td, fontWeight: 700, color: "#166534" }}>{Number(s.net_amount).toLocaleString()}</td>
											<td style={td}>{s.currency}</td>
											<td style={td} onClick={(e) => e.stopPropagation()}>
												{s.status === "draft" && (
													<button style={{ ...iconBtn, color: "#ef4444" }} onClick={() => setDeleteConfirm(s.id)}>
														<Trash2 size={15} />
													</button>
												)}
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
			</div>

			{/* Create statement modal */}
			{showModal && (
				<div style={overlay} onClick={() => setShowModal(false)}>
					<div style={modal} onClick={(e) => e.stopPropagation()} dir="rtl">
						<h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>صورت‌وضعیت جدید</h2>
						<form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }}
							style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							<div style={grid2}>
								<Field label="از تاریخ *" type="date" value={form.period_start} onChange={(v) => setForm((f) => ({ ...f, period_start: v }))} />
								<Field label="تا تاریخ *" type="date" value={form.period_end} onChange={(v) => setForm((f) => ({ ...f, period_end: v }))} />
							</div>
							<Field label="تاریخ صدور *" type="date" value={form.issued_on} onChange={(v) => setForm((f) => ({ ...f, issued_on: v }))} />
							<div style={fieldGroup}>
								<label style={labelStyle}>یادداشت</label>
								<textarea
									value={form.notes}
									onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
									style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
								/>
							</div>
							<div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
								<button type="button" style={cancelBtn} onClick={() => setShowModal(false)}>انصراف</button>
								<button type="submit" style={primaryBtn} disabled={createMut.isPending}>
									{createMut.isPending ? "در حال ذخیره..." : "ایجاد"}
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
						<h3 style={{ margin: "0 0 12px" }}>حذف صورت‌وضعیت</h3>
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

function InfoItem({ label, value }: { label: string; value: string }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<span style={{ fontSize: 12, color: "#9ca3af" }}>{label}</span>
			<span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
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

// --------------- Styles ---------------

const wrap: React.CSSProperties = { padding: "24px", maxWidth: 1000, margin: "0 auto" };
const breadcrumb: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13 };
const breadLink: React.CSSProperties = { color: "#2563eb", textDecoration: "none" };
const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 24 };
const infoGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px 24px", marginTop: 20 };
const badge: React.CSSProperties = { padding: "3px 12px", borderRadius: 999, fontWeight: 600 };
const loading: React.CSSProperties = { textAlign: "center", color: "#6b7280", padding: 40 };
const errorStyle: React.CSSProperties = { textAlign: "center", color: "#ef4444", padding: 40 };
const tableWrap: React.CSSProperties = { overflowX: "auto", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: React.CSSProperties = { padding: "12px 16px", textAlign: "right", fontSize: 13, color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #f3f4f6", background: "#f9fafb" };
const td: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid #f9fafb", verticalAlign: "middle" };
const iconBtn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" };
const pagination: React.CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 };
const pageBtn: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modal: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151" };
const inputStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit", outline: "none" };
const primaryBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
const cancelBtn: React.CSSProperties = { padding: "8px 18px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
