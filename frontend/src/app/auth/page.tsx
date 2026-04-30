"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

// -----------------------------
// API helpers
// -----------------------------
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const User_URL = `${API_URL}/users`;

type SignInPayload = {
	email: string;
	password: string;
};

type SignUpPayload = {
	first_name: string;
	last_name: string;
	email: string;
	national_id: string;
	password: string;
	roles: string[];
	company_id: string;
	employment_type: string;
};

async function signInRequest(payload: SignInPayload) {
	const res = await fetch(`${User_URL}/auth/signin`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "ورود ناموفق بود");
	}

	return res.json();
}

async function signUpRequest(payload: SignUpPayload) {
	const res = await fetch(`${User_URL}/signup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "ثبت نام ناموفق بود");
	}

	return res.json();
}

// -----------------------------
// Main Component
// -----------------------------
export default function AuthPage() {
	const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

	return (
		<div
			className={styles.container}
			dir='rtl'
		>
			<div className={styles.wrapper}>
				{/* Left Panel with Branding */}
				<div className={styles.brandPanel}>
					<div className={styles.brandContent}>
						<div className={styles.logo}>
							<span className={styles.logoIcon}>🔐</span>
							<h1 className={styles.logoText}>پنل مدیریت</h1>
						</div>
						<div className={styles.brandMessage}>
							<h2 className={styles.brandTitle}>به سیستم مدیریت خوش آمدید</h2>
							<p className={styles.brandSubtitle}>
								حساب کاربری خود را ایجاد کنید یا وارد شوید تا به امکانات کامل
								دسترسی داشته باشید
							</p>
						</div>
						<div className={styles.features}>
							<div className={styles.feature}>
								<span className={styles.featureIcon}>✓</span>
								<span>مدیریت امن و آسان</span>
							</div>
							<div className={styles.feature}>
								<span className={styles.featureIcon}>✓</span>
								<span>دسترسی آنی به امکانات</span>
							</div>
							<div className={styles.feature}>
								<span className={styles.featureIcon}>✓</span>
								<span>پشتیبانی 24/7</span>
							</div>
						</div>
					</div>
				</div>

				{/* Right Panel with Form */}
				<div className={styles.formPanel}>
					<div className={styles.formCard}>
						<div className={styles.tabsContainer}>
							<div className={styles.tabs}>
								<button
									className={`${styles.tab} ${activeTab === "signin" ? styles.activeTab : ""}`}
									onClick={() => setActiveTab("signin")}
								>
									<span className={styles.tabIcon}>→</span>
									<span>ورود به حساب</span>
								</button>
								<button
									className={`${styles.tab} ${activeTab === "signup" ? styles.activeTab : ""}`}
									onClick={() => setActiveTab("signup")}
								>
									<span className={styles.tabIcon}>+</span>
									<span>ایجاد حساب</span>
								</button>
							</div>
							<div
								className={styles.tabIndicator}
								data-active={activeTab}
							/>
						</div>

						<div className={styles.formWrapper}>
							{activeTab === "signin" ? <SignInForm /> : <SignUpForm />}
						</div>

						<p className={styles.terms}>
							با ادامه، با{" "}
							<a
								href='#'
								className={styles.link}
							>
								شرایط استفاده
							</a>{" "}
							و{" "}
							<a
								href='#'
								className={styles.link}
							>
								حریم خصوصی
							</a>{" "}
							موافقت می‌کنید.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

// -----------------------------
// Sign In Form
// -----------------------------
function SignInForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const router = useRouter();

	const mutation = useMutation({
		mutationFn: signInRequest,
		onSuccess: (data) => {
			localStorage.setItem("usr-token", data.data.token);
			localStorage.setItem("usr-roles", JSON.stringify(data.data.roles ?? []));

			toast.success("ورود موفقیت‌آمیز بود");
			router.push("/dashboard");
		},
		onError: (error: Error) => {
			toast.error(error.message || "خطا در ورود");
		},
	});

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		mutation.mutate({ email, password });
	};

	return (
		<form
			className={styles.form}
			onSubmit={onSubmit}
		>
			<div className={styles.formHeader}>
				<h2 className={styles.formTitle}>خوش بازگشتی!</h2>
				<p className={styles.formSubtitle}>
					لطفاً اطلاعات حساب خود را وارد کنید
				</p>
			</div>

			<div className={styles.inputGroup}>
				<label className={styles.label}>
					<span>ایمیل</span>
					<span className={styles.required}>*</span>
				</label>
				<div className={styles.inputWrapper}>
					<input
						type='email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						className={styles.input}
						placeholder='ایمیل خود را وارد کنید'
						disabled={mutation.isPending}
					/>
					<span className={styles.inputIcon}>👤</span>
				</div>
			</div>

			<div className={styles.inputGroup}>
				<div className={styles.labelRow}>
					<label className={styles.label}>
						<span>رمز عبور</span>
						<span className={styles.required}>*</span>
					</label>
					<a
						href='#'
						className={styles.forgotPassword}
					>
						فراموشی رمز عبور؟
					</a>
				</div>
				<div className={styles.inputWrapper}>
					<input
						type='password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						className={styles.input}
						placeholder='رمز عبور خود را وارد کنید'
						disabled={mutation.isPending}
					/>
					<span className={styles.inputIcon}>🔒</span>
				</div>
			</div>

			{mutation.isError && (
				<div className={styles.errorAlert}>
					<span className={styles.errorIcon}>⚠️</span>
					<span>{mutation.error.message}</span>
				</div>
			)}

			<button
				type='submit'
				disabled={mutation.isPending}
				className={styles.submitButton}
			>
				{mutation.isPending ? (
					<>
						<span className={styles.spinner} />
						<span>در حال ورود...</span>
					</>
				) : (
					"ورود به حساب"
				)}
			</button>
		</form>
	);
}

// -----------------------------
// Sign Up Form
// -----------------------------
function SignUpForm() {
	const [userName, setUserName] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");

	const mutation = useMutation({
		mutationFn: signUpRequest,
		onSuccess: (data) => {
			toast.success("حساب کاربری با موفقیت ایجاد شد");
			// Optionally auto-login or redirect
		},
		onError: (error: Error) => {
			toast.error(error.message || "خطا در ثبت نام");
		},
	});

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (password !== confirmPassword) {
			toast.error("رمز عبور و تأیید آن مطابقت ندارند");
			return;
		}

		mutation.mutate({
			email: userName,
			password,
			first_name: firstName,
			last_name: lastName,
			national_id: "",
			roles: [],
			company_id: "",
			employment_type: "official",
		});
	};

	return (
		<form
			className={styles.form}
			onSubmit={onSubmit}
		>
			<div className={styles.formHeader}>
				<h2 className={styles.formTitle}>ایجاد حساب جدید</h2>
				<p className={styles.formSubtitle}>
					اطلاعات خود را برای شروع وارد کنید
				</p>
			</div>

			<div className={styles.rowInputs}>
				<div className={styles.inputGroup}>
					<label className={styles.label}>
						<span>نام</span>
						<span className={styles.required}>*</span>
					</label>
					<div className={styles.inputWrapper}>
						<input
							type='text'
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							required
							className={styles.input}
							placeholder='نام'
							disabled={mutation.isPending}
						/>
					</div>
				</div>

				<div className={styles.inputGroup}>
					<label className={styles.label}>
						<span>نام خانوادگی</span>
						<span className={styles.required}>*</span>
					</label>
					<div className={styles.inputWrapper}>
						<input
							type='text'
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							required
							className={styles.input}
							placeholder='نام خانوادگی'
							disabled={mutation.isPending}
						/>
					</div>
				</div>
			</div>

			<div className={styles.inputGroup}>
				<label className={styles.label}>
					<span>نام کاربری</span>
					<span className={styles.required}>*</span>
				</label>
				<div className={styles.inputWrapper}>
					<input
						type='text'
						value={userName}
						onChange={(e) => setUserName(e.target.value)}
						required
						className={styles.input}
						placeholder='نام کاربری دلخواه'
						disabled={mutation.isPending}
					/>
					<span className={styles.inputIcon}>👤</span>
				</div>
			</div>

			<div className={styles.rowInputs}>
				<div className={styles.inputGroup}>
					<label className={styles.label}>
						<span>رمز عبور</span>
						<span className={styles.required}>*</span>
					</label>
					<div className={styles.inputWrapper}>
						<input
							type='password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className={styles.input}
							placeholder='رمز عبور قوی'
							disabled={mutation.isPending}
						/>
						<span className={styles.inputIcon}>🔒</span>
					</div>
				</div>

				<div className={styles.inputGroup}>
					<label className={styles.label}>
						<span>تأیید رمز عبور</span>
						<span className={styles.required}>*</span>
					</label>
					<div className={styles.inputWrapper}>
						<input
							type='password'
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							className={styles.input}
							placeholder='تکرار رمز عبور'
							disabled={mutation.isPending}
						/>
						<span className={styles.inputIcon}>✓</span>
					</div>
				</div>
			</div>

			{mutation.isError && (
				<div className={styles.errorAlert}>
					<span className={styles.errorIcon}>⚠️</span>
					<span>{mutation.error.message}</span>
				</div>
			)}

			<button
				type='submit'
				disabled={mutation.isPending}
				className={styles.submitButton}
			>
				{mutation.isPending ? (
					<>
						<span className={styles.spinner} />
						<span>در حال ایجاد حساب...</span>
					</>
				) : (
					"ایجاد حساب کاربری"
				)}
			</button>
		</form>
	);
}
