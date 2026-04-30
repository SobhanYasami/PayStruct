import styles from "./DataTable.module.css";

export interface TableColumn<T> {
	key: string;
	label: string;
	width?: string;
	align?: "right" | "left" | "center";
	render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
	columns: TableColumn<T>[];
	data: T[];
	keyExtractor: (row: T) => string;
	onRowClick?: (row: T) => void;
	loading?: boolean;
	emptyState?: React.ReactNode;
}

export default function DataTable<T>({
	columns,
	data,
	keyExtractor,
	onRowClick,
	loading = false,
	emptyState,
}: DataTableProps<T>) {
	if (loading) {
		return (
			<div className={styles.loading}>
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className={styles.skeletonRow} />
				))}
			</div>
		);
	}

	if (!data.length && emptyState) {
		return <>{emptyState}</>;
	}

	return (
		<div className={styles.wrapper}>
			<table className={styles.table}>
				<thead className={styles.thead}>
					<tr>
						{columns.map((col) => (
							<th
								key={col.key}
								className={styles.th}
								style={{ width: col.width, textAlign: col.align ?? "right" }}
							>
								{col.label}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{data.map((row) => (
						<tr
							key={keyExtractor(row)}
							className={`${styles.tr} ${onRowClick ? styles.trClickable : ""}`}
							onClick={() => onRowClick?.(row)}
						>
							{columns.map((col) => (
								<td
									key={col.key}
									className={styles.td}
									style={{ textAlign: col.align ?? "right" }}
								>
									{col.render
										? col.render(row)
										: String((row as Record<string, unknown>)[col.key] ?? "")}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
