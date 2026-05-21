"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FolderKanban,
  UserCheck,
  ScrollText,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { projectsApi } from "@/lib/api/projects";
import { contractorsApi } from "@/lib/api/contractors";
import { contractsApi } from "@/lib/api/contracts";
import { sumDecimals } from "@/lib/utils/money";

function fmt(n: number): string {
  return new Intl.NumberFormat("fa-IR").format(n);
}

function fmtBudget(total: string): string {
  const n = parseFloat(total);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1_000_000_000_000) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(n / 1_000_000_000_000)} تریلیون`;
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(n / 1_000_000_000)} میلیارد`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(n / 1_000_000)} میلیون`;
  return new Intl.NumberFormat("fa-IR").format(n);
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
  sub?: string;
}

function StatCard({ label, value, icon, color, loading, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border p-5 shadow-sm flex gap-4 items-start">
      <div className={`rounded-lg p-2.5 shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-primary mt-0.5">
          {loading ? <span className="animate-pulse text-muted-foreground/40">—</span> : value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: projectsData, isLoading: projLoading } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: () => projectsApi.list(1, 1000),
    staleTime: 60_000,
  });

  const { data: contractorsData, isLoading: ctorLoading } = useQuery({
    queryKey: ["dashboard-contractors"],
    queryFn: () => contractorsApi.list(1, 1),
    staleTime: 60_000,
  });

  const { data: contractsData, isLoading: ctLoading } = useQuery({
    queryKey: ["dashboard-contracts"],
    queryFn: () => contractsApi.list(1, 1000),
    staleTime: 60_000,
  });

  const projects = projectsData?.data?.data ?? [];
  const totalContractors = contractorsData?.data?.total ?? 0;
  const contracts = contractsData?.data?.data ?? [];

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const planningProjects = projects.filter((p) => p.status === "planning").length;
  const onHoldProjects = projects.filter((p) => p.status === "on_hold").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  const activeContracts = contracts.filter((c) => c.status === "active" || c.status === "signed").length;
  const draftContracts = contracts.filter((c) => c.status === "draft").length;
  const closedContracts = contracts.filter((c) => c.status === "closed" || c.status === "cancelled").length;
  const totalContracts = contractsData?.data?.total ?? 0;

  const totalBudgetStr = sumDecimals(...contracts.map((c) => c.gross_budget));
  const loading = projLoading || ctorLoading || ctLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">داشبورد</h1>

      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="پروژه‌های فعال"
          value={fmt(activeProjects)}
          sub={`از ${fmt(projects.length)} پروژه`}
          icon={<FolderKanban size={20} className="text-green-700" />}
          color="bg-green-100"
          loading={projLoading}
        />
        <StatCard
          label="پیمانکاران"
          value={fmt(totalContractors)}
          icon={<UserCheck size={20} className="text-blue-700" />}
          color="bg-blue-100"
          loading={ctorLoading}
        />
        <StatCard
          label="قراردادهای فعال"
          value={fmt(activeContracts)}
          sub={`از ${fmt(totalContracts)} قرارداد`}
          icon={<ScrollText size={20} className="text-purple-700" />}
          color="bg-purple-100"
          loading={ctLoading}
        />
        <StatCard
          label="ارزش کل قراردادها"
          value={fmtBudget(totalBudgetStr)}
          sub="ریال"
          icon={<TrendingUp size={20} className="text-amber-700" />}
          color="bg-amber-100"
          loading={ctLoading}
        />
      </div>

      {/* Secondary breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="در برنامه‌ریزی"
          value={fmt(planningProjects)}
          icon={<Clock size={20} className="text-sky-700" />}
          color="bg-sky-100"
          loading={projLoading}
        />
        <StatCard
          label="متوقف"
          value={fmt(onHoldProjects)}
          icon={<Clock size={20} className="text-orange-700" />}
          color="bg-orange-100"
          loading={projLoading}
        />
        <StatCard
          label="تکمیل‌شده"
          value={fmt(completedProjects)}
          icon={<CheckCircle2 size={20} className="text-emerald-700" />}
          color="bg-emerald-100"
          loading={projLoading}
        />
        <StatCard
          label="پیش‌نویس / بسته‌شده"
          value={`${fmt(draftContracts)} / ${fmt(closedContracts)}`}
          sub="قراردادها"
          icon={<FileText size={20} className="text-slate-600" />}
          color="bg-slate-100"
          loading={ctLoading}
        />
      </div>
    </div>
  );
}
