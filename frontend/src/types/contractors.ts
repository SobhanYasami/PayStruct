export type Section =
	| "dashboard"
	| "create"
	| "contracts"
	| "wbs"
	| "status"
	| "compliance";

export interface Contract {
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