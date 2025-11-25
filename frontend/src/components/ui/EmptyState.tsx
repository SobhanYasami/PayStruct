import { FileText, Search, Plus } from "lucide-react";
import Button from "../ui/Button";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
	title: string;
	description: string;
	actionText?: string;
	onAction?: () => void;
	variant?: "default" | "search" | "create";
	icon?: React.ReactNode;
}

export default function EmptyState({
	title,
	description,
	actionText,
	onAction,
	variant = "default",
	icon,
}: EmptyStateProps) {
	const getIcon = () => {
		if (icon) return icon;

		switch (variant) {
			case "search":
				return (
					<Search
						size={48}
						className={styles.icon}
					/>
				);
			case "create":
				return (
					<Plus
						size={48}
						className={styles.icon}
					/>
				);
			default:
				return (
					<FileText
						size={48}
						className={styles.icon}
					/>
				);
		}
	};

	return (
		<div className={styles.emptyState}>
			<div className={styles.iconContainer}>{getIcon()}</div>
			<h3 className={styles.title}>{title}</h3>
			<p className={styles.description}>{description}</p>
			{actionText && onAction && (
				<Button
					variant='primary'
					size='medium'
					onClick={onAction}
					className={styles.actionButton}
				>
					{actionText}
				</Button>
			)}
		</div>
	);
}
