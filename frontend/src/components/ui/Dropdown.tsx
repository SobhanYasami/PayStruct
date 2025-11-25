"use client";
import { useState, useRef, useEffect } from "react";
import styles from "./Dropdown.module.css";

interface DropdownItem {
	label: string;
	onClick: () => void;
	className?: string;
	disabled?: boolean;
}

interface DropdownProps {
	items: DropdownItem[];
	children: React.ReactNode;
	position?: "left" | "right";
	className?: string;
}

export default function Dropdown({
	items,
	children,
	position = "right",
	className = "",
}: DropdownProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const toggleDropdown = () => setIsOpen(!isOpen);

	const handleItemClick = (item: DropdownItem) => {
		if (!item.disabled) {
			item.onClick();
			setIsOpen(false);
		}
	};

	return (
		<div
			className={`${styles.dropdown} ${className}`}
			ref={dropdownRef}
		>
			<div
				className={styles.trigger}
				onClick={toggleDropdown}
			>
				{children}
			</div>

			{isOpen && (
				<div className={`${styles.menu} ${styles[position]}`}>
					{items.map((item, index) => (
						<button
							key={index}
							className={`${styles.menuItem} ${item.className || ""} ${
								item.disabled ? styles.disabled : ""
							}`}
							onClick={() => handleItemClick(item)}
							disabled={item.disabled}
						>
							{item.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
