import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import styles from "./ContractInfo.module.css";

type ContractInfoProps = {
	ID: string;
};

export default function ContractInformation() {
	return (
		<div className={styles.Container}>
			<div className={styles.Row1}>
				<div className={styles.Col1}>
					<p>نوع پیمانکار:</p>
					<p>--</p>
				</div>
				<div className={styles.Col2}>
					<p>نام پیمانکار:</p>
					<p>--</p>
				</div>
			</div>
			<div className={styles.Row2}>
				<div className={styles.Col1}>
					<p>شناسه تفضیلی پیمانکار:</p>
					<p>{toPersianDigits(0)}</p>
				</div>
				<div className={styles.Col2}>
					<p>شناسه ملی پیمانکار:</p>
					<p>{toPersianDigits(0)}</p>
				</div>
			</div>
			<div className={styles.Row3}>
				<div className={styles.Col1}>
					<p>مبلغ ناخالص قرارداد:</p>
					<p>{toPersianDigits(0)} ریال</p>
				</div>
				<div className={styles.Col2}>
					<p>پروژه:</p>
					<p>--</p>
				</div>
			</div>
			<div className={styles.Row4}>
				<div className={styles.Col1}>
					<p>درصد پیشرفت فیزیکی آخرین صورت وضعیت:</p>
					<p>{toPersianDigits(0)}%</p>
				</div>
				<div className={styles.Col2}>
					<p>تعداد صورت وضعیت های صادر شده:</p>
					<p>{toPersianDigits(0)}</p>
				</div>
			</div>
		</div>
	);
}
