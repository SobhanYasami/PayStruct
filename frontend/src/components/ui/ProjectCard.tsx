import { MoreVertical, Calendar, Users, Flag } from "lucide-react";
import { Project } from "../../types/project";
import Button from "../ui/Button";
import Dropdown from "../ui/Dropdown";
import ProgressBar from "../ui/ProgressBar";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
	project: Project;
	onClick: (project: Project) => void;
	onEdit: (project: Project) => void;
	onDelete: (project: Project) => void;
}

export default function ProjectCard({
	project,
	onClick,
	onEdit,
	onDelete,
}: ProjectCardProps) {
	const getStatusInfo = (status: Project["status"]) => {
		switch (status) {
			case "active":
				return { label: "فعال", className: styles.statusActive };
			case "inProgress":
				return { label: "در حال انجام", className: styles.statusInProgress };
			case "completed":
				return { label: "تکمیل شده", className: styles.statusCompleted };
			case "onHold":
				return { label: "متوقف شده", className: styles.statusOnHold };
			default:
				return { label: "فعال", className: styles.statusActive };
		}
	};

	const statusInfo = getStatusInfo(project.status);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("fa-IR");
	};

	const dropdownItems = [
		{
			label: "ویرایش پروژه",
			onClick: () => onEdit(project),
		},
		{
			label: "حذف پروژه",
			onClick: () => onDelete(project),
			className: styles.deleteItem,
		},
	];

	return (
		<div className={styles.card}>
			{/* Card Header */}
			<div className={styles.cardHeader}>
				<div className={styles.titleSection}>
					<h3
						className={styles.projectName}
						onClick={() => onClick(project)}
					>
						{project.name}
					</h3>
					<span className={`${styles.status} ${statusInfo.className}`}>
						{statusInfo.label}
					</span>
				</div>
				<Dropdown
					items={dropdownItems}
					position='left'
				>
					<Button
						variant='primary'
						size='small'
						className={styles.menuButton}
					>
						<MoreVertical size={16} />
					</Button>
				</Dropdown>
			</div>

			{/* Description */}
			{project.description && (
				<p className={styles.description}>{project.description}</p>
			)}

			{/* Progress */}
			<div className={styles.progressSection}>
				<div className={styles.progressHeader}>
					<span>پیشرفت پروژه</span>
					<span className={styles.progressValue}>{project.progress}%</span>
				</div>
				<ProgressBar
					value={project.progress}
					className={styles.progressBar}
				/>
			</div>

			{/* Metadata */}
			<div className={styles.metadata}>
				{project.phase && (
					<div className={styles.metaItem}>
						<Flag
							size={16}
							className={styles.metaIcon}
						/>
						<span>فاز {project.phase}</span>
					</div>
				)}

				{project.startDate && (
					<div className={styles.metaItem}>
						<Calendar
							size={16}
							className={styles.metaIcon}
						/>
						<span>{formatDate(project.startDate)}</span>
					</div>
				)}

				{project.teamMembers && project.teamMembers.length > 0 && (
					<div className={styles.metaItem}>
						<Users
							size={16}
							className={styles.metaIcon}
						/>
						<span>{project.teamMembers.length} نفر</span>
					</div>
				)}
			</div>

			{/* Tags */}
			{project.tags && project.tags.length > 0 && (
				<div className={styles.tags}>
					{project.tags.slice(0, 3).map((tag, index) => (
						<span
							key={index}
							className={styles.tag}
						>
							{tag}
						</span>
					))}
					{project.tags.length > 3 && (
						<span className={styles.moreTags}>+{project.tags.length - 3}</span>
					)}
				</div>
			)}
		</div>
	);
}
