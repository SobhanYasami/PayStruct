import styles from "./WorksDone.module.css";

export default function WorksDone() {
	return (
		<div className={styles.Container}>
			<h4 className={styles.Title}>جدول کارکرد</h4>
			<form className={styles.FormContainer}>
				<div className={styles.TableHeader}>
					<p className={styles.col1}>ردیف</p>
					<p className={styles.col2}>شرح</p>
					<p className={styles.col3}>مقدار کار پیشین</p>
					<p className={styles.col4}>مقدار کار جدید</p>
					<p className={styles.col5}> پیشرفت نسبی (%)</p>
					<p className={styles.col5}>پیشرفت کل (%)</p>
				</div>
			</form>
		</div>
	);
}
