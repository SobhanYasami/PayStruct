"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* -------------------- Types -------------------- */
interface Contractor {
	id: string;
	name: string;
	share: number; // percentage share in project
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

/* -------------------- Helpers -------------------- */
const uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 9);
const STORAGE_KEY = "paystruct_projects_v2";

const MOCK_CONTRACTORS = [
	{ id: "k1", name: "پیمانکار سازه‌نو" },
	{ id: "k2", name: "تیم برق‌کاران" },
	{ id: "k3", name: "گروه نازک‌کاری" },
];

/* -------------------- Main Component -------------------- */
export default function Projects() {
	return (
		<div
			dir='rtl'
			className='min-h-screen bg-blue-500/20'
		>
			<div className='containe  px-4 py-8'>
				{/* Header */}
				<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
					<div>
						<h1 className='text-3xl font-bold text-gray-900'>
							مدیریت پروژه‌ها
						</h1>
						<p className='text-gray-600 mt-2'>
							سیستم مدیریت پروژه‌های ساخت و ساز
						</p>
					</div>

					<div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
						<div className='relative'>
							<Search
								className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400'
								size={20}
							/>
							<Input
								placeholder='جستجو بر اساس نام یا فاز...'
								value={""}
								className='pr-10 w-full sm:w-64'
							/>
						</div>

						{/* Create Project Button - Direct trigger without DialogTrigger */}
						<Button className='gap-2 bg-blue-600 hover:bg-blue-700 text-white'>
							<Plus size={20} />
							ایجاد پروژه جدید
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

/* -------------------- Create Project Dialog -------------------- */
