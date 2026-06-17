"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus } from "lucide-react";
import { contractsApi } from "@/lib/api/contracts";
import { statementsApi } from "@/lib/api/interim-statements";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { FinancialSummary } from "@/components/domain/FinancialSummary";
import { bpsToPercent, formatMoney } from "@/lib/utils/money";
import Link from "next/link";
import { toJalali } from "@/lib/utils/date";

type Tab = "statements" | "lineitems" | "info";

const stmtSchema = z.object({
  period_start: z.string().min(1, "تاریخ شروع الزامی است"),
  period_end: z.string().min(1, "تاریخ پایان الزامی است"),
  issued_on: z.string().min(1, "تاریخ صدور الزامی است"),
  notes: z.string().optional(),
});
type StmtForm = z.infer<typeof stmtSchema>;

export default function ContractDetailPage() {
  const { id, cid } = useParams<{ id: string; cid: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("statements");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: contractRes, isLoading: loadingContract } = useQuery({
    queryKey: ["contract", cid],
    queryFn: () => contractsApi.get(cid),
  });

  const { data: statementsRes, isLoading: loadingStatements } = useQuery({
    queryKey: ["statements", cid],
    queryFn: () => statementsApi.list(cid),
    enabled: tab === "statements",
  });

  const { data: lineItemsRes, isLoading: loadingLineItems } = useQuery({
    queryKey: ["line-items", cid],
    queryFn: () => contractsApi.listLineItems(cid),
    enabled: tab === "lineitems",
  });

  const contract = contractRes?.data;
  const statements = statementsRes?.data?.data ?? [];
  const lineItems = Array.isArray(lineItemsRes?.data) ? lineItemsRes.data : [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StmtForm>({
    resolver: zodResolver(stmtSchema),
  });

  const createStatement = useMutation({
    mutationFn: (req: StmtForm) => statementsApi.create(cid, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["statements", cid] });
      setSheetOpen(false);
      reset();
    },
  });

  if (loadingContract) {
    return <div className="text-muted-foreground text-sm p-6">در حال بارگذاری...</div>;
  }

  if (!contract) {
    return <div className="text-status-rejected text-sm p-6">قرارداد یافت نشد</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/projects/${id}`} className="text-muted-foreground hover:text-foreground transition">
          <ArrowRight size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">{contract.title}</h1>
          <p className="text-xs text-muted-foreground">{contract.contract_no}</p>
        </div>
        <StatusBadge status={contract.status} />
        <StatusBadge status={contract.type} />
      </div>

      <div className="bg-white border rounded-xl px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Kpi label="ارزش قرارداد" value={formatMoney(contract.gross_budget, contract.currency)} mono />
        <Kpi label="حسن انجام کار" value={bpsToPercent(contract.retention_pct_bps)} />
        <Kpi label="پیش‌پرداخت" value={bpsToPercent(contract.advance_pct_bps)} />
        <Kpi label="ارزش افزوده" value={bpsToPercent(contract.vat_pct_bps)} />
      </div>

      <div className="flex gap-4 border-b">
        {(["statements", "lineitems", "info"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 transition ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {t === "statements" ? "صورت وضعیت‌ها" : t === "lineitems" ? "آیتم‌های BoQ" : "اطلاعات قرارداد"}
          </button>
        ))}
      </div>

      {tab === "statements" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
            >
              <Plus size={16} />
              صورت وضعیت جدید
            </button>
          </div>
          <DataTable
            columns={[
              { key: "sequence_no", header: "شماره" },
              {
                key: "period",
                header: "دوره",
                render: (r) => (
                  <span className="text-sm">
                    {toJalali(r.period_start)} تا {toJalali(r.period_end)}
                  </span>
                ),
              },
              {
                key: "status",
                header: "وضعیت",
                render: (r) => <StatusBadge status={r.status} />,
              },
              {
                key: "net_amount",
                header: "خالص قابل پرداخت",
                render: (r) => (
                  <span className="font-mono text-sm text-money-in">
                    {r.net_amount ? formatMoney(r.net_amount, r.currency) : "—"}
                  </span>
                ),
              },
              {
                key: "issued_on",
                header: "تاریخ صدور",
                render: (r) => <span className="text-sm">{toJalali(r.issued_on)}</span>,
              },
            ]}
            data={statements}
            isLoading={loadingStatements}
            keyExtractor={(r) => r.id}
            onRowClick={(r) => router.push(`/projects/${id}/contracts/${cid}/statements/${r.id}`)}
            emptyMessage="صورت وضعیتی یافت نشد"
          />
        </div>
      )}

      {tab === "lineitems" && (
        <DataTable
          columns={[
            { key: "sort_order", header: "ردیف" },
            { key: "description", header: "شرح" },
            { key: "unit", header: "واحد" },
            { key: "quantity", header: "مقدار" },
            {
              key: "unit_rate",
              header: "نرخ واحد",
              render: (r) => <span className="font-mono text-sm">{r.unit_rate}</span>,
            },
          ]}
          data={lineItems}
          isLoading={loadingLineItems}
          keyExtractor={(r) => r.id}
          emptyMessage="آیتمی یافت نشد"
        />
      )}

      {tab === "info" && (
        <div className="bg-white border rounded-xl p-6 space-y-4 text-sm">
          <InfoRow label="شرح" value={contract.description ?? "—"} />
          <InfoRow label="تاریخ شروع" value={toJalali(contract.starts_on)} />
          <InfoRow label="تاریخ پایان" value={toJalali(contract.ends_on)} />
          <InfoRow label="بیمه تأمین اجتماعی" value={bpsToPercent(contract.social_security_pct_bps)} />
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); reset(); }} title="صورت وضعیت جدید">
        <form onSubmit={handleSubmit((d) => createStatement.mutate(d))} className="space-y-4">
          <Field label="تاریخ شروع دوره" error={errors.period_start?.message}>
            <input {...register("period_start")} type="date" className={inputCls} dir="ltr" />
          </Field>
          <Field label="تاریخ پایان دوره" error={errors.period_end?.message}>
            <input {...register("period_end")} type="date" className={inputCls} dir="ltr" />
          </Field>
          <Field label="تاریخ صدور" error={errors.issued_on?.message}>
            <input {...register("issued_on")} type="date" className={inputCls} dir="ltr" />
          </Field>
          <Field label="یادداشت">
            <textarea {...register("notes")} className={inputCls} rows={3} />
          </Field>
          <button
            type="submit"
            disabled={createStatement.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {createStatement.isPending ? "در حال ذخیره..." : "ذخیره"}
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
      <span className="text-sm text-muted-foreground w-40 flex-shrink-0">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function Kpi({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-semibold ${mono ? "font-mono text-money-in" : ""}`}>{value}</p>
    </div>
  );
}
