"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import styles from "./page.module.css";

// -----------------------------
// API helpers
// -----------------------------
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const User_URL = `${API_URL}/users`;
async function signInRequest(payload) {
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

async function signUpRequest(payload) {
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
		<div className={styles.container}>
			<div className={styles.card}>
				<div className={styles.tabs}>
					<button
						className={activeTab === "signin" ? styles.activeTab : styles.tab}
						onClick={() => setActiveTab("signin")}
					>
						Sign In
					</button>
					<button
						className={activeTab === "signup" ? styles.activeTab : styles.tab}
						onClick={() => setActiveTab("signup")}
					>
						Sign Up
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
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const mutation = useMutation({
		mutationFn: signInRequest,
		onSuccess: (data) => {
			// example: store token, redirect, etc.
			console.log("Signed in", data);
		},
	});

	const onSubmit = (e) => {
		e.preventDefault();
		mutation.mutate({ email, password });
	};

	return (
		<form
			className={styles.form}
			onSubmit={onSubmit}
		>
			<h2 className={styles.title}>Welcome back</h2>

			<label className={styles.label}>Email</label>
			<input
				type='email'
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				required
				className={styles.input}
			/>

			<label className={styles.label}>Password</label>
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
				{mutation.isPending ? "Signing in..." : "Sign In"}
			</button>
		</form>
	);
}

// -----------------------------
// Sign Up Form
// -----------------------------
function SignUpForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const mutation = useMutation({
		mutationFn: signUpRequest,
		onSuccess: (data) => {
			console.log("Signed up", data);
		},
	});

	const onSubmit = (e) => {
		e.preventDefault();

		if (password !== confirmPassword) {
			alert("Passwords do not match");
			return;
		}

		mutation.mutate({ email, password });
	};

	return (
		<form
			className={styles.form}
			onSubmit={onSubmit}
		>
			<h2 className={styles.title}>Create an account</h2>

			<label className={styles.label}>Email</label>
			<input
				type='email'
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				required
				className={styles.input}
			/>

			<label className={styles.label}>Password</label>
			<input
				type='password'
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				required
				className={styles.input}
			/>

			<label className={styles.label}>Confirm Password</label>
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
				{mutation.isPending ? "Creating account..." : "Sign Up"}
			</button>
		</form>
	);
}
