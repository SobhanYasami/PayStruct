import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
	return (
		<div className={styles.page}>
			<h1 className={styles.title}>Welcome to PayStruct</h1>
			<p className={styles.description}>
				Your ultimate finance manager for companies.
			</p>
			<div className={styles.imageContainer}></div>
		</div>
	);
}
