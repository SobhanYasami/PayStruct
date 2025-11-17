"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

/* -------------------- Types -------------------- */
interface Contractor {
	id: string;
	name: string;
	share: number; // percentage share in project
	statusStatements: number;
}

interface Project {
	id: string;
	name: string;
	phases: string[];
	startDate: string;
	endDate: string;
	budget: number;
	contractors: Contractor[];
	turnover: number;
	createdAt: string;
	updatedAt: string;
}

/* -------------------- Helpers -------------------- */
const uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const STORAGE_KEY = "paystruct_projects_v2";

const MOCK_CONTRACTORS = [
	{ id: "k1", name: "پیمانکار سازه‌نو" },
	{ id: "k2", name: "تیم برق‌کاران" },
	{ id: "k3", name: "گروه نازک‌کاری" },
];

/* -------------------- Main Component -------------------- */
export default function Projects() {
	const [projects, setProjects] = useState<Project[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [editingProject, setEditingProject] = useState<Project | null>(null);
	const [viewingProject, setViewingProject] = useState<Project | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

	// Load projects from localStorage
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			setProjects(JSON.parse(stored));
		}
	}, []);

	// Save to localStorage
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
	}, [projects]);

	/* -------------------- Operations -------------------- */

	const updateProject = (id: string, updates: Partial<Project>) => {
		setProjects((prev) =>
			prev.map((p) =>
				p.id === id
					? { ...p, ...updates, updatedAt: new Date().toISOString() }
					: p,
			),
		);
		setIsEditDialogOpen(false);
		setEditingProject(null);
	};

	const deleteProject = (id: string) => {
		if (!confirm("آیا از حذف این پروژه اطمینان دارید؟")) return;
		setProjects((prev) => prev.filter((p) => p.id !== id));
	};

	const filteredProjects = projects.filter(
		(project) =>
			project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			project.phases.some((phase) =>
				phase.toLowerCase().includes(searchTerm.toLowerCase()),
			),
	);

	return (
		<div
			dir='rtl'
			className='min-h-screen bg-gray-50'
		>
			<div className='container mx-auto px-4 py-8'>
				<Header
					searchTerm={searchTerm}
					setSearchTerm={setSearchTerm}
					isCreateDialogOpen={isCreateDialogOpen}
					setIsCreateDialogOpen={setIsCreateDialogOpen}
					setProjects={setProjects}
				/>
				{/* Projects Table */}
				<Card>
					<CardHeader>
						<CardTitle>لیست پروژه‌ها</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>نام پروژه</TableHead>
									<TableHead>فازها</TableHead>
									<TableHead>تاریخ شروع</TableHead>
									<TableHead>تاریخ پایان</TableHead>
									<TableHead>بودجه</TableHead>
									<TableHead>تعداد پیمانکاران</TableHead>
									<TableHead>عملیات</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredProjects.map((project) => (
									<TableRow key={project.id}>
										<TableCell className='font-medium'>
											{project.name}
										</TableCell>
										<TableCell>
											<div className='flex flex-wrap gap-1'>
												{project.phases.map((phase, index) => (
													<Badge
														key={index}
														variant='secondary'
													>
														{phase}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell>{project.startDate}</TableCell>
										<TableCell>{project.endDate}</TableCell>
										<TableCell>
											{project.budget.toLocaleString("fa-IR")} تومان
										</TableCell>
										<TableCell>{project.contractors.length}</TableCell>
										<TableCell>
											<div className='flex gap-2'>
												<Button
													variant='outline'
													size='sm'
													onClick={() => {
														setViewingProject(project);
														setIsViewDialogOpen(true);
													}}
												>
													<Eye size={16} />
												</Button>
												<Button
													variant='outline'
													size='sm'
													onClick={() => {
														setEditingProject(project);
														setIsEditDialogOpen(true);
													}}
												>
													<Edit size={16} />
												</Button>
												<Button
													variant='destructive'
													size='sm'
													onClick={() => deleteProject(project.id)}
												>
													<Trash2 size={16} />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						{filteredProjects.length === 0 && (
							<div className='text-center py-8 text-gray-500'>
								{searchTerm
									? "پروژه‌ای با این مشخصات یافت نشد"
									: "هنوز پروژه‌ای ایجاد نشده است"}
							</div>
						)}
					</CardContent>
				</Card>

				{/* View Project Dialog */}
				<ViewProjectDialog
					project={viewingProject}
					open={isViewDialogOpen}
					onOpenChange={setIsViewDialogOpen}
				/>

				{/* Edit Project Dialog */}
				<EditProjectDialog
					project={editingProject}
					open={isEditDialogOpen}
					onOpenChange={setIsEditDialogOpen}
					onUpdate={updateProject}
				/>
			</div>
		</div>
	);
}

/* -------------------- Header -------------------- */
interface HeaderProps {
	searchTerm: string;
	setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
	isCreateDialogOpen: boolean;
	setIsCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

function Header({
	searchTerm,
	setSearchTerm,
	isCreateDialogOpen,
	setIsCreateDialogOpen,
	setProjects,
}: HeaderProps) {
	const createProject = (
		project: Omit<Project, "id" | "createdAt" | "updatedAt">,
	) => {
		const newProject: Project = {
			...project,
			id: uid("prj_"),
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		setProjects((prev) => [newProject, ...prev]);
		setIsCreateDialogOpen(false);
	};

	return (
		<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
			<div>
				<h1 className='text-3xl font-bold text-gray-900'>مدیریت پروژه‌ها</h1>
				<p className='text-gray-600 mt-2'>سیستم مدیریت پروژه‌های ساخت و ساز</p>
			</div>

			<div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
				<div className='relative'>
					<Search
						className='absolute right-9 top-1/2 transform translate-x-2 -translate-y-1/2 text-gray-400 '
						size={20}
					/>
					<Input
						placeholder='جستجو بر اساس نام یا فاز...'
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className='pr-10 w-full sm:w-64 active:border-blue-500'
					/>
				</div>

				<CreateProjectDialog
					open={isCreateDialogOpen}
					onOpenChange={setIsCreateDialogOpen}
					onCreate={createProject}
				/>
			</div>
		</div>
	);
}

/* -------------------- Create Project Dialog -------------------- */
function CreateProjectDialog({
	open,
	onOpenChange,
	onCreate,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => void;
}) {
	const [formData, setFormData] = useState({
		name: "",
		phases: [""],
		startDate: todayISO(),
		endDate: todayISO(),
		budget: 0,
		contractors: [] as Contractor[],
		turnover: 0,
	});

	const [selectedContractor, setSelectedContractor] = useState("");
	const [contractorShare, setContractorShare] = useState(0);

	const addPhase = () => {
		setFormData((prev) => ({
			...prev,
			phases: [...prev.phases, ""],
		}));
	};

	const updatePhase = (index: number, value: string) => {
		setFormData((prev) => ({
			...prev,
			phases: prev.phases.map((phase, i) => (i === index ? value : phase)),
		}));
	};

	const removePhase = (index: number) => {
		setFormData((prev) => ({
			...prev,
			phases: prev.phases.filter((_, i) => i !== index),
		}));
	};

	const addContractor = () => {
		if (!selectedContractor || contractorShare <= 0) return;

		const contractor = MOCK_CONTRACTORS.find(
			(c) => c.id === selectedContractor,
		);
		if (!contractor) return;

		const newContractor: Contractor = {
			id: contractor.id,
			name: contractor.name,
			share: contractorShare,
			statusStatements: 0,
		};

		setFormData((prev) => ({
			...prev,
			contractors: [...prev.contractors, newContractor],
		}));

		setSelectedContractor("");
		setContractorShare(0);
	};

	const removeContractor = (contractorId: string) => {
		setFormData((prev) => ({
			...prev,
			contractors: prev.contractors.filter((c) => c.id !== contractorId),
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onCreate(formData);
		setFormData({
			name: "",
			phases: [""],
			startDate: todayISO(),
			endDate: todayISO(),
			budget: 0,
			contractors: [],
			turnover: 0,
		});
	};

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogTrigger asChild>
				<Button className='gap-1 bg-blue-500 text-white'>
					<Plus size={20} />
					ایجاد پروژه جدید
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[600px]'>
				<DialogHeader>
					<DialogTitle>ایجاد پروژه جدید</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={handleSubmit}
					className='space-y-6'
				>
					{/* Basic Info */}
					<div className='space-y-4'>
						<div className='grid grid-cols-1 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='name'>نام پروژه *</Label>
								<Input
									id='name'
									value={formData.name}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, name: e.target.value }))
									}
									required
								/>
							</div>
						</div>

						<div className='grid grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='startDate'>تاریخ شروع</Label>
								<Input
									id='startDate'
									type='date'
									value={formData.startDate}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											startDate: e.target.value,
										}))
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='endDate'>تاریخ پایان</Label>
								<Input
									id='endDate'
									type='date'
									value={formData.endDate}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											endDate: e.target.value,
										}))
									}
								/>
							</div>
						</div>

						<div className='grid grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='budget'>بودجه (تومان)</Label>
								<Input
									id='budget'
									type='number'
									value={formData.budget}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											budget: Number(e.target.value),
										}))
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='turnover'>گردش مالی (تومان)</Label>
								<Input
									id='turnover'
									type='number'
									value={formData.turnover}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											turnover: Number(e.target.value),
										}))
									}
								/>
							</div>
						</div>
					</div>

					{/* Phases */}
					<div className='space-y-3'>
						<div className='flex justify-between items-center'>
							<Label>فازهای پروژه</Label>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={addPhase}
							>
								افزودن فاز
							</Button>
						</div>

						<div className='space-y-2'>
							{formData.phases.map((phase, index) => (
								<div
									key={index}
									className='flex gap-2'
								>
									<Input
										value={phase}
										onChange={(e) => updatePhase(index, e.target.value)}
										placeholder={`فاز ${index + 1}`}
									/>
									{formData.phases.length > 1 && (
										<Button
											type='button'
											variant='destructive'
											size='sm'
											onClick={() => removePhase(index)}
										>
											حذف
										</Button>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Contractors */}
					<div className='space-y-3'>
						<Label>پیمانکاران</Label>

						<div className='flex gap-2'>
							<Select
								value={selectedContractor}
								onValueChange={setSelectedContractor}
							>
								<SelectTrigger className='flex-1'>
									<SelectValue placeholder='انتخاب پیمانکار' />
								</SelectTrigger>
								<SelectContent>
									{MOCK_CONTRACTORS.map((contractor) => (
										<SelectItem
											key={contractor.id}
											value={contractor.id}
										>
											{contractor.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Input
								type='number'
								placeholder='سهم (%)'
								value={contractorShare}
								onChange={(e) => setContractorShare(Number(e.target.value))}
								className='w-24'
							/>

							<Button
								type='button'
								onClick={addContractor}
							>
								افزودن
							</Button>
						</div>

						{/* Selected Contractors */}
						<div className='space-y-2'>
							{formData.contractors.map((contractor) => (
								<div
									key={contractor.id}
									className='flex items-center justify-between p-3 border rounded-lg'
								>
									<div>
										<div className='font-medium'>{contractor.name}</div>
										<div className='text-sm text-gray-500'>
											سهم: {contractor.share}%
										</div>
									</div>
									<Button
										type='button'
										variant='destructive'
										size='sm'
										onClick={() => removeContractor(contractor.id)}
									>
										حذف
									</Button>
								</div>
							))}
						</div>
					</div>

					{/* Submit */}
					<div className='flex gap-3 justify-end'>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							انصراف
						</Button>
						<Button type='submit'>ایجاد پروژه</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/* -------------------- View Project Dialog -------------------- */
function ViewProjectDialog({
	project,
	open,
	onOpenChange,
}: {
	project: Project | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	if (!project) return null;

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className='sm:max-w-[700px]'>
				<DialogHeader>
					<DialogTitle>جزئیات پروژه - {project.name}</DialogTitle>
				</DialogHeader>

				<div className='space-y-6'>
					{/* Basic Info */}
					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>اطلاعات پایه</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<Label className='text-sm text-gray-500'>تاریخ شروع</Label>
									<div className='font-medium'>{project.startDate}</div>
								</div>
								<div>
									<Label className='text-sm text-gray-500'>تاریخ پایان</Label>
									<div className='font-medium'>{project.endDate}</div>
								</div>
								<div>
									<Label className='text-sm text-gray-500'>بودجه</Label>
									<div className='font-medium'>
										{project.budget.toLocaleString("fa-IR")} تومان
									</div>
								</div>
								<div>
									<Label className='text-sm text-gray-500'>گردش مالی</Label>
									<div className='font-medium'>
										{project.turnover.toLocaleString("fa-IR")} تومان
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Phases */}
					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>فازهای پروژه</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='flex flex-wrap gap-2'>
								{project.phases.map((phase, index) => (
									<Badge
										key={index}
										variant='secondary'
										className='text-sm'
									>
										{phase}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Contractors */}
					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>پیمانکاران</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								{project.contractors.map((contractor) => (
									<div
										key={contractor.id}
										className='flex items-center justify-between p-4 border rounded-lg'
									>
										<div className='space-y-1'>
											<div className='font-medium'>{contractor.name}</div>
											<div className='text-sm text-gray-500'>
												سهم: {contractor.share}% -{" "}
												{Math.round(
													(project.turnover * contractor.share) / 100,
												).toLocaleString("fa-IR")}{" "}
												تومان
											</div>
										</div>
										<Badge variant='outline'>
											{contractor.statusStatements} وضعیت‌سنجی
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/* -------------------- Edit Project Dialog -------------------- */
function EditProjectDialog({
	project,
	open,
	onOpenChange,
	onUpdate,
}: {
	project: Project | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (id: string, updates: Partial<Project>) => void;
}) {
	const [formData, setFormData] = useState<Partial<Project> | null>(null);

	React.useEffect(() => {
		if (project) {
			setFormData({ ...project });
		}
	}, [project]);

	if (!project || !formData) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onUpdate(project.id, formData);
	};

	const updatePhase = (index: number, value: string) => {
		setFormData((prev) =>
			prev
				? {
						...prev,
						phases:
							prev.phases?.map((phase, i) => (i === index ? value : phase)) ||
							[],
				  }
				: null,
		);
	};

	const addPhase = () => {
		setFormData((prev) =>
			prev
				? {
						...prev,
						phases: [...(prev.phases || []), ""],
				  }
				: null,
		);
	};

	const removePhase = (index: number) => {
		setFormData((prev) =>
			prev
				? {
						...prev,
						phases: prev.phases?.filter((_, i) => i !== index) || [],
				  }
				: null,
		);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogContent className='sm:max-w-[600px]'>
				<DialogHeader>
					<DialogTitle>ویرایش پروژه - {project.name}</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={handleSubmit}
					className='space-y-6'
				>
					{/* Basic Info */}
					<div className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='edit-name'>نام پروژه</Label>
							<Input
								id='edit-name'
								value={formData.name || ""}
								onChange={(e) =>
									setFormData((prev) =>
										prev ? { ...prev, name: e.target.value } : null,
									)
								}
							/>
						</div>

						<div className='grid grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='edit-startDate'>تاریخ شروع</Label>
								<Input
									id='edit-startDate'
									type='date'
									value={formData.startDate || ""}
									onChange={(e) =>
										setFormData((prev) =>
											prev ? { ...prev, startDate: e.target.value } : null,
										)
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-endDate'>تاریخ پایان</Label>
								<Input
									id='edit-endDate'
									type='date'
									value={formData.endDate || ""}
									onChange={(e) =>
										setFormData((prev) =>
											prev ? { ...prev, endDate: e.target.value } : null,
										)
									}
								/>
							</div>
						</div>

						<div className='grid grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='edit-budget'>بودجه (تومان)</Label>
								<Input
									id='edit-budget'
									type='number'
									value={formData.budget || 0}
									onChange={(e) =>
										setFormData((prev) =>
											prev ? { ...prev, budget: Number(e.target.value) } : null,
										)
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='edit-turnover'>گردش مالی (تومان)</Label>
								<Input
									id='edit-turnover'
									type='number'
									value={formData.turnover || 0}
									onChange={(e) =>
										setFormData((prev) =>
											prev
												? { ...prev, turnover: Number(e.target.value) }
												: null,
										)
									}
								/>
							</div>
						</div>
					</div>

					{/* Phases */}
					<div className='space-y-3'>
						<div className='flex justify-between items-center'>
							<Label>فازهای پروژه</Label>
							<Button
								type='button'
								variant='outline'
								size='sm'
								onClick={addPhase}
							>
								افزودن فاز
							</Button>
						</div>

						<div className='space-y-2'>
							{formData.phases?.map((phase, index) => (
								<div
									key={index}
									className='flex gap-2'
								>
									<Input
										value={phase}
										onChange={(e) => updatePhase(index, e.target.value)}
										placeholder={`فاز ${index + 1}`}
									/>
									{formData.phases && formData.phases.length > 1 && (
										<Button
											type='button'
											variant='destructive'
											size='sm'
											onClick={() => removePhase(index)}
										>
											حذف
										</Button>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Submit */}
					<div className='flex gap-3 justify-end'>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							انصراف
						</Button>
						<Button type='submit'>ذخیره تغییرات</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
