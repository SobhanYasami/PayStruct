"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { contractorsApi, type CreateContractorReq } from "@/lib/api/contractors";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { ApiError } from "@/lib/api/client";

const schema = z.object({
  type: z.enum(["individual", "company"]),
  display_name: z.string().min(1, "نام نمایشی الزامی است"),
  legal_name: z.string().min(1, "نام حقوقی الزامی است"),
  tax_id: z.string().optional(),
  registration_no: z.string().optional(),
  national_id: z.string().optional(),
  default_currency: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ContractorsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["contractors", page, search],
    queryFn: () => contractorsApi.list(page, 20, search || undefined),
  });

  const contractors = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "company", default_currency: "IRR" },
  });

  const contractorType = watch("type");

  const createMutation = useMutation({
    mutationFn: (req: CreateContractorReq) => contractorsApi.create(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractors"] });
      setSheetOpen(false);
      reset();
    },
    onError: (e) => setError(e instanceof ApiError ? e.detail : "خطا در ایجاد پیمانکار"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contractorsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractors"] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary">پیمانکاران</h1>
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="جستجو..."
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
          />
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            <Plus size={16} />
            پیمانکار جدید
          </button>
        </div>
      </div>

      <DataTable
        columns={[
          { key: "display_name", header: "نام نمایشی" },
          { key: "legal_name", header: "نام حقوقی" },
          {
            key: "type",
            header: "نوع",
            render: (r) => <StatusBadge status={r.type} />,
          },
          { key: "tax_id", header: "شناسه مالیاتی", render: (r) => <span className="font-mono text-sm">{r.tax_id ?? "—"}</span> },
          { key: "default_currency", header: "ارز پیش‌فرض" },
          {
            key: "rating",
            header: "امتیاز",
            render: (r) => <span>{r.rating != null ? `${r.rating}/5` : "—"}</span>,
          },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(r.id); }}
                className="text-xs text-status-rejected hover:underline"
              >
                حذف
              </button>
            ),
          },
        ]}
        data={contractors}
        isLoading={isLoading}
        keyExtractor={(r) => r.id}
        emptyMessage="پیمانکاری یافت نشد"
      />

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} پیمانکار</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">قبلی</button>
            <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">بعدی</button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); reset(); setError(null); }} title="پیمانکار جدید">
        <form onSubmit={handleSubmit((d) => { setError(null); createMutation.mutate(d); })} className="space-y-4">
          {error && <p className="text-sm text-status-rejected bg-status-rejected/10 rounded px-3 py-2">{error}</p>}

          <Field label="نوع" error={errors.type?.message}>
            <select {...register("type")} className={inputCls}>
              <option value="company">حقوقی</option>
              <option value="individual">حقیقی</option>
            </select>
          </Field>
          <Field label="نام نمایشی" error={errors.display_name?.message}>
            <input {...register("display_name")} className={inputCls} />
          </Field>
          <Field label="نام حقوقی" error={errors.legal_name?.message}>
            <input {...register("legal_name")} className={inputCls} />
          </Field>
          <Field label="شناسه مالیاتی">
            <input {...register("tax_id")} className={inputCls} dir="ltr" />
          </Field>
          {contractorType === "company" && (
            <Field label="شماره ثبت">
              <input {...register("registration_no")} className={inputCls} dir="ltr" />
            </Field>
          )}
          {contractorType === "individual" && (
            <Field label="کد ملی">
              <input {...register("national_id")} className={inputCls} dir="ltr" />
            </Field>
          )}
          <Field label="ارز پیش‌فرض">
            <input {...register("default_currency")} className={inputCls} dir="ltr" maxLength={3} />
          </Field>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {createMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
          </button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="حذف پیمانکار"
        description="آیا از حذف این پیمانکار مطمئن هستید؟"
        confirmLabel="حذف"
        confirmClassName="bg-status-rejected text-white"
        isPending={deleteMutation.isPending}
      />
    </div>
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
