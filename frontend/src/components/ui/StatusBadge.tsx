import styles from "./StatusBadge.module.css";

type Status =
	| "draft"
	| "submitted"
	| "approved"
	| "rejected"
	| "paid"
	| "active"
	| "inactive"
	| "completed"
	| "onHold"
	| "inProgress"
	| "official"
	| "contractual";

const statusConfig: Record<Status, { label: string; className: string }> = {
	draft:       { label: "پیش‌نویس",   className: styles.draft },
	submitted:   { label: "ارسال‌شده",  className: styles.submitted },
	approved:    { label: "تأیید‌شده",  className: styles.approved },
	rejected:    { label: "رد‌شده",     className: styles.rejected },
	paid:        { label: "پرداخت‌شده", className: styles.paid },
	active:      { label: "فعال",        className: styles.approved },
	inactive:    { label: "غیرفعال",    className: styles.draft },
	completed:   { label: "تکمیل‌شده",  className: styles.paid },
	onHold:      { label: "متوقف",      className: styles.rejected },
	inProgress:  { label: "در جریان",   className: styles.submitted },
	official:    { label: "رسمی",        className: styles.paid },
	contractual: { label: "قراردادی",   className: styles.submitted },
};

interface StatusBadgeProps {
	status: string;
	className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
	const config = statusConfig[status as Status] ?? {
		label: status,
		className: styles.draft,
	};
	return (
		<span className={`${styles.badge} ${config.className} ${className}`}>
			{config.label}
		</span>
	);
}
