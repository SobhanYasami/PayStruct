import styles from "./Dialog.module.css";
import { X } from "lucide-react";
import Button from "./Button"; // Import your Button component

interface DialogProps {
	title: string;
	onClose: () => void;
	children: React.ReactNode;
	size?: "small" | "medium" | "large";
	showCloseButton?: boolean;
}

export default function Dialog({
	title,
	onClose,
	children,
	size = "medium",
	showCloseButton = true,
}: DialogProps) {
	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className={styles.dialogOverlay}
			onClick={handleOverlayClick}
		>
			<div
				className={`${styles.dialogContent} ${
					styles[`dialogContent--${size}`]
				}`}
			>
				{showCloseButton && (
					<Button
						variant='text'
						size='small'
						onClick={onClose}
						className={styles.dialogClose}
						aria-label='Close dialog'
					>
						<X size={20} />
					</Button>
				)}

				{title && <h2 className={styles.dialogTitle}>{title}</h2>}

				<div className={styles.dialogBody}>{children}</div>
			</div>
		</div>
	);
}
