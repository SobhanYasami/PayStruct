"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ShieldAlert } from "lucide-react";
import { employeesApi, type CreateEmployeeReq } from "@/lib/api/employees";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { useAuthStore } from "@/lib/stores/auth";
import { ApiError } from "@/lib/api/client";

const AVAILABLE_ROLES = ["admin", "pm", "finance", "director", "viewer"];

const schema = z.object({
  company_id: z.string().min(1, "شرکت الزامی است"),
  first_name: z.string().min(1, "نام الزامی است"),
  last_name: z.string().min(1, "نام خانوادگی الزامی است"),
  email: z.string().email("ایمیل نامعتبر است"),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر"),
  national_id: z.string().optional(),
  employment_type: z.string().optional(),
  roles: z.array(z.string()).optional(),
});
type FormData = z.infer<typeof schema>;

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const isSuperAdmin = user?.roles?.includes("sudoer") || user?.roles?.includes("admin");

  const { data, isLoading } = useQuery({
    queryKey: ["employees", page],
    queryFn: () => employeesApi.list(page, 20),
    enabled: isSuperAdmin,
  });

  const employees = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { company_id: user?.companyId ?? "" },
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateEmployeeReq) => employeesApi.create(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setSheetOpen(false);
      reset();
      setSelectedRoles([]);
    },
    onError: (e) => setError(e instanceof ApiError ? e.detail : "خطا در ایجاد کارمند"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
        <ShieldAlert size={48} className="text-status-rejected/50" />
        <p className="text-sm">دسترسی ندارید. این صفحه فقط برای ادمین سیستم قابل مشاهده است.</p>
      </div>
    );
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const onSubmit = (data: FormData) => {
    setError(null);
    createMutation.mutate({ ...data, roles: selectedRoles });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">کارمندان</h1>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          <Plus size={16} />
          کارمند جدید
        </button>
      </div>

      <DataTable
        columns={[
          {
            key: "name",
            header: "نام",
            render: (r) => <span>{r.first_name} {r.last_name}</span>,
          },
          { key: "email", header: "ایمیل", render: (r) => <span className="font-mono text-sm">{r.email}</span> },
          {
            key: "roles",
            header: "نقش‌ها",
            render: (r) => (
              <div className="flex gap-1 flex-wrap">
                {r.roles.map((role) => (
                  <span key={role} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                    {role}
                  </span>
                ))}
              </div>
            ),
          },
          {
            key: "active",
            header: "فعال",
            render: (r) => (
              <span className={`text-xs font-medium ${r.active ? "text-status-approved" : "text-status-rejected"}`}>
                {r.active ? "فعال" : "غیرفعال"}
              </span>
            ),
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
        data={employees}
        isLoading={isLoading}
        keyExtractor={(r) => r.id}
        emptyMessage="کارمندی یافت نشد"
      />

      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} کارمند</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">قبلی</button>
            <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">بعدی</button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); reset(); setError(null); setSelectedRoles([]); }} title="کارمند جدید">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && <p className="text-sm text-status-rejected bg-status-rejected/10 rounded px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="نام" error={errors.first_name?.message}>
              <input {...register("first_name")} className={inputCls} />
            </Field>
            <Field label="نام خانوادگی" error={errors.last_name?.message}>
              <input {...register("last_name")} className={inputCls} />
            </Field>
          </div>
          <Field label="ایمیل" error={errors.email?.message}>
            <input {...register("email")} type="email" className={inputCls} dir="ltr" />
          </Field>
          <Field label="رمز عبور" error={errors.password?.message}>
            <input {...register("password")} type="password" className={inputCls} dir="ltr" />
          </Field>
          <Field label="کد ملی">
            <input {...register("national_id")} className={inputCls} dir="ltr" />
          </Field>
          <Field label="نوع استخدام">
            <select {...register("employment_type")} className={inputCls}>
              <option value="full_time">تمام وقت</option>
              <option value="part_time">پاره وقت</option>
              <option value="contractor">پیمانکار</option>
            </select>
          </Field>
          <Field label="نقش‌ها">
            <div className="flex flex-wrap gap-2 mt-1">
              {AVAILABLE_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    selectedRoles.includes(role)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
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
        title="حذف کارمند"
        description="آیا از حذف این کارمند مطمئن هستید؟"
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
