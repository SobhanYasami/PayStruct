import { Plus } from "lucide-react";

import styles from "./ProjectPageHeader.module.css";
import Button from "../ui/Button";
import SearchInput from "../ui/SearchInput";

export default function PageHeader({
	title,
	subtitle,
	searchValue,
	onSearchChange,
	onCreateClick,
}: {
	title: string;
	subtitle: string;
	searchValue: string;
	onSearchChange: (value: string) => void;
	onCreateClick: () => void;
}) {
	return (
		<div className={styles.header}>
			<div>
				<h1 className={styles.title}>{title}</h1>
				<p className={styles.subtitle}>{subtitle}</p>
			</div>

			<div className={styles.actions}>
				<SearchInput
					value={searchValue}
					onChange={onSearchChange}
					placeholder='جستجو بر اساس نام یا فاز...'
				/>
				<Button
					variant='primary'
					size='medium'
					onClick={onCreateClick}
					className={styles.createButton}
				>
					<Plus size={20} /> ایجاد پروژه جدید
				</Button>
			</div>
		</div>
	);
}
