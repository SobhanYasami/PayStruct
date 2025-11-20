"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import styles from "./page.module.css";

/* -------------------- Types -------------------- */
interface Contractor {
	id: string;
	name: string;
	share: number;
	statusStatements: number;
}

interface Project {
	id: string;
	name: string;
	phases: string[];
	startDate: string;
	endDate: string;
	budget: number;
	contractors: Contractor[];
	turnover: number;
	createdAt: string;
	updatedAt: string;
}

/* -------- Dialog Component (Blur Overlay) -------- */
function Dialog({
	title,
	onClose,
	children,
}: {
	title: string;
	onClose: any;
	children: React.ReactNode;
}) {
	return (
		<div className={styles.dialogOverlay}>
			{/* Modal Box */}
			<div className={styles.dialogContent}>
				<button
					className={styles.dialogClose}
					onClick={onClose}
				>
					<X size={20} />
				</button>
				<h2 className={styles.dialogTitle}>{title}</h2>

				{children}
			</div>
		</div>
	);
}

/* ----------   Main Component --------------   */
export default function Projects() {
	const [showCreate, setShowCreate] = useState(false);
	const [showEdit, setShowEdit] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const [search, setSearch] = useState("");

	return (
		<main
			className={styles.page}
			dir='rtl'
		>
			<div className={styles.wrapper}>
				{/* Header */}
				<div className={styles.header}>
					<div>
						<h1 className={styles.title}>مدیریت پروژه‌ها</h1>
						<p className={styles.subtitle}>سیستم مدیریت پروژه‌های ساخت و ساز</p>
					</div>

					<div className={styles.actions}>
						<div className={styles.searchWrapper}>
							<Search
								className={styles.searchIcon}
								size={20}
							/>
							<input
								placeholder='جستجو بر اساس نام یا فاز...'
								value={search} // controlled value
								onChange={(e) => setSearch(e.target.value)}
								className={styles.searchInput}
							/>
						</div>

						<button
							className={styles.createButton}
							onClick={() => setShowCreate(true)}
						>
							<Plus size={20} /> ایجاد پروژه جدید
						</button>
					</div>
				</div>
			</div>

			{/* Create Dialog */}
			{showCreate && (
				<Dialog
					title='ایجاد پروژه جدید'
					onClose={() => setShowCreate(false)}
				>
					<form className='flex flex-col gap-3'>
						<input
							type='text'
							placeholder='نام پروژه'
							className={styles.dialogInput}
							onChange={() => console.log("project name")}
						/>
						<input
							type='number'
							placeholder='فاز'
							className={styles.dialogInput}
							onChange={() => console.log("project phase")}
						/>

						<button className='bg-blue-600 text-white p-2 rounded mt-2'>
							ثبت پروژه
						</button>
					</form>
				</Dialog>
			)}

			{/* Edit Dialog */}
			{showEdit && (
				<Dialog
					title='ویرایش پروژه'
					onClose={() => setShowEdit(false)}
				>
					<p>فرم ویرایش اینجا...</p>
				</Dialog>
			)}

			{/* Delete Dialog */}
			{showDelete && (
				<Dialog
					title='حذف پروژه'
					onClose={() => setShowDelete(false)}
				>
					<p className='mb-4'>آیا از حذف این پروژه مطمئن هستید؟</p>
					<div className='flex gap-3'>
						<button className='bg-red-600 text-white p-2 rounded flex-1'>
							حذف
						</button>
						<button
							className='bg-gray-300 p-2 rounded flex-1'
							onClick={() => setShowDelete(false)}
						>
							لغو
						</button>
					</div>
				</Dialog>
			)}
		</main>
	);
}

/* Small fade animation */
// Add this to your global.css if needed:
// .animate-fadeIn {
//   animation: fadeIn 0.2s ease-out;
// }
// @keyframes fadeIn {
//   from { opacity: 0; transform: scale(0.96); }
//   to { opacity: 1; transform: scale(1); }
// }
