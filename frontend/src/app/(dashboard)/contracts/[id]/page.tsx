"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, Pencil, Trash2, FileUp, FileText, Image as ImageIcon, Trash, Download } from "lucide-react";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  contractsApi,
  type Attachment,
  type ContractLineItem,
  type ContractApprovalEvent,
  type CreateLineItemReq,
  type UpdateLineItemReq,
} from "@/lib/api/contracts";
import { useAuthStore } from "@/lib/stores/auth";
import DocumentViewer from "@/components/domain/DocumentViewer";
import { contractorsApi } from "@/lib/api/contractors";
import { projectsApi } from "@/lib/api/projects";
import { statementsApi, type InterimStatement } from "@/lib/api/interim-statements";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Sheet } from "@/components/ui/Sheet";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { ApiError } from "@/lib/api/client";
import { toJalali, fmtNum, fmtPct } from "@/lib/utils/date";

// ─── document slot definitions ─────────────────────────────────────────────────

const DOC_SLOTS = [
  { key: "full_contract_text", label: "متن کامل قرارداد (PDF)" },
  { key: "bill_of_quantities",  label: "فهرست‌بها (در صورت واحدبها)" },
  { key: "drawings_specs",      label: "نقشه‌ها و مشخصات فنی" },
  { key: "guarantees",          label: "ضمانت‌نامه‌ها" },
  { key: "approved_schedule",   label: "برنامه زمان‌بندی تأییدشده" },
  { key: "signed_contract",     label: "قرارداد امضاشده" },
] as const;

type DocKey = typeof DOC_SLOTS[number]["key"];

// ─── helpers ───────────────────────────────────────────────────────────────────

function bpsToPercent(bps: number): string {
  if (!bps) return "۰٪";
  return `${(bps / 100).toLocaleString("fa-IR")}٪`;
}

function formatMoney(v: string | number | undefined, currency = "IRR"): string {
  const s = fmtNum(v);
  return s === "—" ? "—" : `${s} ${currency}`;
}

function totalLineItem(item: ContractLineItem): string {
  const qty = parseFloat(item.quantity);
  const rate = parseFloat(item.unit_rate);
  if (isNaN(qty) || isNaN(rate)) return "—";
  return (qty * rate).toLocaleString("fa-IR");
}

// ─── statement form schema ──────────────────────────────────────────────────────

const stmtSchema = z.object({
  period_start: z.string().min(1, "تاریخ شروع الزامی است"),
  period_end: z.string().min(1, "تاریخ پایان الزامی است"),
  issued_on: z.string().min(1, "تاریخ صدور الزامی است"),
  notes: z.string().optional(),
});
type StmtForm = z.infer<typeof stmtSchema>;
const stmtDefaults: StmtForm = { period_start: "", period_end: "", issued_on: "", notes: "" };

// ─── WBS form schema ────────────────────────────────────────────────────────────

const wbsSchema = z.object({
  description: z.string().min(1, "شرح الزامی است"),
  unit: z.string().min(1, "واحد الزامی است"),
  quantity: z.string().min(1, "مقدار الزامی است"),
  unit_rate: z.string().min(1, "قیمت واحد الزامی است"),
  currency_code: z.string().length(3).optional(),
  sort_order: z.number().int().optional(),
});
type WbsForm = z.infer<typeof wbsSchema>;

const wbsDefaults: WbsForm = {
  description: "",
  unit: "",
  quantity: "",
  unit_rate: "",
  currency_code: "IRR",
  sort_order: undefined,
};

// ─── approval workflow config ──────────────────────────────────────────────────

const STATUS_ORDER = [
  "draft", "pending_engineering", "pending_finance",
  "pending_legal", "pending_ceo", "ready_to_print", "signed", "active",
];

const APPROVAL_STAGES = [
  { label: "تأیید مهندسی",  role: "engineering_head", pendingStatus: "pending_engineering", action: "approve" },
  { label: "تأیید مالی",    role: "finance_head",      pendingStatus: "pending_finance",      action: "approve" },
  { label: "تأیید حقوقی",   role: "juridical_head",    pendingStatus: "pending_legal",         action: "approve" },
  { label: "تأیید مدیریت",  role: "manager",           pendingStatus: "pending_ceo",           action: "approve" },
  { label: "ثبت امضا",      role: "manager",           pendingStatus: "ready_to_print",        action: "sign" },
  { label: "فعال‌سازی",     role: "manager",           pendingStatus: "signed",                action: "activate" },
] as const;

function stageState(contractStatus: string, pendingStatus: string): "done" | "active" | "pending" {
  const ci = STATUS_ORDER.indexOf(contractStatus);
  const si = STATUS_ORDER.indexOf(pendingStatus);
  if (ci > si) return "done";
  if (ci === si) return "active";
  return "pending";
}

// ─── page ──────────────────────────────────────────────────────────────────────

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const userRoles: string[] = user?.roles ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContractLineItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");

  const [createStmtOpen, setCreateStmtOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const slotInputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

  const { data: contractRes, isLoading: loadingContract } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => contractsApi.get(id),
    enabled: !!id,
  });

  const contract = contractRes?.data;

  const { data: contractorRes } = useQuery({
    queryKey: ["contractor", contract?.contractor_id],
    queryFn: () => contractorsApi.get(contract!.contractor_id),
    enabled: !!contract?.contractor_id,
  });

  const { data: projectRes } = useQuery({
    queryKey: ["project", contract?.project_id],
    queryFn: () => projectsApi.get(contract!.project_id),
    enabled: !!contract?.project_id,
  });

  const { data: lineItemsRes, isLoading: loadingItems } = useQuery({
    queryKey: ["line-items", id],
    queryFn: () => contractsApi.listLineItems(id),
    enabled: !!id,
  });

  const { data: statementsRes, isLoading: loadingStmts } = useQuery({
    queryKey: ["statements", id],
    queryFn: () => statementsApi.list(id, 1, 50),
    enabled: !!id,
  });

  const contractor = contractorRes?.data;
  const project = projectRes?.data;
  const lineItems: ContractLineItem[] = Array.isArray(lineItemsRes?.data)
    ? lineItemsRes.data
    : [];
  const statements: InterimStatement[] = statementsRes?.data?.data ?? [];

  const { data: attachmentsRes } = useQuery({
    queryKey: ["attachments", id],
    queryFn: () => contractsApi.listAttachments(id),
    enabled: !!id,
  });
  const attachments: Attachment[] = Array.isArray(attachmentsRes?.data) ? attachmentsRes.data : [];

  const { data: approvalsRes } = useQuery({
    queryKey: ["contract-approvals", id],
    queryFn: () => contractsApi.listApprovals(id),
    enabled: !!id,
  });
  const approvalEvents: ContractApprovalEvent[] = Array.isArray(approvalsRes?.data) ? approvalsRes.data : [];

  // Editing WBS + docs locked once contract has entered approval or been rejected
  const canEdit = contract?.status === "draft" && approvalEvents.length === 0;
  // Statements only make sense on an active contract
  const canCreateStatement = contract?.status === "active";
  // Signed document upload allowed while waiting for manager to activate
  const canUploadSignedDoc = contract?.status === "ready_to_print" || contract?.status === "signed";

  const transitionMutation = useMutation({
    mutationFn: ({ action, comment }: { action: string; comment: string }) =>
      contractsApi.transition(id, action, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contract", id] });
      qc.invalidateQueries({ queryKey: ["contract-approvals", id] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      setApprovalComment("");
      toast.success("وضعیت قرارداد بروزرسانی شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در تغییر وضعیت"),
  });

  const handleStmtDownload = async (stmtId: string) => {
    try {
      const { blob, filename } = await statementsApi.downloadReport(stmtId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("خطا در دریافت گزارش");
    }
  };

  const invalidateItems = () => qc.invalidateQueries({ queryKey: ["line-items", id] });
  const invalidateStmts = () => qc.invalidateQueries({ queryKey: ["statements", id] });
  const invalidateAttachments = () => qc.invalidateQueries({ queryKey: ["attachments", id] });

  const createForm = useForm<WbsForm>({ resolver: zodResolver(wbsSchema), defaultValues: wbsDefaults });
  const editForm   = useForm<WbsForm>({ resolver: zodResolver(wbsSchema), defaultValues: wbsDefaults });
  const stmtForm   = useForm<StmtForm>({ resolver: zodResolver(stmtSchema), defaultValues: stmtDefaults });

  const uploadMutation = useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: DocKey }) =>
      contractsApi.uploadAttachment(id, file, documentType),
    onSuccess: () => { invalidateAttachments(); toast.success("سند بارگذاری شد"); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در بارگذاری"),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attId: string) => contractsApi.deleteAttachment(attId),
    onSuccess: () => { invalidateAttachments(); toast.success("سند حذف شد"); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateLineItemReq) => contractsApi.createLineItem(id, req),
    onSuccess: () => {
      invalidateItems();
      setCreateOpen(false);
      createForm.reset(wbsDefaults);
      toast.success("آیتم اضافه شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, req }: { itemId: string; req: UpdateLineItemReq }) =>
      contractsApi.updateLineItem(id, itemId, req),
    onSuccess: () => {
      invalidateItems();
      setEditItem(null);
      editForm.reset(wbsDefaults);
      toast.success("آیتم ویرایش شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => contractsApi.deleteLineItem(id, itemId),
    onSuccess: () => {
      invalidateItems();
      setDeleteItemId(null);
      toast.success("آیتم حذف شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const createStmtMutation = useMutation({
    mutationFn: (d: StmtForm) => statementsApi.create(id, {
      period_start: d.period_start,
      period_end: d.period_end,
      issued_on: d.issued_on,
      notes: d.notes || undefined,
    }),
    onSuccess: () => {
      invalidateStmts();
      setCreateStmtOpen(false);
      stmtForm.reset(stmtDefaults);
      toast.success("صورت وضعیت ایجاد شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
  });

  const openEdit = (item: ContractLineItem) => {
    editForm.reset({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      currency_code: item.currency_code,
      sort_order: item.sort_order,
    });
    setEditItem(item);
  };

  const toCreateReq = (d: WbsForm): CreateLineItemReq => ({
    description: d.description,
    unit: d.unit,
    quantity: d.quantity,
    unit_rate: d.unit_rate,
    currency_code: d.currency_code || "IRR",
    sort_order: d.sort_order ?? 0,
  });

  const toUpdateReq = (d: WbsForm): UpdateLineItemReq => ({
    description: d.description,
    unit: d.unit,
    quantity: d.quantity,
    unit_rate: d.unit_rate,
    currency_code: d.currency_code || "IRR",
    sort_order: d.sort_order ?? 0,
  });

  if (loadingContract) {
    return <div className="p-8 text-muted-foreground text-sm">در حال بارگذاری...</div>;
  }
  if (!contract) {
    return <div className="p-8 text-status-rejected text-sm">قرارداد یافت نشد</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/contracts" className="hover:text-foreground transition flex items-center gap-1">
          <ArrowRight size={16} />
          قراردادها
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{contract.contract_no}</span>
      </div>

      {/* ── contract header ── */}
      <div className="bg-white border rounded-xl px-6 py-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-primary">{contract.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{contract.contract_no}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={contract.status} />
            <StatusBadge status={contract.type} />
          </div>
        </div>

        {contract.description && (
          <p className="text-sm text-muted-foreground border-t pt-3">{contract.description}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-4">
          <Kpi label="ارزش ناخالص" value={formatMoney(contract.gross_budget, contract.currency)} mono />
          <Kpi label="تاریخ شروع" value={toJalali(contract.starts_on)} />
          <Kpi label="تاریخ پایان" value={toJalali(contract.ends_on)} />
          <Kpi label="ارز" value={contract.currency} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-4">
          <BpsBadge label="ضمانت حسن انجام" bps={contract.retention_pct_bps} />
          <BpsBadge label="ارزش افزوده" bps={contract.vat_pct_bps} />
          <BpsBadge label="حق بیمه تامین اجتماعی" bps={contract.social_security_pct_bps} />
          <BpsBadge label="پیش‌پرداخت" bps={contract.advance_pct_bps} />
        </div>
      </div>

      {/* ── approval workflow ── */}
      {contract.status !== "active" && contract.status !== "closed" && contract.status !== "cancelled" && (
        <div className="bg-white border rounded-xl px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-primary">گردش کار تأیید</h2>
            {contract.status === "draft" && userRoles.some((r) =>
              ["engineering_head", "finance_head", "juridical_head", "manager"].includes(r)
            ) && (
              <button
                onClick={() => transitionMutation.mutate({ action: "submit", comment: "" })}
                disabled={transitionMutation.isPending}
                className="text-xs bg-status-pm/10 text-status-pm border border-status-pm/30 rounded-lg px-3 py-1.5 hover:bg-status-pm/20 transition disabled:opacity-50"
              >
                ارسال برای تأیید مهندسی
              </button>
            )}
          </div>

          {/* step chain */}
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {APPROVAL_STAGES.map((stage, i) => {
              const state = stageState(contract.status, stage.pendingStatus);
              const approvedEvent = approvalEvents.find(
                (e) => e.from_status === stage.pendingStatus && e.to_status !== "draft"
              );
              return (
                <div key={i} className="flex items-start flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                      ${state === "done" ? "bg-status-approved text-white"
                        : state === "active" ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"}`}>
                      {state === "done" ? "✓" : i + 1}
                    </div>
                    <span className={`text-[10px] text-center leading-tight px-1 ${state === "active" ? "text-primary font-semibold" : state === "done" ? "text-status-approved" : "text-muted-foreground"}`}>
                      {stage.label}
                    </span>
                    {approvedEvent && (
                      <span className="text-[9px] text-muted-foreground text-center leading-tight px-1">
                        {new Date(approvedEvent.created_at).toLocaleDateString("fa-IR")}
                      </span>
                    )}
                  </div>
                  {i < APPROVAL_STAGES.length - 1 && (
                    <div className={`flex-none w-8 h-0.5 mt-4 transition-colors ${state === "done" ? "bg-status-approved" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* action area for current active stage */}
          {APPROVAL_STAGES.map((stage) => {
            if (contract.status !== stage.pendingStatus) return null;
            if (!userRoles.includes(stage.role)) return null;
            const signedAtt = attachments.find((a) => a.document_type === "signed_contract");
            return (
              <div key={stage.pendingStatus} className="mt-4 pt-4 border-t space-y-3">
                {/* Print + upload area for ready_to_print */}
                {stage.action === "sign" && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                      <FileText size={14} className="shrink-0 mt-0.5" />
                      <span>قرارداد را پرینت کنید، بر روی کاغذ امضا نمایید، سند امضاشده را بارگذاری کنید، سپس «ثبت امضا» را بزنید.</span>
                    </div>
                    {signedAtt ? (
                      <div className="flex items-center gap-2 border border-status-approved/40 rounded-lg px-3 py-2 text-xs bg-status-approved/5">
                        <FileText size={13} className="text-status-approved shrink-0" />
                        <span className="flex-1 text-status-approved font-medium truncate">{signedAtt.file_name}</span>
                        <button
                          onClick={() => deleteAttachmentMutation.mutate(signedAtt.id)}
                          className="text-muted-foreground hover:text-status-rejected transition"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          ref={(el) => { slotInputRefs.current["signed_contract"] = el; }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadMutation.mutate({ file, documentType: "signed_contract" });
                            e.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => slotInputRefs.current["signed_contract"]?.click()}
                          disabled={uploadMutation.isPending}
                          className="flex items-center justify-center gap-1.5 w-full text-xs border border-dashed rounded-lg px-3 py-2.5 text-primary hover:bg-primary/5 disabled:opacity-50 transition"
                        >
                          <FileUp size={13} />
                          بارگذاری قرارداد امضاشده
                        </button>
                      </>
                    )}
                  </div>
                )}
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="توضیحات (اختیاری)..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                />
                <div className="flex gap-2">
                  {stage.action === "sign" ? (
                    <button
                      onClick={() => transitionMutation.mutate({ action: "sign", comment: approvalComment })}
                      disabled={transitionMutation.isPending}
                      className="flex-1 bg-status-approved text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {transitionMutation.isPending ? "..." : "ثبت امضا"}
                    </button>
                  ) : stage.action === "activate" ? (
                    <button
                      onClick={() => transitionMutation.mutate({ action: "activate", comment: approvalComment })}
                      disabled={transitionMutation.isPending}
                      className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {transitionMutation.isPending ? "..." : "فعال‌سازی قرارداد"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => transitionMutation.mutate({ action: "approve", comment: approvalComment })}
                        disabled={transitionMutation.isPending}
                        className="flex-1 bg-status-approved text-white rounded-lg py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {transitionMutation.isPending ? "..." : "تأیید"}
                      </button>
                      <button
                        onClick={() => transitionMutation.mutate({ action: "reject", comment: approvalComment })}
                        disabled={transitionMutation.isPending}
                        className="flex-1 bg-status-rejected/10 text-status-rejected border border-status-rejected/30 rounded-lg py-2 text-sm font-semibold hover:bg-status-rejected/20 disabled:opacity-50 transition"
                      >
                        رد
                      </button>
                    </>
                  )}
                  {userRoles.includes("manager") && (
                    <button
                      onClick={() => transitionMutation.mutate({ action: "cancel", comment: approvalComment })}
                      disabled={transitionMutation.isPending}
                      className="px-3 border rounded-lg py-2 text-xs text-muted-foreground hover:text-status-rejected hover:border-status-rejected/30 transition"
                    >
                      لغو قرارداد
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── project & contractor cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="پروژه">
          {project ? (
            <div className="space-y-2 text-sm">
              <Row label="نام" value={project.name} />
              <Row label="کد" value={project.code} mono />
              <Row label="وضعیت" value={<StatusBadge status={project.status} />} />
              <Row label="اولویت" value={project.priority} />
              {project.start_date && <Row label="شروع" value={toJalali(project.start_date)} />}
              {project.end_date && <Row label="پایان" value={toJalali(project.end_date)} />}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          )}
        </InfoCard>

        <InfoCard title="پیمانکار">
          {contractor ? (
            <div className="space-y-2 text-sm">
              <Row label="نام" value={contractor.display_name} />
              <Row label="نوع" value={contractor.type === "individual" ? "حقیقی" : "حقوقی"} />
              {contractor.tax_id && <Row label="شناسه مالیاتی" value={contractor.tax_id} mono />}
              {contractor.national_id && <Row label="کد ملی" value={contractor.national_id} mono />}
              {contractor.registration_no && <Row label="شماره ثبت" value={contractor.registration_no} mono />}
              {contractor.preferential_id && <Row label="کد ترجیحی" value={contractor.preferential_id} mono />}
              <Row label="ارز پیش‌فرض" value={contractor.default_currency} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
          )}
        </InfoCard>
      </div>

      {/* ── WBS / BoQ ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">آیتم‌های قرارداد (WBS / BoQ)</h2>
          {canEdit && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              <Plus size={15} />
              افزودن آیتم
            </button>
          )}
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          {loadingItems ? (
            <div className="p-6 text-center text-sm text-muted-foreground">در حال بارگذاری...</div>
          ) : lineItems.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">آیتمی تعریف نشده است</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-10">#</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">شرح کار</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-20">واحد</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-24">مقدار</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">قیمت واحد</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">جمع</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-20">ارز</th>
                    {canEdit && <th className="w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition">
                      <td className="px-4 py-3 text-muted-foreground">{item.sort_order || idx + 1}</td>
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 font-mono">{item.unit}</td>
                      <td className="px-4 py-3 font-mono">{parseFloat(item.quantity).toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-3 font-mono">{parseFloat(item.unit_rate).toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-3 font-mono text-money-in">{totalLineItem(item)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.currency_code}</td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteItemId(item.id)}
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
                {lineItems.length > 0 && (
                  <tfoot className="bg-muted/30 border-t">
                    <tr>
                      <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold text-right">جمع کل</td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-money-in">
                        {lineItems.reduce((acc, item) => {
                          const qty = parseFloat(item.quantity) || 0;
                          const rate = parseFloat(item.unit_rate) || 0;
                          return acc + qty * rate;
                        }, 0).toLocaleString("fa-IR")}
                      </td>
                      <td colSpan={canEdit ? 2 : 1}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Statements ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">صورت وضعیت‌ها</h2>
          <button
            onClick={() => setCreateStmtOpen(true)}
            disabled={!canCreateStatement}
            title={!canCreateStatement ? "صورت وضعیت فقط برای قراردادهای فعال قابل ایجاد است" : undefined}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={15} />
            صورت وضعیت جدید
          </button>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          {loadingStmts ? (
            <div className="p-6 text-center text-sm text-muted-foreground">در حال بارگذاری...</div>
          ) : statements.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">صورت وضعیتی ثبت نشده است</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-12">شماره</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">دوره</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-28">وضعیت</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-24">پیشرفت قبلی</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-24">پیشرفت کنونی</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-32">مبلغ خالص</th>
                    <th className="w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/contracts/${id}/statements/${s.id}`)}
                      className="border-b last:border-0 hover:bg-muted/20 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono">{s.sequence_no}</td>
                      <td className="px-4 py-3 text-xs">
                        {toJalali(s.period_start)} — {toJalali(s.period_end)}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 font-mono">
                        {fmtPct(s.prev_progress_pct)}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {fmtPct(s.progress_pct)}
                      </td>
                      <td className="px-4 py-3 font-mono text-money-in">
                        {parseFloat(s.net_amount).toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStmtDownload(s.id)}
                          title="دریافت گزارش Excel"
                          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Documents ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">اسناد قرارداد</h2>
          <span className="text-xs text-muted-foreground">{attachments.length} / ۳ فایل</span>
        </div>

        <div className="bg-white border rounded-xl divide-y overflow-hidden">
          {DOC_SLOTS.map(({ key, label }) => {
            const att = attachments.find((a) => a.document_type === key);
            const isSignedSlot = key === "signed_contract";
            const effectiveCanEdit = isSignedSlot ? canUploadSignedDoc : canEdit;
            const canUpload = !att && (isSignedSlot || attachments.length < 3);
            return (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 text-sm text-muted-foreground">{label}</span>
                {att ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewerAttachment(att)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      {att.mime_type.startsWith("image/") ? (
                        <ImageIcon size={13} />
                      ) : (
                        <FileText size={13} />
                      )}
                      <span className="max-w-32 truncate">{att.file_name}</span>
                    </button>
                    {effectiveCanEdit && (
                      <button
                        onClick={() => deleteAttachmentMutation.mutate(att.id)}
                        className="p-1 rounded text-muted-foreground hover:text-status-rejected hover:bg-status-rejected/10 transition"
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                ) : effectiveCanEdit ? (
                  <>
                    <input
                      ref={(el) => { slotInputRefs.current[key] = el; }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadMutation.mutate({ file, documentType: key });
                        e.target.value = "";
                      }}
                    />
                    <button
                      disabled={!canUpload || uploadMutation.isPending}
                      onClick={() => slotInputRefs.current[key]?.click()}
                      className="flex items-center gap-1 text-xs text-primary disabled:text-muted-foreground disabled:cursor-not-allowed hover:underline"
                    >
                      <FileUp size={13} />
                      بارگذاری
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── document viewer modal ── */}
      <DocumentViewer attachment={viewerAttachment} onClose={() => setViewerAttachment(null)} />

      {/* ── create statement sheet ── */}
      <Sheet open={createStmtOpen} onClose={() => { setCreateStmtOpen(false); stmtForm.reset(stmtDefaults); }} title="صورت وضعیت جدید">
        <form onSubmit={stmtForm.handleSubmit((d) => createStmtMutation.mutate(d))} className="space-y-4">
          <Field label="تاریخ شروع دوره" error={stmtForm.formState.errors.period_start?.message}>
            <Controller control={stmtForm.control} name="period_start"
              render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
            />
          </Field>
          <Field label="تاریخ پایان دوره" error={stmtForm.formState.errors.period_end?.message}>
            <Controller control={stmtForm.control} name="period_end"
              render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
            />
          </Field>
          <Field label="تاریخ صدور" error={stmtForm.formState.errors.issued_on?.message}>
            <Controller control={stmtForm.control} name="issued_on"
              render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
            />
          </Field>
          <Field label="یادداشت">
            <textarea {...stmtForm.register("notes")} className={`${inputCls} resize-none`} rows={2} />
          </Field>
          <button
            type="submit"
            disabled={createStmtMutation.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {createStmtMutation.isPending ? "در حال ایجاد..." : "ایجاد صورت وضعیت"}
          </button>
        </form>
      </Sheet>

      {/* ── create WBS sheet ── */}
      <Sheet open={createOpen} onClose={() => { setCreateOpen(false); createForm.reset(wbsDefaults); }} title="افزودن آیتم WBS">
        <WbsForm
          form={createForm}
          isPending={createMutation.isPending}
          onSubmit={createForm.handleSubmit((d) => createMutation.mutate(toCreateReq(d)))}
          submitLabel="افزودن"
        />
      </Sheet>

      {/* ── edit sheet ── */}
      <Sheet open={!!editItem} onClose={() => { setEditItem(null); editForm.reset(wbsDefaults); }} title="ویرایش آیتم WBS">
        <WbsForm
          form={editForm}
          isPending={updateMutation.isPending}
          onSubmit={editForm.handleSubmit((d) => {
            if (!editItem) return;
            updateMutation.mutate({ itemId: editItem.id, req: toUpdateReq(d) });
          })}
          submitLabel="ذخیره تغییرات"
        />
      </Sheet>

      {/* ── delete confirm ── */}
      <ConfirmDialog
        open={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => deleteItemId && deleteMutation.mutate(deleteItemId)}
        title="حذف آیتم"
        description="آیا از حذف این آیتم مطمئن هستید؟"
        confirmLabel="حذف"
        confirmClassName="bg-status-rejected text-white"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── WBS form component ─────────────────────────────────────────────────────────

function WbsForm({
  form, isPending, onSubmit, submitLabel,
}: {
  form: ReturnType<typeof useForm<WbsForm>>;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
}) {
  const { register, formState: { errors } } = form;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="شرح کار" error={errors.description?.message}>
        <textarea {...register("description")} className={`${inputCls} resize-none`} rows={2} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="واحد" error={errors.unit?.message}>
          <input {...register("unit")} className={inputCls} placeholder="m², kg, دستگاه..." dir="ltr" />
        </Field>
        <Field label="ردیف (مرتب‌سازی)">
          <input {...register("sort_order", { valueAsNumber: true })} type="number" className={inputCls} dir="ltr" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="مقدار" error={errors.quantity?.message}>
          <input {...register("quantity")} className={inputCls} dir="ltr" placeholder="0" />
        </Field>
        <Field label="قیمت واحد" error={errors.unit_rate?.message}>
          <input {...register("unit_rate")} className={inputCls} dir="ltr" placeholder="0" />
        </Field>
      </div>
      <Field label="ارز">
        <input {...register("currency_code")} className={inputCls} dir="ltr" maxLength={3} placeholder="IRR" />
      </Field>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
      >
        {isPending ? "در حال ذخیره..." : submitLabel}
      </button>
    </form>
  );
}

// ─── utility components ─────────────────────────────────────────────────────────

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

function Kpi({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-semibold text-sm ${mono ? "font-mono text-money-in" : ""}`}>{value}</p>
    </div>
  );
}

function BpsBadge({ label, bps }: { label: string; bps: number }) {
  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold font-mono">{bpsToPercent(bps)}</p>
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

function Row({ label, value }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-4 items-start">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}
