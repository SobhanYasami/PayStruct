"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ShieldAlert, Pencil, Crown } from "lucide-react";
import toast from "react-hot-toast";
import {
	employeesApi,
	type Employee,
	type CreateEmployeeReq,
	type UpdateEmployeeReq,
} from "@/lib/api/employees";
import { companiesApi } from "@/lib/api/companies";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { CompanyCombobox } from "@/components/domain/CompanyCombobox";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { useAuthStore } from "@/lib/stores/auth";
import { ApiError } from "@/lib/api/client";

const HEAD_ROLES = [
	"manager",
	"finance_head",
	"juridical_head",
	"engineering_head",
	"security_head",
];
const REGULAR_ROLES = ["admin", "finance", "engineering", "security"];

const ROLE_LABELS: Record<string, string> = {
	manager: "مدیر",
	finance_head: "مدیر مالی",
	juridical_head: "مدیر حقوقی",
	engineering_head: "مدیر فنی",
	security_head: "مدیر امنیت",
	admin: "ادمین",
	finance: "مالی",
	engineering: "فنی",
	security: "امنیت",
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
	official: "رسمی",
	contractual: "قراردادی",
};

const createSchema = z.object({
	company_id: z.string().min(1, "شرکت الزامی است"),
	first_name: z.string().min(1, "نام الزامی است"),
	last_name: z.string().min(1, "نام خانوادگی الزامی است"),
	email: z.string().email("ایمیل نامعتبر است"),
	password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر"),
	national_id: z.string().optional(),
	phone: z.string().optional(),
	employment_type: z.enum(["official", "contractual"]),
	roles: z.array(z.string()),
});

const editSchema = z.object({
	first_name: z.string().min(1, "نام الزامی است"),
	last_name: z.string().min(1, "نام خانوادگی الزامی است"),
	email: z.string().email("ایمیل نامعتبر است"),
	password: z
		.string()
		.min(6, "رمز عبور حداقل ۶ کاراکتر")
		.optional()
		.or(z.literal("")),
	phone: z.string().optional(),
	company_id: z.string().optional(),
	employment_type: z.enum(["official", "contractual"]),
	roles: z.array(z.string()),
	active: z.boolean(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

function RolePicker({
	value,
	onChange,
}: {
	value: string[];
	onChange: (roles: string[]) => void;
}) {
	const toggle = (role: string) => {
		onChange(
			value.includes(role) ? value.filter((r) => r !== role) : [...value, role],
		);
	};

	const RoleBtn = ({ role }: { role: string }) => (
		<button
			type='button'
			onClick={() => toggle(role)}
			className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
				value.includes(role)
					? "bg-primary text-primary-foreground border-primary"
					: "bg-transparent text-muted-foreground border-border hover:border-primary"
			}`}
		>
			{ROLE_LABELS[role] ?? role}
		</button>
	);

	return (
		<div className='space-y-2'>
			<div>
				<p className='text-xs text-muted-foreground mb-1.5'>
					نقش‌های مدیریتی (صاحب امضا)
				</p>
				<div className='flex flex-wrap gap-2'>
					{HEAD_ROLES.map((r) => (
						<RoleBtn
							key={r}
							role={r}
						/>
					))}
				</div>
			</div>
			<div>
				<p className='text-xs text-muted-foreground mb-1.5'>نقش‌های عملیاتی</p>
				<div className='flex flex-wrap gap-2'>
					{REGULAR_ROLES.map((r) => (
						<RoleBtn
							key={r}
							role={r}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

export default function EmployeesPage() {
	const { user } = useAuthStore();
	const qc = useQueryClient();
	const [page, setPage] = useState(1);
	const [companyFilter, setCompanyFilter] = useState<string | undefined>(undefined);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Employee | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const isSuperAdmin =
		user?.roles?.includes("sudoer") || user?.roles?.includes("admin");
	const isManager = !!user?.roles?.includes("manager");
	const isHead = HEAD_ROLES.some((r) => user?.roles?.includes(r));
	const canWrite = isSuperAdmin || isManager;

	const { data, isLoading } = useQuery({
		queryKey: ["employees", page, companyFilter],
		queryFn: () => employeesApi.list(page, 20, isSuperAdmin ? companyFilter : undefined),
		enabled: !!(isSuperAdmin || isHead),
	});

	const employees = data?.data?.data ?? [];
	const total = data?.data?.total ?? 0;
	const adminCount = employees.filter((e) => e.roles?.includes("admin") || e.roles?.includes("sudoer")).length;

	const { data: companiesData } = useQuery({
		queryKey: ["companies-all"],
		queryFn: () => companiesApi.list(1, 200),
		enabled: !!(isSuperAdmin || isHead),
	});
	const companyNameById = new Map((companiesData?.data?.data ?? []).map((c) => [c.id, c.name]));

	const createForm = useForm<CreateFormData>({
		resolver: zodResolver(createSchema),
		defaultValues: {
			company_id: user?.companyId ?? "",
			employment_type: "official",
			roles: [],
		},
	});

	const editForm = useForm<EditFormData>({
		resolver: zodResolver(editSchema),
		defaultValues: { employment_type: "official", roles: [], active: true },
	});

	const invalidate = () => qc.invalidateQueries({ queryKey: ["employees"] });

	const createMutation = useMutation({
		mutationFn: (req: CreateEmployeeReq) => employeesApi.create(req),
		onSuccess: () => {
			invalidate();
			setCreateOpen(false);
			createForm.reset({
				company_id: user?.companyId ?? "",
				employment_type: "official",
				roles: [],
			});
			toast.success("کارمند با موفقیت ایجاد شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در ایجاد کارمند",
			),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, req }: { id: string; req: UpdateEmployeeReq }) =>
			employeesApi.update(id, req),
		onSuccess: () => {
			invalidate();
			setEditTarget(null);
			editForm.reset();
			toast.success("کارمند با موفقیت ویرایش شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در ویرایش کارمند",
			),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => employeesApi.delete(id),
		onSuccess: () => {
			invalidate();
			setDeleteTarget(null);
			toast.success("کارمند حذف شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در حذف کارمند",
			),
	});

	if (!isSuperAdmin && !isHead) {
		return (
			<div className='flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground'>
				<ShieldAlert
					size={48}
					className='text-status-rejected/50'
				/>
				<p className='text-sm'>
					دسترسی ندارید. این صفحه فقط برای مدیران و ادمین‌های سیستم قابل مشاهده است.
				</p>
			</div>
		);
	}

	const openEdit = (emp: Employee) => {
		editForm.reset({
			first_name: emp.first_name,
			last_name: emp.last_name,
			email: emp.email,
			phone: emp.phone ?? "",
			employment_type:
				(emp.employment_type as "official" | "contractual") ?? "official",
			roles: emp.roles ?? [],
			active: emp.active,
			password: "",
		});
		setEditTarget(emp);
	};

	const onCreateSubmit = (d: CreateFormData) => {
		const req: CreateEmployeeReq = {
			company_id: d.company_id,
			first_name: d.first_name,
			last_name: d.last_name,
			email: d.email,
			password: d.password,
			employment_type: d.employment_type,
			roles: d.roles,
			...(d.national_id && { national_id: d.national_id }),
			...(d.phone && { phone: d.phone }),
		};
		createMutation.mutate(req);
	};

	const onEditSubmit = (d: EditFormData) => {
		if (!editTarget) return;
		const req: UpdateEmployeeReq = {
			first_name: d.first_name,
			last_name: d.last_name,
			email: d.email,
			employment_type: d.employment_type,
			roles: d.roles,
			active: d.active,
			...(d.phone && { phone: d.phone }),
			...(d.password && { password: d.password }),
		};
		updateMutation.mutate({ id: editTarget.id, req });
	};

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between flex-wrap gap-3'>
				<h1 className='text-2xl font-bold text-primary'>کارمندان</h1>
				<div className='flex gap-3 flex-wrap'>
					{isSuperAdmin && (
						<div className='w-52'>
							<CompanyCombobox
								value={companyFilter}
								onChange={(id) => { setCompanyFilter(id); setPage(1); }}
							/>
						</div>
					)}
					{canWrite && (
						<button
							onClick={() => {
								createForm.reset({
									company_id: user?.companyId ?? "",
									employment_type: "official",
									roles: [],
								});
								setCreateOpen(true);
							}}
							className='flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition'
						>
							<Plus size={16} />
							کارمند جدید
						</button>
					)}
				</div>
			</div>

			<DataTable
				columns={[
					{
						key: "name",
						header: "نام",
						render: (r) => (
							<div className='flex items-center gap-2'>
								<span>
									{r.first_name} {r.last_name}
								</span>
								{r.is_head && (
									<Crown
										size={12}
										className='text-saffron'
									/>
								)}
							</div>
						),
					},
					{
						key: "email",
						header: "ایمیل",
						render: (r) => <span className='font-mono text-sm'>{r.email}</span>,
					},
					{
						key: "company",
						header: "شرکت",
						render: (r) => (
							<span className='text-sm text-muted-foreground'>
								{companyNameById.get(r.company_id) ?? "—"}
							</span>
						),
					},
					{
						key: "employment_type",
						header: "نوع استخدام",
						render: (r) => (
							<span
								className={`px-2 py-0.5 rounded-full text-xs font-medium ${
									r.employment_type === "official"
										? "bg-status-approved/10 text-status-approved"
										: "bg-status-submitted/10 text-status-submitted"
								}`}
							>
								{EMPLOYMENT_TYPE_LABELS[r.employment_type] ?? r.employment_type}
							</span>
						),
					},
					{
						key: "roles",
						header: "نقش‌ها",
						render: (r) => (
							<div className='flex gap-1 flex-wrap max-w-xs'>
								{r.roles.map((role) => (
									<span
										key={role}
										className='px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs'
									>
										{ROLE_LABELS[role] ?? role}
									</span>
								))}
							</div>
						),
					},
					{
						key: "active",
						header: "وضعیت",
						render: (r) => (
							<span
								className={`text-xs font-medium ${r.active ? "text-status-approved" : "text-status-rejected"}`}
							>
								{r.active ? "فعال" : "غیرفعال"}
							</span>
						),
					},
					...(canWrite ? [{
						key: "actions",
						header: "",
						render: (r: Employee) => (
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
									disabled={(r.roles?.includes("admin") || r.roles?.includes("sudoer")) && adminCount <= 1}
									className='text-xs bg-red-600 px-2 py-0.5 rounded-md text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed'
								>
									حذف
								</button>
							</div>
						),
					}] : []),
				]}
				data={employees}
				isLoading={isLoading}
				keyExtractor={(r) => r.id}
				emptyMessage='کارمندی یافت نشد'
			/>

			{total > 20 && (
				<div className='flex items-center justify-between text-sm text-muted-foreground'>
					<span>{total} کارمند</span>
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
					createForm.reset();
				}}
				title='کارمند جدید'
			>
				<form
					onSubmit={createForm.handleSubmit(onCreateSubmit)}
					className='space-y-4'
				>
					<Field
						label='شرکت'
						error={createForm.formState.errors.company_id?.message}
					>
						<Controller
							control={createForm.control}
							name='company_id'
							render={({ field }) => (
								<CompanyCombobox
									value={field.value || undefined}
									onChange={(id) => field.onChange(id ?? "")}
								/>
							)}
						/>
					</Field>

					<div className='grid grid-cols-2 gap-3'>
						<Field
							label='نام'
							error={createForm.formState.errors.first_name?.message}
						>
							<input
								{...createForm.register("first_name")}
								className={inputCls}
							/>
						</Field>
						<Field
							label='نام خانوادگی'
							error={createForm.formState.errors.last_name?.message}
						>
							<input
								{...createForm.register("last_name")}
								className={inputCls}
							/>
						</Field>
					</div>

					<Field
						label='ایمیل'
						error={createForm.formState.errors.email?.message}
					>
						<input
							{...createForm.register("email")}
							type='email'
							className={inputCls}
							dir='ltr'
						/>
					</Field>
					<Field
						label='رمز عبور'
						error={createForm.formState.errors.password?.message}
					>
						<input
							{...createForm.register("password")}
							type='password'
							className={inputCls}
							dir='ltr'
						/>
					</Field>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='کد ملی'>
							<input
								{...createForm.register("national_id")}
								className={inputCls}
								dir='ltr'
							/>
						</Field>
						<Field label='تلفن'>
							<input
								{...createForm.register("phone")}
								className={inputCls}
								dir='ltr'
							/>
						</Field>
					</div>

					<Field label='نوع استخدام'>
						<select
							{...createForm.register("employment_type")}
							className={inputCls}
						>
							<option value='official'>رسمی</option>
							<option value='contractual'>قراردادی</option>
						</select>
					</Field>

					<Field label='نقش‌ها'>
						<Controller
							control={createForm.control}
							name='roles'
							render={({ field }) => (
								<RolePicker
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
					</Field>

					<button
						type='submit'
						disabled={createMutation.isPending}
						className='w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition'
					>
						{createMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
					</button>
				</form>
			</Sheet>

			{/* Edit */}
			<Sheet
				open={!!editTarget}
				onClose={() => {
					setEditTarget(null);
					editForm.reset();
				}}
				title='ویرایش کارمند'
			>
				<form
					onSubmit={editForm.handleSubmit(onEditSubmit)}
					className='space-y-4'
				>
					<div className='grid grid-cols-2 gap-3'>
						<Field
							label='نام'
							error={editForm.formState.errors.first_name?.message}
						>
							<input
								{...editForm.register("first_name")}
								className={inputCls}
							/>
						</Field>
						<Field
							label='نام خانوادگی'
							error={editForm.formState.errors.last_name?.message}
						>
							<input
								{...editForm.register("last_name")}
								className={inputCls}
							/>
						</Field>
					</div>

					<Field
						label='ایمیل'
						error={editForm.formState.errors.email?.message}
					>
						<input
							{...editForm.register("email")}
							type='email'
							className={inputCls}
							dir='ltr'
						/>
					</Field>
					<Field
						label='رمز عبور جدید (اختیاری)'
						error={editForm.formState.errors.password?.message}
					>
						<input
							{...editForm.register("password")}
							type='password'
							className={inputCls}
							dir='ltr'
							placeholder='خالی = بدون تغییر'
						/>
					</Field>

					<Field label='تلفن'>
						<input
							{...editForm.register("phone")}
							className={inputCls}
							dir='ltr'
						/>
					</Field>

					<Field label='نوع استخدام'>
						<select
							{...editForm.register("employment_type")}
							className={inputCls}
						>
							<option value='official'>رسمی</option>
							<option value='contractual'>قراردادی</option>
						</select>
					</Field>

					<Field label='نقش‌ها'>
						<Controller
							control={editForm.control}
							name='roles'
							render={({ field }) => (
								<RolePicker
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
					</Field>

					<Field label='وضعیت'>
						<label className='flex items-center gap-2 cursor-pointer'>
							<input
								{...editForm.register("active")}
								type='checkbox'
								className='w-4 h-4 accent-primary'
							/>
							<span className='text-sm'>حساب فعال است</span>
						</label>
					</Field>

					<button
						type='submit'
						disabled={updateMutation.isPending}
						className='w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition'
					>
						{updateMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
					</button>
				</form>
			</Sheet>

			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
				title='حذف کارمند'
				description='آیا از حذف این کارمند مطمئن هستید؟ این عمل برگشت‌پذیر نیست.'
				confirmLabel='حذف'
				confirmClassName='bg-status-rejected text-white'
				isPending={deleteMutation.isPending}
			/>
		</div>
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
