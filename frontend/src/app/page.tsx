import Image from "next/image";
import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
	return (
		<div className={styles.page}>
			<h1 className={styles.title}>خوش آمدید</h1>
			<p className={styles.description}>دستیار شما در مدیریت پروژه ها</p>
			<p className={styles.description}>
				برای شروع{" "}
				<Link
					href='/sign-in'
					className={styles.link}
				>
					وارد
				</Link>{" "}
				شوید
			</p>

			<div className={styles.imageContainer}></div>
		</div>
	);
}
