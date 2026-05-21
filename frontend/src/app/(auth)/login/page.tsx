"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth";

import logo from "@/../public/main-logo.png";

const schema = z.object({
	email: z.string().email("ایمیل نامعتبر است"),
	password: z.string().min(1, "رمز عبور الزامی است"),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const setToken = useAuthStore((s) => s.setToken);
	const [error, setError] = useState<string | null>(null);

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
			router.push(
				next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
			);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "خطای ورود");
		}
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className='space-y-4'
		>
			<div>
				<label className='block text-sm font-medium mb-1'>ایمیل</label>
				<input
					{...register("email")}
					type='email'
					className='w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
					placeholder='you@example.com'
					dir='ltr'
				/>
				{errors.email && (
					<p className='text-xs text-status-rejected mt-1'>
						{errors.email.message}
					</p>
				)}
			</div>

			<div>
				<label className='block text-sm font-medium mb-1'>رمز عبور</label>
				<input
					{...register("password")}
					type='password'
					className='w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
					placeholder='••••••••'
					dir='ltr'
				/>
				{errors.password && (
					<p className='text-xs text-status-rejected mt-1'>
						{errors.password.message}
					</p>
				)}
			</div>

			{error && (
				<p className='text-sm text-status-rejected bg-status-rejected/10 rounded px-3 py-2'>
					{error}
				</p>
			)}

			<button
				type='submit'
				disabled={isSubmitting}
				className='w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition'
			>
				{isSubmitting ? "در حال ورود..." : "ورود"}
			</button>
		</form>
	);
}

export default function LoginPage() {
	return (
		<div className='min-h-screen flex items-center justify-center bg-primary/5'>
			<div className='w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-6'>
				<div className='flex justify-center'>
					<Image
						src={logo}
						alt='logo'
						width={160}
						height={54}
						className='object-contain rounded-3xl'
						priority
					/>
				</div>
				<p className='text-muted-foreground text-center text-sm'>
					ورود به سیستم
				</p>
				<Suspense fallback={null}>
					<LoginForm />
				</Suspense>
			</div>
		</div>
	);
}
