"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus } from "lucide-react";
import { projectsApi } from "@/lib/api/projects";
import { contractsApi, type CreateContractReq } from "@/lib/api/contracts";
import { contractorsApi } from "@/lib/api/contractors";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { formatMoney } from "@/lib/utils/money";
import Link from "next/link";

type Tab = "contracts" | "info";

const contractSchema = z.object({
  contractor_id: z.string().min(1, "پیمانکار الزامی است"),
  contract_no: z.string().min(1, "شماره قرارداد الزامی است"),
  title: z.string().min(1, "عنوان الزامی است"),
  type: z.string().optional(),
  contract_value: z.string().optional(),
  currency: z.string().optional(),
  retention_pct_bps: z.number().optional(),
  advance_pct_bps: z.number().optional(),
  vat_pct_bps: z.number().optional(),
  social_security_pct_bps: z.number().optional(),
  starts_on: z.string().optional(),
  ends_on: z.string().optional(),
});
type ContractForm = z.infer<typeof contractSchema>;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("contracts");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: projectRes, isLoading: loadingProject } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id),
  });

  const { data: contractsRes, isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts", id],
    queryFn: () => contractsApi.list(id),
  });

  const { data: contractorsRes } = useQuery({
    queryKey: ["contractors"],
    queryFn: () => contractorsApi.list(1, 100),
  });

  const project = projectRes?.data;
  const contracts = contractsRes?.data?.data ?? [];
  const contractors = contractorsRes?.data?.data ?? [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: { currency: "IRR", type: "lump_sum" },
  });

  const createContract = useMutation({
    mutationFn: (req: CreateContractReq) => contractsApi.create(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contracts", id] });
      setSheetOpen(false);
      reset();
    },
  });

  const onSubmit = (data: ContractForm) => {
    createContract.mutate({ ...data, project_id: id });
  };

  if (loadingProject) {
    return <div className="text-muted-foreground text-sm p-6">در حال بارگذاری...</div>;
  }

  if (!project) {
    return <div className="text-status-rejected text-sm p-6">پروژه یافت نشد</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects" className="text-muted-foreground hover:text-foreground transition">
          <ArrowRight size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">{project.name}</h1>
          <p className="text-xs text-muted-foreground">{project.code}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex gap-4 border-b">
        {(["contracts", "info"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 transition ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {t === "contracts" ? "قراردادها" : "اطلاعات"}
          </button>
        ))}
      </div>

      {tab === "contracts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              <Plus size={16} />
              قرارداد جدید
            </button>
          </div>

          <DataTable
            columns={[
              { key: "contract_no", header: "شماره قرارداد" },
              { key: "title", header: "عنوان" },
              {
                key: "type",
                header: "نوع",
                render: (r) => <StatusBadge status={r.type} />,
              },
              {
                key: "status",
                header: "وضعیت",
                render: (r) => <StatusBadge status={r.status} />,
              },
              {
                key: "contract_value",
                header: "ارزش قرارداد",
                render: (r) => (
                  <span className="font-mono text-sm text-money-in">
                    {formatMoney(r.contract_value, r.currency)}
                  </span>
                ),
              },
              {
                key: "starts_on",
                header: "شروع",
                render: (r) => <span className="text-sm">{r.starts_on?.slice(0, 10) ?? "—"}</span>,
              },
            ]}
            data={contracts}
            isLoading={loadingContracts}
            keyExtractor={(r) => r.id}
            onRowClick={(r) => router.push(`/dashboard/projects/${id}/contracts/${r.id}`)}
            emptyMessage="قراردادی یافت نشد"
          />
        </div>
      )}

      {tab === "info" && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <InfoRow label="کد پروژه" value={project.code} />
          <InfoRow label="توضیحات" value={project.description ?? "—"} />
          <InfoRow label="دسته‌بندی" value={project.category ?? "—"} />
          <InfoRow label="اولویت" value={project.priority} />
          <InfoRow label="بودجه تخمینی" value={project.budget_estimate ? `${project.budget_estimate} ${project.currency}` : "—"} />
          <InfoRow label="تاریخ شروع" value={project.start_date?.slice(0, 10) ?? "—"} />
          <InfoRow label="تاریخ پایان" value={project.end_date?.slice(0, 10) ?? "—"} />
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); reset(); }} title="قرارداد جدید">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="پیمانکار" error={errors.contractor_id?.message}>
            <select {...register("contractor_id")} className={inputCls}>
              <option value="">انتخاب کنید</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name}</option>
              ))}
            </select>
          </Field>
          <Field label="شماره قرارداد" error={errors.contract_no?.message}>
            <input {...register("contract_no")} className={inputCls} dir="ltr" placeholder="C-001" />
          </Field>
          <Field label="عنوان" error={errors.title?.message}>
            <input {...register("title")} className={inputCls} />
          </Field>
          <Field label="نوع قرارداد">
            <select {...register("type")} className={inputCls}>
              <option value="lump_sum">مقطوع</option>
              <option value="unit_rate">واحد بها</option>
              <option value="cost_plus">هزینه به‌علاوه</option>
              <option value="time_material">زمان و مواد</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ارزش قرارداد">
              <input {...register("contract_value")} className={inputCls} dir="ltr" placeholder="0" />
            </Field>
            <Field label="ارز">
              <input {...register("currency")} className={inputCls} dir="ltr" maxLength={3} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="حسن انجام کار (bps)">
              <input {...register("retention_pct_bps")} type="number" className={inputCls} dir="ltr" defaultValue={0} />
            </Field>
            <Field label="پیش‌پرداخت (bps)">
              <input {...register("advance_pct_bps")} type="number" className={inputCls} dir="ltr" defaultValue={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ارزش افزوده (bps)">
              <input {...register("vat_pct_bps")} type="number" className={inputCls} dir="ltr" defaultValue={0} />
            </Field>
            <Field label="بیمه (bps)">
              <input {...register("social_security_pct_bps")} type="number" className={inputCls} dir="ltr" defaultValue={0} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاریخ شروع">
              <input {...register("starts_on")} type="date" className={inputCls} dir="ltr" />
            </Field>
            <Field label="تاریخ پایان">
              <input {...register("ends_on")} type="date" className={inputCls} dir="ltr" />
            </Field>
          </div>
          <button
            type="submit"
            disabled={createContract.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {createContract.isPending ? "در حال ذخیره..." : "ذخیره"}
          </button>
        </form>
      </Sheet>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6">
      <span className="text-sm text-muted-foreground w-36 flex-shrink-0">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
