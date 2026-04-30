"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function authHeaders() {
	const token =
		typeof window !== "undefined" ? localStorage.getItem("usr-token") : "";
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

// --------------- Types ---------------

type Profile = {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	phone?: string;
	active: boolean;
	roles: string[];
	company_id: string;
	employment_type: string;
};

type UpdateProfileBody = {
	first_name?: string;
	last_name?: string;
	phone?: string;
	password?: string;
};

// --------------- API ---------------

async function fetchProfile(): Promise<Profile> {
	const res = await fetch(`${API_URL}/users/me`, {
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error("Failed to fetch profile");
	const json = await res.json();
	return json.data;
}

async function updateProfile(body: UpdateProfileBody): Promise<Profile> {
	const res = await fetch(`${API_URL}/users/me`, {
		method: "PUT",
		headers: authHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to update profile");
	}
	const json = await res.json();
	return json.data;
}

// --------------- Role badge ---------------

const roleLabel: Record<string, string> = {
	sudoer:      "مدیر ارشد",
	manager:     "مدیر",
	juridical:   "حقوقی",
	financial:   "مالی",
	engineering: "مهندسی",
	security:    "امنیت",
};

const roleColor: Record<string, { bg: string; color: string }> = {
	sudoer:      { bg: "#fef3c7", color: "#92400e" },
	manager:     { bg: "#dbeafe", color: "#1e40af" },
	juridical:   { bg: "#fce7f3", color: "#9d174d" },
	financial:   { bg: "#dcfce7", color: "#166534" },
	engineering: { bg: "#e0e7ff", color: "#3730a3" },
	security:    { bg: "#fee2e2", color: "#991b1b" },
};

// --------------- Page ---------------

export default function ProfilePage() {
	const qc = useQueryClient();
	const [editing, setEditing] = useState(false);
	const [form, setForm] = useState<UpdateProfileBody>({});
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const { data: profile, isLoading, isError } = useQuery<Profile>({
		queryKey: ["profile"],
		queryFn: fetchProfile,
	});

	useEffect(() => {
		if (profile) {
			setForm({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone ?? "" });
		}
	}, [profile]);

	const mutation = useMutation({
		mutationFn: updateProfile,
		onSuccess: () => {
			toast.success("پروفایل به‌روزرسانی شد");
			setEditing(false);
			setNewPassword("");
			setConfirmPassword("");
			qc.invalidateQueries({ queryKey: ["profile"] });
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword && newPassword !== confirmPassword) {
			toast.error("رمز عبور جدید و تأیید آن مطابقت ندارند");
			return;
		}
		const payload: UpdateProfileBody = { ...form };
		if (newPassword) payload.password = newPassword;
		mutation.mutate(payload);
	};

	if (isLoading) return <div style={loadingStyle}>در حال بارگذاری...</div>;
	if (isError)
		return <div style={errorStyle}>خطا در دریافت اطلاعات پروفایل</div>;
	if (!profile) return null;

	return (
		<div style={pageWrap} dir='rtl'>
			<h1 style={pageTitle}>پروفایل من</h1>

			<div style={card}>
				{/* Avatar & name header */}
				<div style={avatarSection}>
					<div style={avatar}>
						{profile.first_name.charAt(0)}
						{profile.last_name.charAt(0)}
					</div>
					<div>
						<p style={fullName}>
							{profile.first_name} {profile.last_name}
						</p>
						<p style={emailText}>{profile.email}</p>
						<div style={rolesRow}>
							{(profile.roles ?? []).map((r) => (
								<span
									key={r}
									style={{
										...roleBadge,
										background: roleColor[r]?.bg ?? "#f3f4f6",
										color: roleColor[r]?.color ?? "#374151",
									}}
								>
									{roleLabel[r] ?? r}
								</span>
							))}
							{profile.roles?.length === 0 && (
								<span style={{ ...roleBadge, background: "#f3f4f6", color: "#6b7280" }}>
									بدون نقش
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Info grid */}
				<div style={infoGrid}>
					<InfoRow label='شناسه' value={profile.id} mono />
					<InfoRow label='شرکت' value={profile.company_id} mono />
					<InfoRow
						label='نوع استخدام'
						value={profile.employment_type === "official" ? "رسمی" : "قراردادی"}
					/>
					<InfoRow
						label='وضعیت حساب'
						value={profile.active ? "فعال" : "غیرفعال"}
						highlight={profile.active ? "green" : "red"}
					/>
				</div>

				<div style={{ borderTop: "1px solid #f3f4f6", margin: "20px 0" }} />

				{/* Edit form */}
				{!editing ? (
					<button style={primaryBtn} onClick={() => setEditing(true)}>
						ویرایش پروفایل
					</button>
				) : (
					<form onSubmit={handleSave} style={formStyle}>
						<h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>
							ویرایش اطلاعات
						</h3>

						<div style={row}>
							<Field
								label='نام'
								value={form.first_name ?? ""}
								onChange={(v) => setForm((p) => ({ ...p, first_name: v }))}
							/>
							<Field
								label='نام خانوادگی'
								value={form.last_name ?? ""}
								onChange={(v) => setForm((p) => ({ ...p, last_name: v }))}
							/>
						</div>

						<Field
							label='شماره تلفن'
							value={form.phone ?? ""}
							onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
						/>

						<div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
							<p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
								تغییر رمز عبور (اختیاری)
							</p>
							<div style={row}>
								<Field
									label='رمز عبور جدید'
									type='password'
									value={newPassword}
									onChange={setNewPassword}
								/>
								<Field
									label='تأیید رمز عبور'
									type='password'
									value={confirmPassword}
									onChange={setConfirmPassword}
								/>
							</div>
						</div>

						<div style={footerRow}>
							<button
								type='button'
								style={cancelBtn}
								onClick={() => {
									setEditing(false);
									setNewPassword("");
									setConfirmPassword("");
								}}
							>
								انصراف
							</button>
							<button
								type='submit'
								style={primaryBtn}
								disabled={mutation.isPending}
							>
								{mutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}

// --------------- Sub-components ---------------

function InfoRow({
	label,
	value,
	mono,
	highlight,
}: {
	label: string;
	value: string;
	mono?: boolean;
	highlight?: "green" | "red";
}) {
	const color = highlight === "green" ? "#166534" : highlight === "red" ? "#991b1b" : "#1f2937";
	const bg = highlight === "green" ? "#dcfce7" : highlight === "red" ? "#fee2e2" : "transparent";

	return (
		<div style={infoRowStyle}>
			<span style={infoLabel}>{label}</span>
			<span
				style={{
					fontSize: 13,
					fontFamily: mono ? "monospace" : "inherit",
					color,
					background: bg,
					padding: highlight ? "2px 8px" : 0,
					borderRadius: highlight ? 4 : 0,
				}}
			>
				{value}
			</span>
		</div>
	);
}

function Field({
	label,
	value,
	onChange,
	type = "text",
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	type?: string;
}) {
	return (
		<div style={fieldGroup}>
			<label style={labelStyle}>{label}</label>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				style={inputStyle}
			/>
		</div>
	);
}

// --------------- Styles ---------------

const pageWrap: React.CSSProperties = {
	padding: "24px",
	maxWidth: 700,
	margin: "0 auto",
};
const pageTitle: React.CSSProperties = {
	fontSize: 22,
	fontWeight: 700,
	margin: "0 0 20px",
};
const card: React.CSSProperties = {
	background: "#fff",
	borderRadius: 12,
	border: "1px solid #e5e7eb",
	padding: 28,
};
const avatarSection: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 20,
	marginBottom: 24,
};
const avatar: React.CSSProperties = {
	width: 64,
	height: 64,
	borderRadius: "50%",
	background: "#2563eb",
	color: "#fff",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	fontSize: 22,
	fontWeight: 700,
	flexShrink: 0,
};
const fullName: React.CSSProperties = {
	margin: "0 0 4px",
	fontSize: 18,
	fontWeight: 700,
	color: "#111827",
};
const emailText: React.CSSProperties = {
	margin: "0 0 8px",
	fontSize: 14,
	color: "#6b7280",
};
const rolesRow: React.CSSProperties = {
	display: "flex",
	gap: 6,
	flexWrap: "wrap",
};
const roleBadge: React.CSSProperties = {
	padding: "2px 10px",
	borderRadius: 999,
	fontSize: 12,
	fontWeight: 600,
};
const infoGrid: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: 12,
};
const infoRowStyle: React.CSSProperties = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	padding: "8px 0",
	borderBottom: "1px solid #f9fafb",
};
const infoLabel: React.CSSProperties = {
	fontSize: 13,
	color: "#6b7280",
	fontWeight: 500,
};
const formStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: 14,
};
const row: React.CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 14,
};
const footerRow: React.CSSProperties = {
	display: "flex",
	justifyContent: "flex-end",
	gap: 10,
	marginTop: 8,
};
const fieldGroup: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: 4,
};
const labelStyle: React.CSSProperties = {
	fontSize: 13,
	fontWeight: 600,
	color: "#374151",
};
const inputStyle: React.CSSProperties = {
	padding: "8px 12px",
	borderRadius: 6,
	border: "1px solid #d1d5db",
	fontSize: 14,
	fontFamily: "inherit",
	outline: "none",
};
const primaryBtn: React.CSSProperties = {
	padding: "8px 20px",
	background: "#2563eb",
	color: "#fff",
	border: "none",
	borderRadius: 8,
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 14,
};
const cancelBtn: React.CSSProperties = {
	padding: "8px 20px",
	background: "#f3f4f6",
	color: "#374151",
	border: "none",
	borderRadius: 8,
	cursor: "pointer",
	fontFamily: "inherit",
	fontSize: 14,
};
const loadingStyle: React.CSSProperties = {
	padding: 40,
	textAlign: "center",
	color: "#6b7280",
};
const errorStyle: React.CSSProperties = {
	padding: 40,
	textAlign: "center",
	color: "#ef4444",
};
