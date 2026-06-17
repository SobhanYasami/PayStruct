"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { projectsApi } from "@/lib/api/projects";
import { contractsApi } from "@/lib/api/contracts";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { CreateContractSheet } from "@/components/domain/CreateContractSheet";
import { DataTable } from "@/components/ui/DataTable";
import { formatMoney } from "@/lib/utils/money";
import Link from "next/link";
import { toJalali } from "@/lib/utils/date";

type Tab = "contracts" | "info";

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
    queryFn: () => contractsApi.list(1, 100, id),
  });

  const project = projectRes?.data;
  const contracts = contractsRes?.data?.data ?? [];

  if (loadingProject) {
    return <div className="text-muted-foreground text-sm p-6">در حال بارگذاری...</div>;
  }

  if (!project) {
    return <div className="text-status-rejected text-sm p-6">پروژه یافت نشد</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-muted-foreground hover:text-foreground transition">
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
                    {formatMoney(r.gross_budget, r.currency)}
                  </span>
                ),
              },
              {
                key: "starts_on",
                header: "شروع",
                render: (r) => <span className="text-sm">{toJalali(r.starts_on)}</span>,
              },
            ]}
            data={contracts}
            isLoading={loadingContracts}
            keyExtractor={(r) => r.id}
            onRowClick={(r) => router.push(`/projects/${id}/contracts/${r.id}`)}
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
          <InfoRow label="تاریخ شروع" value={toJalali(project.start_date)} />
          <InfoRow label="تاریخ پایان" value={toJalali(project.end_date)} />
        </div>
      )}

      <CreateContractSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultProjectId={id}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["contracts", id] })}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-6">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
