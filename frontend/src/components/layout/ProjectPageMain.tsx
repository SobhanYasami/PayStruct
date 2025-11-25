import { Project, ProjectStatus } from "../../types/project";
import ProjectCard from "../ui/ProjectCard";
import ProjectGridSkeleton from "../ui/ProjectGridSkeleton";
import EmptyState from "../ui/EmptyState";
import styles from "./ProjectPageMain.module.css";

interface ProjectPageMainProps {
	projects: Project[];
	loading: boolean;
	searchQuery: string;
	onProjectClick: (project: Project) => void;
	onEditProject: (project: Project) => void;
	onDeleteProject: (project: Project) => void;
}

export default function ProjectPageMain({
	projects,
	loading,
	searchQuery,
	onProjectClick,
	onEditProject,
	onDeleteProject,
}: ProjectPageMainProps) {
	// Filter projects based on search query
	const filteredProjects = projects.filter(
		(project) =>
			project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			project.phase?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			project.description?.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// Group projects by status
	const groupedProjects = {
		active: filteredProjects.filter((project) => project.status === "active"),
		inProgress: filteredProjects.filter(
			(project) => project.status === "inProgress",
		),
		completed: filteredProjects.filter(
			(project) => project.status === "completed",
		),
		onHold: filteredProjects.filter((project) => project.status === "onHold"),
	};

	if (loading) {
		return <ProjectGridSkeleton />;
	}

	if (projects.length === 0) {
		return (
			<div className={styles.emptyStateWrapper}>
				<EmptyState
					title='هیچ پروژه‌ای وجود ندارد'
					description='برای شروع، اولین پروژه خود را ایجاد کنید.'
					actionText='ایجاد پروژه جدید'
					onAction={() => {}} // This will be handled by parent
				/>
			</div>
		);
	}

	if (filteredProjects.length === 0 && searchQuery) {
		return (
			<div className={styles.emptyStateWrapper}>
				<EmptyState
					title='نتیجه‌ای یافت نشد'
					description={`هیچ پروژه‌ای با عبارت "${searchQuery}" پیدا نشد.`}
					actionText='پاک کردن جستجو'
					onAction={() => {}} // This will be handled by parent
				/>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			{/* All Projects View */}
			{!searchQuery && (
				<>
					{/* Active Projects */}
					{groupedProjects.active.length > 0 && (
						<section className={styles.section}>
							<h2 className={styles.sectionTitle}>پروژه‌های فعال</h2>
							<div className={styles.projectsGrid}>
								{groupedProjects.active.map((project) => (
									<ProjectCard
										key={project.id}
										project={project}
										onClick={onProjectClick}
										onEdit={onEditProject}
										onDelete={onDeleteProject}
									/>
								))}
							</div>
						</section>
					)}

					{/* In Progress Projects */}
					{groupedProjects.inProgress.length > 0 && (
						<section className={styles.section}>
							<h2 className={styles.sectionTitle}>در حال انجام</h2>
							<div className={styles.projectsGrid}>
								{groupedProjects.inProgress.map((project) => (
									<ProjectCard
										key={project.id}
										project={project}
										onClick={onProjectClick}
										onEdit={onEditProject}
										onDelete={onDeleteProject}
									/>
								))}
							</div>
						</section>
					)}

					{/* Completed Projects */}
					{groupedProjects.completed.length > 0 && (
						<section className={styles.section}>
							<h2 className={styles.sectionTitle}>تکمیل شده</h2>
							<div className={styles.projectsGrid}>
								{groupedProjects.completed.map((project) => (
									<ProjectCard
										key={project.id}
										project={project}
										onClick={onProjectClick}
										onEdit={onEditProject}
										onDelete={onDeleteProject}
									/>
								))}
							</div>
						</section>
					)}

					{/* On Hold Projects */}
					{groupedProjects.onHold.length > 0 && (
						<section className={styles.section}>
							<h2 className={styles.sectionTitle}>متوقف شده</h2>
							<div className={styles.projectsGrid}>
								{groupedProjects.onHold.map((project) => (
									<ProjectCard
										key={project.id}
										project={project}
										onClick={onProjectClick}
										onEdit={onEditProject}
										onDelete={onDeleteProject}
									/>
								))}
							</div>
						</section>
					)}
				</>
			)}

			{/* Search Results View */}
			{searchQuery && filteredProjects.length > 0 && (
				<section className={styles.section}>
					<div className={styles.searchResultsHeader}>
						<h2 className={styles.sectionTitle}>
							نتایج جستجو برای "{searchQuery}"
						</h2>
						<span className={styles.resultsCount}>
							{filteredProjects.length} پروژه پیدا شد
						</span>
					</div>
					<div className={styles.projectsGrid}>
						{filteredProjects.map((project) => (
							<ProjectCard
								key={project.id}
								project={project}
								onClick={onProjectClick}
								onEdit={onEditProject}
								onDelete={onDeleteProject}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
