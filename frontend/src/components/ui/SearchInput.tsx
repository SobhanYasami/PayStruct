import { Search } from "lucide-react";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	size?: "small" | "medium" | "large";
	variant?: "default" | "outlined" | "filled";
	disabled?: boolean;
	className?: string;
	inputClassName?: string;
	iconClassName?: string;
}

export default function SearchInput({
	value,
	onChange,
	placeholder = "جستجو...",
	size = "medium",
	variant = "default",
	disabled = false,
	className = "",
	inputClassName = "",
	iconClassName = "",
}: SearchInputProps) {
	return (
		<div
			className={`${styles.searchWrapper} ${styles[size]} ${styles[variant]} ${
				disabled ? styles.disabled : ""
			} ${className}`}
		>
			<Search
				className={`${styles.searchIcon} ${iconClassName}`}
				size={20}
			/>
			<input
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className={`${styles.searchInput} ${inputClassName}`}
			/>
		</div>
	);
}
