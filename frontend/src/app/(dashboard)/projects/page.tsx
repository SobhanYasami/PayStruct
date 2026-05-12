"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { projectsApi, type CreateProjectReq } from "@/lib/api/projects";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { ApiError } from "@/lib/api/client";

const STATUS_TABS = [
  { key: "", label: "همه" },
  { key: "planning", label: "برنامه‌ریزی" },
  { key: "active", label: "فعال" },
  { key: "on_hold", label: "متوقف" },
  { key: "completed", label: "تکمیل شده" },
  { key: "cancelled", label: "لغو شده" },
];

const schema = z.object({
  code: z.string().min(1, "کد الزامی است"),
  name: z.string().min(1, "نام الزامی است"),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  budget_estimate: z.string().optional(),
  currency: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ProjectsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", statusFilter, page],
    queryFn: () => projectsApi.list(page, 20, statusFilter || undefined),
  });

  const projects = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateProjectReq) => projectsApi.create(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setSheetOpen(false);
      reset();
    },
    onError: (e) => setError(e instanceof ApiError ? e.detail : "خطا در ایجاد پروژه"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
    },
  });

  const onSubmit = (data: FormData) => {
    setError(null);
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">پروژه‌ها</h1>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus size={16} />
          پروژه جدید
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              statusFilter === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: "code", header: "کد" },
          { key: "name", header: "نام پروژه" },
          {
            key: "status",
            header: "وضعیت",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "priority",
            header: "اولویت",
            render: (r) => <span className="text-sm">{r.priority}</span>,
          },
          {
            key: "budget_estimate",
            header: "بودجه",
            render: (r) => <span className="font-mono text-sm">{r.budget_estimate ? `${r.budget_estimate} ${r.currency}` : "—"}</span>,
          },
          {
            key: "start_date",
            header: "شروع",
            render: (r) => <span className="text-sm">{r.start_date?.slice(0, 10) ?? "—"}</span>,
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
        data={projects}
        isLoading={isLoading}
        keyExtractor={(r) => r.id}
        onRowClick={(r) => router.push(`/dashboard/projects/${r.id}`)}
        emptyMessage="پروژه‌ای یافت نشد"
      />

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} پروژه</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">قبلی</button>
            <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">بعدی</button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); reset(); setError(null); }} title="پروژه جدید">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-status-rejected bg-status-rejected/10 rounded px-3 py-2">{error}</p>}

          <Field label="کد پروژه" error={errors.code?.message}>
            <input {...register("code")} className={inputCls} placeholder="P-001" dir="ltr" />
          </Field>
          <Field label="نام پروژه" error={errors.name?.message}>
            <input {...register("name")} className={inputCls} />
          </Field>
          <Field label="توضیحات">
            <textarea {...register("description")} className={inputCls} rows={2} />
          </Field>
          <Field label="وضعیت">
            <select {...register("status")} className={inputCls}>
              <option value="planning">برنامه‌ریزی</option>
              <option value="active">فعال</option>
              <option value="on_hold">متوقف</option>
              <option value="completed">تکمیل شده</option>
              <option value="cancelled">لغو شده</option>
            </select>
          </Field>
          <Field label="اولویت">
            <select {...register("priority")} className={inputCls}>
              <option value="low">کم</option>
              <option value="medium">متوسط</option>
              <option value="high">زیاد</option>
              <option value="critical">بحرانی</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="بودجه تخمینی">
              <input {...register("budget_estimate")} className={inputCls} dir="ltr" placeholder="0" />
            </Field>
            <Field label="ارز">
              <input {...register("currency")} className={inputCls} dir="ltr" placeholder="IRR" maxLength={3} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاریخ شروع">
              <input {...register("start_date")} type="date" className={inputCls} dir="ltr" />
            </Field>
            <Field label="تاریخ پایان">
              <input {...register("end_date")} type="date" className={inputCls} dir="ltr" />
            </Field>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
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
        title="حذف پروژه"
        description="آیا از حذف این پروژه مطمئن هستید؟ این عمل برگشت‌پذیر نیست."
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
