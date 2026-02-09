import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import styles from "./ContractInfo.module.css";

export default function ContractInformation({
	first_name,
	last_name,
	legal_entity,
	preferential_id,
	national_id,
	project_name,
	project_phase,
}: {
	first_name: string;
	last_name: string;
	legal_entity: boolean;
	preferential_id: string;
	national_id: string;
	project_name: string;
	project_phase: number;
}) {
	return (
		<div className={styles.Container}>
			<div className={styles.Row1}>
				<div className={styles.Col1}>
					<p>نوع پیمانکار:</p>
					<p>{legal_entity ? "حقوقی" : "حقیقی"}</p>
				</div>
				<div className={styles.Col2}>
					<p>نام پیمانکار:</p>
					<p>{`${first_name}-${last_name}`}</p>
				</div>
			</div>
			<div className={styles.Row2}>
				<div className={styles.Col1}>
					<p>شناسه تفضیلی پیمانکار:</p>
					<p>{toPersianDigits(preferential_id)}</p>
				</div>
				<div className={styles.Col2}>
					<p>شناسه ملی پیمانکار:</p>
					<p>{toPersianDigits(national_id)}</p>
				</div>
			</div>
			<div className={styles.Row3}>
				<div className={styles.Col1}>
					<p>مبلغ ناخالص قرارداد:</p>
					<p>{toPersianDigits(0)} ریال</p>
				</div>
				<div className={styles.Col2}>
					<p>پروژه:</p>
					<p>{`${project_name}-${project_phase}`}</p>
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
