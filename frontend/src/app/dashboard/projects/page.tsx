"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import styles from "./page.module.css";
import Dialog from "@/components/ui/Dialog";

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

/* ----------   Reusable Components --------------   */

// Search Input Component
function SearchInput({
	value,
	onChange,
	placeholder = "جستجو...",
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	return (
		<div className={styles.searchWrapper}>
			<Search
				className={styles.searchIcon}
				size={20}
			/>
			<input
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={styles.searchInput}
			/>
		</div>
	);
}

// Create Button Component
function CreateButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			className={styles.createButton}
			onClick={onClick}
		>
			<Plus size={20} /> ایجاد پروژه جدید
		</button>
	);
}

// Page Header Component
function PageHeader({
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
				<CreateButton onClick={onCreateClick} />
			</div>
		</div>
	);
}

// Create Project Form Component
function CreateProjectForm({ onCancel }: { onCancel: () => void }) {
	const [formData, setFormData] = useState({
		name: "",
		phase: "",
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		console.log("Creating project:", formData);
		// Handle form submission
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<Dialog
			title='ایجاد پروژه جدید'
			onClose={onCancel}
		>
			<form
				className='flex flex-col gap-3'
				onSubmit={handleSubmit}
			>
				<input
					type='text'
					placeholder='نام پروژه'
					className={styles.dialogInput}
					value={formData.name}
					onChange={(e) => handleInputChange("name", e.target.value)}
				/>
				<input
					type='number'
					placeholder='فاز'
					className={styles.dialogInput}
					value={formData.phase}
					onChange={(e) => handleInputChange("phase", e.target.value)}
				/>
				<button
					type='submit'
					className={styles.submitBtn}
				>
					ثبت پروژه
				</button>
			</form>
		</Dialog>
	);
}

// Edit Project Form Component
function EditProjectForm({ onCancel }: { onCancel: () => void }) {
	return (
		<Dialog
			title='ویرایش پروژه'
			onClose={onCancel}
		>
			<p>فرم ویرایش اینجا...</p>
		</Dialog>
	);
}

// Delete Confirmation Dialog Component
function DeleteConfirmationDialog({
	onConfirm,
	onCancel,
}: {
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<Dialog
			title='حذف پروژه'
			onClose={onCancel}
		>
			<p className='mb-4'>آیا از حذف این پروژه مطمئن هستید؟</p>
			<div className='flex gap-3'>
				<button
					className='bg-red-600 text-white p-2 rounded flex-1'
					onClick={onConfirm}
				>
					حذف
				</button>
				<button
					className='bg-gray-300 p-2 rounded flex-1'
					onClick={onCancel}
				>
					لغو
				</button>
			</div>
		</Dialog>
	);
}

/* ----------   Main Component --------------   */
export default function Projects() {
	const [showCreate, setShowCreate] = useState(false);
	const [showEdit, setShowEdit] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const [search, setSearch] = useState("");

	const handleDeleteConfirm = () => {
		console.log("Project deleted");
		setShowDelete(false);
		// Add actual delete logic here
	};

	return (
		<main
			className={styles.page}
			dir='rtl'
		>
			<div className={styles.wrapper}>
				<PageHeader
					title='مدیریت پروژه‌ها'
					subtitle='سیستم مدیریت پروژه‌های ساخت و ساز'
					searchValue={search}
					onSearchChange={setSearch}
					onCreateClick={() => setShowCreate(true)}
				/>
			</div>

			{/* Dialogs */}
			{showCreate && (
				<CreateProjectForm onCancel={() => setShowCreate(false)} />
			)}

			{showEdit && <EditProjectForm onCancel={() => setShowEdit(false)} />}

			{showDelete && (
				<DeleteConfirmationDialog
					onConfirm={handleDeleteConfirm}
					onCancel={() => setShowDelete(false)}
				/>
			)}
		</main>
	);
}
