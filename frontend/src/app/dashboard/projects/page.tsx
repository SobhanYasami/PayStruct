"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, Archive, Trash2, DownloadCloud, Edit2 } from "lucide-react";
/* -------------------- Types -------------------- */
import {
	Project,
	ProjectStatus,
	StakeholderRef,
	Phase,
	User,
} from "@/types/projects";

/**
 * Projects page (Persian / RTL) - features:
 * - Sidebar for page sections
 * - Project create/edit form (rich fields)
 * - Phases with drag-and-drop ordering (HTML5 DnD)
 * - Stakeholder selection (customer/contractor autocomplete)
 * - File attachments (basic)
 * - Projects table with search, sort, bulk actions, CSV export
 * - Kanban view toggle
 * - Soft-delete (archive) with confirmation and reason logging
 * - Version history for edits (simple)
 * - Dashboard widgets area
 * - LocalStorage persistence
 * - Mobile responsive and RTL
 */

/* -------------------- Helpers -------------------- */
const uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);

const STORAGE_KEY =
	process.env.NEXT_PUBLIC_STORAGE_KEY || "paystruct_projects_v1";

const MOCK_CUSTOMERS = [
	{ id: "c1", name: "شرکت آلفا" },
	{ id: "c2", name: "آقای احمدی" },
	{ id: "c3", name: "خانم موسوی" },
];
const MOCK_CONTRACTORS = [
	{ id: "k1", name: "پیمانکار سازه‌نو" },
	{ id: "k2", name: "تیم برق‌کاران" },
	{ id: "k3", name: "گروه نازک‌کاری" },
];

/* -------------------- Component -------------------- */

export default function Projects() {
	const [projects, setProjects] = useState<Project[]>([]);
	const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState<"createdAt" | "name" | "budget">(
		"createdAt",
	);
	const [kanbanMode, setKanbanMode] = useState(false);
	const [darkMode, setDarkMode] = useState(false);

	// Form state for create / edit
	const [editingProject, setEditingProject] = useState<Project | null>(null);
	const [showEditor, setShowEditor] = useState(false);
	const [showArchiveModal, setShowArchiveModal] = useState<{
		open: boolean;
		id?: string;
	}>({ open: false });

	// Sidebar active anchor
	const [activeSection, setActiveSection] = useState<string>("create");

	// Autocomplete lists (mock)
	const [customers] = useState(MOCK_CUSTOMERS);
	const [contractors] = useState(MOCK_CONTRACTORS);

	// Load projects from localStorage
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			setProjects(JSON.parse(stored));
		} else {
			// seed a sample project
			const sample: Project = {
				id: uid("prj_"),
				name: "پروژه نمونه برج آفتاب",
				code: "PRJ-0001",
				description: "پروژه نمونه جهت نمایش امکانات سیستم PayStruct.",
				category: "ساختمانی",
				phases: [
					{
						id: uid("ph_"),
						title: "پی‌ریزی",
						start: todayISO(),
						end: todayISO(),
						completed: true,
					},
					{
						id: uid("ph_"),
						title: "سازه",
						start: todayISO(),
						end: todayISO(),
						completed: false,
					},
				],
				customers: [{ id: "c1", name: "شرکت آلفا", type: "customer" }],
				contractors: [
					{ id: "k1", name: "پیمانکار سازه‌نو", type: "contractor" },
				],
				budget: 1200000000,
				priority: "High",
				status: "Active",
				tags: ["شهری", "اولویت-بالا"],
				files: [],
				archived: false,
				history: [
					{
						when: new Date().toISOString(),
						by: "admin",
						changes: "ایجاد پروژه نمونه",
					},
				],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};
			setProjects([sample]);
		}
	}, []);

	// Save to localStorage
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
	}, [projects]);

	/* -------------------- Basic operations -------------------- */

	function openCreate() {
		setEditingProject({
			id: uid("prj_"),
			name: "",
			code: `PRJ-${Math.floor(Math.random() * 9000 + 1000)}`,
			description: "",
			category: "",
			phases: [],
			customers: [],
			contractors: [],
			budget: 0,
			priority: "Medium",
			status: "Planning",
			tags: [],
			files: [],
			archived: false,
			history: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		setShowEditor(true);
		setActiveSection("create");
	}

	function openEdit(p: Project) {
		setEditingProject(JSON.parse(JSON.stringify(p))); // clone
		setShowEditor(true);
		setActiveSection("edit");
	}

	function saveProject(proj: Project) {
		const exists = projects.find((p) => p.id === proj.id);
		proj.updatedAt = new Date().toISOString();
		proj.history = proj.history || [];
		proj.history.push({
			when: new Date().toISOString(),
			by: "مدیر",
			changes: exists ? "ویرایش پروژه" : "ایجاد پروژه",
		});

		if (exists) {
			setProjects((prev) => prev.map((p) => (p.id === proj.id ? proj : p)));
		} else {
			setProjects((prev) => [proj, ...prev]);
		}
		setShowEditor(false);
	}

	function toggleSelect(id: string) {
		setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
	}

	function bulkArchive() {
		const toArchive = Object.keys(selectedIds).filter((id) => selectedIds[id]);
		if (!toArchive.length) return alert("هیچ پروژه‌ای انتخاب نشده است.");
		if (!confirm("آیا مایل به آرشیو کردن پروژه‌های انتخاب شده هستید؟")) return;
		setProjects((prev) =>
			prev.map((p) =>
				toArchive.includes(p.id) ? { ...p, archived: true } : p,
			),
		);
		setSelectedIds({});
	}

	function exportCSV(filtered: Project[]) {
		const rows = [
			["ID", "نام پروژه", "کد", "وضعیت", "اولویت", "بودجه", "تاریخ ایجاد"],
			...filtered.map((p) => [
				p.id,
				p.name,
				p.code || "",
				p.status || "",
				p.priority || "",
				String(p.budget || 0),
				p.createdAt,
			]),
		];
		const csv = rows
			.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
			.join("\n");
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = `projects_${new Date().toISOString().slice(0, 10)}.csv`;
		link.click();
	}

	function openArchiveModalWith(id?: string) {
		setShowArchiveModal({ open: true, id });
	}

	function confirmArchive(reason?: string) {
		if (!showArchiveModal.id) return;
		const id = showArchiveModal.id;
		setProjects((prev) =>
			prev.map((p) =>
				p.id === id
					? {
							...p,
							archived: true,
							history: [
								...(p.history || []),
								{
									when: new Date().toISOString(),
									by: "مدیر",
									changes: `آرشیو — دلیل: ${reason || "بدون دلیل"}`,
								},
							],
					  }
					: p,
			),
		);
		setShowArchiveModal({ open: false });
	}

	function restoreProject(id: string) {
		setProjects((prev) =>
			prev.map((p) => (p.id === id ? { ...p, archived: false } : p)),
		);
	}

	function deleteProjectPermanent(id: string) {
		if (!confirm("حذف دائمی؟ این عمل قابل بازگشت نیست.")) return;
		setProjects((prev) => prev.filter((p) => p.id !== id));
	}

	/* -------------------- Filtering / Sorting / Views -------------------- */

	const filtered = projects.filter((p) => {
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			return (
				p.name.toLowerCase().includes(q) ||
				(p.code || "").toLowerCase().includes(q) ||
				(p.customers || []).some((c) => c.name.toLowerCase().includes(q))
			);
		}
		return true;
	});

	const sorted = [...filtered].sort((a, b) => {
		if (sortBy === "createdAt") return b.createdAt.localeCompare(a.createdAt);
		if (sortBy === "name") return a.name.localeCompare(b.name);
		if (sortBy === "budget") return (b.budget || 0) - (a.budget || 0);
		return 0;
	});

	/* -------------------- Drag & Drop phases (HTML5) -------------------- */

	function handlePhaseDragStart(
		e: React.DragEvent<HTMLDivElement>,
		phaseId: string,
	) {
		e.dataTransfer.setData("text/plain", phaseId);
		e.dataTransfer.effectAllowed = "move";
	}

	function handlePhaseDrop(
		e: React.DragEvent<HTMLDivElement>,
		projId: string,
		targetIndex: number,
	) {
		e.preventDefault();
		const phaseId = e.dataTransfer.getData("text/plain");
		setEditingProject((prev) => {
			if (!prev) return prev;
			const phases = [...prev.phases];
			const idx = phases.findIndex((p) => p.id === phaseId);
			if (idx === -1) return prev;
			const [moved] = phases.splice(idx, 1);
			phases.splice(targetIndex, 0, moved);
			return { ...prev, phases };
		});
	}

	function allowDrop(e: React.DragEvent) {
		e.preventDefault();
	}

	/* -------------------- Minimal file attach handler -------------------- */

	function handleAttachFile(file: File) {
		if (!editingProject) return;
		const f = { id: uid("f_"), name: file.name };
		setEditingProject({
			...editingProject,
			files: [...(editingProject.files || []), f],
		});
	}

	/* -------------------- Simple Kanban helper -------------------- */

	const statusColumns: ProjectStatus[] = [
		"Planning",
		"Active",
		"On Hold",
		"Completed",
		"Cancelled",
	];

	/* -------------------- JSX -------------------- */

	return (
		<div
			dir='rtl'
			className={`${darkMode ? "dark" : ""}`}
		>
			<div className='min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
					<div className='flex flex-col md:flex-row gap-6'>
						{/* -------- Sidebar (left in layout but logical right for RTL) -------- */}
						<aside className='w-full md:w-64 shrink-0'>
							<div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm sticky top-6'>
								<div className='flex items-center justify-between mb-4'>
									<div className='text-lg font-semibold'>منو پروژه‌ها</div>
									<button
										className='text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700'
										onClick={() => setDarkMode((s) => !s)}
										title='تغییر حالت'
									>
										{darkMode ? "روشن" : "تاریک"}
									</button>
								</div>

								<nav className='space-y-2 text-sm'>
									<button
										onClick={() => {
											openCreate();
											setActiveSection("create");
										}}
										className={`w-full text-right px-3 py-2 rounded ${
											activeSection === "create"
												? "bg-blue-50 dark:bg-blue-900 text-blue-700"
												: "hover:bg-gray-50 dark:hover:bg-gray-700"
										}`}
									>
										<div className='flex items-center justify-between'>
											<span>ایجاد پروژه</span>
											<Plus size={16} />
										</div>
									</button>

									<button
										onClick={() => setActiveSection("phases")}
										className={`w-full text-right px-3 py-2 rounded ${
											activeSection === "phases"
												? "bg-blue-50 dark:bg-blue-900 text-blue-700"
												: "hover:bg-gray-50 dark:hover:bg-gray-700"
										}`}
									>
										مدیریت فازها
									</button>

									<button
										onClick={() => setActiveSection("stakeholders")}
										className={`w-full text-right px-3 py-2 rounded ${
											activeSection === "stakeholders"
												? "bg-blue-50 dark:bg-blue-900 text-blue-700"
												: "hover:bg-gray-50 dark:hover:bg-gray-700"
										}`}
									>
										سهامداران
									</button>

									<button
										onClick={() => setActiveSection("table")}
										className={`w-full text-right px-3 py-2 rounded ${
											activeSection === "table"
												? "bg-blue-50 dark:bg-blue-900 text-blue-700"
												: "hover:bg-gray-50 dark:hover:bg-gray-700"
										}`}
									>
										جدول پروژه‌ها
									</button>

									<button
										onClick={() => setActiveSection("kanban")}
										className={`w-full text-right px-3 py-2 rounded ${
											activeSection === "kanban"
												? "bg-blue-50 dark:bg-blue-900 text-blue-700"
												: "hover:bg-gray-50 dark:hover:bg-gray-700"
										}`}
									>
										کانبان
									</button>

									<button
										onClick={() => setActiveSection("dashboard")}
										className={`w-full text-right px-3 py-2 rounded ${
											activeSection === "dashboard"
												? "bg-blue-50 dark:bg-blue-900 text-blue-700"
												: "hover:bg-gray-50 dark:hover:bg-gray-700"
										}`}
									>
										داشبورد
									</button>

									<button
										onClick={() => setActiveSection("settings")}
										className={`w-full text-right px-3 py-2 rounded ${
											activeSection === "settings"
												? "bg-blue-50 dark:bg-blue-900 text-blue-700"
												: "hover:bg-gray-50 dark:hover:bg-gray-700"
										}`}
									>
										تنظیمات
									</button>
								</nav>
							</div>

							{/* quick actions */}
							<div className='mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm'>
								<div className='flex gap-2'>
									<button
										className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm'
										onClick={() => {
											setKanbanMode((s) => !s);
											setActiveSection("kanban");
										}}
									>
										{kanbanMode ? "نمای جدول" : "نمای کانبان"}
									</button>
									<button
										className='bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-200'
										onClick={() => exportCSV(sorted)}
										title='خروجی CSV'
									>
										<DownloadCloud size={18} />
									</button>
								</div>

								<div className='mt-3 text-xs text-gray-500'>
									میانبر: کلید <kbd className='px-1 bg-gray-100 rounded'>N</kbd>{" "}
									برای افزودن پروژه جدید
								</div>
							</div>
						</aside>

						{/* -------- Main Content -------- */}
						<main className='flex-1'>
							<div className='space-y-6'>
								{/* Header / Controls */}
								<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
									<div>
										<h1 className='text-2xl font-bold'>مدیریت پروژه‌ها</h1>
										<p className='text-sm text-gray-500'>
											ایجاد، ویرایش، آرشیو و گزارش‌گیری پروژه‌ها
										</p>
									</div>

									<div className='flex items-center gap-3 w-full sm:w-auto'>
										<input
											placeholder='جستجو در پروژه‌ها، مشتری یا کد...'
											value={search}
											onChange={(e) => setSearch(e.target.value)}
											className='flex-1 sm:w-64 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800'
										/>
										<select
											value={sortBy}
											onChange={(e) => setSortBy(e.target.value as any)}
											className='border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 bg-white dark:bg-gray-800'
										>
											<option value='createdAt'>جدیدترین</option>
											<option value='name'>نام</option>
											<option value='budget'>بودجه</option>
										</select>
										<button
											onClick={() => {
												openCreate();
											}}
											className='bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center gap-2'
										>
											<Plus size={16} />
											پروژه جدید
										</button>
									</div>
								</div>

								{/* Active Section: Create / Edit Form */}
								{activeSection === "create" && editingProject && showEditor && (
									<div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm'>
										<div className='flex items-center justify-between'>
											<h2 className='text-lg font-semibold'>فرم پروژه</h2>
											<div className='flex items-center gap-2'>
												<button
													onClick={() => {
														setShowEditor(false);
														setEditingProject(null);
													}}
													className='text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded'
												>
													بستن
												</button>
											</div>
										</div>

										<ProjectEditor
											project={editingProject}
											customers={customers}
											contractors={contractors}
											onChange={(p) => setEditingProject(p)}
											onSave={(p) => saveProject(p)}
											onAttachFile={handleAttachFile}
										/>
									</div>
								)}

								{/* Phases section */}
								{activeSection === "phases" && (
									<div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm'>
										<h2 className='text-lg font-semibold mb-3'>مدیریت فازها</h2>
										<p className='text-sm text-gray-500 mb-4'>
											برای ویرایش فاز‌ها ابتدا پروژه را ویرایش کرده یا یک پروژه
											جدید بسازید.
										</p>
										{/* Show phases from first project as demo */}
										{projects[0] ? (
											<div>
												<div className='mb-3 text-sm text-gray-600'>
													فازهای پروژه نمونه ({projects[0].name})
												</div>
												<div className='space-y-2'>
													{projects[0].phases.map((ph, idx) => (
														<div
															key={ph.id}
															draggable
															onDragStart={(e) =>
																handlePhaseDragStart(e, ph.id)
															}
															onDrop={(e) =>
																handlePhaseDrop(e, projects[0].id, idx)
															}
															onDragOver={allowDrop}
															className='p-3 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-between'
														>
															<div>
																<div className='font-medium'>{ph.title}</div>
																<div className='text-xs text-gray-500'>
																	{ph.start || "---"} → {ph.end || "---"}
																</div>
															</div>
															<div className='text-xs text-gray-600'>
																{ph.completed ? "تکمیل‌شده" : "در حال انجام"}
															</div>
														</div>
													))}
												</div>
												<div className='mt-4 text-xs text-gray-500'>
													نکته: قابلیت drag-and-drop برای ترتیب‌دهی فازها در فرم
													ویرایش پروژه نیز فعال است.
												</div>
											</div>
										) : (
											<div className='text-sm text-gray-500'>
												هیچ پروژه‌ای یافت نشد.
											</div>
										)}
									</div>
								)}

								{/* Stakeholders section */}
								{activeSection === "stakeholders" && (
									<div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm'>
										<h2 className='text-lg font-semibold mb-3'>سهامداران</h2>
										<div className='grid sm:grid-cols-2 gap-4'>
											<div>
												<h3 className='text-sm font-medium mb-2'>
													مشتریان نمونه
												</h3>
												<ul className='space-y-2'>
													{customers.map((c) => (
														<li
															key={c.id}
															className='p-2 border rounded'
														>
															{c.name}
														</li>
													))}
												</ul>
											</div>
											<div>
												<h3 className='text-sm font-medium mb-2'>
													پیمانکاران نمونه
												</h3>
												<ul className='space-y-2'>
													{contractors.map((c) => (
														<li
															key={c.id}
															className='p-2 border rounded'
														>
															{c.name}
														</li>
													))}
												</ul>
											</div>
										</div>
									</div>
								)}

								{/* Table section */}
								{activeSection === "table" && !kanbanMode && (
									<div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm'>
										<div className='flex items-center justify-between mb-3'>
											<h2 className='text-lg font-semibold'>جدول پروژه‌ها</h2>
											<div className='flex items-center gap-2'>
												<button
													className='px-3 py-1 border rounded'
													onClick={() => setSelectedIds({})}
												>
													ریست انتخاب
												</button>
												<button
													className='px-3 py-1 bg-yellow-500 text-white rounded'
													onClick={bulkArchive}
												>
													<Archive size={14} /> آرشیو
												</button>
												<button
													className='px-3 py-1 bg-red-600 text-white rounded'
													onClick={() => {
														const ids = Object.keys(selectedIds).filter(
															(i) => selectedIds[i],
														);
														ids.forEach((id) => deleteProjectPermanent(id));
													}}
												>
													حذف
												</button>
											</div>
										</div>

										<div className='overflow-x-auto'>
											<table className='min-w-full text-sm'>
												<thead className='text-right text-gray-600'>
													<tr>
														<th className='p-2'>
															<input
																type='checkbox'
																onChange={(e) => {
																	const checked = e.target.checked;
																	const map: Record<string, boolean> = {};
																	if (checked)
																		sorted.forEach((s) => (map[s.id] = true));
																	setSelectedIds(map);
																}}
															/>
														</th>
														<th className='p-2'>کد</th>
														<th className='p-2'>نام پروژه</th>
														<th className='p-2'>فازها</th>
														<th className='p-2'>مشتریان</th>
														<th className='p-2'>پیمانکاران</th>
														<th className='p-2'>بودجه</th>
														<th className='p-2'>وضعیت</th>
														<th className='p-2'>عملیات</th>
													</tr>
												</thead>
												<tbody>
													{sorted.map((p) => (
														<tr
															key={p.id}
															className='border-t'
														>
															<td className='p-2 text-center'>
																<input
																	checked={!!selectedIds[p.id]}
																	onChange={() => toggleSelect(p.id)}
																	type='checkbox'
																/>
															</td>
															<td className='p-2'>
																<div className='flex items-center gap-2'>
																	<div className='text-xs text-gray-500'>
																		{p.code}
																	</div>
																	<button
																		className='text-xs text-blue-600'
																		onClick={() => {
																			navigator.clipboard?.writeText(p.id);
																			alert("کپی شد");
																		}}
																	>
																		کپی id
																	</button>
																</div>
															</td>
															<td className='p-2'>
																<div className='font-medium'>{p.name}</div>
																<div className='text-xs text-gray-500'>
																	تاریخ: {p.createdAt.slice(0, 10)}
																</div>
															</td>
															<td className='p-2'>
																<div className='w-40 bg-gray-100 rounded h-3 relative'>
																	{/* basic progress by completed phases */}
																	<div
																		style={{
																			width: `${
																				(p.phases.filter((ph) => ph.completed)
																					.length /
																					Math.max(1, p.phases.length)) *
																				100
																			}%`,
																		}}
																		className='bg-green-500 h-3 rounded'
																	/>
																</div>
																<div className='text-xs text-gray-500 mt-1'>
																	{p.phases.length} فاز
																</div>
															</td>
															<td className='p-2'>
																<div className='flex items-center -space-x-2 rtl:space-x-reverse'>
																	{p.customers.slice(0, 3).map((c) => (
																		<div
																			key={c.id}
																			className='w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs border border-white dark:border-gray-900'
																		>
																			{c.name.slice(0, 1)}
																		</div>
																	))}
																	{p.customers.length > 3 && (
																		<div className='text-xs px-2'>
																			+{p.customers.length - 3}
																		</div>
																	)}
																</div>
															</td>
															<td className='p-2'>
																<div className='text-sm'>
																	{p.contractors.length} پیمانکار
																</div>
															</td>
															<td className='p-2'>
																{Number(p.budget || 0).toLocaleString("fa-IR")}
															</td>
															<td className='p-2'>
																<div
																	className={`inline-block px-2 py-1 rounded text-xs ${
																		p.status === "Active"
																			? "bg-green-100 text-green-700"
																			: p.status === "Planning"
																			? "bg-blue-100 text-blue-700"
																			: "bg-gray-100 text-gray-800"
																	}`}
																>
																	{p.status}
																</div>
															</td>
															<td className='p-2'>
																<div className='flex items-center gap-2'>
																	{!p.archived ? (
																		<>
																			<button
																				className='text-blue-600'
																				onClick={() => openEdit(p)}
																				title='ویرایش'
																			>
																				<Edit2 size={16} />
																			</button>
																			<button
																				className='text-yellow-600'
																				onClick={() =>
																					openArchiveModalWith(p.id)
																				}
																				title='آرشیو'
																			>
																				<Archive size={16} />
																			</button>
																			<button
																				className='text-red-600'
																				onClick={() =>
																					deleteProjectPermanent(p.id)
																				}
																				title='حذف'
																			>
																				<Trash2 size={16} />
																			</button>
																		</>
																	) : (
																		<>
																			<button
																				className='text-green-600'
																				onClick={() => restoreProject(p.id)}
																			>
																				بازگردانی
																			</button>
																			<button
																				className='text-red-600'
																				onClick={() =>
																					deleteProjectPermanent(p.id)
																				}
																			>
																				حذف دائمی
																			</button>
																		</>
																	)}
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								)}

								{/* Kanban section */}
								{activeSection === "kanban" && (
									<div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm'>
										<h2 className='text-lg font-semibold mb-3'>
											کانبان پروژه‌ها
										</h2>
										<div className='grid grid-cols-1 sm:grid-cols-5 gap-3'>
											{statusColumns.map((status) => (
												<div
													key={status}
													className='bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded p-3 min-h-[150px]'
												>
													<div className='flex items-center justify-between mb-2'>
														<div className='font-medium text-sm'>{status}</div>
														<div className='text-xs text-gray-500'>
															{
																projects.filter((p) => p.status === status)
																	.length
															}
														</div>
													</div>
													<div className='space-y-2'>
														{projects
															.filter((p) => p.status === status)
															.map((p) => (
																<div
																	key={p.id}
																	className='p-2 border rounded bg-white dark:bg-gray-800'
																>
																	<div className='flex items-center justify-between'>
																		<div className='text-sm font-medium'>
																			{p.name}
																		</div>
																		<div className='text-xs text-gray-500'>
																			{p.priority}
																		</div>
																	</div>
																	<div className='text-xs text-gray-500 mt-1'>
																		{(p.customers[0] && p.customers[0].name) ||
																			""}
																	</div>
																</div>
															))}
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Dashboard widgets */}
								{activeSection === "dashboard" && (
									<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
										<div className='bg-white dark:bg-gray-800 border rounded-xl p-4'>
											<h3 className='font-medium mb-2'>آمار پروژه‌ها</h3>
											<div className='text-2xl font-bold'>
												{projects.length}
											</div>
											<div className='text-sm text-gray-500 mt-1'>
												تعداد کل پروژه‌ها
											</div>
											<div className='mt-3 text-xs'>
												فعال:{" "}
												{projects.filter((p) => p.status === "Active").length} •
												تکمیل‌شده:{" "}
												{
													projects.filter((p) => p.status === "Completed")
														.length
												}
											</div>
										</div>

										<div className='bg-white dark:bg-gray-800 border rounded-xl p-4'>
											<h3 className='font-medium mb-2'>بودجه</h3>
											<div className='text-xl font-bold'>
												{Number(
													projects.reduce((s, p) => s + (p.budget || 0), 0),
												).toLocaleString("fa-IR")}
											</div>
											<div className='text-sm text-gray-500 mt-1'>
												کل بودجه تخصیص یافته
											</div>
										</div>

										<div className='bg-white dark:bg-gray-800 border rounded-xl p-4'>
											<h3 className='font-medium mb-2'>
												نزدیک‌ترین مایلستون‌ها
											</h3>
											<div className='text-sm text-gray-500'>
												نمایش مایلستون‌های آینده در پیاده‌سازی API
											</div>
										</div>
									</div>
								)}

								{/* Settings */}
								{activeSection === "settings" && (
									<div className='bg-white dark:bg-gray-800 border rounded-xl p-4'>
										<h3 className='font-medium mb-3'>تنظیمات پروژه</h3>
										<div className='text-sm text-gray-500'>
											تنظیمات مربوط به قالب‌ها، همگام‌سازی تقویم و اتوماسیون در
											این بخش قرار می‌گیرد.
										</div>
									</div>
								)}
							</div>
						</main>
					</div>
				</div>
			</div>

			{/* Archive / Delete Modal */}
			{showArchiveModal.open && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
					<div className='bg-white dark:bg-gray-800 rounded-lg p-5 w-96'>
						<h3 className='font-semibold mb-2'>آرشیو پروژه</h3>
						<p className='text-sm text-gray-600 mb-3'>
							لطفاً دلیل آرشیو را انتخاب یا وارد کنید (اختیاری):
						</p>
						<select
							id='archiveReasons'
							className='w-full mb-3 p-2 border rounded'
						>
							<option value=''>بدون دلیل</option>
							<option value='completed'>تکمیل شد</option>
							<option value='budget'>کمبود بودجه</option>
							<option value='client_request'>درخواست مشتری</option>
							<option value='other'>سایر</option>
						</select>
						<div className='flex gap-2 justify-end'>
							<button
								className='px-3 py-1 rounded border'
								onClick={() => setShowArchiveModal({ open: false })}
							>
								انصراف
							</button>
							<button
								className='px-3 py-1 rounded bg-yellow-500 text-white'
								onClick={() => {
									const sel = (
										document.getElementById(
											"archiveReasons",
										) as HTMLSelectElement
									).value;
									confirmArchive(sel);
								}}
							>
								آرشیو
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

/* -------------------- ProjectEditor Component -------------------- */
function ProjectEditor({
	project,
	customers,
	contractors,
	onChange,
	onSave,
	onAttachFile,
}: {
	project: Project;
	customers: User[];
	contractors: User[];
	onChange: (p: Project) => void;
	onSave: (p: Project) => void;
	onAttachFile: (file: File) => void;
}) {
	const [local, setLocal] = useState<Project>(project);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [custQuery, setCustQuery] = useState("");
	const [contrQuery, setContrQuery] = useState("");
	const addPhase = () => {
		const ph: Phase = {
			id: uid("ph_"),
			title: "فاز جدید",
			start: todayISO(),
			end: todayISO(),
			completed: false,
		};
		setLocal((s) => ({ ...s, phases: [...(s.phases || []), ph] }));
	};

	useEffect(() => setLocal(project), [project]);

	useEffect(() => onChange(local), [local]);

	function updatePhase(id: string, patch: Partial<Phase>) {
		setLocal((s) => ({
			...s,
			phases: s.phases.map((ph) => (ph.id === id ? { ...ph, ...patch } : ph)),
		}));
	}

	function removePhase(id: string) {
		setLocal((s) => ({ ...s, phases: s.phases.filter((ph) => ph.id !== id) }));
	}

	function addCustomerById(id: string) {
		const c = customers.find((x) => x.id === id);
		if (!c) return;
		if (local.customers.some((x) => x.id === id)) return;
		setLocal((s) => ({
			...s,
			customers: [...s.customers, { id: c.id, name: c.name, type: "customer" }],
		}));
	}

	function addContractorById(id: string) {
		const c = contractors.find((x) => x.id === id);
		if (!c) return;
		if (local.contractors.some((x) => x.id === id)) return;
		setLocal((s) => ({
			...s,
			contractors: [
				...s.contractors,
				{ id: c.id, name: c.name, type: "contractor" },
			],
		}));
	}

	function removeStakeholder(type: "customer" | "contractor", id: string) {
		if (type === "customer")
			setLocal((s) => ({
				...s,
				customers: s.customers.filter((c) => c.id !== id),
			}));
		else
			setLocal((s) => ({
				...s,
				contractors: s.contractors.filter((c) => c.id !== id),
			}));
	}

	function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0];
		if (f) {
			onAttachFile(f);
			// we also store a placeholder
			setLocal((s) => ({
				...s,
				files: [...(s.files || []), { id: uid("f_"), name: f.name }],
			}));
		}
	}

	return (
		<div className='mt-4 space-y-4'>
			{/* Basic */}
			<div>
				<label className='block text-sm font-medium mb-1'>نام پروژه *</label>
				<input
					value={local.name}
					onChange={(e) => setLocal({ ...local, name: e.target.value })}
					className='w-full p-2 border rounded'
					placeholder='مثلاً: پروژه برج ...'
				/>
			</div>

			<div className='grid sm:grid-cols-2 gap-3'>
				<div>
					<label className='text-sm block mb-1'>کد پروژه</label>
					<input
						value={local.code}
						onChange={(e) => setLocal({ ...local, code: e.target.value })}
						className='w-full p-2 border rounded'
					/>
				</div>
				<div>
					<label className='text-sm block mb-1'>دسته‌بندی</label>
					<select
						value={local.category}
						onChange={(e) => setLocal({ ...local, category: e.target.value })}
						className='w-full p-2 border rounded'
					>
						<option value=''>انتخاب کنید</option>
						<option value='ساختمانی'>ساختمانی</option>
						<option value='نوسازی'>نوسازی</option>
						<option value='زیربنایی'>زیربنایی</option>
					</select>
				</div>
			</div>

			<div>
				<label className='block text-sm font-medium mb-1'>توضیحات</label>
				{/* simple rich editor: contentEditable */}
				<div
					contentEditable
					suppressContentEditableWarning
					onInput={(e) =>
						setLocal({
							...local,
							description: (e.target as HTMLElement).innerHTML,
						})
					}
					className='min-h-[120px] p-3 border rounded bg-white dark:bg-gray-900'
					dangerouslySetInnerHTML={{ __html: local.description || "" }}
				/>
			</div>

			{/* Phases */}
			<div>
				<div className='flex items-center justify-between mb-2'>
					<label className='text-sm font-medium'>فازها و جدول زمانی</label>
					<button
						className='text-sm bg-gray-100 px-2 py-1 rounded'
						onClick={addPhase}
					>
						افزودن فاز
					</button>
				</div>
				<div className='space-y-2'>
					{(local.phases || []).map((ph, idx) => (
						<div
							key={ph.id}
							draggable
							onDragStart={(e) => e.dataTransfer.setData("phase-id", ph.id)}
							onDragOver={(e) => e.preventDefault()}
							onDrop={(e) => {
								const moving = e.dataTransfer.getData("phase-id");
								if (!moving || moving === ph.id) return;
								const list = [...(local.phases || [])];
								const from = list.findIndex((x) => x.id === moving);
								const to = list.findIndex((x) => x.id === ph.id);
								if (from === -1 || to === -1) return;
								const [moved] = list.splice(from, 1);
								list.splice(to, 0, moved);
								setLocal({ ...local, phases: list });
							}}
							className='p-3 border rounded flex flex-col sm:flex-row sm:items-center gap-2'
						>
							<div className='flex-1'>
								<input
									value={ph.title}
									onChange={(e) =>
										updatePhaseLocal(ph.id, { title: e.target.value })
									}
									className='w-full p-2 border rounded mb-2'
								/>
								<div className='flex gap-2'>
									<input
										type='date'
										value={ph.start || ""}
										onChange={(e) =>
											updatePhaseLocal(ph.id, { start: e.target.value })
										}
										className='p-2 border rounded'
									/>
									<input
										type='date'
										value={ph.end || ""}
										onChange={(e) =>
											updatePhaseLocal(ph.id, { end: e.target.value })
										}
										className='p-2 border rounded'
									/>
								</div>
							</div>
							<div className='flex items-center gap-2'>
								<label className='text-sm'>تکمیل</label>
								<input
									type='checkbox'
									checked={!!ph.completed}
									onChange={(e) =>
										updatePhaseLocal(ph.id, { completed: e.target.checked })
									}
								/>
								<button
									className='text-sm text-red-600'
									onClick={() => removePhaseLocal(ph.id)}
								>
									حذف
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Stakeholders */}
			<div className='grid sm:grid-cols-2 gap-3'>
				<div>
					<label className='text-sm block mb-1'>مشتریان (جستجو/انتخاب)</label>
					<input
						placeholder='نام مشتری...'
						value={custQuery}
						onChange={(e) => setCustQuery(e.target.value)}
						className='w-full p-2 border rounded mb-2'
					/>
					<div className='max-h-40 overflow-auto space-y-1'>
						{customers
							.filter((c) => c.name.includes(custQuery))
							.map((c) => (
								<div
									key={c.id}
									className='flex items-center justify-between p-2 border rounded'
								>
									<div>{c.name}</div>
									<button
										className='text-sm text-blue-600'
										onClick={() => addCustomerByIdLocal(c.id)}
									>
										افزودن
									</button>
								</div>
							))}
					</div>

					<div className='mt-3 text-sm'>
						<div className='font-medium mb-1'>مشتریان انتخاب شده</div>
						<div className='flex gap-2 flex-wrap'>
							{local.customers.map((c) => (
								<div
									key={c.id}
									className='px-2 py-1 border rounded flex items-center gap-2'
								>
									<div>{c.name}</div>
									<button
										className='text-xs text-red-600'
										onClick={() => removeStakeholderLocal("customer", c.id)}
									>
										حذف
									</button>
								</div>
							))}
						</div>
					</div>
				</div>

				<div>
					<label className='text-sm block mb-1'>
						پیمانکاران (جستجو/انتخاب)
					</label>
					<input
						placeholder='نام پیمانکار...'
						value={contrQuery}
						onChange={(e) => setContrQuery(e.target.value)}
						className='w-full p-2 border rounded mb-2'
					/>
					<div className='max-h-40 overflow-auto space-y-1'>
						{contractors
							.filter((c) => c.name.includes(contrQuery))
							.map((c) => (
								<div
									key={c.id}
									className='flex items-center justify-between p-2 border rounded'
								>
									<div>{c.name}</div>
									<button
										className='text-sm text-blue-600'
										onClick={() => addContractorByIdLocal(c.id)}
									>
										افزودن
									</button>
								</div>
							))}
					</div>

					<div className='mt-3 text-sm'>
						<div className='font-medium mb-1'>پیمانکاران انتخاب شده</div>
						<div className='flex gap-2 flex-wrap'>
							{local.contractors.map((c) => (
								<div
									key={c.id}
									className='px-2 py-1 border rounded flex items-center gap-2'
								>
									<div>{c.name}</div>
									<button
										className='text-xs text-red-600'
										onClick={() => removeStakeholderLocal("contractor", c.id)}
									>
										حذف
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Additional fields */}
			<div className='grid sm:grid-cols-3 gap-3'>
				<div>
					<label className='text-sm block mb-1'>بودجه</label>
					<input
						type='number'
						value={local.budget || 0}
						onChange={(e) =>
							setLocal({ ...local, budget: Number(e.target.value) })
						}
						className='w-full p-2 border rounded'
					/>
				</div>
				<div>
					<label className='text-sm block mb-1'>اولویت</label>
					<select
						value={local.priority}
						onChange={(e) =>
							setLocal({ ...local, priority: e.target.value as any })
						}
						className='w-full p-2 border rounded'
					>
						<option value='Low'>کم</option>
						<option value='Medium'>متوسط</option>
						<option value='High'>بالا</option>
						<option value='Critical'>بحرانی</option>
					</select>
				</div>
				<div>
					<label className='text-sm block mb-1'>وضعیت</label>
					<select
						value={local.status}
						onChange={(e) =>
							setLocal({ ...local, status: e.target.value as any })
						}
						className='w-full p-2 border rounded'
					>
						<option value='Planning'>در حال برنامه‌ریزی</option>
						<option value='Active'>فعال</option>
						<option value='On Hold'>متوقف</option>
						<option value='Completed'>تکمیل‌شده</option>
						<option value='Cancelled'>لغو‌شده</option>
					</select>
				</div>
			</div>

			{/* Tags & Files */}
			<div className='grid sm:grid-cols-2 gap-3'>
				<div>
					<label className='text-sm block mb-1'>
						برچسب‌ها / تگ‌ها (با ویرگول جدا کنید)
					</label>
					<input
						value={(local.tags || []).join(",")}
						onChange={(e) =>
							setLocal({
								...local,
								tags: e.target.value
									.split(",")
									.map((t) => t.trim())
									.filter(Boolean),
							})
						}
						className='w-full p-2 border rounded'
					/>
				</div>
				<div>
					<label className='text-sm block mb-1'>ضمائم</label>
					<div className='flex gap-2'>
						<input
							ref={fileInputRef}
							onChange={handleFileSelect}
							type='file'
						/>
						<button
							className='px-3 py-1 bg-gray-100 rounded'
							onClick={() => fileInputRef.current?.click()}
						>
							افزودن
						</button>
					</div>
					<div className='mt-2 text-xs'>
						{(local.files || []).map((f) => (
							<div
								key={f.id}
								className='text-sm'
							>
								{f.name}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Save */}
			<div className='flex items-center gap-2 justify-end'>
				<button
					className='px-4 py-2 border rounded'
					onClick={() => onSave(local)}
				>
					ذخیره
				</button>
			</div>
		</div>
	);

	/* ---------- Local helpers (scoped) ---------- */
	function updatePhaseLocal(id: string, patch: Partial<Phase>) {
		setLocal((s) => ({
			...s,
			phases: s.phases.map((ph) => (ph.id === id ? { ...ph, ...patch } : ph)),
		}));
	}
	function removePhaseLocal(id: string) {
		setLocal((s) => ({ ...s, phases: s.phases.filter((ph) => ph.id !== id) }));
	}
	function addCustomerByIdLocal(id: string) {
		const c = customers.find((x) => x.id === id);
		if (!c) return;
		if (local.customers.some((x) => x.id === id)) return;
		setLocal((s) => ({
			...s,
			customers: [...s.customers, { id: c.id, name: c.name, type: "customer" }],
		}));
	}
	function addContractorByIdLocal(id: string) {
		const c = contractors.find((x) => x.id === id);
		if (!c) return;
		if (local.contractors.some((x) => x.id === id)) return;
		setLocal((s) => ({
			...s,
			contractors: [
				...s.contractors,
				{ id: c.id, name: c.name, type: "contractor" },
			],
		}));
	}
	function removeStakeholderLocal(type: "customer" | "contractor", id: string) {
		if (type === "customer")
			setLocal((s) => ({
				...s,
				customers: s.customers.filter((c) => c.id !== id),
			}));
		else
			setLocal((s) => ({
				...s,
				contractors: s.contractors.filter((c) => c.id !== id),
			}));
	}
	function handleFileSelectLocal(e: React.ChangeEvent<HTMLInputElement>) {
		const f = e.target.files?.[0];
		if (f) {
			onAttachFile(f);
			setLocal((s) => ({
				...s,
				files: [...(s.files || []), { id: uid("f_"), name: f.name }],
			}));
		}
	}
}
