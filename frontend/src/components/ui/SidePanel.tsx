"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import styles from "./SidePanel.module.css";

interface SidePanelProps {
	open: boolean;
	onClose: () => void;
	title: string;
	width?: "md" | "lg";
	footer?: React.ReactNode;
	children: React.ReactNode;
}

export default function SidePanel({
	open,
	onClose,
	title,
	width = "md",
	footer,
	children,
}: SidePanelProps) {
	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	if (!open) return null;

	return (
		<div
			className={styles.overlay}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className={`${styles.panel} ${styles[`panel--${width}`]}`}>
				<div className={styles.header}>
					<h2 className={styles.title}>{title}</h2>
					<button
						className={styles.closeBtn}
						onClick={onClose}
						aria-label="بستن"
					>
						<X size={18} />
					</button>
				</div>
				<div className={styles.body}>{children}</div>
				{footer && <div className={styles.footer}>{footer}</div>}
			</div>
		</div>
	);
}
