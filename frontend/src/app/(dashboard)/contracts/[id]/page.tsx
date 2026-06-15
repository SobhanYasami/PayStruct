"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus, Pencil, Trash2, FileUp, FileText, Image, Trash, Download } from "lucide-react";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  contractsApi,
  type Attachment,
  type ContractLineItem,
  type CreateLineItemReq,
  type UpdateLineItemReq,
} from "@/lib/api/contracts";
import DocumentViewer from "@/components/domain/DocumentViewer";
import { contractorsApi } from "@/lib/api/contractors";
import { projectsApi } from "@/lib/api/projects";
import { statementsApi, type InterimStatement } from "@/lib/api/interim-statements";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Sheet } from "@/components/ui/Sheet";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { ApiError } from "@/lib/api/client";
import { toJalali, fmtNum, fmtPct } from "@/lib/utils/date";

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

// ─── page ──────────────────────────────────────────────────────────────────────

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContractLineItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const [createStmtOpen, setCreateStmtOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    mutationFn: (file: File) => contractsApi.uploadAttachment(id, file),
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 border-t pt-4">
          <BpsBadge label="حسن انجام کار" bps={contract.performance_bond_pct_bps} />
          <BpsBadge label="بیمه" bps={contract.insurance_rate_pct_bps} />
          <BpsBadge label="ارزش افزوده" bps={contract.vat_pct_bps} />
          <BpsBadge label="حق بیمه تامین اجتماعی" bps={contract.social_security_pct_bps} />
          <BpsBadge label="پیش‌پرداخت" bps={contract.advance_pct_bps} />
          <BpsBadge label="ضمانت حسن انجام" bps={contract.retention_pct_bps} />
        </div>
      </div>

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
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <Plus size={15} />
            افزودن آیتم
          </button>
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
                    <th className="w-20"></th>
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
                      <td colSpan={2}></td>
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
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition"
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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= 3 || uploadMutation.isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition"
          >
            <FileUp size={15} />
            {uploadMutation.isPending ? "در حال بارگذاری..." : "بارگذاری سند"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {attachments.map((att) => (
            <AttachmentCard
              key={att.id}
              att={att}
              onView={() => setViewerAttachment(att)}
              onDelete={() => deleteAttachmentMutation.mutate(att.id)}
            />
          ))}
          {Array.from({ length: Math.max(0, 3 - attachments.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="border-2 border-dashed border-muted rounded-xl flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground text-sm cursor-pointer hover:border-primary/40 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp size={20} className="opacity-40" />
              <span>بارگذاری سند</span>
            </div>
          ))}
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

function AttachmentCard({
  att,
  onView,
  onDelete,
}: {
  att: Attachment;
  onView: () => void;
  onDelete: () => void;
}) {
  const isImage = att.mime_type.startsWith("image/");
  return (
    <div className="border rounded-xl p-4 flex flex-col gap-3 bg-white hover:shadow-sm transition">
      <div
        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
        onClick={onView}
      >
        {isImage ? (
          <Image size={22} className="shrink-0 text-primary/60" />
        ) : (
          <FileText size={22} className="shrink-0 text-primary/60" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" title={att.file_name}>
            {att.file_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {(att.size_bytes / 1024).toFixed(0)} KB
          </p>
        </div>
      </div>
      <div className="flex gap-2 border-t pt-2">
        <button
          onClick={onView}
          className="flex-1 text-xs text-center text-primary hover:underline"
        >
          مشاهده
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded text-muted-foreground hover:text-status-rejected hover:bg-status-rejected/10 transition"
        >
          <Trash size={13} />
        </button>
      </div>
    </div>
  );
}
