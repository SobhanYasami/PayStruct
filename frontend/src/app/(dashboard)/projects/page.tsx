"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil } from "lucide-react";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import toast from "react-hot-toast";
import {
	projectsApi,
	type Project,
	type CreateProjectReq,
	type UpdateProjectReq,
} from "@/lib/api/projects";
import { companiesApi } from "@/lib/api/companies";
import { useAuthStore } from "@/lib/stores/auth";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { ApiError } from "@/lib/api/client";

const STATUS_TABS = [
	{ key: "", label: "همه" },
	{ key: "planning", label: "برنامه‌ریزی" },
	{ key: "active", label: "فعال" },
	{ key: "on_hold", label: "متوقف" },
	{ key: "completed", label: "تکمیل شده" },
	{ key: "cancelled", label: "لغو شده" },
];

const PRIORITY_LABELS: Record<string, string> = {
	low: "کم",
	medium: "متوسط",
	high: "زیاد",
	critical: "بحرانی",
};

const createSchema = z.object({
	company_id: z.string().min(1, "شرکت الزامی است"),
	code: z.string().min(1, "کد الزامی است"),
	name: z.string().min(1, "نام الزامی است"),
	description: z.string().optional(),
	category: z.string().optional(),
	phase: z.string().optional(),
	status: z.string().optional(),
	priority: z.string().optional(),
	budget_estimate: z.string().optional(),
	currency: z.string().optional(),
	start_date: z.string().optional(),
	end_date: z.string().optional(),
});

const editSchema = z.object({
	name: z.string().min(1, "نام الزامی است"),
	description: z.string().optional(),
	category: z.string().optional(),
	phase: z.string().optional(),
	status: z.string().optional(),
	priority: z.string().optional(),
	budget_estimate: z.string().optional(),
	budget_actual: z.string().optional(),
	currency: z.string().optional(),
	start_date: z.string().optional(),
	end_date: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

function CompanyCombobox({
	value,
	onChange,
}: {
	value: string | undefined;
	onChange: (id: string | undefined) => void;
}) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [selectedLabel, setSelectedLabel] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedQuery(query), 300);
		return () => clearTimeout(t);
	}, [query]);

	const { data, isFetching } = useQuery({
		queryKey: ["companies-search", debouncedQuery],
		queryFn: () => companiesApi.list(1, 30, debouncedQuery),
		enabled: open,
		staleTime: 10_000,
	});

	const results = data?.data?.data ?? [];

	useEffect(() => {
		function handler(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	return (
		<div
			ref={containerRef}
			className='relative'
		>
			<input
				value={value ? selectedLabel || value.slice(0, 8) + "…" : query}
				onChange={(e) => {
					setQuery(e.target.value);
					if (value) {
						onChange(undefined);
						setSelectedLabel("");
					}
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				placeholder='جستجوی شرکت...'
				className={inputCls}
				dir='rtl'
				autoComplete='off'
			/>
			{open && (
				<div className='absolute z-50 w-full bg-white border border-border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto'>
					{isFetching && (
						<p className='px-3 py-2 text-xs text-muted-foreground'>
							در حال جستجو...
						</p>
					)}
					{!isFetching && results.length === 0 && (
						<p className='px-3 py-2 text-xs text-muted-foreground'>
							نتیجه‌ای یافت نشد
						</p>
					)}
					{results.map((c) => (
						<button
							key={c.id}
							type='button'
							onClick={() => {
								onChange(c.id);
								setSelectedLabel(c.name);
								setQuery("");
								setOpen(false);
							}}
							className={`w-full text-right px-3 py-2 text-sm hover:bg-primary/5 flex items-center justify-between gap-2 ${value === c.id ? "bg-primary/10 font-medium" : ""}`}
						>
							<span>{c.name}</span>
							<span className='font-mono text-xs text-muted-foreground'>
								{c.reg_num}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

const WRITE_ROLES = ["manager", "engineering_head", "sudoer", "admin"];

export default function ProjectsPage() {
	const router = useRouter();
	const qc = useQueryClient();
	const user = useAuthStore((s) => s.user);
	const canWrite = user?.roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;
	const isSuperAdmin = user?.roles?.some((r) => ["sudoer", "admin"].includes(r)) ?? false;
	const [statusFilter, setStatusFilter] = useState("");
	const [page, setPage] = useState(1);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Project | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["projects", statusFilter, page],
		queryFn: () => projectsApi.list(page, 20, statusFilter || undefined),
	});

	const projects = data?.data?.data ?? [];
	const total = data?.data?.total ?? 0;

	const createForm = useForm<CreateFormData>({
		resolver: zodResolver(createSchema),
		defaultValues: {
			company_id: isSuperAdmin ? "" : (user?.companyId ?? ""),
			status: "planning",
			priority: "medium",
			currency: "IRR",
		},
	});

	const editForm = useForm<EditFormData>({
		resolver: zodResolver(editSchema),
		defaultValues: { status: "planning", priority: "medium", currency: "IRR" },
	});

	const invalidate = () => qc.invalidateQueries({ queryKey: ["projects"] });

	const createMutation = useMutation({
		mutationFn: (req: CreateProjectReq) => projectsApi.create(req),
		onSuccess: () => {
			invalidate();
			setCreateOpen(false);
			createForm.reset({
				company_id: isSuperAdmin ? "" : (user?.companyId ?? ""),
				status: "planning",
				priority: "medium",
				currency: "IRR",
			});
			toast.success("پروژه با موفقیت ایجاد شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در ایجاد پروژه",
			),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, req }: { id: string; req: UpdateProjectReq }) =>
			projectsApi.update(id, req),
		onSuccess: () => {
			invalidate();
			setEditTarget(null);
			editForm.reset();
			toast.success("پروژه با موفقیت ویرایش شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در ویرایش پروژه",
			),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => projectsApi.delete(id),
		onSuccess: () => {
			invalidate();
			setDeleteTarget(null);
			toast.success("پروژه حذف شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در حذف پروژه",
			),
	});

	const openEdit = (p: Project) => {
		editForm.reset({
			name: p.name,
			description: p.description ?? "",
			category: p.category ?? "",
			phase: p.phase ?? "",
			status: p.status,
			priority: p.priority,
			budget_estimate: p.budget_estimate ?? "",
			budget_actual: p.budget_actual ?? "",
			currency: p.currency,
			start_date: p.start_date?.slice(0, 10) ?? "",
			end_date: p.end_date?.slice(0, 10) ?? "",
		});
		setEditTarget(p);
	};

	const onCreateSubmit = (d: CreateFormData) => {
		const req: CreateProjectReq = {
			company_id: d.company_id,
			code: d.code,
			name: d.name,
			...(d.description && { description: d.description }),
			...(d.category && { category: d.category }),
			...(d.phase && { phase: d.phase }),
			status: d.status,
			priority: d.priority,
			budget_estimate: d.budget_estimate,
			currency: d.currency,
			...(d.start_date && { start_date: d.start_date }),
			...(d.end_date && { end_date: d.end_date }),
		};
		createMutation.mutate(req);
	};

	const onEditSubmit = (d: EditFormData) => {
		if (!editTarget) return;
		const req: UpdateProjectReq = {
			name: d.name,
			description: d.description,
			category: d.category,
			phase: d.phase,
			status: d.status,
			priority: d.priority,
			budget_estimate: d.budget_estimate,
			budget_actual: d.budget_actual,
			currency: d.currency,
			...(d.start_date ? { start_date: d.start_date } : { start_date: "" }),
			...(d.end_date ? { end_date: d.end_date } : { end_date: "" }),
		};
		updateMutation.mutate({ id: editTarget.id, req });
	};

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between'>
				<h1 className='text-2xl font-bold text-primary'>پروژه‌ها</h1>
				{canWrite && (
					<button
						onClick={() => {
							createForm.reset({
								company_id: isSuperAdmin ? "" : (user?.companyId ?? ""),
								status: "planning",
								priority: "medium",
								currency: "IRR",
							});
							setCreateOpen(true);
						}}
						className='flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition'
					>
						<Plus size={16} />
						پروژه جدید
					</button>
				)}
			</div>

			<div className='flex gap-2 flex-wrap'>
				{STATUS_TABS.map(({ key, label }) => (
					<button
						key={key}
						onClick={() => {
							setStatusFilter(key);
							setPage(1);
						}}
						className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
							statusFilter === key
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-muted/80"
						}`}
					>
						{label}
					</button>
				))}
			</div>

			<DataTable
				columns={[
					{
						key: "code",
						header: "کد",
						render: (r) => <span className='font-mono text-sm'>{r.code}</span>,
					},
					{ key: "name", header: "نام پروژه" },
					{
						key: "phase",
						header: "فاز",
						render: (r) => (
							<span className='text-sm text-muted-foreground'>
								{r.phase || "—"}
							</span>
						),
					},
					{
						key: "status",
						header: "وضعیت",
						render: (r) => <StatusBadge status={r.status} />,
					},
					{
						key: "priority",
						header: "اولویت",
						render: (r) => (
							<span className='text-sm'>
								{PRIORITY_LABELS[r.priority] ?? r.priority}
							</span>
						),
					},
					{
						key: "contracts_count",
						header: "قراردادها",
						render: (r) => (
							<span className='font-mono text-sm text-center block'>
								{r.contracts_count ?? 0}
							</span>
						),
					},
					{
						key: "budget_estimate",
						header: "بودجه",
						render: (r) => (
							<span className='font-mono text-sm'>
								{r.budget_estimate ? `${r.budget_estimate} ${r.currency}` : "—"}
							</span>
						),
					},
					{
						key: "start_date",
						header: "شروع",
						render: (r) => (
							<span className='text-sm'>
								{r.start_date?.slice(0, 10) ?? "—"}
							</span>
						),
					},
					...(canWrite
						? [
								{
									key: "actions",
									header: "",
									render: (r: Project) => (
										<div className='flex gap-2'>
											<button
												onClick={(e) => {
													e.stopPropagation();
													openEdit(r);
												}}
												className='text-xs text-primary hover:bg-slate-200 rounded-md px-1 py-0.5 flex items-center gap-1'
											>
												<Pencil size={12} />
												ویرایش
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation();
													setDeleteTarget(r.id);
												}}
												className='text-xs bg-red-600 px-2 py-0.5 rounded-md text-white hover:bg-red-700'
											>
												حذف
											</button>
										</div>
									),
								},
							]
						: []),
				]}
				data={projects}
				isLoading={isLoading}
				keyExtractor={(r) => r.id}
				onRowClick={(r) => router.push(`/projects/${r.id}`)}
				emptyMessage='پروژه‌ای یافت نشد'
			/>

			{total > 20 && (
				<div className='flex items-center justify-between text-sm text-muted-foreground'>
					<span>{total} پروژه</span>
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
				title='پروژه جدید'
			>
				<form
					onSubmit={createForm.handleSubmit(onCreateSubmit)}
					className='space-y-4'
				>
					{isSuperAdmin ? (
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
					) : null}

					<div className='grid grid-cols-2 gap-3'>
						<Field
							label='کد پروژه'
							error={createForm.formState.errors.code?.message}
						>
							<input
								{...createForm.register("code")}
								className={inputCls}
								placeholder='P-001'
								dir='ltr'
							/>
						</Field>
						<Field label='دسته‌بندی'>
							<input
								{...createForm.register("category")}
								className={inputCls}
							/>
						</Field>
					</div>

					<Field
						label='نام پروژه'
						error={createForm.formState.errors.name?.message}
					>
						<input
							{...createForm.register("name")}
							className={inputCls}
						/>
					</Field>

					<Field label='فاز پروژه'>
						<input
							{...createForm.register("phase")}
							className={inputCls}
							placeholder='مثلاً: مطالعه، طراحی، اجرا...'
						/>
					</Field>

					<Field label='توضیحات'>
						<textarea
							{...createForm.register("description")}
							className={inputCls}
							rows={2}
						/>
					</Field>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='وضعیت'>
							<select
								{...createForm.register("status")}
								className={inputCls}
							>
								<option value='planning'>برنامه‌ریزی</option>
								<option value='active'>فعال</option>
								<option value='on_hold'>متوقف</option>
								<option value='completed'>تکمیل شده</option>
								<option value='cancelled'>لغو شده</option>
							</select>
						</Field>
						<Field label='اولویت'>
							<select
								{...createForm.register("priority")}
								className={inputCls}
							>
								<option value='low'>کم</option>
								<option value='medium'>متوسط</option>
								<option value='high'>زیاد</option>
								<option value='critical'>بحرانی</option>
							</select>
						</Field>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='بودجه تخمینی'>
							<input
								{...createForm.register("budget_estimate")}
								className={inputCls}
								dir='ltr'
								placeholder='0'
							/>
						</Field>
						<Field label='ارز'>
							<input
								{...createForm.register("currency")}
								className={inputCls}
								dir='ltr'
								placeholder='IRR'
								maxLength={3}
							/>
						</Field>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='تاریخ شروع'>
							<Controller control={createForm.control} name='start_date'
								render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
							/>
						</Field>
						<Field label='تاریخ پایان'>
							<Controller control={createForm.control} name='end_date'
								render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
							/>
						</Field>
					</div>

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
				title='ویرایش پروژه'
			>
				<form
					onSubmit={editForm.handleSubmit(onEditSubmit)}
					className='space-y-4'
				>
					<Field
						label='نام پروژه'
						error={editForm.formState.errors.name?.message}
					>
						<input
							{...editForm.register("name")}
							className={inputCls}
						/>
					</Field>

					<Field label='فاز پروژه'>
						<input
							{...editForm.register("phase")}
							className={inputCls}
							placeholder='مثلاً: مطالعه، طراحی، اجرا...'
						/>
					</Field>

					<Field label='دسته‌بندی'>
						<input
							{...editForm.register("category")}
							className={inputCls}
						/>
					</Field>

					<Field label='توضیحات'>
						<textarea
							{...editForm.register("description")}
							className={inputCls}
							rows={2}
						/>
					</Field>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='وضعیت'>
							<select
								{...editForm.register("status")}
								className={inputCls}
							>
								<option value='planning'>برنامه‌ریزی</option>
								<option value='active'>فعال</option>
								<option value='on_hold'>متوقف</option>
								<option value='completed'>تکمیل شده</option>
								<option value='cancelled'>لغو شده</option>
							</select>
						</Field>
						<Field label='اولویت'>
							<select
								{...editForm.register("priority")}
								className={inputCls}
							>
								<option value='low'>کم</option>
								<option value='medium'>متوسط</option>
								<option value='high'>زیاد</option>
								<option value='critical'>بحرانی</option>
							</select>
						</Field>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='بودجه تخمینی'>
							<input
								{...editForm.register("budget_estimate")}
								className={inputCls}
								dir='ltr'
							/>
						</Field>
						<Field label='بودجه واقعی'>
							<input
								{...editForm.register("budget_actual")}
								className={inputCls}
								dir='ltr'
							/>
						</Field>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='ارز'>
							<input
								{...editForm.register("currency")}
								className={inputCls}
								dir='ltr'
								maxLength={3}
							/>
						</Field>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='تاریخ شروع'>
							<Controller control={editForm.control} name='start_date'
								render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
							/>
						</Field>
						<Field label='تاریخ پایان'>
							<Controller control={editForm.control} name='end_date'
								render={({ field }) => <PersianDatePicker value={field.value} onChange={field.onChange} inputClass={inputCls} />}
							/>
						</Field>
					</div>

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
				title='حذف پروژه'
				description='آیا از حذف این پروژه مطمئن هستید؟ این عمل برگشت‌پذیر نیست.'
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
