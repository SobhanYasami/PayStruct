"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, Trash2, Pencil, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  statementsApi,
  type DeductionItem,
  type ExtraWorkItem,
  type WorkDoneItem,
  type UpdateStatementPayload,
} from "@/lib/api/interim-statements";
import { contractsApi, type ContractLineItem } from "@/lib/api/contracts";
import { contractorsApi } from "@/lib/api/contractors";
import { projectsApi } from "@/lib/api/projects";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Sheet } from "@/components/ui/Sheet";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth";
import { toJalali, fmtPct } from "@/lib/utils/date";

// ─── types & helpers ───────────────────────────────────────────────────────────

type Tab = "works" | "extra" | "deductions" | "financial";

const TRANSITIONS: Record<string, { to: string; label: string; roles: string[]; requireComment?: boolean }[]> = {
  draft:           [{ to: "submitted",       label: "ارسال برای بررسی",     roles: ["pm", "admin"] }],
  submitted:       [
    { to: "finance_review", label: "ارسال به مالی",          roles: ["finance", "admin"] },
    { to: "rejected",       label: "رد کردن",                roles: ["finance", "admin"], requireComment: true },
  ],
  finance_review:  [
    { to: "pm_review",      label: "ارسال به مدیر پروژه",   roles: ["pm", "admin"] },
    { to: "rejected",       label: "رد کردن",                roles: ["pm", "admin"], requireComment: true },
  ],
  pm_review:       [
    { to: "director_review",label: "ارسال به مدیر ارشد",    roles: ["director", "admin"] },
    { to: "rejected",       label: "رد کردن",                roles: ["director", "admin"], requireComment: true },
  ],
  director_review: [
    { to: "approved",       label: "تأیید نهایی",            roles: ["director", "admin"] },
    { to: "rejected",       label: "رد کردن",                roles: ["director", "admin"], requireComment: true },
  ],
};

function fmt(v?: string | number, currency?: string): string {
  if (v === undefined || v === null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  const s = n.toLocaleString("fa-IR");
  return currency ? `${s} ${currency}` : s;
}

function pct(v?: string | null): string {
  return fmtPct(v, 2);
}

// ─── form schemas ──────────────────────────────────────────────────────────────

const extraWorkSchema = z.object({
  description: z.string().min(1, "شرح الزامی است"),
  unit: z.string().optional(),
  quantity: z.string().min(1, "مقدار الزامی است"),
  unit_price: z.string().min(1, "قیمت واحد الزامی است"),
  reason: z.string().optional(),
  variation_ref: z.string().optional(),
  approved_by_client: z.boolean().optional(),
  approval_ref: z.string().optional(),
});
type ExtraWorkForm = z.infer<typeof extraWorkSchema>;

const deductionSchema = z.object({
  description: z.string().min(1, "شرح الزامی است"),
  unit: z.string().optional(),
  quantity: z.string().min(1, "مقدار الزامی است"),
  unit_price: z.string().min(1, "قیمت واحد الزامی است"),
});
type DeductionForm = z.infer<typeof deductionSchema>;

const editStmtSchema = z.object({
  period_start: z.string().min(1, "تاریخ شروع الزامی است"),
  period_end: z.string().min(1, "تاریخ پایان الزامی است"),
  issued_on: z.string().min(1, "تاریخ صدور الزامی است"),
  notes: z.string().optional(),
});
type EditStmtForm = z.infer<typeof editStmtSchema>;

// ─── page ──────────────────────────────────────────────────────────────────────

export default function StatementDetailPage() {
  const { id: contractId, sid } = useParams<{ id: string; sid: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<Tab>("works");
  const [addExtraOpen, setAddExtraOpen] = useState(false);
  const [addDeductOpen, setAddDeductOpen] = useState(false);
  const [editDeduct, setEditDeduct] = useState<DeductionItem | null>(null);
  const [deleteExtraId, setDeleteExtraId] = useState<string | null>(null);
  const [deleteDeductId, setDeleteDeductId] = useState<string | null>(null);
  const [transitionComment, setTransitionComment] = useState("");
  const [confirmTransition, setConfirmTransition] = useState<{ to: string; label: string; requireComment?: boolean } | null>(null);

  // Works-done local state: map line_item_id → quantity_done
  const [editStmtOpen, setEditStmtOpen] = useState(false);
  const [worksDoneMap, setWorksDoneMap] = useState<Record<string, string>>({});
  const [worksDirty, setWorksDirty] = useState(false);

  // ── queries ──
  const { data: stmtRes, isLoading: loadingStmt } = useQuery({
    queryKey: ["statement", sid],
    queryFn: () => statementsApi.get(sid),
    enabled: !!sid,
  });

  const stmt = stmtRes?.data;

  const { data: contractRes } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => contractsApi.get(contractId),
    enabled: !!contractId,
  });
  const contract = contractRes?.data;

  const { data: lineItemsRes } = useQuery({
    queryKey: ["line-items", contractId],
    queryFn: () => contractsApi.listLineItems(contractId),
    enabled: !!contractId,
  });
  const lineItems: ContractLineItem[] = Array.isArray(lineItemsRes?.data) ? lineItemsRes.data : [];

  const { data: projectRes } = useQuery({
    queryKey: ["project", contract?.project_id],
    queryFn: () => projectsApi.get(contract!.project_id),
    enabled: !!contract?.project_id,
  });

  const { data: contractorRes } = useQuery({
    queryKey: ["contractor", contract?.contractor_id],
    queryFn: () => contractorsApi.get(contract!.contractor_id),
    enabled: !!contract?.contractor_id,
  });

  const project = projectRes?.data;
  const contractor = contractorRes?.data;

  const workDoneItems: WorkDoneItem[] = stmt?.work_done_items ?? [];
  const extraWorkItems: ExtraWorkItem[] = stmt?.extra_work_items ?? [];
  const deductionItems: DeductionItem[] = stmt?.deduction_items ?? [];

  // Init works-done map from existing items when stmt loads
  const initWorksDoneMap = () => {
    const m: Record<string, string> = {};
    for (const w of workDoneItems) {
      if (w.line_item_id) m[w.line_item_id] = w.quantity;
    }
    return m;
  };

  // ── forms ──
  const extraForm = useForm<ExtraWorkForm>({ resolver: zodResolver(extraWorkSchema), defaultValues: { description: "", unit: "", quantity: "", unit_price: "", reason: "" } });
  const deductForm = useForm<DeductionForm>({ resolver: zodResolver(deductionSchema), defaultValues: { description: "", unit: "", quantity: "", unit_price: "" } });
  const editStmtForm = useForm<EditStmtForm>({ resolver: zodResolver(editStmtSchema), defaultValues: { period_start: "", period_end: "", issued_on: "", notes: "" } });

  const invalidateStmt = () => qc.invalidateQueries({ queryKey: ["statement", sid] });
  const invalidateStmts = () => qc.invalidateQueries({ queryKey: ["statements", contractId] });

  // ── mutations ──
  const updateStmtMutation = useMutation({
    mutationFn: (payload: UpdateStatementPayload) => statementsApi.update(sid, payload),
    onSuccess: (res) => {
      invalidateStmt();
      invalidateStmts();
      setEditStmtOpen(false);
      toast.success("صورت وضعیت ویرایش شد");
      // Re-seed form with saved values
      const d = res.data;
      editStmtForm.reset({
        period_start: d.period_start.slice(0, 10),
        period_end: d.period_end.slice(0, 10),
        issued_on: d.issued_on.slice(0, 10),
        notes: d.notes ?? "",
      });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const worksDoneMutation = useMutation({
    mutationFn: (items: { line_item_id: string; quantity_done: string }[]) =>
      statementsApi.setWorksDone(sid, { items }),
    onSuccess: () => {
      invalidateStmt();
      invalidateStmts();
      setWorksDirty(false);
      toast.success("کارهای انجام شده به‌روز شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const addExtraMutation = useMutation({
    mutationFn: (d: ExtraWorkForm) => statementsApi.addExtraWork(sid, {
      description: d.description,
      unit: d.unit || undefined,
      quantity: d.quantity,
      unit_price: d.unit_price,
      reason: d.reason || undefined,
      variation_ref: d.variation_ref || undefined,
      approved_by_client: d.approved_by_client ?? false,
      approval_ref: d.approval_ref || undefined,
    }),
    onSuccess: () => {
      invalidateStmt();
      invalidateStmts();
      setAddExtraOpen(false);
      extraForm.reset();
      toast.success("کار اضافه اضافه شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const deleteExtraMutation = useMutation({
    mutationFn: (ewId: string) => statementsApi.deleteExtraWork(sid, ewId),
    onSuccess: () => {
      invalidateStmt();
      invalidateStmts();
      setDeleteExtraId(null);
      toast.success("آیتم حذف شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const addDeductMutation = useMutation({
    mutationFn: (d: DeductionForm) => statementsApi.addDeduction(sid, {
      description: d.description,
      unit: d.unit || undefined,
      quantity: d.quantity,
      unit_price: d.unit_price,
    }),
    onSuccess: () => {
      invalidateStmt();
      invalidateStmts();
      setAddDeductOpen(false);
      deductForm.reset();
      toast.success("کسر اضافه شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const updateDeductMutation = useMutation({
    mutationFn: ({ did, d }: { did: string; d: DeductionForm }) => statementsApi.updateDeduction(sid, did, {
      description: d.description,
      unit: d.unit || undefined,
      quantity: d.quantity,
      unit_price: d.unit_price,
    }),
    onSuccess: () => {
      invalidateStmt();
      invalidateStmts();
      setEditDeduct(null);
      deductForm.reset();
      toast.success("کسر ویرایش شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const deleteDeductMutation = useMutation({
    mutationFn: (did: string) => statementsApi.deleteDeduction(sid, did),
    onSuccess: () => {
      invalidateStmt();
      invalidateStmts();
      setDeleteDeductId(null);
      toast.success("کسر حذف شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ to, comment }: { to: string; comment: string }) =>
      statementsApi.transition(sid, { status: to, comment: comment || undefined }),
    onSuccess: () => {
      invalidateStmt();
      invalidateStmts();
      setConfirmTransition(null);
      setTransitionComment("");
      toast.success("وضعیت به‌روز شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  // ── works done save ──
  const saveWorksDone = () => {
    const items = Object.entries(worksDoneMap)
      .filter(([, qty]) => qty && parseFloat(qty) > 0)
      .map(([line_item_id, quantity_done]) => ({ line_item_id, quantity_done }));
    worksDoneMutation.mutate(items);
  };

  // Build works-done display: merge lineItems with workDoneItems
  const getWorkQty = (liId: string): string => {
    if (worksDirty) return worksDoneMap[liId] ?? "";
    const found = workDoneItems.find((w) => w.line_item_id === liId);
    return found ? found.quantity : "";
  };

  const isDraft = stmt?.status === "draft";
  const isCostPlus = contract?.type === "cost_plus";

  // Available transitions for this user
  const userRoles = user?.roles ?? [];
  const availableTransitions = stmt
    ? (TRANSITIONS[stmt.status] ?? []).filter((t) => t.roles.some((r) => userRoles.includes(r)))
    : [];

  if (loadingStmt) {
    return <div className="p-8 text-muted-foreground text-sm">در حال بارگذاری...</div>;
  }
  if (!stmt) {
    return <div className="p-8 text-status-rejected text-sm">صورت وضعیت یافت نشد</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link href="/contracts" className="hover:text-foreground transition flex items-center gap-1">
          <ArrowRight size={16} />
          قراردادها
        </Link>
        <span>/</span>
        <Link href={`/contracts/${contractId}`} className="hover:text-foreground transition">
          {contract?.contract_no ?? contractId.slice(0, 8)}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">صورت وضعیت #{stmt.sequence_no}</span>
      </div>

      {/* ── statement header ── */}
      <div className="bg-white border rounded-xl px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-primary">صورت وضعیت #{stmt.sequence_no}</h1>
              <StatusBadge status={stmt.status} />
              {isDraft && (
                <button
                  onClick={() => {
                    editStmtForm.reset({
                      period_start: stmt.period_start.slice(0, 10),
                      period_end: stmt.period_end.slice(0, 10),
                      issued_on: stmt.issued_on.slice(0, 10),
                      notes: stmt.notes ?? "",
                    });
                    setEditStmtOpen(true);
                  }}
                  title="ویرایش مشخصات صورت وضعیت"
                  className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                >
                  <Settings2 size={15} />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {toJalali(stmt.period_start)} — {toJalali(stmt.period_end)}
            </p>
          </div>
          {availableTransitions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {availableTransitions.map((t) => (
                <button
                  key={t.to}
                  onClick={() => { setConfirmTransition(t); setTransitionComment(""); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    t.to === "rejected"
                      ? "bg-status-rejected/10 text-status-rejected hover:bg-status-rejected/20"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Progress indicators */}
        <div className="grid grid-cols-3 gap-4 mt-5 border-t pt-4">
          <ProgressCard label="پیشرفت قبلی" value={pct(stmt.prev_progress_pct)} />
          <ProgressCard label="پیشرفت کنونی" value={pct(stmt.progress_pct)} highlight />
          <ProgressCard
            label="تغییر این دوره"
            value={stmt.progress_pct && stmt.prev_progress_pct
              ? pct(String(parseFloat(stmt.progress_pct) - parseFloat(stmt.prev_progress_pct)))
              : "—"
            }
          />
        </div>
      </div>

      {/* ── info cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard title="پروژه">
          {project ? (
            <div className="space-y-1.5 text-sm">
              <Row label="نام" value={project.name} />
              <Row label="کد" value={<span className="font-mono">{project.code}</span>} />
              <Row label="وضعیت" value={<StatusBadge status={project.status} />} />
            </div>
          ) : <Skeleton />}
        </InfoCard>

        <InfoCard title="پیمانکار">
          {contractor ? (
            <div className="space-y-1.5 text-sm">
              <Row label="نام" value={contractor.display_name} />
              <Row label="نوع" value={contractor.type === "individual" ? "حقیقی" : "حقوقی"} />
              {contractor.tax_id && <Row label="شناسه مالیاتی" value={<span className="font-mono">{contractor.tax_id}</span>} />}
            </div>
          ) : <Skeleton />}
        </InfoCard>

        <InfoCard title="قرارداد">
          {contract ? (
            <div className="space-y-1.5 text-sm">
              <Row label="شماره" value={<span className="font-mono">{contract.contract_no}</span>} />
              <Row label="ارزش" value={<span className="font-mono text-money-in">{fmt(contract.gross_budget, contract.currency)}</span>} />
              <Row label="ارز" value={contract.currency} />
            </div>
          ) : <Skeleton />}
        </InfoCard>
      </div>

      {/* ── tabs ── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {(["works", "extra", "deductions", "financial"] as Tab[]).filter((t) =>
            isCostPlus ? t !== "works" : true
          ).map((t) => {
            const labels: Record<Tab, string> = {
              works: "کارهای انجام شده",
              extra: isCostPlus ? "هزینه‌های واقعی" : "کارهای اضافه",
              deductions: "کسورات",
              financial: "خلاصه مالی",
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {/* Works Done Tab */}
          {tab === "works" && (
            <div className="space-y-4">
              {lineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">ابتدا آیتم‌های WBS را تعریف کنید</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">#</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">شرح کار</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-20">واحد</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-28">مقدار کل</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">قیمت واحد</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-36">مقدار انجام‌شده</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">مبلغ انجام‌شده</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((li, idx) => {
                          const doneQty = getWorkQty(li.id);
                          const doneAmt = doneQty
                            ? (parseFloat(doneQty) * parseFloat(li.unit_rate)).toLocaleString("fa-IR")
                            : "—";
                          return (
                            <tr key={li.id} className="border-t hover:bg-muted/10 transition">
                              <td className="px-4 py-3 text-muted-foreground">{li.sort_order || idx + 1}</td>
                              <td className="px-4 py-3">{li.description}</td>
                              <td className="px-4 py-3 font-mono">{li.unit}</td>
                              <td className="px-4 py-3 font-mono">{fmt(li.quantity)}</td>
                              <td className="px-4 py-3 font-mono">{fmt(li.unit_rate)}</td>
                              <td className="px-4 py-3">
                                {isDraft ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={worksDirty ? (worksDoneMap[li.id] ?? "") : doneQty}
                                    onChange={(e) => {
                                      if (!worksDirty) {
                                        const init = initWorksDoneMap();
                                        setWorksDoneMap({ ...init, [li.id]: e.target.value });
                                      } else {
                                        setWorksDoneMap((prev) => ({ ...prev, [li.id]: e.target.value }));
                                      }
                                      setWorksDirty(true);
                                    }}
                                    className="w-full border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                                    dir="ltr"
                                  />
                                ) : (
                                  <span className="font-mono">{doneQty || "—"}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono text-money-in">{doneAmt}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {isDraft && (
                    <div className="flex justify-end">
                      <button
                        onClick={saveWorksDone}
                        disabled={!worksDirty || worksDoneMutation.isPending}
                        className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {worksDoneMutation.isPending ? "در حال ذخیره..." : "ذخیره کارهای انجام شده"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Extra Works / Actual Costs Tab */}
          {tab === "extra" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-semibold">{isCostPlus ? "هزینه‌های واقعی" : "کارهای اضافه"}</h3>
                  {isCostPlus && (
                    <p className="text-xs text-muted-foreground mt-0.5">هزینه‌های دستمزد، مصالح، تجهیزات و پیمانکاران جزء</p>
                  )}
                </div>
                {isDraft && (
                  <button
                    onClick={() => setAddExtraOpen(true)}
                    className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition"
                  >
                    <Plus size={14} /> {isCostPlus ? "ثبت هزینه" : "افزودن"}
                  </button>
                )}
              </div>
              {extraWorkItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {isCostPlus ? "هزینه‌ای ثبت نشده است" : "کار اضافه‌ای ثبت نشده است"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">#</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">شرح</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-20">واحد</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-24">مقدار</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">قیمت واحد</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">مبلغ</th>
                        {isDraft && <th className="w-12"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {extraWorkItems.map((ew) => (
                        <tr key={ew.id} className="border-t hover:bg-muted/10 transition">
                          <td className="px-4 py-3 text-muted-foreground">{ew.line_no}</td>
                          <td className="px-4 py-3">{ew.description}</td>
                          <td className="px-4 py-3 font-mono">{ew.unit || "—"}</td>
                          <td className="px-4 py-3 font-mono">{fmt(ew.quantity)}</td>
                          <td className="px-4 py-3 font-mono">{fmt(ew.unit_price)}</td>
                          <td className="px-4 py-3 font-mono text-money-in">{fmt(ew.amount)}</td>
                          {isDraft && (
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setDeleteExtraId(ew.id)}
                                className="p-1.5 rounded hover:bg-status-rejected/10 text-muted-foreground hover:text-status-rejected transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t">
                      <tr>
                        <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold">جمع کارهای اضافه</td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-money-in">
                          {fmt(stmt.extra_amount, stmt.currency)}
                        </td>
                        {isDraft && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Deductions Tab */}
          {tab === "deductions" && (
            <div className="space-y-6">
              {/* Calculated deductions from contract params */}
              <div>
                <h3 className="text-sm font-semibold mb-3">کسورات محاسبه‌شده</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DeductCard label="کسر ضمانت حسن انجام" value={fmt(stmt.retention_amount, stmt.currency)} />
                  <DeductCard label="استرداد پیش‌پرداخت" value={fmt(stmt.advance_recovered, stmt.currency)} />
                  <DeductCard label="ارزش افزوده" value={fmt(stmt.vat_amount, stmt.currency)} plus />
                  <DeductCard label="حق بیمه تامین اجتماعی" value={fmt(stmt.social_security_amount, stmt.currency)} />
                  <DeductCard label="خسارت تأخیر (LD)" value={fmt(stmt.ld_amount, stmt.currency)} />
                </div>
              </div>

              {/* User-provided deductions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">کسورات متفرقه</h3>
                  {isDraft && (
                    <button
                      onClick={() => setAddDeductOpen(true)}
                      className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition"
                    >
                      <Plus size={14} /> افزودن
                    </button>
                  )}
                </div>
                {deductionItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">کسر متفرقه‌ای ثبت نشده است</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">#</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">شرح</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-20">واحد</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-24">مقدار</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">قیمت واحد</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">مبلغ</th>
                          {isDraft && <th className="w-20"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {deductionItems.map((d) => (
                          <tr key={d.id} className="border-t hover:bg-muted/10 transition">
                            <td className="px-4 py-3 text-muted-foreground">{d.line_no}</td>
                            <td className="px-4 py-3">{d.description}</td>
                            <td className="px-4 py-3 font-mono">{d.unit || "—"}</td>
                            <td className="px-4 py-3 font-mono">{fmt(d.quantity)}</td>
                            <td className="px-4 py-3 font-mono">{fmt(d.unit_price)}</td>
                            <td className="px-4 py-3 font-mono text-money-out">{fmt(d.amount)}</td>
                            {isDraft && (
                              <td className="px-4 py-3">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => {
                                      deductForm.reset({ description: d.description, unit: d.unit, quantity: d.quantity, unit_price: d.unit_price });
                                      setEditDeduct(d);
                                    }}
                                    className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteDeductId(d.id)}
                                    className="p-1.5 rounded hover:bg-status-rejected/10 text-muted-foreground hover:text-status-rejected transition"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t">
                        <tr>
                          <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold">جمع کسورات متفرقه</td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-money-out">
                            {fmt(stmt.deduction_amount, stmt.currency)}
                          </td>
                          {isDraft && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Summary Tab */}
          {tab === "financial" && (
            <div className="space-y-4">
              <div className="max-w-md mx-auto space-y-1">
                {isCostPlus ? (
                  <>
                    <FinRow label="هزینه‌های واقعی" value={fmt(stmt.extra_amount, stmt.currency)} />
                    <FinRow label="حق‌الزحمه مدیریت" value={fmt(stmt.gross_amount, stmt.currency)} />
                  </>
                ) : (
                  <>
                    <FinRow label="مبلغ ناخالص کارهای انجام‌شده" value={fmt(stmt.gross_amount, stmt.currency)} />
                    <FinRow label="کارهای اضافه" value={fmt(stmt.extra_amount, stmt.currency)} />
                  </>
                )}
                <FinRow label="جمع کل" value={fmt(String(parseFloat(stmt.gross_amount) + parseFloat(stmt.extra_amount)), stmt.currency)} bold />
                <div className="border-t my-2" />
                <FinRow label="کسر ضمانت حسن انجام" value={`(${fmt(stmt.retention_amount, stmt.currency)})`} negative />
                <FinRow label="استرداد پیش‌پرداخت" value={`(${fmt(stmt.advance_recovered, stmt.currency)})`} negative />
                <FinRow label="حق بیمه تامین اجتماعی" value={`(${fmt(stmt.social_security_amount, stmt.currency)})`} negative />
                <FinRow label="خسارت تأخیر" value={`(${fmt(stmt.ld_amount, stmt.currency)})`} negative />
                <FinRow label="کسورات متفرقه" value={`(${fmt(stmt.deduction_amount, stmt.currency)})`} negative />
                <FinRow label="ارزش افزوده" value={fmt(stmt.vat_amount, stmt.currency)} />
                <div className="border-t my-2" />
                <FinRow label="مبلغ خالص قابل پرداخت" value={fmt(stmt.net_amount, stmt.currency)} bold highlight />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Statement Sheet ── */}
      <Sheet open={editStmtOpen} onClose={() => setEditStmtOpen(false)} title="ویرایش مشخصات صورت وضعیت">
        <form onSubmit={editStmtForm.handleSubmit((d) => updateStmtMutation.mutate({
          period_start: d.period_start,
          period_end: d.period_end,
          issued_on: d.issued_on,
          notes: d.notes || undefined,
        }))} className="space-y-4">
          <Field label="تاریخ شروع دوره" error={editStmtForm.formState.errors.period_start?.message}>
            <input {...editStmtForm.register("period_start")} type="date" className={inputCls} dir="ltr" />
          </Field>
          <Field label="تاریخ پایان دوره" error={editStmtForm.formState.errors.period_end?.message}>
            <input {...editStmtForm.register("period_end")} type="date" className={inputCls} dir="ltr" />
          </Field>
          <Field label="تاریخ صدور" error={editStmtForm.formState.errors.issued_on?.message}>
            <input {...editStmtForm.register("issued_on")} type="date" className={inputCls} dir="ltr" />
          </Field>
          <Field label="یادداشت">
            <textarea {...editStmtForm.register("notes")} className={`${inputCls} resize-none`} rows={2} />
          </Field>
          <button type="submit" disabled={updateStmtMutation.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
            {updateStmtMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>
        </form>
      </Sheet>

      {/* ── Add Extra Work / Actual Cost Sheet ── */}
      <Sheet open={addExtraOpen} onClose={() => { setAddExtraOpen(false); extraForm.reset(); }} title={isCostPlus ? "ثبت هزینه واقعی" : "افزودن کار اضافه"}>
        <form onSubmit={extraForm.handleSubmit((d) => addExtraMutation.mutate(d))} className="space-y-4">
          <Field label="شرح کار" error={extraForm.formState.errors.description?.message}>
            <textarea {...extraForm.register("description")} className={`${inputCls} resize-none`} rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="واحد">
              <input {...extraForm.register("unit")} className={inputCls} dir="ltr" placeholder="m², kg..." />
            </Field>
            <Field label="مقدار" error={extraForm.formState.errors.quantity?.message}>
              <input {...extraForm.register("quantity")} className={inputCls} dir="ltr" placeholder="0" />
            </Field>
          </div>
          <Field label="قیمت واحد" error={extraForm.formState.errors.unit_price?.message}>
            <input {...extraForm.register("unit_price")} className={inputCls} dir="ltr" placeholder="0" />
          </Field>
          <Field label="دلیل">
            <input {...extraForm.register("reason")} className={inputCls} />
          </Field>
          <button type="submit" disabled={addExtraMutation.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
            {addExtraMutation.isPending ? "در حال افزودن..." : "افزودن"}
          </button>
        </form>
      </Sheet>

      {/* ── Add/Edit Deduction Sheet ── */}
      <Sheet
        open={addDeductOpen || !!editDeduct}
        onClose={() => { setAddDeductOpen(false); setEditDeduct(null); deductForm.reset(); }}
        title={editDeduct ? "ویرایش کسر" : "افزودن کسر"}
      >
        <form
          onSubmit={deductForm.handleSubmit((d) => {
            if (editDeduct) {
              updateDeductMutation.mutate({ did: editDeduct.id, d });
            } else {
              addDeductMutation.mutate(d);
            }
          })}
          className="space-y-4"
        >
          <Field label="شرح کسر" error={deductForm.formState.errors.description?.message}>
            <input {...deductForm.register("description")} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="واحد">
              <input {...deductForm.register("unit")} className={inputCls} dir="ltr" />
            </Field>
            <Field label="مقدار" error={deductForm.formState.errors.quantity?.message}>
              <input {...deductForm.register("quantity")} className={inputCls} dir="ltr" placeholder="0" />
            </Field>
          </div>
          <Field label="قیمت واحد" error={deductForm.formState.errors.unit_price?.message}>
            <input {...deductForm.register("unit_price")} className={inputCls} dir="ltr" placeholder="0" />
          </Field>
          <button
            type="submit"
            disabled={addDeductMutation.isPending || updateDeductMutation.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {(addDeductMutation.isPending || updateDeductMutation.isPending)
              ? "در حال ذخیره..."
              : editDeduct ? "ذخیره تغییرات" : "افزودن"}
          </button>
        </form>
      </Sheet>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        open={!!deleteExtraId}
        onClose={() => setDeleteExtraId(null)}
        onConfirm={() => deleteExtraId && deleteExtraMutation.mutate(deleteExtraId)}
        title="حذف کار اضافه"
        description="آیا از حذف این آیتم مطمئن هستید؟"
        confirmLabel="حذف"
        confirmClassName="bg-status-rejected text-white"
        isPending={deleteExtraMutation.isPending}
      />
      <ConfirmDialog
        open={!!deleteDeductId}
        onClose={() => setDeleteDeductId(null)}
        onConfirm={() => deleteDeductId && deleteDeductMutation.mutate(deleteDeductId)}
        title="حذف کسر"
        description="آیا از حذف این کسر مطمئن هستید؟"
        confirmLabel="حذف"
        confirmClassName="bg-status-rejected text-white"
        isPending={deleteDeductMutation.isPending}
      />

      {/* ── Transition Confirm ── */}
      {confirmTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-bold">{confirmTransition.label}</h2>
            <p className="text-sm text-muted-foreground">
              وضعیت صورت وضعیت به <strong>{confirmTransition.to}</strong> تغییر خواهد کرد.
            </p>
            {confirmTransition.requireComment && (
              <div>
                <label className="block text-sm font-medium mb-1">دلیل (الزامی)</label>
                <textarea
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={3}
                  placeholder="توضیح دهید..."
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmTransition(null)}
                className="px-4 py-2 rounded-lg text-sm border hover:bg-muted/40 transition"
              >
                لغو
              </button>
              <button
                disabled={confirmTransition.requireComment && !transitionComment.trim() || transitionMutation.isPending}
                onClick={() => transitionMutation.mutate({ to: confirmTransition.to, comment: transitionComment })}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                  confirmTransition.to === "rejected"
                    ? "bg-status-rejected text-white hover:opacity-90"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {transitionMutation.isPending ? "در حال پردازش..." : "تأیید"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── utility components ────────────────────────────────────────────────────────

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-status-rejected mt-1">{error}</p>}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-xl px-5 py-4">
      <h3 className="text-sm font-semibold text-primary mb-3 border-b pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-muted-foreground shrink-0 w-24 text-xs">{label}</span>
      <span className="flex-1 text-xs">{value}</span>
    </div>
  );
}

function Skeleton() {
  return <div className="h-20 bg-muted/30 rounded animate-pulse" />;
}

function ProgressCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-4 py-3 text-center ${highlight ? "bg-primary/5 border border-primary/20" : "bg-muted/20"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function DeductCard({ label, value, plus }: { label: string; value: string; plus?: boolean }) {
  return (
    <div className="bg-muted/20 rounded-lg px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-semibold font-mono ${plus ? "text-money-in" : "text-money-out"}`}>{value}</p>
    </div>
  );
}

function FinRow({ label, value, bold, negative, highlight }: { label: string; value: string; bold?: boolean; negative?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 px-3 rounded ${highlight ? "bg-primary/5" : ""}`}>
      <span className={`text-sm ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-sm font-mono ${bold ? "font-bold" : ""} ${negative ? "text-money-out" : highlight ? "text-primary" : "text-money-in"}`}>
        {value}
      </span>
    </div>
  );
}
