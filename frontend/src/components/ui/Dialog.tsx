import styles from "./Dialog.module.css";
import { X } from "lucide-react";

export default function Dialog({
	title,
	onClose,
	children,
}: {
	title: string;
	onClose: any;
	children: React.ReactNode;
}) {
	return (
		<div className={styles.dialogOverlay}>
			{/* Modal Box */}
			<div className={styles.dialogContent}>
				<button
					className={styles.dialogClose}
					onClick={onClose}
				>
					<X size={20} />
				</button>
				<h2 className={styles.dialogTitle}>{title}</h2>

				{children}
			</div>
		</div>
	);
}
