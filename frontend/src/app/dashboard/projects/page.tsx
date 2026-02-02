"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import styles from "./page.module.css";
import Dialog from "@/components/ui/Dialog";
import PageHeader from "@/components/layout/ProjectPageHeader";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

//
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Project_URL = `${API_URL}/management/projects/`;

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

interface ProjectCreationPayload {
	name: string;
	phase: string;
}

async function projectCreationReq(payload: ProjectCreationPayload) {
	let token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("UnAuthorized");
	}
	const res = await fetch(`${Project_URL}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `bearer ${token}`,
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Creating project failed!");
	}

	return res.json();
}

async function getAllProjects() {
	let token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("UnAuthorized");
	}
	const res = await fetch(`${Project_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Creating project failed!");
	}

	return res.json();
}
/* ----------   Reusable Components --------------   */
// Create Project Form Component
function CreateProjectForm({
	onCancel,
	setUpdateUi,
}: {
	onCancel: () => void;
	setUpdateUi: Dispatch<SetStateAction<string>>;
}) {
	const [formData, setFormData] = useState({
		name: "",
		phase: "",
	});

	const mutation = useMutation({
		mutationFn: projectCreationReq,
		onSuccess: (data) => {
			toast.success(data.message);
			setUpdateUi(data.message);
		},
		onError(error) {
			console.log(error.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		console.log("Creating project:", formData);

		mutation.mutate({ name: formData.name, phase: formData.phase });
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

/* ---------- Main Component -------------- */
export default function Projects() {
	const [showCreate, setShowCreate] = useState(false);
	const [showEdit, setShowEdit] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const [projectList, setProjectList] = useState<Project[]>();

	const [search, setSearch] = useState("");

	const [updateui, setUpdateUi] = useState("");

	// todo: implement it
	const handleDeleteConfirm = () => {
		setShowDelete(false);
	};

	useEffect(() => {
		const res = getAllProjects();
		res.then((data) => {
			setProjectList(data.data);
		});
		res.catch((err) => {
			// setProjectList([]);
			console.log(err);
			toast.error(err);
		});
	}, [updateui]);

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

				<div className={styles.projectListContainer}>
					{/* {projectList &&
							projectList.map((project) => (
								<div
									key={project.name}
									className={styles.project}
								>
									{project.name}
									<div className={styles.projectPhaseContainer}>
										{project.phases.map((phase) => (
											<span key={`${project.name}-${phase}`}>{phase}</span>
										))}
									</div>
								</div>
							))} */}
				</div>
			</div>

			{/* Dialogs */}
			{showCreate && (
				<CreateProjectForm
					onCancel={() => setShowCreate(false)}
					setUpdateUi={setUpdateUi}
				/>
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
