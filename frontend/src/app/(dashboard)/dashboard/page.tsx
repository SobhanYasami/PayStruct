export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">داشبورد</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "پروژه‌های فعال", value: "—" },
          { label: "ارزش قراردادها", value: "—" },
          { label: "در انتظار تأیید", value: "—" },
          { label: "پیش‌پرداخت باز", value: "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-primary mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
