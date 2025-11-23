import styles from "./Button.module.css";
import { CSSProperties } from "react";

interface ButtonProps {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
	type?: "button" | "submit" | "reset";
	variant?: "primary" | "secondary" | "outline" | "text";
	size?: "small" | "medium" | "large";
	disabled?: boolean;
	loading?: boolean;
	style?: CSSProperties;
}

export default function Button({
	children,
	className = "",
	onClick,
	type = "button",
	variant = "primary",
	size = "medium",
	disabled = false,
	loading = false,
	style,
}: ButtonProps) {
	const getButtonClasses = () => {
		const baseClass = styles.button;
		const variantClass = styles[`button--${variant}`];
		const sizeClass = styles[`button--${size}`];
		const stateClass = disabled ? styles["button--disabled"] : "";
		const loadingClass = loading ? styles["button--loading"] : "";

		return [
			baseClass,
			variantClass,
			sizeClass,
			stateClass,
			loadingClass,
			className,
		]
			.filter(Boolean)
			.join(" ");
	};

	return (
		<button
			type={type}
			className={getButtonClasses()}
			onClick={onClick}
			disabled={disabled || loading}
			style={style}
		>
			{loading ? "Loading..." : children}
		</button>
	);
}
