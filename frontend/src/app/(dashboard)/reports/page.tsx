"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";

interface ReportCard {
  title: string;
  description: string;
  icon: React.ElementType;
  actions: { label: string; format: "excel" | "pdf" }[];
}

const REPORTS: ReportCard[] = [
  {
    title: "گزارش قراردادها",
    description: "لیست کامل قراردادها با جزئیات مالی",
    icon: FileSpreadsheet,
    actions: [{ label: "دانلود Excel", format: "excel" }],
  },
  {
    title: "گزارش صورت وضعیت‌ها",
    description: "خلاصه تمام صورت وضعیت‌های اجرا شده",
    icon: FileSpreadsheet,
    actions: [{ label: "دانلود Excel", format: "excel" }],
  },
  {
    title: "گزارش پیمانکاران",
    description: "اطلاعات و عملکرد پیمانکاران",
    icon: FileSpreadsheet,
    actions: [{ label: "دانلود Excel", format: "excel" }],
  },
  {
    title: "گزارش مالی جامع",
    description: "خلاصه کامل وضعیت مالی پروژه‌ها",
    icon: FileText,
    actions: [
      { label: "دانلود PDF", format: "pdf" },
      { label: "دانلود Excel", format: "excel" },
    ],
  },
];

export default function ReportsPage() {
  const [toast, setToast] = useState<string | null>(null);

  const handleDownload = (title: string, format: string) => {
    setToast(`گزارش "${title}" (${format}) به زودی در دسترس خواهد بود`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">گزارشات</h1>

      <p className="text-sm text-muted-foreground">
        از این بخش می‌توانید گزارش‌های مختلف سیستم را دریافت کنید.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORTS.map(({ title, description, icon: Icon, actions }) => (
          <div key={title} className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {actions.map(({ label, format }) => (
                <button
                  key={format}
                  onClick={() => handleDownload(title, format)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-muted transition"
                >
                  {format === "excel" ? <FileSpreadsheet size={13} className="text-money-in" /> : <FileText size={13} className="text-money-out" />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-5 py-3 rounded-xl shadow-lg text-sm z-50 animate-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}
    </div>
  );
}
