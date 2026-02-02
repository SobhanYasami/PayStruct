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
	user_name: string;
	password: string;
};

type SignUpPayload = {
	first_name: string;
	last_name: string;
	user_name: string;
	password: string;
	role: string;
};

async function signInRequest(payload: SignInPayload) {
	const res = await fetch(`${User_URL}/signin`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Sign in failed");
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
		throw new Error(err.message || "Sign up failed");
	}

	return res.json();
}

// -----------------------------
// Page
// -----------------------------
export default function SignIn() {
	const [activeTab, setActiveTab] = useState("signin");

	return (
		<div
			className={styles.container}
			dir='rtl'
		>
			<div className={styles.card}>
				<div className={styles.tabs}>
					<button
						className={activeTab === "signin" ? styles.activeTab : styles.tab}
						onClick={() => setActiveTab("signin")}
					>
						ورود
					</button>
					<button
						className={activeTab === "signup" ? styles.activeTab : styles.tab}
						onClick={() => setActiveTab("signup")}
					>
						ثبت نام
					</button>
				</div>

				{activeTab === "signin" ? <SignInForm /> : <SignUpForm />}
			</div>
		</div>
	);
}

// -----------------------------
// Sign In Form
// -----------------------------
function SignInForm() {
	const [userName, setUserName] = useState("");
	const [password, setPassword] = useState("");
	const router = useRouter();

	const mutation = useMutation({
		mutationFn: signInRequest,
		onSuccess: (data) => {
			// todo: remove printing to console
			console.log("Signed in", data);

			// todo: store them in cookies instead of local storage
			localStorage.setItem("usr-token", data.data.token);
			localStorage.setItem("usr-role", data.data.role);

			toast.success(data.message);
			router.push("/dashboard");
		},
	});

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		mutation.mutate({ user_name: userName, password });
	};

	return (
		<form
			className={styles.form}
			onSubmit={onSubmit}
		>
			<h2 className={styles.title}>خوش آمدید</h2>

			<label className={styles.label}>نام کاربری</label>
			<input
				type='text'
				value={userName}
				onChange={(e) => setUserName(e.target.value)}
				required
				className={styles.input}
			/>

			<label className={styles.label}>رمز عبور</label>
			<input
				type='password'
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				required
				className={styles.input}
			/>

			{mutation.isError && (
				<p className={styles.error}>{mutation.error.message}</p>
			)}

			<button
				type='submit'
				disabled={mutation.isPending}
				className={styles.primaryButton}
			>
				{mutation.isPending ? "در حال ورود..." : "ورود"}
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
			// Todo: remove printing to console
			console.log("Signed up", data);
			toast.success(data.message);
		},
	});

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (password !== confirmPassword) {
			toast.error("Passwords do not match");
			return;
		}

		mutation.mutate({
			user_name: userName,
			password,
			first_name: firstName,
			last_name: lastName,
			// Todo: properly handle user role
			role: "admin",
		});
	};

	return (
		<form
			className={styles.form}
			onSubmit={onSubmit}
		>
			<h2 className={styles.title}>ایجاد حساب کاربری</h2>
			<label className={styles.label}>نام</label>
			<input
				type='text'
				value={firstName}
				onChange={(e) => setFirstName(e.target.value)}
				required
				className={styles.input}
			/>

			<label className={styles.label}>نام خانوادگی</label>
			<input
				type='text'
				value={lastName}
				onChange={(e) => setLastName(e.target.value)}
				required
				className={styles.input}
			/>

			<label className={styles.label}>نام کاربری</label>
			<input
				type='text'
				value={userName}
				onChange={(e) => setUserName(e.target.value)}
				required
				className={styles.input}
			/>

			<label className={styles.label}>رمز عبور</label>
			<input
				type='password'
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				required
				className={styles.input}
			/>

			<label className={styles.label}>تایید رمز عبور</label>
			<input
				type='password'
				value={confirmPassword}
				onChange={(e) => setConfirmPassword(e.target.value)}
				required
				className={styles.input}
			/>

			{mutation.isError && (
				<p className={styles.error}>{mutation.error.message}</p>
			)}

			<button
				type='submit'
				disabled={mutation.isPending}
				className={styles.primaryButton}
			>
				{mutation.isPending ? "در حال ایجاد حساب..." : "ثبت نام"}
			</button>
		</form>
	);
}
