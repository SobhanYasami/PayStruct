import Image from "next/image";
import styles from "./page.module.css";
import UnderContraction from "../../../../public/under-construction0.jpg";
import PersianDatePickerCustom from "@/components/ui/persianDatePicker/PersianDatePicker";

export default function Customers() {
	return (
		<div className={styles.Container}>
			<Image
				src={UnderContraction}
				alt='under construction'
				fill
			/>
			<div className={styles.Overlay}>مشتریان</div>
		</div>
	);
}
