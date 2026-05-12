"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Plus } from "lucide-react";
import {
  statementsApi,
  type WorkDoneItem,
  type ExtraWorkItem,
} from "@/lib/api/interim-statements";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { FinancialSummary } from "@/components/domain/FinancialSummary";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { useAuthStore } from "@/lib/stores/auth";
import Link from "next/link";

type Tab = "works" | "extra" | "financial" | "trail";

const TRANSITIONS: Record<string, { to: string; label: string; roles: string[]; requireComment?: boolean }[]> = {
  draft: [{ to: "submitted", label: "ارسال برای بررسی", roles: ["pm", "admin"] }],
  submitted: [
    { to: "finance_review", label: "ارسال به مالی", roles: ["finance", "admin"] },
    { to: "rejected", label: "رد کردن", roles: ["finance", "admin"], requireComment: true },
  ],
  finance_review: [
    { to: "pm_review", label: "ارسال به مدیر پروژه", roles: ["pm", "admin"] },
    { to: "rejected", label: "رد کردن", roles: ["pm", "admin"], requireComment: true },
  ],
  pm_review: [
    { to: "director_review", label: "ارسال به مدیر ارشد", roles: ["director", "admin"] },
    { to: "rejected", label: "رد کردن", roles: ["director", "admin"], requireComment: true },
  ],
  director_review: [
    { to: "approved", label: "تأیید نهایی", roles: ["director", "admin"] },
    { to: "rejected", label: "رد کردن", roles: ["director", "admin"], requireComment: true },
  ],
};

const extraWorkSchema = z.object({
  description: z.string().min(1, "شرح الزامی است"),
  amount: z.string().min(1, "مبلغ الزامی است"),
  reason: z.string().optional(),
  variation_ref: z.string().optional(),
  approved_by_client: z.boolean().optional(),
  approval_ref: z.string().optional(),
});
type ExtraWorkForm = z.infer<typeof extraWorkSchema>;

export default function StatementDetailPage() {
  const { id, cid, sid } = useParams<{ id: string; cid: string; sid: string }>();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("financial");
  const [transition, setTransition] = useState<{ to: string; requireComment?: boolean } | null>(null);
  const [showExtraForm, setShowExtraForm] = useState(false);

  const { data: stmtRes, isLoading } = useQuery({
    queryKey: ["statement", sid],
    queryFn: () => statementsApi.get(sid),
  });

  const stmt = stmtRes?.data;
  const userRoles = user?.roles ?? [];

  const transitionMutation = useMutation({
    mutationFn: ({ to, comment }: { to: string; comment?: string }) =>
      statementsApi.transition(sid, { status: to, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["statement", sid] });
      qc.invalidateQueries({ queryKey: ["statements", cid] });
      setTransition(null);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExtraWorkForm>({
    resolver: zodResolver(extraWorkSchema),
  });

  const addExtraWork = useMutation({
    mutationFn: (req: Omit<ExtraWorkItem, "id" | "created_at">) =>
      statementsApi.addExtraWork(sid, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["statement", sid] });
      setShowExtraForm(false);
      reset();
    },
  });

  const allowedTransitions = stmt
    ? (TRANSITIONS[stmt.status] ?? []).filter((t) =>
        t.roles.some((r) => userRoles.includes(r))
      )
    : [];

  if (isLoading) {
    return <div className="text-muted-foreground text-sm p-6">در حال بارگذاری...</div>;
  }

  if (!stmt) {
    return <div className="text-status-rejected text-sm p-6">صورت وضعیت یافت نشد</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/dashboard/projects/${id}/contracts/${cid}`} className="text-muted-foreground hover:text-foreground transition">
          <ArrowRight size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-primary">صورت وضعیت #{stmt.sequence_no}</h1>
          <p className="text-xs text-muted-foreground">
            {stmt.period_start?.slice(0, 10)} — {stmt.period_end?.slice(0, 10)}
          </p>
        </div>
        <StatusBadge status={stmt.status} />
      </div>

      {allowedTransitions.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {allowedTransitions.map((t) => (
            <button
              key={t.to}
              onClick={() => setTransition({ to: t.to, requireComment: t.requireComment })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                t.to === "rejected"
                  ? "bg-status-rejected/10 text-status-rejected border border-status-rejected/30 hover:bg-status-rejected hover:text-white"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4 border-b">
        {(["financial", "works", "extra", "trail"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm font-medium border-b-2 transition ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            {t === "financial" ? "خلاصه مالی" : t === "works" ? "کارکرد" : t === "extra" ? "کار اضافه" : "سابقه تأیید"}
          </button>
        ))}
      </div>

      {tab === "financial" && (
        <FinancialSummary
          currency={stmt.currency}
          gross={stmt.gross_amount}
          extra={stmt.extra_amount}
          retention={stmt.retention_amount}
          advance={stmt.advance_recovered}
          vat={stmt.vat_amount}
          socialSecurity={stmt.social_security_amount}
          ld={stmt.ld_amount}
          net={stmt.net_amount}
        />
      )}

      {tab === "works" && (
        <WorksDoneTab sid={sid} isDraft={stmt.status === "draft"} />
      )}

      {tab === "extra" && (
        <div className="space-y-4">
          {stmt.status === "draft" && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowExtraForm(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                <Plus size={16} />
                افزودن کار اضافه
              </button>
            </div>
          )}

          {showExtraForm && (
            <form onSubmit={handleSubmit((d) => addExtraWork.mutate(d))} className="bg-white border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold">کار اضافه جدید</h3>
              <Field label="شرح" error={errors.description?.message}>
                <textarea {...register("description")} className={inputCls} rows={2} />
              </Field>
              <Field label="مبلغ" error={errors.amount?.message}>
                <input {...register("amount")} className={inputCls} dir="ltr" placeholder="0" />
              </Field>
              <Field label="دلیل">
                <input {...register("reason")} className={inputCls} />
              </Field>
              <Field label="شماره تغییرات">
                <input {...register("variation_ref")} className={inputCls} dir="ltr" />
              </Field>
              <div className="flex items-center gap-2">
                <input type="checkbox" {...register("approved_by_client")} id="abc" />
                <label htmlFor="abc" className="text-sm">تأیید شده توسط کارفرما</label>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowExtraForm(false); reset(); }} className="flex-1 border rounded-lg py-2 text-sm">انصراف</button>
                <button type="submit" disabled={addExtraWork.isPending} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold disabled:opacity-50">
                  {addExtraWork.isPending ? "..." : "ذخیره"}
                </button>
              </div>
            </form>
          )}

          <p className="text-sm text-muted-foreground text-center py-8">
            برای مشاهده آیتم‌های کار اضافه، صورت وضعیت را بارگذاری مجدد کنید
          </p>
        </div>
      )}

      {tab === "trail" && (
        <div className="bg-white border rounded-xl p-6">
          <p className="text-sm text-muted-foreground text-center py-8">
            سابقه تأیید در حال توسعه است
          </p>
        </div>
      )}

      <ConfirmDialog
        open={!!transition}
        onClose={() => setTransition(null)}
        onConfirm={(comment) => transition && transitionMutation.mutate({ to: transition.to, comment })}
        title={transition?.to === "rejected" ? "رد صورت وضعیت" : "تغییر وضعیت"}
        description={transition?.to === "rejected" ? "لطفاً دلیل رد را وارد کنید." : "آیا از این عمل مطمئن هستید؟"}
        requireComment={transition?.requireComment}
        confirmLabel={transition?.to === "rejected" ? "رد کردن" : "تأیید"}
        confirmClassName={transition?.to === "rejected" ? "bg-status-rejected text-white" : "bg-primary text-primary-foreground"}
        isPending={transitionMutation.isPending}
      />
    </div>
  );
}

function WorksDoneTab({ sid, isDraft }: { sid: string; isDraft: boolean }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<WorkDoneItem[]>([
    { description: "", quantity: "0", unit_price: "0" },
  ]);

  const saveMutation = useMutation({
    mutationFn: () => statementsApi.setWorksDone(sid, rows),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["statement", sid] }),
  });

  const addRow = () => setRows((r) => [...r, { description: "", quantity: "0", unit_price: "0" }]);

  const updateRow = (i: number, field: keyof WorkDoneItem, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">شرح</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-28">مقدار</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-36">نرخ واحد</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground w-24">کد BoQ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-2">
                  <input
                    disabled={!isDraft}
                    value={row.description}
                    onChange={(e) => updateRow(i, "description", e.target.value)}
                    className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 disabled:opacity-60"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    disabled={!isDraft}
                    value={row.quantity}
                    onChange={(e) => updateRow(i, "quantity", e.target.value)}
                    className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 text-left disabled:opacity-60"
                    dir="ltr"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    disabled={!isDraft}
                    value={row.unit_price}
                    onChange={(e) => updateRow(i, "unit_price", e.target.value)}
                    className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 text-left disabled:opacity-60"
                    dir="ltr"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    disabled={!isDraft}
                    value={row.boq_item_code ?? ""}
                    onChange={(e) => updateRow(i, "boq_item_code", e.target.value)}
                    className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 text-left disabled:opacity-60"
                    dir="ltr"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDraft && (
        <div className="flex gap-3">
          <button onClick={addRow} className="flex items-center gap-2 border rounded-lg px-4 py-2 text-sm hover:bg-muted transition">
            <Plus size={14} />
            ردیف جدید
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {saveMutation.isPending ? "در حال ذخیره..." : "ذخیره کارکرد"}
          </button>
        </div>
      )}
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
