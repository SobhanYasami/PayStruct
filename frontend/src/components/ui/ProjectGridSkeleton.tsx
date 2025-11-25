import styles from "./ProjectGridSkeleton.module.css";

interface ProjectGridSkeletonProps {
	count?: number;
}

export default function ProjectGridSkeleton({
	count = 6,
}: ProjectGridSkeletonProps) {
	return (
		<div className={styles.skeletonGrid}>
			{Array.from({ length: count }, (_, index) => (
				<div
					key={index}
					className={styles.skeletonCard}
				>
					{/* Header */}
					<div className={styles.skeletonHeader}>
						<div className={styles.skeletonTitleSection}>
							<div
								className={`${styles.skeletonText} ${styles.skeletonTitle}`}
							></div>
							<div
								className={`${styles.skeletonText} ${styles.skeletonBadge}`}
							></div>
						</div>
						<div className={styles.skeletonMenu}></div>
					</div>

					{/* Description */}
					<div className={styles.skeletonDescription}>
						<div
							className={`${styles.skeletonText} ${styles.skeletonLine}`}
						></div>
						<div
							className={`${styles.skeletonText} ${styles.skeletonLineShort}`}
						></div>
					</div>

					{/* Progress */}
					<div className={styles.skeletonProgress}>
						<div className={styles.skeletonProgressHeader}>
							<div
								className={`${styles.skeletonText} ${styles.skeletonProgressLabel}`}
							></div>
							<div
								className={`${styles.skeletonText} ${styles.skeletonProgressValue}`}
							></div>
						</div>
						<div className={styles.skeletonProgressBar}></div>
					</div>

					{/* Metadata */}
					<div className={styles.skeletonMetadata}>
						<div className={styles.skeletonMetaItem}>
							<div className={styles.skeletonIcon}></div>
							<div
								className={`${styles.skeletonText} ${styles.skeletonMetaText}`}
							></div>
						</div>
						<div className={styles.skeletonMetaItem}>
							<div className={styles.skeletonIcon}></div>
							<div
								className={`${styles.skeletonText} ${styles.skeletonMetaText}`}
							></div>
						</div>
					</div>

					{/* Tags */}
					<div className={styles.skeletonTags}>
						<div className={styles.skeletonTag}></div>
						<div className={styles.skeletonTag}></div>
						<div className={styles.skeletonTag}></div>
					</div>
				</div>
			))}
		</div>
	);
}
