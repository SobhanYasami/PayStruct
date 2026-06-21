"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import {
	consultantsApi,
	type Consultant,
	type CreateConsultantReq,
	type UpdateConsultantReq,
} from "@/lib/api/consultants";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { CompanyCombobox } from "@/components/domain/CompanyCombobox";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth";

const WRITE_ROLES = ["manager", "engineering_head", "sudoer", "admin"];

const CURRENCIES = [
	{ code: "IRR", label: "ریال ایران (IRR)" },
	{ code: "USD", label: "دلار آمریکا (USD)" },
	{ code: "EUR", label: "یورو (EUR)" },
	{ code: "GBP", label: "پوند انگلیس (GBP)" },
	{ code: "AED", label: "درهم امارات (AED)" },
	{ code: "SAR", label: "ریال عربستان (SAR)" },
	{ code: "CNY", label: "یوان چین (CNY)" },
];

const SPECIALIZATIONS = [
	"",
	"civil",
	"structural",
	"geotechnical",
	"hydraulic",
	"transportation",
	"environmental",
	"mechanical",
	"electrical",
	"architecture",
	"project_management",
	"other",
];

const SPEC_LABELS: Record<string, string> = {
	"": "—",
	civil: "مهندسی عمران",
	structural: "مهندسی سازه",
	geotechnical: "ژئوتکنیک",
	hydraulic: "هیدرولیک",
	transportation: "حمل و نقل",
	environmental: "محیط زیست",
	mechanical: "مکانیک",
	electrical: "برق",
	architecture: "معماری",
	project_management: "مدیریت پروژه",
	other: "سایر",
};

const schema = z.object({
	name: z.string().min(1, "نام الزامی است"),
	legal_name: z.string().optional(),
	registration_no: z.string().optional(),
	tax_id: z.string().optional(),
	specialization: z.string().optional(),
	license_no: z.string().optional(),
	license_expiry: z.string().optional(),
	default_currency: z.string().max(3).optional(),
	rating: z
		.string()
		.optional()
		.refine(
			(v) => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 5),
			"امتیاز باید بین ۰ و ۵ باشد",
		),
	is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

function toCreateReq(d: FormData): CreateConsultantReq {
	return {
		name: d.name,
		legal_name: d.legal_name || undefined,
		registration_no: d.registration_no || undefined,
		tax_id: d.tax_id || undefined,
		specialization: d.specialization || undefined,
		license_no: d.license_no || undefined,
		license_expiry: d.license_expiry || undefined,
		default_currency: d.default_currency || "IRR",
		rating: d.rating ? Number(d.rating) : undefined,
		is_active: d.is_active ?? true,
	};
}

function toUpdateReq(d: FormData): UpdateConsultantReq {
	return {
		name: d.name,
		legal_name: d.legal_name ?? "",
		registration_no: d.registration_no ?? "",
		tax_id: d.tax_id ?? "",
		specialization: d.specialization ?? "",
		license_no: d.license_no ?? "",
		license_expiry: d.license_expiry ?? "",
		default_currency: d.default_currency || "IRR",
		rating: d.rating ? Number(d.rating) : undefined,
		is_active: d.is_active ?? true,
	};
}

export default function ConsultantsPage() {
	const qc = useQueryClient();
	const user = useAuthStore((s) => s.user);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [companyFilter, setCompanyFilter] = useState<string | undefined>(undefined);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Consultant | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const isAdmin = user?.roles?.some((r) => r === "sudoer" || r === "admin") ?? false;
	const canWrite = user?.roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

	const canMutate = (c: Consultant) =>
		isAdmin || !c.company_id || c.company_id === user?.companyId;

	const { data, isLoading } = useQuery({
		queryKey: ["consultants", page, search, companyFilter],
		queryFn: () => consultantsApi.list(page, 20, search || undefined, companyFilter),
	});

	const consultants = data?.data?.data ?? [];
	const total = data?.data?.total ?? 0;

	const invalidate = () => qc.invalidateQueries({ queryKey: ["consultants"] });

	const defaultValues: FormData = { name: "", default_currency: "IRR", is_active: true };

	const createForm = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });
	const editForm = useForm<FormData>({ resolver: zodResolver(schema), defaultValues });

	const createMutation = useMutation({
		mutationFn: (req: CreateConsultantReq) => consultantsApi.create(req),
		onSuccess: () => {
			invalidate();
			setCreateOpen(false);
			createForm.reset(defaultValues);
			toast.success("مشاور با موفقیت ایجاد شد");
		},
		onError: (e) =>
			toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در ایجاد مشاور"),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, req }: { id: string; req: UpdateConsultantReq }) =>
			consultantsApi.update(id, req),
		onSuccess: () => {
			invalidate();
			setEditTarget(null);
			editForm.reset(defaultValues);
			toast.success("مشاور با موفقیت ویرایش شد");
		},
		onError: (e) =>
			toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در ویرایش مشاور"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => consultantsApi.delete(id),
		onSuccess: () => {
			invalidate();
			setDeleteTarget(null);
			toast.success("مشاور حذف شد");
		},
		onError: (e) =>
			toast.error(e instanceof ApiError ? e.detail || e.title : "خطا در حذف مشاور"),
	});

	const openEdit = (c: Consultant) => {
		editForm.reset({
			name: c.name,
			legal_name: c.legal_name ?? "",
			registration_no: c.registration_no ?? "",
			tax_id: c.tax_id ?? "",
			specialization: c.specialization ?? "",
			license_no: c.license_no ?? "",
			license_expiry: c.license_expiry ? c.license_expiry.slice(0, 10) : "",
			default_currency: c.default_currency ?? "IRR",
			rating: c.rating != null ? String(c.rating) : "",
			is_active: c.is_active,
		});
		setEditTarget(c);
	};

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between flex-wrap gap-3'>
				<h1 className='text-2xl font-bold text-primary'>شرکت‌های مهندسین مشاور</h1>
				<div className='flex gap-3 flex-wrap'>
					{isAdmin && (
						<div className='w-52'>
							<CompanyCombobox
								value={companyFilter}
								onChange={(id) => { setCompanyFilter(id); setPage(1); }}
							/>
						</div>
					)}
					<input
						value={search}
						onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						placeholder='جستجو...'
						className='border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48'
					/>
					{canWrite && (
						<button
							onClick={() => { createForm.reset(defaultValues); setCreateOpen(true); }}
							className='flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition'
						>
							<Plus size={16} />
							مشاور جدید
						</button>
					)}
				</div>
			</div>

			<DataTable
				columns={[
					{ key: "name", header: "نام" },
					{
						key: "specialization",
						header: "تخصص",
						render: (r) => (
							<span className='text-sm'>
								{SPEC_LABELS[r.specialization ?? ""] ?? r.specialization ?? "—"}
							</span>
						),
					},
					{
						key: "license_no",
						header: "شماره پروانه",
						render: (r) => (
							<span className='font-mono text-sm'>{r.license_no || "—"}</span>
						),
					},
					{
						key: "registration_no",
						header: "شماره ثبت",
						render: (r) => (
							<span className='font-mono text-sm'>{r.registration_no || "—"}</span>
						),
					},
					{ key: "default_currency", header: "ارز" },
					{
						key: "rating",
						header: "امتیاز",
						render: (r) => <span>{r.rating != null ? `${r.rating}/5` : "—"}</span>,
					},
					{
						key: "is_active",
						header: "وضعیت",
						render: (r) => (
							<span
								className={`text-xs font-medium px-2 py-0.5 rounded-full ${
									r.is_active
										? "bg-green-100 text-green-700"
										: "bg-red-100 text-red-600"
								}`}
							>
								{r.is_active ? "فعال" : "غیرفعال"}
							</span>
						),
					},
					{
						key: "actions",
						header: "",
						render: (r) =>
							canMutate(r) && canWrite ? (
								<div className='flex gap-2'>
									<button
										onClick={(e) => { e.stopPropagation(); openEdit(r); }}
										className='text-xs text-primary hover:underline flex items-center gap-1'
									>
										<Pencil size={12} />
										ویرایش
									</button>
									<button
										onClick={(e) => { e.stopPropagation(); setDeleteTarget(r.id); }}
										className='text-xs bg-red-600 rounded-sm px-2 py-0.5 text-amber-50 hover:bg-red-700'
									>
										حذف
									</button>
								</div>
							) : null,
					},
				]}
				data={consultants}
				isLoading={isLoading}
				keyExtractor={(r) => r.id}
				emptyMessage='مشاوری یافت نشد'
			/>

			{total > 20 && (
				<div className='flex items-center justify-between text-sm text-muted-foreground'>
					<span>{total} مشاور</span>
					<div className='flex gap-2'>
						<button
							disabled={page === 1}
							onClick={() => setPage((p) => p - 1)}
							className='px-3 py-1 border rounded disabled:opacity-40'
						>
							قبلی
						</button>
						<button
							disabled={page * 20 >= total}
							onClick={() => setPage((p) => p + 1)}
							className='px-3 py-1 border rounded disabled:opacity-40'
						>
							بعدی
						</button>
					</div>
				</div>
			)}

			{/* Create */}
			<Sheet
				open={createOpen}
				onClose={() => { setCreateOpen(false); createForm.reset(defaultValues); }}
				title='مشاور جدید'
			>
				<ConsultantForm
					form={createForm}
					isPending={createMutation.isPending}
					onSubmit={createForm.handleSubmit((d) => createMutation.mutate(toCreateReq(d)))}
					submitLabel='ذخیره'
				/>
			</Sheet>

			{/* Edit */}
			<Sheet
				open={!!editTarget}
				onClose={() => { setEditTarget(null); editForm.reset(defaultValues); }}
				title='ویرایش مشاور'
			>
				<ConsultantForm
					form={editForm}
					isPending={updateMutation.isPending}
					onSubmit={editForm.handleSubmit(
						(d) => editTarget && updateMutation.mutate({ id: editTarget.id, req: toUpdateReq(d) }),
					)}
					submitLabel='ذخیره تغییرات'
				/>
			</Sheet>

			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
				title='حذف مشاور'
				description='آیا از حذف این شرکت مشاور مطمئن هستید؟ این عمل برگشت‌پذیر نیست.'
				confirmLabel='حذف'
				confirmClassName='bg-status-rejected text-white'
				isPending={deleteMutation.isPending}
			/>
		</div>
	);
}

// ── shared form component ──────────────────────────────────────────────────

function ConsultantForm({
	form,
	isPending,
	onSubmit,
	submitLabel,
}: {
	form: UseFormReturn<FormData>;
	isPending: boolean;
	onSubmit: () => void;
	submitLabel: string;
}) {
	const { register, control, watch, setValue, formState: { errors } } = form;
	const isActive = watch("is_active") ?? true;

	return (
		<form onSubmit={onSubmit} className='space-y-4'>
			<Field label='نام شرکت' error={errors.name?.message}>
				<input {...register("name")} className={inputCls} />
			</Field>

			<Field label='نام حقوقی (اختیاری)'>
				<input {...register("legal_name")} className={inputCls} />
			</Field>

			<Field label='تخصص'>
				<select {...register("specialization")} className={inputCls}>
					{SPECIALIZATIONS.map((s) => (
						<option key={s} value={s}>
							{SPEC_LABELS[s]}
						</option>
					))}
				</select>
			</Field>

			<div className='grid grid-cols-2 gap-3'>
				<Field label='شماره پروانه مهندسی'>
					<input {...register("license_no")} className={inputCls} dir='ltr' />
				</Field>
				<Field label='تاریخ انقضای پروانه'>
					<Controller
						control={control}
						name='license_expiry'
						render={({ field }) => (
							<PersianDatePicker
								value={field.value ?? ""}
								onChange={field.onChange}
								inputClass={inputCls}
							/>
						)}
					/>
				</Field>
			</div>

			<div className='grid grid-cols-2 gap-3'>
				<Field label='شماره ثبت'>
					<input {...register("registration_no")} className={inputCls} dir='ltr' />
				</Field>
				<Field label='شناسه مالیاتی'>
					<input {...register("tax_id")} className={inputCls} dir='ltr' />
				</Field>
			</div>

			<div className='grid grid-cols-2 gap-3'>
				<Field label='ارز پیش‌فرض'>
					<select {...register("default_currency")} className={inputCls} dir='ltr'>
						{CURRENCIES.map((c) => (
							<option key={c.code} value={c.code}>{c.label}</option>
						))}
					</select>
				</Field>
				<Field label='امتیاز (۰–۵)' error={errors.rating?.message}>
					<input
						{...register("rating")}
						type='number'
						min={0}
						max={5}
						step={0.1}
						className={inputCls}
						dir='ltr'
					/>
				</Field>
			</div>

			<Field label='وضعیت'>
				<div className='flex rounded-lg border overflow-hidden'>
					<button
						type='button'
						onClick={() => setValue("is_active", true, { shouldDirty: true })}
						className={`flex-1 py-2 text-sm font-medium transition border-l ${
							isActive
								? "bg-status-approved/10 text-status-approved"
								: "text-muted-foreground hover:bg-muted/40"
						}`}
					>
						فعال
					</button>
					<button
						type='button'
						onClick={() => setValue("is_active", false, { shouldDirty: true })}
						className={`flex-1 py-2 text-sm font-medium transition ${
							!isActive
								? "bg-status-rejected/10 text-status-rejected"
								: "text-muted-foreground hover:bg-muted/40"
						}`}
					>
						غیرفعال
					</button>
				</div>
			</Field>

			<button
				type='submit'
				disabled={isPending}
				className='w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition'
			>
				{isPending ? "در حال ذخیره..." : submitLabel}
			</button>
		</form>
	);
}

const inputCls =
	"w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Field({
	label,
	error,
	children,
}: {
	label: string;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<label className='block text-sm font-medium mb-1'>{label}</label>
			{children}
			{error && <p className='text-xs text-status-rejected mt-1'>{error}</p>}
		</div>
	);
}
