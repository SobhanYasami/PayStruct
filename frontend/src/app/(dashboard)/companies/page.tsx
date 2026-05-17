"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, ShieldAlert, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import {
	companiesApi,
	type Company,
	type CreateCompanyReq,
} from "@/lib/api/companies";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { DataTable } from "@/components/ui/DataTable";
import { useAuthStore } from "@/lib/stores/auth";
import { ApiError } from "@/lib/api/client";

const schema = z.object({
	name: z.string().min(1, "نام الزامی است"),
	reg_num: z.string().min(1, "شناسه ثبت الزامی است"),
	parent_id: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Searchable combobox that queries /company/management and returns the selected UUID
function ParentCompanyCombobox({
	value,
	onChange,
	excludeId,
}: {
	value: string | undefined;
	onChange: (id: string | undefined) => void;
	excludeId?: string;
}) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [selectedLabel, setSelectedLabel] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	// debounce
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

	const results = (data?.data?.data ?? []).filter((c) => c.id !== excludeId);

	// close on outside click
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

	const clear = () => {
		onChange(undefined);
		setSelectedLabel("");
		setQuery("");
	};

	const displayValue = value ? selectedLabel || value.slice(0, 8) + "…" : query;

	return (
		<div
			ref={containerRef}
			className='relative'
		>
			<div className='flex items-center'>
				<input
					value={displayValue}
					onChange={(e) => {
						setQuery(e.target.value);
						if (value) {
							onChange(undefined);
							setSelectedLabel("");
						}
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					placeholder='جستجوی شرکت مادر...'
					className={`${inputCls} ${value ? "pr-8" : ""}`}
					dir='rtl'
					autoComplete='off'
				/>
				{value && (
					<button
						type='button'
						onClick={clear}
						className='absolute left-2 text-muted-foreground hover:text-foreground'
					>
						<X size={14} />
					</button>
				)}
			</div>

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
							className={`w-full text-right px-3 py-2 text-sm hover:bg-primary/5 flex items-center justify-between gap-2 ${
								value === c.id ? "bg-primary/10 font-medium" : ""
							}`}
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

const HEAD_ROLES = ["manager", "finance_head", "juridical_head", "engineering_head", "security_head"];

export default function CompaniesPage() {
	const { user } = useAuthStore();
	const qc = useQueryClient();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Company | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const isSuperAdmin =
		user?.roles?.includes("sudoer") || user?.roles?.includes("admin");
	const isHead = HEAD_ROLES.some((r) => user?.roles?.includes(r));

	const { data, isLoading } = useQuery({
		queryKey: ["companies", page, search],
		queryFn: () => companiesApi.list(page, 20, search),
		enabled: !!(isSuperAdmin || isHead),
	});

	const companies = data?.data?.data ?? [];
	const total = data?.data?.total ?? 0;

	const createForm = useForm<FormData>({ resolver: zodResolver(schema) });
	const editForm = useForm<FormData>({ resolver: zodResolver(schema) });

	const invalidate = () => qc.invalidateQueries({ queryKey: ["companies"] });

	const createMutation = useMutation({
		mutationFn: (req: CreateCompanyReq) => companiesApi.create(req),
		onSuccess: () => {
			invalidate();
			setCreateOpen(false);
			createForm.reset();
			toast.success("شرکت با موفقیت ایجاد شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در ایجاد شرکت",
			),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, req }: { id: string; req: CreateCompanyReq }) =>
			companiesApi.update(id, req),
		onSuccess: () => {
			invalidate();
			setEditTarget(null);
			editForm.reset();
			toast.success("شرکت با موفقیت ویرایش شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در ویرایش شرکت",
			),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => companiesApi.delete(id),
		onSuccess: () => {
			invalidate();
			setDeleteTarget(null);
			toast.success("شرکت حذف شد");
		},
		onError: (e) =>
			toast.error(
				e instanceof ApiError ? e.detail || e.title : "خطا در حذف شرکت",
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

	const openEdit = (company: Company) => {
		editForm.reset({
			name: company.name,
			reg_num: company.reg_num,
			parent_id: company.parent_id ?? undefined,
		});
		setEditTarget(company);
	};

	const buildReq = (d: FormData): CreateCompanyReq => ({
		name: d.name,
		reg_num: d.reg_num,
		parent_id: d.parent_id || undefined,
	});

	return (
		<div className='space-y-6'>
			<div className='flex items-center justify-between flex-wrap gap-3'>
				<h1 className='text-2xl font-bold text-primary'>شرکت‌ها</h1>
				<div className='flex gap-3'>
					<input
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						placeholder='جستجو...'
						className='border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48'
					/>
					{isSuperAdmin && (
						<button
							onClick={() => {
								createForm.reset();
								setCreateOpen(true);
							}}
							className='flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition'
						>
							<Plus size={16} />
							شرکت جدید
						</button>
					)}
				</div>
			</div>

			<DataTable
				columns={[
					{ key: "name", header: "نام شرکت" },
					{
						key: "reg_num",
						header: "شناسه ثبت",
						render: (r) => (
							<span className='font-mono text-sm'>{r.reg_num}</span>
						),
					},
					{
						key: "parent_id",
						header: "زیرمجموعه",
						render: (r) => (
							<span className='font-mono text-xs text-muted-foreground'>
								{r.parent_id ? r.parent_id.slice(0, 8) + "…" : "—"}
							</span>
						),
					},
					...(isSuperAdmin ? [{
						key: "actions",
						header: "",
						render: (r: Company) => (
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
									className='text-xs bg-red-600 rounded-sm px-2 py-0.5 text-amber-50 hover:bg-red-700 flex items-center gap-1'
								>
									حذف
								</button>
							</div>
						),
					}] : []),
				]}
				data={companies}
				isLoading={isLoading}
				keyExtractor={(r) => r.id}
				emptyMessage='شرکتی یافت نشد'
			/>

			{total > 20 && (
				<div className='flex items-center justify-between text-sm text-muted-foreground'>
					<span>{total} شرکت</span>
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
				title='شرکت جدید'
			>
				<form
					onSubmit={createForm.handleSubmit((d) =>
						createMutation.mutate(buildReq(d)),
					)}
					className='space-y-4'
				>
					<Field
						label='نام شرکت'
						error={createForm.formState.errors.name?.message}
					>
						<input
							{...createForm.register("name")}
							className={inputCls}
						/>
					</Field>
					<Field
						label='شناسه ثبت'
						error={createForm.formState.errors.reg_num?.message}
					>
						<input
							{...createForm.register("reg_num")}
							className={inputCls}
							dir='ltr'
						/>
					</Field>
					<Field label='شرکت مادر (اختیاری)'>
						<Controller
							control={createForm.control}
							name='parent_id'
							render={({ field }) => (
								<ParentCompanyCombobox
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
				title='ویرایش شرکت'
			>
				<form
					onSubmit={editForm.handleSubmit(
						(d) =>
							editTarget &&
							updateMutation.mutate({ id: editTarget.id, req: buildReq(d) }),
					)}
					className='space-y-4'
				>
					<Field
						label='نام شرکت'
						error={editForm.formState.errors.name?.message}
					>
						<input
							{...editForm.register("name")}
							className={inputCls}
						/>
					</Field>
					<Field
						label='شناسه ثبت'
						error={editForm.formState.errors.reg_num?.message}
					>
						<input
							{...editForm.register("reg_num")}
							className={inputCls}
							dir='ltr'
						/>
					</Field>
					<Field label='شرکت مادر (اختیاری)'>
						<Controller
							control={editForm.control}
							name='parent_id'
							render={({ field }) => (
								<ParentCompanyCombobox
									value={field.value}
									onChange={field.onChange}
									excludeId={editTarget?.id}
								/>
							)}
						/>
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
				title='حذف شرکت'
				description='آیا از حذف این شرکت مطمئن هستید؟ این عمل برگشت‌پذیر نیست.'
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
