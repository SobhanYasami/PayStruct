import styles from "./layout.module.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className={styles.shell}>
			<Sidebar />
			<div className={styles.content}>
				<TopBar />
				<main className={styles.main}>{children}</main>
			</div>
		</div>
	);
}
