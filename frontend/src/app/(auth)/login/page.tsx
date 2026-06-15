"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth";
import logo from "@/../public/main-logo.jpg";

const schema = z.object({
  email: z.string().email("ایمیل نامعتبر است"),
  password: z.string().min(1, "رمز عبور الزامی است"),
});
type FormData = z.infer<typeof schema>;

const inputCls =
  "w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white transition-shadow placeholder:text-muted-foreground/50";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setToken = useAuthStore((s) => s.setToken);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const res = await authApi.login(data);
      const { token, user } = res.data;
      setToken(token, {
        id: user.id,
        companyId: user.company_id,
        rootCompanyId: user.root_company_id,
        roles: user.roles,
        name: `${user.first_name} ${user.last_name}`,
      });
      const next = searchParams.get("next") ?? "/dashboard";
      router.push(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "ایمیل یا رمز عبور اشتباه است");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground/80">ایمیل</label>
        <input
          {...register("email")}
          type="email"
          className={inputCls}
          placeholder="you@example.com"
          dir="ltr"
          autoComplete="email"
        />
        {errors.email && (
          <p className="text-xs text-status-rejected mt-1">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground/80">رمز عبور</label>
        <div className="relative">
          <input
            {...register("password")}
            type={showPw ? "text" : "password"}
            className={`${inputCls} pl-10`}
            placeholder="••••••••"
            dir="ltr"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label={showPw ? "پنهان کردن رمز" : "نمایش رمز"}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-status-rejected mt-1">{errors.password.message}</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-status-rejected bg-status-rejected/8 rounded-lg px-3 py-2.5 border border-status-rejected/20">
          <span className="shrink-0">⚠</span>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer mt-2"
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            در حال ورود...
          </>
        ) : (
          <>
            <LogIn size={16} />
            ورود به سیستم
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-primary">
      {/* Dot-grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Gradient blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-saffron/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
        {/* Top accent bar */}
        <div className="h-1 bg-linear-to-l from-accent via-primary to-saffron" />

        <div className="p-8 space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-primary/10 shadow-md">
              <Image
                src={logo}
                alt="logo"
                width={64}
                height={64}
                className="object-cover w-full h-full"
                priority
              />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-primary">بایگان من</h1>
              <p className="text-xs text-muted-foreground mt-0.5">سیستم مدیریت مالی قراردادها</p>
            </div>
          </div>

          <div className="border-t border-border/60" />

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
