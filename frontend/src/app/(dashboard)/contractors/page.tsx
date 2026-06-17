"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import {
	contractorsApi,
	type Contractor,
	type CreateContractorReq,
	type UpdateContractorReq,
} from "@/lib/api/contractors";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { CompanyCombobox } from "@/components/domain/CompanyCombobox";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth";

const schema = z
	.object({
		type: z.enum(["individual", "company"]),
		first_name: z.string().optional(),
		last_name: z.string().optional(),
		company_name: z.string().optional(),
		legal_name: z.string().optional(),
		tax_id: z.string().optional(),
		registration_no: z.string().optional(),
		national_id: z.string().optional(),
		preferential_id: z.string().optional(),
		default_currency: z.string().max(3).optional(),
		rating: z
			.string()
			.optional()
			.refine(
				(v) => !v || (!isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 5),
				"امتیاز باید بین ۰ و ۵ باشد",
			),
	})
	.superRefine((d, ctx) => {
		if (
			d.type === "individual" &&
			!d.first_name?.trim() &&
			!d.last_name?.trim()
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "نام یا نام خانوادگی الزامی است",
				path: ["first_name"],
			});
		}
		if (d.type === "company" && !d.company_name?.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "نام شرکت الزامی است",
				path: ["company_name"],
			});
		}
	});

type FormData = z.infer<typeof schema>;

function toReq(d: FormData): CreateContractorReq {
	return {
		type: d.type,
		first_name: d.first_name || undefined,
		last_name: d.last_name || undefined,
		company_name: d.company_name || undefined,
		legal_name: d.legal_name || undefined,
		tax_id: d.tax_id || undefined,
		registration_no: d.registration_no || undefined,
		national_id: d.national_id || undefined,
		preferential_id: d.preferential_id || undefined,
		default_currency: d.default_currency || "IRR",
		rating: d.rating ? Number(d.rating) : undefined,
	};
}

export default function ContractorsPage() {
	const qc = useQueryClient();
	const user = useAuthStore((s) => s.user);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [companyFilter, setCompanyFilter] = useState<string | undefined>(undefined);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Contractor | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const isAdmin =
		user?.roles?.some((r) => r === "sudoer" || r === "admin") ?? false;

	const canMutate = (contractor: Contractor) =>
		isAdmin ||
		!contractor.company_id ||
		contractor.company_id === user?.companyId;

	const { data, isLoading } = useQuery({
		queryKey: ["contractors", page, search, companyFilter],
		queryFn: () => contractorsApi.list(page, 20, search || undefined, companyFilter),
	});

	const contractors = data?.data?.data ?? [];
	const total = data?.data?.total ?? 0;

	const invalidate = () => qc.invalidateQueries({ queryKey: ["contractors"] });

	const createForm = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { type: "company", default_currency: "IRR" },
	});
	const editForm = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { type: "company", default_currency: "IRR" },
	});

	const createType = createForm.watch("type");
	const editType = editForm.watch("type");

	const createMutation = useMutation({
		mutationFn: (req: CreateContractorReq) => contractorsApi.create(req),
		onSuccess: () => {
			invalidate();
			setCreateOpen(false);
			createForm.reset({ type: "company", default_currency: "IRR" });
			toast.success("پیمانکار با موفقیت ایجاد شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در ایجاد پیمانکار",
			),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, req }: { id: string; req: UpdateContractorReq }) =>
			contractorsApi.update(id, req),
		onSuccess: () => {
			invalidate();
			setEditTarget(null);
			editForm.reset({ type: "company", default_currency: "IRR" });
			toast.success("پیمانکار با موفقیت ویرایش شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در ویرایش پیمانکار",
			),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => contractorsApi.delete(id),
		onSuccess: () => {
			invalidate();
			setDeleteTarget(null);
			toast.success("پیمانکار حذف شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در حذف پیمانکار",
			),
	});

	const openEdit = (contractor: Contractor) => {
		editForm.reset({
			type: contractor.type,
			first_name: contractor.first_name ?? "",
			last_name: contractor.last_name ?? "",
			company_name: contractor.company_name ?? "",
			legal_name: contractor.legal_name ?? "",
			tax_id: contractor.tax_id ?? "",
			registration_no: contractor.registration_no ?? "",
			national_id: contractor.national_id ?? "",
			preferential_id: contractor.preferential_id ?? "",
			default_currency: contractor.default_currency ?? "IRR",
			rating: contractor.rating != null ? String(contractor.rating) : "",
		});
		setEditTarget(contractor);
	};

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between flex-wrap gap-3'>
				<h1 className='text-2xl font-bold text-primary'>پیمانکاران</h1>
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
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						placeholder='جستجو...'
						className='border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48'
					/>
					<button
						onClick={() => {
							createForm.reset({ type: "company", default_currency: "IRR" });
							setCreateOpen(true);
						}}
						className='flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition'
					>
						<Plus size={16} />
						پیمانکار جدید
					</button>
				</div>
			</div>

			<DataTable
				columns={[
					{ key: "display_name", header: "نام" },
					{
						key: "type",
						header: "نوع",
						render: (r) => <StatusBadge status={r.type} />,
					},
					{
						key: "preferential_id",
						header: "شناسه تفضیلی",
						render: (r) => (
							<span className='font-mono text-sm'>
								{r.preferential_id || "—"}
							</span>
						),
					},
					{
						key: "national_id",
						header: "کد ملی / شناسه",
						render: (r) => (
							<span className='font-mono text-sm'>
								{r.national_id || r.tax_id || "—"}
							</span>
						),
					},
					{ key: "default_currency", header: "ارز" },
					{
						key: "rating",
						header: "امتیاز",
						render: (r) => (
							<span>{r.rating != null ? `${r.rating}/5` : "—"}</span>
						),
					},
					{
						key: "actions",
						header: "",
						render: (r) =>
							canMutate(r) ? (
								<div className='flex gap-2'>
									<button
										onClick={(e) => {
											e.stopPropagation();
											openEdit(r);
										}}
										className='text-xs text-primary hover:underline flex items-center gap-1'
									>
										<Pencil size={12} />
										ویرایش
									</button>
									<button
										onClick={(e) => {
											e.stopPropagation();
											setDeleteTarget(r.id);
										}}
										className='text-xs bg-red-600 rounded-sm px-2 py-0.5 text-amber-50 hover:bg-red-700'
									>
										حذف
									</button>
								</div>
							) : null,
					},
				]}
				data={contractors}
				isLoading={isLoading}
				keyExtractor={(r) => r.id}
				emptyMessage='پیمانکاری یافت نشد'
			/>

			{total > 20 && (
				<div className='flex items-center justify-between text-sm text-muted-foreground'>
					<span>{total} پیمانکار</span>
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
				onClose={() => {
					setCreateOpen(false);
					createForm.reset({ type: "company", default_currency: "IRR" });
				}}
				title='پیمانکار جدید'
			>
				<ContractorForm
					form={createForm}
					type={createType}
					isPending={createMutation.isPending}
					onSubmit={createForm.handleSubmit((d) =>
						createMutation.mutate(toReq(d)),
					)}
					submitLabel='ذخیره'
				/>
			</Sheet>

			{/* Edit */}
			<Sheet
				open={!!editTarget}
				onClose={() => {
					setEditTarget(null);
					editForm.reset({ type: "company", default_currency: "IRR" });
				}}
				title='ویرایش پیمانکار'
			>
				<ContractorForm
					form={editForm}
					type={editType}
					isPending={updateMutation.isPending}
					onSubmit={editForm.handleSubmit(
						(d) =>
							editTarget &&
							updateMutation.mutate({ id: editTarget.id, req: toReq(d) }),
					)}
					submitLabel='ذخیره تغییرات'
				/>
			</Sheet>

			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
				title='حذف پیمانکار'
				description='آیا از حذف این پیمانکار مطمئن هستید؟ این عمل برگشت‌پذیر نیست.'
				confirmLabel='حذف'
				confirmClassName='bg-status-rejected text-white'
				isPending={deleteMutation.isPending}
			/>
		</div>
	);
}

// ── shared form component ──────────────────────────────────────────────────

function ContractorForm({
	form,
	type,
	isPending,
	onSubmit,
	submitLabel,
}: {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	type: "individual" | "company";
	isPending: boolean;
	onSubmit: () => void;
	submitLabel: string;
}) {
	const {
		register,
		formState: { errors },
	} = form;

	return (
		<form
			onSubmit={onSubmit}
			className='space-y-4'
		>
			<Field
				label='نوع'
				error={errors.type?.message}
			>
				<select
					{...register("type")}
					className={inputCls}
				>
					<option value='company'>حقوقی</option>
					<option value='individual'>حقیقی</option>
				</select>
			</Field>

			{type === "individual" ? (
				<>
					<Field
						label='نام'
						error={errors.first_name?.message}
					>
						<input
							{...register("first_name")}
							className={inputCls}
						/>
					</Field>
					<Field
						label='نام خانوادگی'
						error={errors.last_name?.message}
					>
						<input
							{...register("last_name")}
							className={inputCls}
						/>
					</Field>
					<Field label='کد ملی'>
						<input
							{...register("national_id")}
							className={inputCls}
							dir='ltr'
						/>
					</Field>
				</>
			) : (
				<Field
					label='نام شرکت'
					error={errors.company_name?.message}
				>
					<input
						{...register("company_name")}
						className={inputCls}
					/>
				</Field>
			)}

			<Field label='شناسه تفضیلی'>
				<input
					{...register("preferential_id")}
					className={inputCls}
					dir='ltr'
				/>
			</Field>
			<Field label='نام حقوقی (اختیاری)'>
				<input
					{...register("legal_name")}
					className={inputCls}
				/>
			</Field>
			<Field label='شناسه مالیاتی'>
				<input
					{...register("tax_id")}
					className={inputCls}
					dir='ltr'
				/>
			</Field>
			{type === "company" && (
				<Field label='شماره ثبت'>
					<input
						{...register("registration_no")}
						className={inputCls}
						dir='ltr'
					/>
				</Field>
			)}
			<Field label='ارز پیش‌فرض'>
				<input
					{...register("default_currency")}
					className={inputCls}
					dir='ltr'
					maxLength={3}
				/>
			</Field>
			<Field label='امتیاز (۰–۵)'>
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
