"use client";

import { useState } from "react";
import styles from "./page.module.css";
import Dialog from "@/components/ui/Dialog";
import PageHeader from "@/components/layout/ProjectPageHeader";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
	Plus,
	Edit,
	Trash2,
	Calendar,
	DollarSign,
	Users,
	ChevronLeft,
	ChevronRight,
	Building,
	Clock,
	CheckCircle,
	AlertCircle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Project_URL = `${API_URL}/management/projects/`;

/* -------------------- Types -------------------- */
interface Contractor {
	id: string;
	name: string;
	share: number;
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
	status?: "active" | "completed" | "on-hold";
}

interface ProjectCreationPayload {
	name: string;
	phase: string;
}

/* -------------------- API Functions -------------------- */
async function projectCreationReq(payload: ProjectCreationPayload) {
	const token = localStorage.getItem("usr-token");
	if (!token) throw new Error("UnAuthorized");

	const res = await fetch(`${Project_URL}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `bearer ${token}`,
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Creating project failed!");
	}

	return res.json();
}

async function getAllProjects() {
	const token = localStorage.getItem("usr-token");
	if (!token) throw new Error("UnAuthorized");

	const res = await fetch(`${Project_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to fetch projects!");
	}

	return res.json();
}

/* -------------------- Project Card Component -------------------- */
function ProjectCard({
	project,
	onEdit,
	onDelete,
}: {
	project: Project;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const getStatusColor = (status?: string) => {
		switch (status) {
			case "active":
				return "var(--status-active)";
			case "completed":
				return "var(--status-completed)";
			case "on-hold":
				return "var(--status-onhold)";
			default:
				return "var(--status-default)";
		}
	};

	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString("fa-IR");
		} catch {
			return dateString;
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
	};

	return (
		<div className={styles.projectCard}>
			<div className={styles.projectCardHeader}>
				<div className={styles.projectTitleSection}>
					<Building
						size={20}
						className={styles.projectIcon}
					/>
					<h3 className={styles.projectName}>{project.name}</h3>
					<span
						className={styles.projectStatus}
						style={{ backgroundColor: getStatusColor(project.status) }}
					>
						{project.status === "active"
							? "فعال"
							: project.status === "completed"
								? "تکمیل شده"
								: "در انتظار"}
					</span>
				</div>
				<div className={styles.projectActions}>
					<button
						className={`${styles.actionButton} ${styles.editButton}`}
						onClick={onEdit}
						title='ویرایش پروژه'
						type='button'
					>
						<Edit size={18} />
					</button>
					<button
						className={`${styles.actionButton} ${styles.deleteButton}`}
						onClick={onDelete}
						title='حذف پروژه'
						type='button'
					>
						<Trash2 size={18} />
					</button>
				</div>
			</div>

			<div className={styles.projectDetails}>
				<div className={styles.detailRow}>
					<div className={styles.detailItem}>
						<Calendar
							size={16}
							className={styles.detailIcon}
						/>
						<span className={styles.detailLabel}>تاریخ شروع:</span>
						<span className={styles.detailValue}>
							{formatDate(project.startDate)}
						</span>
					</div>
					<div className={styles.detailItem}>
						<Clock
							size={16}
							className={styles.detailIcon}
						/>
						<span className={styles.detailLabel}>تاریخ پایان:</span>
						<span className={styles.detailValue}>
							{formatDate(project.endDate)}
						</span>
					</div>
				</div>

				<div className={styles.detailRow}>
					<div className={styles.detailItem}>
						<DollarSign
							size={16}
							className={styles.detailIcon}
						/>
						<span className={styles.detailLabel}>بودجه:</span>
						<span className={styles.detailValue}>
							{formatCurrency(project.budget)}
						</span>
					</div>
					<div className={styles.detailItem}>
						<Users
							size={16}
							className={styles.detailIcon}
						/>
						<span className={styles.detailLabel}>پیمانکاران:</span>
						<span className={styles.detailValue}>
							{project.contractors?.length || 0} نفر
						</span>
					</div>
				</div>
			</div>

			<div className={styles.projectPhases}>
				<span className={styles.phasesLabel}>فازها:</span>
				<div className={styles.phasesList}>
					{project.phases?.map((phase, index) => (
						<span
							key={`phase-${project.id}-${index}`}
							className={styles.phaseBadge}
						>
							فاز {phase}
						</span>
					)) || <span className={styles.phaseBadge}>بدون فاز</span>}
				</div>
			</div>

			<div className={styles.projectFooter}>
				<div className={styles.turnover}>
					<span className={styles.turnoverLabel}>گردش مالی:</span>
					<span className={styles.turnoverValue}>
						{formatCurrency(project.turnover)}
					</span>
				</div>
				<div className={styles.lastUpdate}>
					آخرین بروزرسانی: {formatDate(project.updatedAt)}
				</div>
			</div>
		</div>
	);
}

/* -------------------- Create Project Form -------------------- */
function CreateProjectForm({ onCancel }: { onCancel: () => void }) {
	const [formData, setFormData] = useState({
		name: "",
		phase: "",
	});
	const [errors, setErrors] = useState<{ name?: string; phase?: string }>({});
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: projectCreationReq,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["Projects"] });
			onCancel();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const validateForm = () => {
		const newErrors: { name?: string; phase?: string } = {};
		if (!formData.name.trim()) newErrors.name = "نام پروژه الزامی است";
		if (!formData.phase.trim()) newErrors.phase = "شماره فاز الزامی است";
		return newErrors;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const validationErrors = validateForm();

		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}

		mutation.mutate({ name: formData.name, phase: formData.phase });
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field as keyof typeof errors]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	return (
		<Dialog
			title='ایجاد پروژه جدید'
			onClose={onCancel}
			size='medium'
		>
			<form
				className={styles.dialogForm}
				onSubmit={handleSubmit}
			>
				<div className={styles.formGroup}>
					<label className={styles.formLabel}>
						نام پروژه
						<span className={styles.required}>*</span>
					</label>
					<input
						type='text'
						placeholder='مثال: پروژه مسکونی گلستان'
						className={`${styles.dialogInput} ${errors.name ? styles.inputError : ""}`}
						value={formData.name}
						onChange={(e) => handleInputChange("name", e.target.value)}
						disabled={mutation.isPending}
					/>
					{errors.name && (
						<span className={styles.errorMessage}>{errors.name}</span>
					)}
				</div>

				<div className={styles.formGroup}>
					<label className={styles.formLabel}>
						شماره فاز
						<span className={styles.required}>*</span>
					</label>
					<input
						type='number'
						placeholder='مثال: ۱'
						min='1'
						className={`${styles.dialogInput} ${errors.phase ? styles.inputError : ""}`}
						value={formData.phase}
						onChange={(e) => handleInputChange("phase", e.target.value)}
						disabled={mutation.isPending}
					/>
					{errors.phase && (
						<span className={styles.errorMessage}>{errors.phase}</span>
					)}
				</div>

				<div className={styles.dialogFooter}>
					<button
						type='button'
						className={`${styles.dialogButton} ${styles.dialogButtonSecondary}`}
						onClick={onCancel}
						disabled={mutation.isPending}
					>
						لغو
					</button>
					<button
						type='submit'
						className={`${styles.dialogButton} ${styles.dialogButtonPrimary}`}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? (
							<span className={styles.loadingText}>در حال ایجاد...</span>
						) : (
							<>
								<Plus size={18} />
								ایجاد پروژه
							</>
						)}
					</button>
				</div>
			</form>
		</Dialog>
	);
}

/* -------------------- Delete Confirmation Dialog -------------------- */
function DeleteConfirmationDialog({
	projectName,
	onConfirm,
	onCancel,
}: {
	projectName?: string;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<Dialog
			title='تأیید حذف پروژه'
			onClose={onCancel}
			size='small'
		>
			<div className={styles.deleteDialogContent}>
				<AlertCircle
					size={48}
					className={styles.warningIcon}
				/>
				<p className={styles.deleteMessage}>
					آیا از حذف پروژه <strong>{projectName}</strong> مطمئن هستید؟
				</p>
				<p className={styles.deleteWarning}>
					این عمل غیرقابل بازگشت است و تمامی اطلاعات مرتبط با پروژه حذف خواهند
					شد.
				</p>
				<div className={styles.dialogFooter}>
					<button
						type='button'
						className={`${styles.dialogButton} ${styles.dialogButtonSecondary}`}
						onClick={onCancel}
					>
						لغو
					</button>
					<button
						type='button'
						className={`${styles.dialogButton} ${styles.dialogButtonDanger}`}
						onClick={onConfirm}
					>
						<Trash2 size={18} />
						حذف پروژه
					</button>
				</div>
			</div>
		</Dialog>
	);
}

/* -------------------- Stats Card Component -------------------- */
function StatCard({
	icon: Icon,
	value,
	label,
	type = "default",
}: {
	icon: any;
	value: string | number;
	label: string;
	type?: "default" | "active" | "budget";
}) {
	return (
		<div className={styles.statCard}>
			<div className={`${styles.statIcon} ${styles[`${type}Icon`]}`}>
				<Icon size={24} />
			</div>
			<div className={styles.statContent}>
				<span className={styles.statValue}>{value}</span>
				<span className={styles.statLabel}>{label}</span>
			</div>
		</div>
	);
}

/* -------------------- Main Component -------------------- */
export default function Projects() {
	const [showCreate, setShowCreate] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);
	const [search, setSearch] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 6;

	const {
		isPending,
		isError,
		data: projectData,
		error,
	} = useQuery({
		queryKey: ["Projects"],
		queryFn: getAllProjects,
	});

	// Safely extract projects data
	const projects: Project[] = projectData?.data || [];

	const filteredProjects = projects.filter((project) =>
		project.name.toLowerCase().includes(search.toLowerCase()),
	);

	const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
	const paginatedProjects = filteredProjects.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	const handleDeleteConfirm = () => {
		// Implement delete logic here
		toast.success(`پروژه ${selectedProject?.name} حذف شد`);
		setShowDelete(false);
		setSelectedProject(null);
	};

	const handleEditProject = (project: Project) => {
		setSelectedProject(project);
		// Implement edit logic
		toast.error("قابلیت ویرایش به زودی اضافه خواهد شد");
	};

	const handleDeleteProject = (project: Project) => {
		setSelectedProject(project);
		setShowDelete(true);
	};

	// Calculate statistics
	const totalBudget = filteredProjects.reduce(
		(sum, project) => sum + (project.budget || 0),
		0,
	);
	const activeProjects = filteredProjects.filter(
		(project) => project.status === "active",
	).length;

	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<PageHeader
					title='مدیریت پروژه‌ها'
					subtitle='سیستم جامع مدیریت پروژه‌های ساخت و ساز'
					searchValue={search}
					onSearchChange={setSearch}
					onCreateClick={() => setShowCreate(true)}
				/>

				<div className={styles.content}>
					{isPending ? (
						<div className={styles.loadingContainer}>
							<div className={styles.loadingSpinner}></div>
							<p>در حال بارگذاری پروژه‌ها...</p>
						</div>
					) : isError ? (
						<div className={styles.errorContainer}>
							<AlertCircle
								size={48}
								className={styles.errorIcon}
							/>
							<h3>خطا در بارگذاری داده‌ها</h3>
							<p>{error.message}</p>
							<button
								type='button'
								className={styles.retryButton}
								onClick={() => window.location.reload()}
							>
								تلاش مجدد
							</button>
						</div>
					) : (
						<>
							<div className={styles.statsContainer}>
								<StatCard
									icon={Building}
									value={filteredProjects.length}
									label='پروژه کل'
									type='default'
								/>
								<StatCard
									icon={CheckCircle}
									value={activeProjects}
									label='پروژه فعال'
									type='active'
								/>
								<StatCard
									icon={DollarSign}
									value={new Intl.NumberFormat("fa-IR").format(totalBudget)}
									label='بودجه کل'
									type='budget'
								/>
							</div>

							<div className={styles.projectGrid}>
								{paginatedProjects.length > 0 ? (
									paginatedProjects.map((project: Project) => (
										<ProjectCard
											key={`project-${project.id}`}
											project={project}
											onEdit={() => handleEditProject(project)}
											onDelete={() => handleDeleteProject(project)}
										/>
									))
								) : (
									<div className={styles.emptyState}>
										<Building
											size={64}
											className={styles.emptyIcon}
										/>
										<h3>پروژه‌ای یافت نشد</h3>
										<p>
											{search
												? "هیچ پروژه‌ای با این جستجو مطابقت ندارد"
												: "هنوز پروژه‌ای ایجاد نشده است"}
										</p>
										{!search && (
											<button
												type='button'
												className={styles.createFirstButton}
												onClick={() => setShowCreate(true)}
											>
												<Plus size={18} />
												ایجاد اولین پروژه
											</button>
										)}
									</div>
								)}
							</div>

							{filteredProjects.length > 0 && totalPages > 1 && (
								<div className={styles.pagination}>
									<button
										type='button'
										className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ""}`}
										onClick={() =>
											setCurrentPage((prev) => Math.max(prev - 1, 1))
										}
										disabled={currentPage === 1}
									>
										<ChevronRight size={20} />
										قبلی
									</button>

									<div className={styles.pageNumbers}>
										{Array.from({ length: totalPages }, (_, i) => i + 1).map(
											(page) => (
												<button
													key={`page-${page}`}
													type='button'
													className={`${styles.pageNumber} ${currentPage === page ? styles.active : ""}`}
													onClick={() => setCurrentPage(page)}
												>
													{page}
												</button>
											),
										)}
									</div>

									<button
										type='button'
										className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ""}`}
										onClick={() =>
											setCurrentPage((prev) => Math.min(prev + 1, totalPages))
										}
										disabled={currentPage === totalPages}
									>
										بعدی
										<ChevronLeft size={20} />
									</button>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Dialogs */}
			{showCreate && (
				<CreateProjectForm onCancel={() => setShowCreate(false)} />
			)}

			{showDelete && selectedProject && (
				<DeleteConfirmationDialog
					projectName={selectedProject.name}
					onConfirm={handleDeleteConfirm}
					onCancel={() => {
						setShowDelete(false);
						setSelectedProject(null);
					}}
				/>
			)}
		</main>
	);
}
