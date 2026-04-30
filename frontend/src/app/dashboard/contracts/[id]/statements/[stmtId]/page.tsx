"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronLeft, Save, Plus } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
	const token = typeof window !== "undefined" ? localStorage.getItem("usr-token") : "";
	return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// --------------- Types ---------------

type WBS = {
	id: string;
	item_code: string;
	description: string;
	unit: string;
	quantity: string;
	unit_price: string;
	total_price: string;
};

type WBSProgress = {
	wbs: WBS;
	done_qty: string;
	remaining_qty: string;
};

type WorksDone = {
	id: string;
	boq_item_code: string;
	description: string;
	unit_code: string;
	quantity: string;
	unit_price: string;
	amount: string;
};

type ExtraWork = {
	id: string;
	line_no: number;
	description: string;
	reason?: string;
	amount: string;
};

type Deduction = {
	id: string;
	line_no: number;
	kind: string;
	description: string;
	rate_pct?: string;
	amount: string;
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
	works_done: WorksDone[];
	extra_works: ExtraWork[];
	deductions: Deduction[];
};

type WorksDoneRow = {
	boq_item_code: string;
	description: string;
	unit_code: string;
	qty: string;
	unit_price: string;
};

// --------------- API ---------------

async function fetchStatement(id: string): Promise<Statement> {
	const res = await fetch(`${API_URL}/statements/${id}`, { headers: authHeaders() });
	if (!res.ok) throw new Error("Failed to fetch statement");
	return (await res.json()).data;
}

async function fetchWBSProgress(contractId: string): Promise<WBSProgress[]> {
	const res = await fetch(`${API_URL}/contracts/${contractId}/wbs-progress`, { headers: authHeaders() });
	if (!res.ok) return [];
	return (await res.json()).data;
}

async function setWorksDone(stmtId: string, items: WorksDoneRow[]): Promise<Statement> {
	const payload = {
		items: items.map((r) => ({
			boq_item_code: r.boq_item_code,
			description: r.description,
			unit_code: r.unit_code,
			quantity: r.qty,
			unit_price: r.unit_price,
		})),
	};
	const res = await fetch(`${API_URL}/statements/${stmtId}/works-done`, {
		method: "PUT",
		headers: authHeaders(),
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to save works done");
	}
	return (await res.json()).data;
}

async function addExtraWork(stmtId: string, body: { description: string; reason: string; amount: string }): Promise<ExtraWork> {
	const res = await fetch(`${API_URL}/statements/${stmtId}/extra-works`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to add extra work");
	}
	return (await res.json()).data;
}

async function addDeduction(stmtId: string, body: { kind: string; description: string; rate_pct?: string; amount: string }): Promise<Deduction> {
	const res = await fetch(`${API_URL}/statements/${stmtId}/deductions`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to add deduction");
	}
	return (await res.json()).data;
}

async function transition(stmtId: string, status: string): Promise<Statement> {
	const res = await fetch(`${API_URL}/statements/${stmtId}/transition`, {
		method: "PATCH",
		headers: authHeaders(),
		body: JSON.stringify({ status }),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Transition failed");
	}
	return (await res.json()).data;
}

// --------------- Labels ---------------

const statusLabel: Record<string, string> = {
	draft: "پیش‌نویس",
	submitted: "ارسال شده",
	approved: "تأیید شده",
	rejected: "رد شده",
	paid: "پرداخت شده",
};
const statusColor: Record<string, { bg: string; color: string }> = {
	draft: { bg: "#f3f4f6", color: "#374151" },
	submitted: { bg: "#fef3c7", color: "#92400e" },
	approved: { bg: "#dcfce7", color: "#166534" },
	rejected: { bg: "#fee2e2", color: "#991b1b" },
	paid: { bg: "#e0e7ff", color: "#3730a3" },
};

const deductionKinds = [
	{ value: "tax", label: "مالیات" },
	{ value: "retention", label: "حسن انجام کار" },
	{ value: "insurance", label: "بیمه" },
	{ value: "penalty", label: "جریمه" },
	{ value: "advance", label: "پیش‌پرداخت" },
	{ value: "other", label: "سایر" },
];

// --------------- Page ---------------

export default function StatementPage() {
	const { id, stmtId } = useParams<{ id: string; stmtId: string }>();
	const qc = useQueryClient();
	const [activeTab, setActiveTab] = useState<"works" | "extra" | "deductions">("works");

	// Works Done rows (keyed by boq_item_code)
	const [wdRows, setWdRows] = useState<Record<string, WorksDoneRow>>({});
	const [wdInitialized, setWdInitialized] = useState(false);

	// Extra work form
	const [ewForm, setEwForm] = useState({ description: "", reason: "", amount: "" });
	const [showEwForm, setShowEwForm] = useState(false);

	// Deduction form
	const [dedForm, setDedForm] = useState({ kind: "tax", description: "", rate_pct: "", amount: "" });
	const [showDedForm, setShowDedForm] = useState(false);

	const { data: stmt, isLoading: loadingStmt } = useQuery({
		queryKey: ["statement", stmtId],
		queryFn: () => fetchStatement(stmtId),
	});

	const { data: wbsProgress = [], isLoading: loadingWBS } = useQuery({
		queryKey: ["wbs-progress", id],
		queryFn: () => fetchWBSProgress(id),
		enabled: !!id,
	});

	// Initialize row state once statement + wbs loaded
	useMemo(() => {
		if (!stmt || !wbsProgress.length || wdInitialized) return;
		const rows: Record<string, WorksDoneRow> = {};
		for (const p of wbsProgress) {
			const existing = stmt.works_done?.find((w) => w.boq_item_code === p.wbs.item_code);
			rows[p.wbs.item_code] = {
				boq_item_code: p.wbs.item_code,
				description: p.wbs.description || p.wbs.item_code,
				unit_code: p.wbs.unit,
				qty: existing ? existing.quantity : "",
				unit_price: existing ? existing.unit_price : p.wbs.unit_price,
			};
		}
		setWdRows(rows);
		setWdInitialized(true);
	}, [stmt, wbsProgress, wdInitialized]);

	const saveMut = useMutation({
		mutationFn: () => setWorksDone(stmtId, Object.values(wdRows)),
		onSuccess: () => {
			toast.success("کارهای انجام‌شده ذخیره شد");
			qc.invalidateQueries({ queryKey: ["statement", stmtId] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const ewMut = useMutation({
		mutationFn: () => addExtraWork(stmtId, ewForm),
		onSuccess: () => {
			toast.success("کار اضافه ثبت شد");
			setEwForm({ description: "", reason: "", amount: "" });
			setShowEwForm(false);
			qc.invalidateQueries({ queryKey: ["statement", stmtId] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const dedMut = useMutation({
		mutationFn: () => addDeduction(stmtId, { ...dedForm, rate_pct: dedForm.rate_pct || undefined }),
		onSuccess: () => {
			toast.success("کسر ثبت شد");
			setDedForm({ kind: "tax", description: "", rate_pct: "", amount: "" });
			setShowDedForm(false);
			qc.invalidateQueries({ queryKey: ["statement", stmtId] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const transitionMut = useMutation({
		mutationFn: (status: string) => transition(stmtId, status),
		onSuccess: (updated) => {
			toast.success(`وضعیت به «${statusLabel[updated.status]}» تغییر کرد`);
			qc.invalidateQueries({ queryKey: ["statement", stmtId] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	if (loadingStmt) return <div style={loading}>در حال بارگذاری...</div>;
	if (!stmt) return <div style={loading}>صورت‌وضعیت یافت نشد</div>;

	const isDraft = stmt.status === "draft";
	const sc = statusColor[stmt.status] ?? { bg: "#f3f4f6", color: "#374151" };

	// Compute live gross from row inputs
	const liveGross = Object.values(wdRows).reduce((sum, r) => {
		const q = parseFloat(r.qty) || 0;
		const p = parseFloat(r.unit_price) || 0;
		return sum + q * p;
	}, 0);
	const savedGross = parseFloat(stmt.gross_amount) || 0;
	const savedExtra = parseFloat(stmt.extra_amount) || 0;
	const savedDed = parseFloat(stmt.deduction_amount) || 0;
	const savedNet = parseFloat(stmt.net_amount) || 0;

	return (
		<div style={wrap} dir="rtl">
			{/* Breadcrumb */}
			<div style={breadcrumb}>
				<Link href={`/dashboard/contracts/${id}`} style={breadLink}>قرارداد</Link>
				<ChevronLeft size={14} color="#9ca3af" />
				<span>صورت‌وضعیت #{stmt.sequence_no}</span>
			</div>

			{/* Header */}
			<div style={headerCard}>
				<div>
					<h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>
						صورت‌وضعیت شماره {stmt.sequence_no}
					</h1>
					<p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
						دوره: {stmt.period_start.slice(0, 10)} تا {stmt.period_end.slice(0, 10)} | صدور: {stmt.issued_on.slice(0, 10)}
					</p>
					{stmt.notes && <p style={{ margin: "8px 0 0", fontSize: 13, color: "#4b5563" }}>{stmt.notes}</p>}
				</div>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
					<span style={{ ...statusBadge, background: sc.bg, color: sc.color }}>
						{statusLabel[stmt.status]}
					</span>
					{/* Transition buttons */}
					{stmt.status === "draft" && (
						<button style={actionBtn("#2563eb")} disabled={transitionMut.isPending}
							onClick={() => transitionMut.mutate("submitted")}>
							ارسال برای تأیید
						</button>
					)}
					{stmt.status === "submitted" && (
						<div style={{ display: "flex", gap: 8 }}>
							<button style={actionBtn("#16a34a")} disabled={transitionMut.isPending}
								onClick={() => transitionMut.mutate("approved")}>
								تأیید
							</button>
							<button style={actionBtn("#ef4444")} disabled={transitionMut.isPending}
								onClick={() => transitionMut.mutate("rejected")}>
								رد
							</button>
						</div>
					)}
					{stmt.status === "approved" && (
						<button style={actionBtn("#7c3aed")} disabled={transitionMut.isPending}
							onClick={() => transitionMut.mutate("paid")}>
							ثبت پرداخت
						</button>
					)}
					{stmt.status === "rejected" && (
						<button style={actionBtn("#6b7280")} disabled={transitionMut.isPending}
							onClick={() => transitionMut.mutate("draft")}>
							بازگشت به پیش‌نویس
						</button>
					)}
				</div>
			</div>

			{/* Financial summary */}
			<div style={summaryRow}>
				<SumCard label="ناخالص" value={isDraft ? liveGross : savedGross} currency={stmt.currency} color="#1e40af" />
				<SumCard label="کارهای اضافه" value={savedExtra} currency={stmt.currency} color="#15803d" />
				<SumCard label="کسورات" value={savedDed} currency={stmt.currency} color="#991b1b" />
				<SumCard label="خالص پرداختنی" value={isDraft ? liveGross + savedExtra - savedDed : savedNet} currency={stmt.currency} color="#374151" large />
			</div>

			{/* Tabs */}
			<div style={tabBar}>
				{(["works", "extra", "deductions"] as const).map((t) => (
					<button key={t} style={{ ...tabBtn, ...(activeTab === t ? tabActive : {}) }}
						onClick={() => setActiveTab(t)}>
						{t === "works" ? `کارهای انجام‌شده (${wbsProgress.length})` :
							t === "extra" ? `کارهای اضافه (${stmt.extra_works?.length ?? 0})` :
								`کسورات (${stmt.deductions?.length ?? 0})`}
					</button>
				))}
			</div>

			{/* Tab 1 — Works Done */}
			{activeTab === "works" && (
				<div>
					{loadingWBS ? (
						<p style={loading}>در حال بارگذاری ردیف‌های WBS...</p>
					) : wbsProgress.length === 0 ? (
						<p style={{ textAlign: "center", color: "#9ca3af", padding: "30px 0" }}>
							هیچ ردیف WBS برای این قرارداد تعریف نشده است.
						</p>
					) : (
						<>
							<div style={tableWrap}>
								<table style={table}>
									<thead>
										<tr>
											<th style={th}>کد ردیف</th>
											<th style={th}>شرح</th>
											<th style={th}>واحد</th>
											<th style={{ ...th, textAlign: "left" }}>مقدار کل</th>
											<th style={{ ...th, textAlign: "left" }}>انجام‌شده قبلی</th>
											<th style={{ ...th, textAlign: "left" }}>باقی‌مانده</th>
											<th style={{ ...th, width: 130, textAlign: "left" }}>این دوره</th>
											<th style={{ ...th, textAlign: "left" }}>مبلغ واحد</th>
											<th style={{ ...th, textAlign: "left" }}>جمع</th>
										</tr>
									</thead>
									<tbody>
										{wbsProgress.map((p) => {
											const row = wdRows[p.wbs.item_code];
											if (!row) return null;
											const remaining = parseFloat(p.remaining_qty) || 0;
											const thisPeriodQty = parseFloat(row.qty) || 0;
											const unitPrice = parseFloat(row.unit_price) || 0;
											const lineAmount = thisPeriodQty * unitPrice;
											const overLimit = thisPeriodQty > remaining + 0.0001;
											return (
												<tr key={p.wbs.item_code}>
													<td style={td}><code style={{ fontSize: 12 }}>{p.wbs.item_code}</code></td>
													<td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
														{p.wbs.description || "—"}
													</td>
													<td style={td}>{p.wbs.unit}</td>
													<td style={{ ...td, textAlign: "left", color: "#374151" }}>{parseFloat(p.wbs.quantity).toLocaleString()}</td>
													<td style={{ ...td, textAlign: "left", color: "#6b7280" }}>{parseFloat(p.done_qty).toLocaleString()}</td>
													<td style={{ ...td, textAlign: "left", color: remaining <= 0 ? "#9ca3af" : "#166534" }}>
														{remaining.toLocaleString()}
													</td>
													<td style={td}>
														{isDraft ? (
															<input
																type="number"
																min="0"
																max={String(remaining)}
																step="any"
																value={row.qty}
																onChange={(e) => {
																	const v = e.target.value;
																	setWdRows((prev) => ({
																		...prev,
																		[p.wbs.item_code]: { ...prev[p.wbs.item_code], qty: v },
																	}));
																}}
																style={{
																	...numInput,
																	borderColor: overLimit ? "#ef4444" : "#d1d5db",
																	background: overLimit ? "#fef2f2" : "#fff",
																}}
															/>
														) : (
															<span style={{ color: "#374151" }}>{thisPeriodQty || "—"}</span>
														)}
													</td>
													<td style={{ ...td, textAlign: "left" }}>{unitPrice.toLocaleString()}</td>
													<td style={{ ...td, textAlign: "left", fontWeight: 600 }}>
														{lineAmount > 0 ? lineAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
							{isDraft && (
								<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
									<button style={primaryBtn} disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
										<Save size={15} />
										{saveMut.isPending ? "در حال ذخیره..." : "ذخیره کارهای انجام‌شده"}
									</button>
								</div>
							)}
						</>
					)}
				</div>
			)}

			{/* Tab 2 — Extra Works */}
			{activeTab === "extra" && (
				<div>
					{(stmt.extra_works ?? []).length > 0 && (
						<div style={tableWrap}>
							<table style={table}>
								<thead>
									<tr>
										<th style={th}>ردیف</th>
										<th style={th}>شرح</th>
										<th style={th}>دلیل</th>
										<th style={{ ...th, textAlign: "left" }}>مبلغ</th>
									</tr>
								</thead>
								<tbody>
									{stmt.extra_works.map((ew) => (
										<tr key={ew.id}>
											<td style={td}>{ew.line_no}</td>
											<td style={td}>{ew.description}</td>
											<td style={td}>{ew.reason || "—"}</td>
											<td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{Number(ew.amount).toLocaleString()}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					{isDraft && (
						<div style={{ marginTop: 14 }}>
							{!showEwForm ? (
								<button style={ghostBtn} onClick={() => setShowEwForm(true)}>
									<Plus size={15} /> افزودن کار اضافه
								</button>
							) : (
								<div style={inlineForm}>
									<h4 style={{ margin: "0 0 12px", fontSize: 14 }}>کار اضافه جدید</h4>
									<Field label="شرح *" value={ewForm.description} onChange={(v) => setEwForm((f) => ({ ...f, description: v }))} />
									<Field label="دلیل" value={ewForm.reason} onChange={(v) => setEwForm((f) => ({ ...f, reason: v }))} />
									<Field label="مبلغ *" value={ewForm.amount} onChange={(v) => setEwForm((f) => ({ ...f, amount: v }))} />
									<div style={{ display: "flex", gap: 10, marginTop: 8 }}>
										<button style={cancelBtn} onClick={() => { setShowEwForm(false); setEwForm({ description: "", reason: "", amount: "" }); }}>انصراف</button>
										<button style={primaryBtn} disabled={ewMut.isPending} onClick={() => ewMut.mutate()}>
											{ewMut.isPending ? "در حال ثبت..." : "ثبت"}
										</button>
									</div>
								</div>
							)}
						</div>
					)}
					{(stmt.extra_works ?? []).length === 0 && !showEwForm && (
						<p style={{ textAlign: "center", color: "#9ca3af", padding: "20px 0" }}>هیچ کار اضافه‌ای ثبت نشده است.</p>
					)}
				</div>
			)}

			{/* Tab 3 — Deductions */}
			{activeTab === "deductions" && (
				<div>
					{(stmt.deductions ?? []).length > 0 && (
						<div style={tableWrap}>
							<table style={table}>
								<thead>
									<tr>
										<th style={th}>ردیف</th>
										<th style={th}>نوع</th>
										<th style={th}>شرح</th>
										<th style={{ ...th, textAlign: "left" }}>درصد</th>
										<th style={{ ...th, textAlign: "left" }}>مبلغ</th>
									</tr>
								</thead>
								<tbody>
									{stmt.deductions.map((d) => (
										<tr key={d.id}>
											<td style={td}>{d.line_no}</td>
											<td style={td}>{deductionKinds.find((k) => k.value === d.kind)?.label ?? d.kind}</td>
											<td style={td}>{d.description}</td>
											<td style={{ ...td, textAlign: "left" }}>{d.rate_pct ? `${d.rate_pct}٪` : "—"}</td>
											<td style={{ ...td, textAlign: "left", fontWeight: 600, color: "#991b1b" }}>{Number(d.amount).toLocaleString()}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
					{isDraft && (
						<div style={{ marginTop: 14 }}>
							{!showDedForm ? (
								<button style={ghostBtn} onClick={() => setShowDedForm(true)}>
									<Plus size={15} /> افزودن کسر
								</button>
							) : (
								<div style={inlineForm}>
									<h4 style={{ margin: "0 0 12px", fontSize: 14 }}>کسر جدید</h4>
									<div style={fieldGroup}>
										<label style={labelStyle}>نوع</label>
										<select style={inputStyle} value={dedForm.kind} onChange={(e) => setDedForm((f) => ({ ...f, kind: e.target.value }))}>
											{deductionKinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
										</select>
									</div>
									<Field label="شرح *" value={dedForm.description} onChange={(v) => setDedForm((f) => ({ ...f, description: v }))} />
									<Field label="درصد (اختیاری)" value={dedForm.rate_pct} onChange={(v) => setDedForm((f) => ({ ...f, rate_pct: v }))} />
									<Field label="مبلغ *" value={dedForm.amount} onChange={(v) => setDedForm((f) => ({ ...f, amount: v }))} />
									<div style={{ display: "flex", gap: 10, marginTop: 8 }}>
										<button style={cancelBtn} onClick={() => { setShowDedForm(false); setDedForm({ kind: "tax", description: "", rate_pct: "", amount: "" }); }}>انصراف</button>
										<button style={primaryBtn} disabled={dedMut.isPending} onClick={() => dedMut.mutate()}>
											{dedMut.isPending ? "در حال ثبت..." : "ثبت"}
										</button>
									</div>
								</div>
							)}
						</div>
					)}
					{(stmt.deductions ?? []).length === 0 && !showDedForm && (
						<p style={{ textAlign: "center", color: "#9ca3af", padding: "20px 0" }}>هیچ کسری ثبت نشده است.</p>
					)}
				</div>
			)}
		</div>
	);
}

// --------------- Sub-components ---------------

function SumCard({ label, value, currency, color, large }: { label: string; value: number; currency: string; color: string; large?: boolean }) {
	return (
		<div style={{ ...sumCard, border: large ? `2px solid ${color}` : "1px solid #e5e7eb" }}>
			<p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>{label}</p>
			<p style={{ margin: 0, fontSize: large ? 18 : 15, fontWeight: 700, color }}>
				{value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
				<span style={{ fontSize: 11, fontWeight: 400, marginRight: 4 }}>{currency}</span>
			</p>
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

const wrap: React.CSSProperties = { padding: "24px", maxWidth: 1100, margin: "0 auto" };
const breadcrumb: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13 };
const breadLink: React.CSSProperties = { color: "#2563eb", textDecoration: "none" };
const headerCard: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 };
const statusBadge: React.CSSProperties = { padding: "4px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600 };
const summaryRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "16px 0" };
const sumCard: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: "14px 18px" };
const tabBar: React.CSSProperties = { display: "flex", gap: 2, borderBottom: "2px solid #e5e7eb", marginBottom: 20 };
const tabBtn: React.CSSProperties = { padding: "10px 18px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#6b7280", fontFamily: "inherit", borderBottom: "2px solid transparent", marginBottom: -2 };
const tabActive: React.CSSProperties = { color: "#2563eb", borderBottomColor: "#2563eb", fontWeight: 600 };
const tableWrap: React.CSSProperties = { overflowX: "auto", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const th: React.CSSProperties = { padding: "11px 14px", textAlign: "right", fontSize: 12, color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #f3f4f6", background: "#f9fafb", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "10px 14px", borderBottom: "1px solid #f9fafb", verticalAlign: "middle" };
const numInput: React.CSSProperties = { width: 110, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit", outline: "none", textAlign: "left" };
const loading: React.CSSProperties = { textAlign: "center", color: "#6b7280", padding: 40 };
const inlineForm: React.CSSProperties = { background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb", padding: 16, display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 };
const fieldGroup: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151" };
const inputStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit", outline: "none" };
const primaryBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
const cancelBtn: React.CSSProperties = { padding: "8px 18px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
const ghostBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", color: "#2563eb", border: "1px dashed #93c5fd", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14 };
const actionBtn = (bg: string): React.CSSProperties => ({
	padding: "7px 16px", background: bg, color: "#fff", border: "none", borderRadius: 7,
	cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
});
