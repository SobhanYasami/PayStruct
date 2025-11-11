"use client";

import React, { useState } from "react";
import {
	LayoutDashboard,
	FileText,
	BarChart3,
	ClipboardList,
	ShieldCheck,
	PlusCircle,
	Trash2,
	RefreshCcw,
	Search,
	Download,
	Eye,
	Edit,
	Archive,
} from "lucide-react";

type Section =
	| "dashboard"
	| "create"
	| "contracts"
	| "wbs"
	| "status"
	| "compliance";

export default function Contractors() {
	const [activeSection, setActiveSection] = useState<Section>("dashboard");

	return (
		<div
			dir='rtl'
			className='flex min-h-screen bg-gray-50 text-gray-800'
		>
			{/* Sidebar */}
			<aside className='w-64 bg-white border-l border-gray-200 shadow-sm flex flex-col'>
				<div className='p-4 border-b border-gray-200 text-center font-bold text-lg'>
					مدیریت پیمانکاران
				</div>

				<nav className='flex-1 p-3 space-y-2'>
					{[
						{
							key: "dashboard",
							label: "داشبورد",
							icon: <LayoutDashboard size={18} />,
						},
						{
							key: "create",
							label: "ایجاد قرارداد",
							icon: <PlusCircle size={18} />,
						},
						{
							key: "contracts",
							label: "لیست قراردادها",
							icon: <FileText size={18} />,
						},
						{
							key: "wbs",
							label: "ساختار شکست کار (WBS)",
							icon: <ClipboardList size={18} />,
						},
						{
							key: "status",
							label: "گزارش وضعیت",
							icon: <BarChart3 size={18} />,
						},
						{
							key: "compliance",
							label: "مطابقت و بیمه",
							icon: <ShieldCheck size={18} />,
						},
					].map((item) => (
						<button
							key={item.key}
							onClick={() => setActiveSection(item.key as Section)}
							className={`w-full flex items-center justify-between p-2 rounded-md transition-all ${
								activeSection === item.key
									? "bg-blue-600 text-white"
									: "hover:bg-gray-100"
							}`}
						>
							<div className='flex items-center gap-2'>
								{item.icon}
								<span className='text-sm font-medium'>{item.label}</span>
							</div>
						</button>
					))}
				</nav>

				<div className='p-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500'>
					<button className='flex items-center gap-2 hover:text-blue-600'>
						<RefreshCcw size={16} />
						به‌روزرسانی
					</button>
					<button className='flex items-center gap-2 hover:text-red-600'>
						<Trash2 size={16} />
						حذف‌ها
					</button>
				</div>
			</aside>

			{/* Main Content */}
			<main className='flex-1 p-6 overflow-y-auto'>
				{activeSection === "dashboard" && <ContractorDashboard />}
				{activeSection === "create" && <CreateContractForm />}
				{activeSection === "contracts" && <ContractsTable />}
				{activeSection === "wbs" && <WBSManager />}
				{activeSection === "status" && <StatusStatementView />}
				{activeSection === "compliance" && <ComplianceCenter />}
			</main>
		</div>
	);
}

//
// ─── DASHBOARD SECTION ─────────────────────────────────────────────────────────────
//

function ContractorDashboard() {
	return (
		<section>
			<h2 className='text-xl font-bold mb-4'>داشبورد پیمانکاران</h2>
			<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'>
				{[
					{ title: "قراردادهای فعال", value: 12 },
					{ title: "در انتظار تایید", value: 3 },
					{ title: "در حال اتمام", value: 2 },
					{ title: "منقضی‌شده", value: 5 },
				].map((card) => (
					<div
						key={card.title}
						className='bg-white rounded-lg shadow-sm border border-gray-200 p-4'
					>
						<h3 className='text-sm text-gray-500'>{card.title}</h3>
						<p className='text-2xl font-bold mt-1 text-gray-800'>
							{card.value}
						</p>
					</div>
				))}
			</div>

			<div className='mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-4'>
				<h3 className='text-lg font-bold mb-3'>فعالیت‌های اخیر</h3>
				<ul className='space-y-2 text-sm text-gray-600'>
					<li>📄 قرارداد شماره ۱۲۰۴ تایید شد.</li>
					<li>💰 بودجه قرارداد ۱۱۰۲ به‌روزرسانی شد.</li>
					<li>📅 تاریخ انقضای بیمه تمدید گردید.</li>
				</ul>
			</div>
		</section>
	);
}

//
// ─── CONTRACT CREATION FORM ───────────────────────────────────────────────────────
//

function CreateContractForm() {
	const [form, setForm] = useState({
		fullName: "",
		legalEntity: false,
		nationalId: "",
		contractNo: "",
		budget: "",
		startDate: "",
		duration: "",
	});

	return (
		<section className='max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6'>
			<h2 className='text-xl font-bold mb-4'>ایجاد قرارداد جدید</h2>

			<form className='space-y-4'>
				<div>
					<label className='block mb-1 text-sm font-medium'>
						نام پیمانکار *
					</label>
					<input
						type='text'
						value={form.fullName}
						onChange={(e) => setForm({ ...form, fullName: e.target.value })}
						className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500'
						placeholder='مثلاً شرکت توسعه عمران پارس'
					/>
				</div>

				<div className='flex gap-3'>
					<div className='flex-1'>
						<label className='block mb-1 text-sm font-medium'>کد ملی</label>
						<input
							type='text'
							value={form.nationalId}
							onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500'
							placeholder='۰۰۴۵۱۲۳۴۵۶'
						/>
					</div>
					<div className='flex-1'>
						<label className='block mb-1 text-sm font-medium'>
							شماره قرارداد
						</label>
						<input
							type='text'
							value={form.contractNo}
							onChange={(e) => setForm({ ...form, contractNo: e.target.value })}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500'
							placeholder='CNT-2025-01'
						/>
					</div>
				</div>

				<div className='flex gap-3'>
					<div className='flex-1'>
						<label className='block mb-1 text-sm font-medium'>بودجه کل</label>
						<input
							type='number'
							value={form.budget}
							onChange={(e) => setForm({ ...form, budget: e.target.value })}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500'
							placeholder='مثلاً ۵۰۰۰۰۰۰۰۰'
						/>
					</div>
					<div className='flex-1'>
						<label className='block mb-1 text-sm font-medium'>تاریخ شروع</label>
						<input
							type='date'
							value={form.startDate}
							onChange={(e) => setForm({ ...form, startDate: e.target.value })}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500'
						/>
					</div>
				</div>

				<div>
					<label className='block mb-1 text-sm font-medium'>مدت (روز)</label>
					<input
						type='number'
						value={form.duration}
						onChange={(e) => setForm({ ...form, duration: e.target.value })}
						className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500'
						placeholder='مثلاً ۹۰'
					/>
				</div>

				<button
					type='submit'
					className='bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded-lg transition-all'
				>
					ثبت قرارداد
				</button>
			</form>
		</section>
	);
}

//
// ─── PLACEHOLDER SECTIONS FOR FUTURE EXPANSION ────────────────────────────────────
//
interface Contract {
	id: number;
	name: string;
	customer: string;
	contractor: string;
	budget: number;
	startDate: string;
	endDate: string;
	status: "فعال" | "در انتظار" | "منقضی" | "تکمیل‌شده";
	priority: "کم" | "متوسط" | "بالا" | "بحرانی";
}

const initialContracts: Contract[] = [
	{
		id: 101,
		name: "پروژه احداث برج مرکزی",
		customer: "شرکت توسعه پارس",
		contractor: "عمران شرق",
		budget: 850000000,
		startDate: "1403/02/15",
		endDate: "1404/01/10",
		status: "فعال",
		priority: "بالا",
	},
	{
		id: 102,
		name: "بازسازی مجتمع نفتی",
		customer: "شرکت انرژی خاور",
		contractor: "پارس‌سازان",
		budget: 420000000,
		startDate: "1402/12/01",
		endDate: "1403/09/30",
		status: "در انتظار",
		priority: "متوسط",
	},
	{
		id: 103,
		name: "راه‌سازی محور تبریز-اهر",
		customer: "سازمان حمل‌ونقل",
		contractor: "راه‌سازان کویر",
		budget: 680000000,
		startDate: "1402/06/20",
		endDate: "1403/04/15",
		status: "تکمیل‌شده",
		priority: "کم",
	},
	{
		id: 104,
		name: "پل‌سازی اتوبان شهید صدر",
		customer: "شهرداری تهران",
		contractor: "بنیاد عمران نوین",
		budget: 950000000,
		startDate: "1401/11/10",
		endDate: "1403/02/05",
		status: "منقضی",
		priority: "بحرانی",
	},
];

function ContractsTable() {
	const [contracts, setContracts] = useState(initialContracts);
	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState<"id" | "budget" | null>(null);
	const [selected, setSelected] = useState<number[]>([]);

	const toggleSelect = (id: number) => {
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const filtered = contracts
		.filter((c) => c.name.toLowerCase().includes(search.toLowerCase().trim()))
		.sort((a, b) => {
			if (sortBy === "id") return a.id - b.id;
			if (sortBy === "budget") return b.budget - a.budget;
			return 0;
		});

	const exportCSV = () => {
		const csv = [
			["شناسه", "نام پروژه", "کارفرما", "پیمانکار", "بودجه", "وضعیت", "اولویت"],
			...contracts.map((c) => [
				c.id,
				c.name,
				c.customer,
				c.contractor,
				c.budget,
				c.status,
				c.priority,
			]),
		]
			.map((row) => row.join(","))
			.join("\n");

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = "contracts.csv";
		link.click();
	};

	const getStatusColor = (status: Contract["status"]) => {
		switch (status) {
			case "فعال":
				return "bg-green-100 text-green-700";
			case "در انتظار":
				return "bg-yellow-100 text-yellow-700";
			case "تکمیل‌شده":
				return "bg-blue-100 text-blue-700";
			case "منقضی":
				return "bg-red-100 text-red-700";
			default:
				return "";
		}
	};

	const getPriorityColor = (priority: Contract["priority"]) => {
		switch (priority) {
			case "کم":
				return "text-gray-500";
			case "متوسط":
				return "text-yellow-600";
			case "بالا":
				return "text-orange-600";
			case "بحرانی":
				return "text-red-600 font-bold";
			default:
				return "";
		}
	};

	return (
		<section className='bg-white border border-gray-200 rounded-xl shadow-sm p-4'>
			<div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4'>
				<h2 className='text-lg font-bold'>لیست قراردادها</h2>

				<div className='flex items-center gap-2'>
					<div className='relative'>
						<input
							type='text'
							placeholder='جستجو در نام پروژه...'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className='border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
						/>
						<Search
							size={16}
							className='absolute left-2 top-1.5 text-gray-400'
						/>
					</div>
					<button
						onClick={exportCSV}
						className='flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-blue-700 transition'
					>
						<Download size={14} />
						خروجی CSV
					</button>
				</div>
			</div>

			<div className='overflow-x-auto'>
				<table className='w-full border-collapse text-sm'>
					<thead>
						<tr className='bg-gray-100 text-gray-700 text-right'>
							<th className='p-2'>
								<input
									type='checkbox'
									onChange={(e) =>
										setSelected(
											e.target.checked ? contracts.map((c) => c.id) : [],
										)
									}
									checked={selected.length === contracts.length}
								/>
							</th>
							<th
								className='p-2 cursor-pointer'
								onClick={() => setSortBy("id")}
							>
								شناسه 🔽
							</th>
							<th className='p-2'>نام پروژه</th>
							<th className='p-2'>کارفرما</th>
							<th className='p-2'>پیمانکار</th>
							<th
								className='p-2 cursor-pointer'
								onClick={() => setSortBy("budget")}
							>
								بودجه 🔽
							</th>
							<th className='p-2'>وضعیت</th>
							<th className='p-2'>اولویت</th>
							<th className='p-2 text-center'>عملیات</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((c) => (
							<tr
								key={c.id}
								className={`border-b hover:bg-gray-50 ${
									selected.includes(c.id) ? "bg-blue-50" : ""
								}`}
							>
								<td className='p-2 text-center'>
									<input
										type='checkbox'
										checked={selected.includes(c.id)}
										onChange={() => toggleSelect(c.id)}
									/>
								</td>
								<td className='p-2'>{c.id}</td>
								<td className='p-2 font-medium text-blue-700'>{c.name}</td>
								<td className='p-2'>{c.customer}</td>
								<td className='p-2'>{c.contractor}</td>
								<td className='p-2 text-left'>
									{c.budget.toLocaleString()} تومان
								</td>
								<td className='p-2'>
									<span
										className={`px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(
											c.status,
										)}`}
									>
										{c.status}
									</span>
								</td>
								<td className={`p-2 ${getPriorityColor(c.priority)}`}>
									{c.priority}
								</td>
								<td className='p-2 flex items-center justify-center gap-2 text-gray-500'>
									<Eye
										size={16}
										className='cursor-pointer hover:text-blue-600'
									/>
									<Edit
										size={16}
										className='cursor-pointer hover:text-yellow-600'
									/>
									<Archive
										size={16}
										className='cursor-pointer hover:text-red-600'
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className='text-xs text-gray-500 mt-3'>
				نمایش {filtered.length} از {contracts.length} قرارداد
			</div>
		</section>
	);
}

function WBSManager() {
	return (
		<div className='text-gray-500'>
			🧱 مدیریت ساختار شکست کار (در حال توسعه)
		</div>
	);
}

function StatusStatementView() {
	return <div className='text-gray-500'>📈 گزارش وضعیت (در حال توسعه)</div>;
}

function ComplianceCenter() {
	return (
		<div className='text-gray-500'>🛡️ مرکز مطابقت و بیمه (در حال توسعه)</div>
	);
}
