"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, ShieldAlert, X, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { contractsApi, type Contract, type CreateContractReq, type UpdateContractReq } from "@/lib/api/contracts";
import { contractorsApi, type Contractor } from "@/lib/api/contractors";
import { projectsApi, type Project } from "@/lib/api/projects";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import { toJalali, fmtNum } from "@/lib/utils/date";

// ─── role gates ────────────────────────────────────────────────────────────────

const WRITE_ROLES = ["manager", "engineering_head", "finance_head", "juridical_head", "sudoer", "admin"];

// ─── helpers ───────────────────────────────────────────────────────────────────

function bpsToPercent(bps: number): string {
  return bps ? String(bps / 100) : "";
}
function percentToBps(pct: string): number {
  const n = parseFloat(pct);
  return isNaN(n) ? 0 : Math.round(n * 100);
}
function formatDate(iso?: string) { return toJalali(iso); }
function formatMoney(v: string) { return fmtNum(v); }

// ─── searchable comboboxes ──────────────────────────────────────────────────────

function ContractorCombobox({
  value, onChange,
}: { value: string; onChange: (id: string, label: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 300); return () => clearTimeout(t); }, [query]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["contractors-search", debounced],
    queryFn: () => contractorsApi.list(1, 30, debounced || undefined),
    enabled: open,
    staleTime: 10_000,
  });
  const results = data?.data?.data ?? [];

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center">
        <input
          value={value ? label || value.slice(0, 8) + "…" : query}
          onChange={(e) => { setQuery(e.target.value); if (value) onChange("", ""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="جستجوی پیمانکار..."
          className={inputCls}
          dir="rtl"
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => { onChange("", ""); setLabel(""); setQuery(""); }}
            className="absolute left-2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">در حال جستجو...</p>}
          {!isFetching && results.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">نتیجه‌ای یافت نشد</p>}
          {results.map((c: Contractor) => (
            <button key={c.id} type="button"
              onClick={() => { onChange(c.id, c.display_name); setLabel(c.display_name); setQuery(""); setOpen(false); }}
              className={`w-full text-right px-3 py-2 text-sm hover:bg-primary/5 flex items-center justify-between gap-2 ${value === c.id ? "bg-primary/10 font-medium" : ""}`}>
              <span>{c.display_name}</span>
              <span className="font-mono text-xs text-muted-foreground">{c.type === "individual" ? c.national_id : c.tax_id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCombobox({
  value, onChange,
}: { value: string; onChange: (id: string, label: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 300); return () => clearTimeout(t); }, [query]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["projects-search", debounced],
    queryFn: () => projectsApi.list(1, 30, undefined, debounced || undefined),
    enabled: open,
    staleTime: 10_000,
  });
  const results = (data?.data?.data ?? []) as Project[];

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center">
        <input
          value={value ? label || value.slice(0, 8) + "…" : query}
          onChange={(e) => { setQuery(e.target.value); if (value) onChange("", ""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="جستجوی پروژه..."
          className={inputCls}
          dir="rtl"
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => { onChange("", ""); setLabel(""); setQuery(""); }}
            className="absolute left-2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">در حال جستجو...</p>}
          {!isFetching && results.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">نتیجه‌ای یافت نشد</p>}
          {results.map((p: Project) => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p.id, p.name); setLabel(p.name); setQuery(""); setOpen(false); }}
              className={`w-full text-right px-3 py-2 text-sm hover:bg-primary/5 flex items-center justify-between gap-2 ${value === p.id ? "bg-primary/10 font-medium" : ""}`}>
              <span>{p.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── form schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  project_id: z.string().min(1, "پروژه الزامی است"),
  contractor_id: z.string().min(1, "پیمانکار الزامی است"),
  contract_no: z.string().optional(),
  title: z.string().min(1, "عنوان الزامی است"),
  description: z.string().optional(),
  type: z.enum(["lump_sum", "unit_rate", "cost_plus", "time_material"]),
  status: z.enum(["draft", "signed", "active", "closed", "cancelled"]),
  gross_budget: z.string().optional(),
  currency: z.string().max(3).optional(),
  starts_on: z.string().optional(),
  ends_on: z.string().optional(),
  performance_bond_pct: z.string().optional(),
  insurance_rate_pct: z.string().optional(),
  vat_pct: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const defaultValues: FormData = {
  project_id: "",
  contractor_id: "",
  contract_no: "",
  title: "",
  description: "",
  type: "lump_sum",
  status: "draft",
  gross_budget: "",
  currency: "IRR",
  starts_on: "",
  ends_on: "",
  performance_bond_pct: "",
  insurance_rate_pct: "",
  vat_pct: "",
};

function toReq(d: FormData): CreateContractReq {
  return {
    project_id: d.project_id,
    contractor_id: d.contractor_id,
    contract_no: d.contract_no || undefined,
    title: d.title,
    description: d.description || undefined,
    type: d.type,
    status: d.status,
    gross_budget: d.gross_budget || undefined,
    currency: d.currency || "IRR",
    starts_on: d.starts_on || undefined,
    ends_on: d.ends_on || undefined,
    performance_bond_pct_bps: percentToBps(d.performance_bond_pct ?? ""),
    insurance_rate_pct_bps: percentToBps(d.insurance_rate_pct ?? ""),
    vat_pct_bps: percentToBps(d.vat_pct ?? ""),
  };
}

// ─── page ──────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  lump_sum: "مقطوع",
  unit_rate: "واحد بها",
  cost_plus: "هزینه + سود",
  time_material: "زمان و مصالح",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  signed: "امضا شده",
  active: "فعال",
  closed: "بسته",
  cancelled: "لغو شده",
};

export default function ContractsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [editTarget, setEditTarget] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const canWrite = user?.roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ["contracts", page, search],
    queryFn: () => contractsApi.list(page, 20, undefined, search || undefined),
    enabled: canWrite,
  });

  const contracts = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["contracts"] });

  const createForm = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });
  const editForm   = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });

  const createMutation = useMutation({
    mutationFn: async (req: CreateContractReq) => {
      const res = await contractsApi.create(req);
      const contractId = res.data.id;
      for (const file of createFiles.slice(0, 3)) {
        await contractsApi.uploadAttachment(contractId, file);
      }
      return res;
    },
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      createForm.reset(defaultValues);
      setCreateFiles([]);
      toast.success("قرارداد با موفقیت ایجاد شد");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در ایجاد قرارداد"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: UpdateContractReq }) => contractsApi.update(id, req),
    onSuccess: () => { invalidate(); setEditTarget(null); editForm.reset(defaultValues); toast.success("قرارداد با موفقیت ویرایش شد"); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در ویرایش قرارداد"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contractsApi.delete(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success("قرارداد حذف شد"); },
    onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در حذف قرارداد"),
  });

  if (!canWrite) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <ShieldAlert size={48} className="text-status-rejected/50" />
        <p className="text-sm">دسترسی ندارید. این صفحه فقط برای مدیران و سرپرستان قابل مشاهده است.</p>
      </div>
    );
  }

  const openEdit = (c: Contract) => {
    editForm.reset({
      project_id: c.project_id,
      contractor_id: c.contractor_id,
      contract_no: c.contract_no,
      title: c.title,
      description: c.description ?? "",
      type: c.type,
      status: c.status as FormData["status"],
      gross_budget: c.gross_budget ?? "",
      currency: c.currency,
      starts_on: c.starts_on ? c.starts_on.slice(0, 10) : "",
      ends_on: c.ends_on ? c.ends_on.slice(0, 10) : "",
      performance_bond_pct: bpsToPercent(c.performance_bond_pct_bps),
      insurance_rate_pct: bpsToPercent(c.insurance_rate_pct_bps),
      vat_pct: bpsToPercent(c.vat_pct_bps),
    });
    setEditTarget(c);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary">قراردادها</h1>
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="جستجو..."
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
          />
          <button
            onClick={() => { createForm.reset(defaultValues); setCreateOpen(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <Plus size={16} />
            قرارداد جدید
          </button>
        </div>
      </div>

      <DataTable
        columns={[
          { key: "contract_no", header: "شماره قرارداد", render: (r) => <span className="font-mono text-sm font-semibold">{r.contract_no}</span> },
          { key: "title", header: "عنوان" },
          { key: "contractor_name", header: "پیمانکار", render: (r) => <span>{(r as Contract & { contractor_name?: string }).contractor_name || "—"}</span> },
          { key: "project_name", header: "پروژه", render: (r) => <span>{(r as Contract & { project_name?: string }).project_name || "—"}</span> },
          { key: "type", header: "نوع", render: (r) => <span className="text-xs">{TYPE_LABELS[r.type] ?? r.type}</span> },
          { key: "status", header: "وضعیت", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "gross_budget",
            header: "بودجه کل",
            render: (r) => <span className="font-mono text-sm">{formatMoney(r.gross_budget)} {r.currency}</span>,
          },
          { key: "starts_on", header: "شروع", render: (r) => <span className="text-xs">{formatDate(r.starts_on)}</span> },
          { key: "ends_on",   header: "پایان", render: (r) => <span className="text-xs">{formatDate(r.ends_on)}</span> },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Pencil size={12} /> ویرایش
                </button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r.id); }}
                  className="text-xs bg-red-600 rounded-sm px-2 py-0.5 text-amber-50 hover:bg-red-700">
                  حذف
                </button>
              </div>
            ),
          },
        ]}
        data={contracts}
        isLoading={isLoading}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => router.push(`/contracts/${r.id}`)}
        emptyMessage="قراردادی یافت نشد"
      />

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} قرارداد</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">قبلی</button>
            <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">بعدی</button>
          </div>
        </div>
      )}

      {/* Create sheet */}
      <Sheet open={createOpen} onClose={() => { setCreateOpen(false); createForm.reset(defaultValues); setCreateFiles([]); }} title="قرارداد جدید">
        <ContractForm form={createForm} isPending={createMutation.isPending}
          onSubmit={createForm.handleSubmit((d) => createMutation.mutate(toReq(d)))}
          submitLabel="ذخیره"
          files={createFiles}
          onFilesChange={setCreateFiles}
        />
      </Sheet>

      {/* Edit sheet */}
      <Sheet open={!!editTarget} onClose={() => { setEditTarget(null); editForm.reset(defaultValues); }} title="ویرایش قرارداد">
        <ContractForm form={editForm} isPending={updateMutation.isPending}
          onSubmit={editForm.handleSubmit((d) => {
            if (!editTarget) return;
            const req: UpdateContractReq = {
              title: d.title,
              description: d.description || undefined,
              type: d.type,
              status: d.status,
              gross_budget: d.gross_budget || undefined,
              currency: d.currency || "IRR",
              starts_on: d.starts_on || undefined,
              ends_on: d.ends_on || undefined,
              performance_bond_pct_bps: percentToBps(d.performance_bond_pct ?? ""),
              insurance_rate_pct_bps: percentToBps(d.insurance_rate_pct ?? ""),
              vat_pct_bps: percentToBps(d.vat_pct ?? ""),
            };
            updateMutation.mutate({ id: editTarget.id, req });
          })}
          submitLabel="ذخیره تغییرات"
          isEdit
        />
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="حذف قرارداد"
        description="آیا از حذف این قرارداد مطمئن هستید؟ این عمل برگشت‌پذیر نیست."
        confirmLabel="حذف"
        confirmClassName="bg-status-rejected text-white"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── reusable form ──────────────────────────────────────────────────────────────

function ContractForm({
  form, isPending, onSubmit, submitLabel, isEdit = false, files, onFilesChange,
}: {
  form: ReturnType<typeof useForm<FormData>>;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isEdit?: boolean;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
}) {
  const { register, control, formState: { errors } } = form;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!isEdit && (
        <>
          <Field label="پروژه" error={errors.project_id?.message}>
            <Controller control={control} name="project_id"
              render={({ field }) => (
                <ProjectCombobox value={field.value} onChange={(id) => field.onChange(id)} />
              )} />
          </Field>
          <Field label="پیمانکار" error={errors.contractor_id?.message}>
            <Controller control={control} name="contractor_id"
              render={({ field }) => (
                <ContractorCombobox value={field.value} onChange={(id) => field.onChange(id)} />
              )} />
          </Field>
          <Field label="شماره قرارداد (خودکار در صورت خالی ماندن)">
            <input {...register("contract_no")} className={inputCls} dir="ltr" placeholder="مثال: ۱۴۰۴/۱" />
          </Field>
        </>
      )}

      <Field label="عنوان" error={errors.title?.message}>
        <input {...register("title")} className={inputCls} />
      </Field>
      <Field label="توضیحات">
        <textarea {...register("description")} className={`${inputCls} resize-none`} rows={2} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="نوع قرارداد" error={errors.type?.message}>
          <select {...register("type")} className={inputCls}>
            <option value="lump_sum">مقطوع</option>
            <option value="unit_rate">واحد بها</option>
            <option value="cost_plus">هزینه + سود</option>
            <option value="time_material">زمان و مصالح</option>
          </select>
        </Field>
        <Field label="وضعیت" error={errors.status?.message}>
          <select {...register("status")} className={inputCls}>
            <option value="draft">پیش‌نویس</option>
            <option value="signed">امضا شده</option>
            <option value="active">فعال</option>
            <option value="closed">بسته</option>
            <option value="cancelled">لغو شده</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="بودجه کل">
          <input {...register("gross_budget")} className={inputCls} dir="ltr" placeholder="0" />
        </Field>
        <Field label="ارز">
          <input {...register("currency")} className={inputCls} dir="ltr" maxLength={3} placeholder="IRR" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="تاریخ شروع">
          <Controller control={control} name="starts_on"
            render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
          />
        </Field>
        <Field label="تاریخ پایان">
          <Controller control={control} name="ends_on"
            render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
          />
        </Field>
      </div>

      <p className="text-xs font-semibold text-muted-foreground border-t pt-3">پارامترهای مالی (درصد)</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="حسن انجام کار %">
          <input {...register("performance_bond_pct")} className={inputCls} dir="ltr" placeholder="0" />
        </Field>
        <Field label="نرخ بیمه %">
          <input {...register("insurance_rate_pct")} className={inputCls} dir="ltr" placeholder="0" />
        </Field>
        <Field label="مالیات بر ارزش افزوده %">
          <input {...register("vat_pct")} className={inputCls} dir="ltr" placeholder="0" />
        </Field>
      </div>

      {!isEdit && onFilesChange && (
        <div>
          <label className="block text-sm font-medium mb-1">مستندات قرارداد (حداکثر ۳ فایل)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              const merged = [...(files ?? []), ...selected].slice(0, 3);
              onFilesChange(merged);
              e.target.value = "";
            }}
          />
          {(files ?? []).length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 border border-dashed rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition w-full justify-center"
            >
              <Paperclip size={15} />
              افزودن فایل
            </button>
          )}
          {(files ?? []).length > 0 && (
            <ul className="mt-2 space-y-1">
              {(files ?? []).map((f, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-1.5">
                  <span className="truncate max-w-55">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => onFilesChange((files ?? []).filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-status-rejected transition"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
        {isPending ? "در حال ذخیره..." : submitLabel}
      </button>
    </form>
  );
}

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
