import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
	value: number;
	max?: number;
	className?: string;
	variant?: "default" | "success" | "warning" | "error";
	size?: "small" | "medium" | "large";
	showLabel?: boolean;
	labelPosition?: "inside" | "outside";
}

export default function ProgressBar({
	value,
	max = 100,
	className = "",
	variant = "default",
	size = "medium",
	showLabel = false,
	labelPosition = "outside",
}: ProgressBarProps) {
	const percentage = Math.min(100, Math.max(0, (value / max) * 100));

	const getVariantClass = () => {
		switch (variant) {
			case "success":
				return styles.success;
			case "warning":
				return styles.warning;
			case "error":
				return styles.error;
			default:
				return styles.default;
		}
	};

	const getSizeClass = () => {
		switch (size) {
			case "small":
				return styles.small;
			case "large":
				return styles.large;
			default:
				return styles.medium;
		}
	};

	return (
		<div className={`${styles.progressBarContainer} ${className}`}>
			{showLabel && labelPosition === "outside" && (
				<div className={styles.labelOutside}>
					<span>پیشرفت</span>
					<span>{Math.round(percentage)}%</span>
				</div>
			)}

			<div className={`${styles.progressBar} ${getSizeClass()}`}>
				<div
					className={`${styles.progressFill} ${getVariantClass()}`}
					style={{ width: `${percentage}%` }}
				>
					{showLabel && labelPosition === "inside" && (
						<span className={styles.labelInside}>
							{Math.round(percentage)}%
						</span>
					)}
				</div>
			</div>

			{showLabel && labelPosition === "outside" && (
				<div className={styles.progressText}>
					{value} از {max}
				</div>
			)}
		</div>
	);
}
