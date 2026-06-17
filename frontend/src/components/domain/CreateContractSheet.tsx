"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Paperclip, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Sheet } from "@/components/ui/Sheet";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import { contractsApi, type CreateContractReq } from "@/lib/api/contracts";
import { projectsApi, type Project } from "@/lib/api/projects";
import { contractorsApi, type Contractor } from "@/lib/api/contractors";
import { ApiError } from "@/lib/api/client";

// ─── helpers ──────────────────────────────────────────────────────────────────

function percentToBps(pct: string): number {
  const n = parseFloat(pct);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

/** Convert Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII 0-9. */
function toAsciiDigits(v: string): string {
  return v
    .replace(/[۰-۹]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x06f0 + 48))
    .replace(/[٠-٩]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48));
}

function formatWithCommas(raw: string): string {
  const [int, dec] = raw.split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

const CURRENCIES = [
  { code: "IRR", label: "ریال ایران (IRR)" },
  { code: "USD", label: "دلار آمریکا (USD)" },
  { code: "EUR", label: "یورو (EUR)" },
  { code: "GBP", label: "پوند انگلیس (GBP)" },
  { code: "AED", label: "درهم امارات (AED)" },
  { code: "SAR", label: "ریال عربستان (SAR)" },
  { code: "CNY", label: "یوان چین (CNY)" },
  { code: "JPY", label: "ین ژاپن (JPY)" },
];

// ─── schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  project_id: z.string().min(1, "پروژه الزامی است"),
  contractor_id: z.string().min(1, "پیمانکار الزامی است"),
  contract_no: z.string().optional(),
  title: z.string().min(1, "عنوان الزامی است"),
  description: z.string().optional(),
  type: z.enum(["lump_sum", "unit_rate", "cost_plus", "construction_management", "design_bid_build", "design_build", "labor_only", "turnkey", "percentage"]),
  status: z.enum(["draft", "signed", "active", "closed", "cancelled"]),
  gross_budget: z.string().optional(),
  currency: z.string().max(3).optional(),
  starts_on: z.string().optional(),
  ends_on: z.string().optional(),
  retention_pct: z.string().optional().refine((v) => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 100), { message: "باید بین ۰ تا ۱۰۰ باشد" }),
  advance_pct: z.string().optional().refine((v) => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 100), { message: "باید بین ۰ تا ۱۰۰ باشد" }),
  vat_pct: z.string().optional().refine((v) => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 100), { message: "باید بین ۰ تا ۱۰۰ باشد" }),
  social_security_pct: z.string().optional().refine((v) => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 100), { message: "باید بین ۰ تا ۱۰۰ باشد" }),
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
  retention_pct: "",
  advance_pct: "",
  vat_pct: "",
  social_security_pct: "",
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
    retention_pct_bps: percentToBps(d.retention_pct ?? ""),
    advance_pct_bps: percentToBps(d.advance_pct ?? ""),
    vat_pct_bps: percentToBps(d.vat_pct ?? ""),
    social_security_pct_bps: percentToBps(d.social_security_pct ?? ""),
  };
}

// ─── comboboxes ───────────────────────────────────────────────────────────────

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

/** Comma-separated budget input that enforces English digits. */
function BudgetInput({ value, onChange }: { value: string; onChange(v: string): void }) {
  const [display, setDisplay] = useState(() => (value ? formatWithCommas(value) : ""));

  useEffect(() => {
    // Sync when form resets (value cleared externally)
    if (!value) setDisplay("");
  }, [value]);

  return (
    <input
      value={display}
      inputMode="numeric"
      dir="ltr"
      placeholder="0"
      className={inputCls}
      onChange={(e) => {
        const ascii = toAsciiDigits(e.target.value);
        const raw = ascii.replace(/[^0-9.]/g, "");
        setDisplay(raw ? formatWithCommas(raw) : "");
        onChange(raw);
      }}
    />
  );
}

/** Percentage input that enforces English digits and strips non-numeric chars. */
function PctInput({
  value,
  onChange,
  onBlur,
  name,
}: {
  value: string;
  onChange(v: string): void;
  onBlur(): void;
  name: string;
}) {
  return (
    <input
      name={name}
      value={value}
      onBlur={onBlur}
      inputMode="decimal"
      dir="ltr"
      placeholder="0"
      className={inputCls}
      onChange={(e) => {
        const normalized = toAsciiDigits(e.target.value).replace(/[^0-9.]/g, "");
        onChange(normalized);
      }}
    />
  );
}

function ActiveProjectCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["projects-active-search", debounced],
    queryFn: () => projectsApi.list(1, 30, "active", debounced || undefined),
    enabled: open,
    staleTime: 10_000,
  });
  const results = (data?.data?.data ?? []) as Project[];

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center">
        <input
          value={value ? label || value.slice(0, 8) + "…" : query}
          onChange={(e) => { setQuery(e.target.value); if (value) onChange(""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="جستجوی پروژه فعال..."
          className={inputCls}
          dir="rtl"
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => { onChange(""); setLabel(""); setQuery(""); }}
            className="absolute left-2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">در حال جستجو...</p>}
          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">پروژه فعالی یافت نشد</p>
          )}
          {results.map((p) => (
            <button key={p.id} type="button"
              onClick={() => { onChange(p.id); setLabel(p.name); setQuery(""); setOpen(false); }}
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

function ContractorCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
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
          onChange={(e) => { setQuery(e.target.value); if (value) onChange(""); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="جستجوی پیمانکار..."
          className={inputCls}
          dir="rtl"
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => { onChange(""); setLabel(""); setQuery(""); }}
            className="absolute left-2 text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">در حال جستجو...</p>}
          {!isFetching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">نتیجه‌ای یافت نشد</p>
          )}
          {results.map((c: Contractor) => (
            <button key={c.id} type="button"
              onClick={() => { onChange(c.id); setLabel(c.display_name); setQuery(""); setOpen(false); }}
              className={`w-full text-right px-3 py-2 text-sm hover:bg-primary/5 flex items-center justify-between gap-2 ${value === c.id ? "bg-primary/10 font-medium" : ""}`}>
              <span>{c.display_name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {c.type === "individual" ? c.national_id : c.tax_id}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-status-rejected mt-1">{error}</p>}
    </div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export function CreateContractSheet({
  open,
  onClose,
  defaultProjectId,
  onSuccess,
}: {
  open: boolean;
  onClose(): void;
  defaultProjectId?: string;
  onSuccess?(): void;
}) {
  const qc = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });
  const { register, control, formState: { errors }, handleSubmit, reset } = form;

  const { data: projectRes } = useQuery({
    queryKey: ["project", defaultProjectId],
    queryFn: () => projectsApi.get(defaultProjectId!),
    enabled: !!defaultProjectId,
  });
  const lockedProject = projectRes?.data;
  const projectNotActive = !!defaultProjectId && !!lockedProject && lockedProject.status !== "active";

  useEffect(() => {
    if (open) {
      reset({ ...defaultValues, project_id: defaultProjectId ?? "" });
      setFiles([]);
    }
  }, [open, defaultProjectId, reset]);

  const mutation = useMutation({
    mutationFn: async (req: CreateContractReq) => {
      const res = await contractsApi.create(req);
      for (const file of files.slice(0, 3)) {
        await contractsApi.uploadAttachment(res.data.id, file);
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts"] });
      toast.success("قرارداد با موفقیت ایجاد شد");
      onSuccess?.();
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در ایجاد قرارداد"),
  });

  const handleClose = () => {
    reset(defaultValues);
    setFiles([]);
    onClose();
  };

  return (
    <Sheet open={open} onClose={handleClose} title="قرارداد جدید">
      {projectNotActive && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0" />
          <span>ایجاد قرارداد فقط برای پروژه‌های <strong>فعال</strong> امکان‌پذیر است.</span>
        </div>
      )}

      <form onSubmit={handleSubmit((d) => mutation.mutate(toReq(d)))} className="space-y-4">
        {defaultProjectId ? (
          lockedProject && (
            <div className="bg-muted/40 rounded-lg px-3 py-2.5 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">پروژه:</span>
              <span className="font-medium">{lockedProject.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{lockedProject.code}</span>
            </div>
          )
        ) : (
          <Field label="پروژه" error={errors.project_id?.message}>
            <Controller control={control} name="project_id"
              render={({ field }) => (
                <ActiveProjectCombobox value={field.value} onChange={(id) => field.onChange(id)} />
              )} />
          </Field>
        )}

        <Field label="پیمانکار" error={errors.contractor_id?.message}>
          <Controller control={control} name="contractor_id"
            render={({ field }) => (
              <ContractorCombobox value={field.value} onChange={(id) => field.onChange(id)} />
            )} />
        </Field>

        <Field label="شماره قرارداد (خودکار در صورت خالی ماندن)">
          <input {...register("contract_no")} className={inputCls} dir="ltr" placeholder="مثال: ۱۴۰۴/۱" />
        </Field>

        <Field label="عنوان" error={errors.title?.message}>
          <input {...register("title")} className={inputCls} />
        </Field>

        <Field label="توضیحات">
          <textarea {...register("description")} className={`${inputCls} resize-none`} rows={2} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="نوع قرارداد" error={errors.type?.message}>
            <select {...register("type")} className={inputCls}>
              <optgroup label="بر اساس نحوه پرداخت">
                <option value="lump_sum">مقطوع (Lump Sum)</option>
                <option value="unit_rate">فهرست‌بها (Unit Price)</option>
                <option value="cost_plus">امانی (Cost-Plus)</option>
              </optgroup>
              <optgroup label="بر اساس روش اجرا">
                <option value="construction_management">مدیریت پیمان</option>
                <option value="design_bid_build">طراحی-مناقصه-ساخت (DBB)</option>
                <option value="design_build">طراحی-ساخت / EPC</option>
              </optgroup>
              <optgroup label="بر اساس نحوه واگذاری">
                <option value="labor_only">پیمانکاری دستمزدی</option>
                <option value="turnkey">کلید در دست (Turnkey)</option>
                <option value="percentage">پیمانکاری درصدی</option>
              </optgroup>
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
            <Controller control={control} name="gross_budget"
              render={({ field }) => (
                <BudgetInput value={field.value ?? ""} onChange={field.onChange} />
              )} />
          </Field>
          <Field label="ارز">
            <select {...register("currency")} className={inputCls} dir="ltr">
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="تاریخ شروع">
            <Controller control={control} name="starts_on"
              render={({ field }) => (
                <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />
              )} />
          </Field>
          <Field label="تاریخ پایان">
            <Controller control={control} name="ends_on"
              render={({ field }) => (
                <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />
              )} />
          </Field>
        </div>

        <p className="text-xs font-semibold text-muted-foreground border-t pt-3">پارامترهای مالی (درصد)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ضمانت حسن انجام %">
            <Controller control={control} name="retention_pct"
              render={({ field }) => (
                <PctInput value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
              )} />
          </Field>
          <Field label="پیش‌پرداخت %">
            <Controller control={control} name="advance_pct"
              render={({ field }) => (
                <PctInput value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
              )} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="مالیات بر ارزش افزوده %">
            <Controller control={control} name="vat_pct"
              render={({ field }) => (
                <PctInput value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
              )} />
          </Field>
          <Field label="حق بیمه تامین اجتماعی %">
            <Controller control={control} name="social_security_pct"
              render={({ field }) => (
                <PctInput value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
              )} />
          </Field>
        </div>

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
              setFiles((prev) => [...prev, ...selected].slice(0, 3));
              e.target.value = "";
            }}
          />
          {files.length < 3 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 border border-dashed rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition w-full justify-center"
            >
              <Paperclip size={15} />
              افزودن فایل
            </button>
          )}
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-1.5">
                  <span className="truncate max-w-55">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-status-rejected transition"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || projectNotActive}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
        >
          {mutation.isPending ? "در حال ذخیره..." : "ذخیره"}
        </button>
      </form>
    </Sheet>
  );
}
