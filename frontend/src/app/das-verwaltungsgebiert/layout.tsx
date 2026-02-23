import styles from "./layout.module.css";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <section className={styles.main}>{children}</section>;
}
