"use client";
import { useState, useEffect } from "react";

// Define types
export interface PersianDate {
	day: number;
	month: number;
	year: number;
}

interface PersianDatePickerCustomProps {
	onChange?: (date: PersianDate | null) => void;
	value?: PersianDate | null;
	placeholder?: string;
	name?: string;
	required?: boolean;
	id?: string;
}

// Helper function to convert Gregorian to Persian (Jalali) date
const gregorianToPersian = (date: Date): PersianDate => {
	const gregorianYear = date.getFullYear();
	const gregorianMonth = date.getMonth() + 1;
	const gregorianDay = date.getDate();

	// Simple conversion algorithm (for more accuracy, use a library like jalali-moment)
	// This is a simplified version. For production, consider using a proper library.
	const gregorian = new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
	const gregorianStart = new Date(gregorianYear, 2, 20); // March 20 (approximate start of Persian year)

	// Calculate Persian year
	let persianYear = gregorianYear - 621;
	if (gregorian < gregorianStart) {
		persianYear--;
	}

	// For months and days, we'll use a simple approach
	// Note: This is simplified. For accurate conversion, use a library.
	const persianMonths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
	const isLeapYear = (year: number) => {
		// Persian leap year calculation
		const a = year - 474;
		const b = Math.floor(a / 2820);
		const c = a % 2820;
		return c === 2820 - 1 || (c + 1) % 128 === 0;
	};

	// Adjust for leap year
	if (isLeapYear(persianYear)) {
		persianMonths[11] = 30; // Esfand has 30 days in leap year
	}

	// Simplified month/day calculation (for demonstration)
	// In production, use a proper conversion algorithm or library
	const daysSinceStart = Math.floor(
		(gregorian.getTime() - new Date(persianYear + 621, 2, 21).getTime()) /
			(1000 * 60 * 60 * 24),
	);

	let dayCount = 0;
	let month = 1;
	for (let i = 0; i < 12; i++) {
		if (daysSinceStart < dayCount + persianMonths[i]) {
			const day = daysSinceStart - dayCount + 1;
			return { year: persianYear, month: i + 1, day };
		}
		dayCount += persianMonths[i];
	}

	// Fallback: return approximate date
	return {
		year: persianYear,
		month: Math.min(Math.floor(daysSinceStart / 30) + 1, 12),
		day: (daysSinceStart % 30) + 1,
	};
};

// Get current Persian year
const getCurrentPersianYear = (): number => {
	return gregorianToPersian(new Date()).year;
};

// Get current Persian month (1-12)
const getCurrentPersianMonth = (): number => {
	return gregorianToPersian(new Date()).month;
};

export const PersianDatePickerCustom: React.FC<
	PersianDatePickerCustomProps
> = ({
	onChange,
	value,
	placeholder = "انتخاب تاریخ",
	name,
	required = false,
	id,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<PersianDate | null>(
		value || null,
	);

	// Dynamic current Persian year
	const [currentYear, setCurrentYear] = useState<number>(1403);

	const [tempMonth, setTempMonth] = useState<number>(
		value?.month || getCurrentPersianMonth(),
	);
	const [tempYear, setTempYear] = useState<number>(
		value?.year || getCurrentPersianYear(),
	);

	// Initialize current year on component mount
	useEffect(() => {
		setCurrentYear(getCurrentPersianYear());
		setTempYear(value?.year || getCurrentPersianYear());
		setTempMonth(value?.month || getCurrentPersianMonth());
	}, [value]);

	// Update internal state when value prop changes
	useEffect(() => {
		if (value) {
			setSelectedDate(value);
			setTempMonth(value.month);
			setTempYear(value.year);
		} else {
			setSelectedDate(null);
		}
	}, [value]);

	// Sample Persian months
	const persianMonths = [
		"فروردین",
		"اردیبهشت",
		"خرداد",
		"تیر",
		"مرداد",
		"شهریور",
		"مهر",
		"آبان",
		"آذر",
		"دی",
		"بهمن",
		"اسفند",
	];

	// Generate years (100 years range: 50 years before and 50 years after current year)
	const generateYears = (): number[] => {
		const years: number[] = [];
		const startYear = currentYear - 50;
		const endYear = currentYear + 50;

		for (let year = startYear; year <= endYear; year++) {
			years.push(year);
		}

		return years;
	};

	const years = generateYears();

	// Get days in month based on Persian calendar rules
	const getDaysInMonth = (month: number, year: number): number[] => {
		const persianMonthDays = [
			31, // Farvardin
			31, // Ordibehesht
			31, // Khordad
			31, // Tir
			31, // Mordad
			31, // Shahrivar
			30, // Mehr
			30, // Aban
			30, // Azar
			30, // Dey
			30, // Bahman
			29, // Esfand
		];

		// Check if it's a leap year in Persian calendar
		const isLeapYear = (y: number): boolean => {
			// Persian leap year calculation (algorithm by Birashk)
			const a = y - 474;
			const b = Math.floor(a / 2820);
			const c = a % 2820;
			return c === 2820 - 1 || (c + 1) % 128 === 0;
		};

		// Adjust Esfand for leap year
		if (month === 12 && isLeapYear(year)) {
			persianMonthDays[11] = 30;
		}

		const daysInMonth = persianMonthDays[month - 1];
		return Array.from({ length: daysInMonth }, (_, i) => i + 1);
	};

	const days = getDaysInMonth(tempMonth, tempYear);

	const handleDaySelect = (day: number) => {
		const newDate: PersianDate = {
			day,
			month: tempMonth,
			year: tempYear,
		};
		setSelectedDate(newDate);
		setIsOpen(false);

		if (onChange) {
			onChange(newDate);
		}
	};

	const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const month = parseInt(e.target.value);
		setTempMonth(month);
	};

	const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const year = parseInt(e.target.value);
		setTempYear(year);
	};

	const clearDate = (e: React.MouseEvent) => {
		e.stopPropagation();
		setSelectedDate(null);
		if (onChange) {
			onChange(null);
		}
	};

	return (
		<div style={{ position: "relative", width: "50%" }}>
			<div
				onClick={() => setIsOpen(!isOpen)}
				style={{
					padding: "0px 9px",
					border: "1px solid #ccc",
					borderRadius: "4px",
					cursor: "pointer",
					textAlign: "right",
					backgroundColor: "#fff",
					direction: "rtl",
					fontFamily: "Vazirmatn, Tahoma, sans-serif",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					minHeight: "20px",
				}}
			>
				<span>
					{selectedDate
						? `${selectedDate.year}/${selectedDate.month
								.toString()
								.padStart(2, "0")}/${selectedDate.day
								.toString()
								.padStart(2, "0")}`
						: placeholder}
				</span>
				{selectedDate && (
					<button
						type='button'
						onClick={clearDate}
						style={{
							background: "none",
							border: "none",
							color: "#999",
							cursor: "pointer",
							fontSize: "14px",
							padding: "0 4px",
						}}
					>
						×
					</button>
				)}
			</div>

			{/* Hidden inputs for form submission */}
			{name && (
				<>
					<input
						type='hidden'
						name={`${name}_year`}
						value={selectedDate?.year || ""}
					/>
					<input
						type='hidden'
						name={`${name}_month`}
						value={selectedDate?.month || ""}
					/>
					<input
						type='hidden'
						name={`${name}_day`}
						value={selectedDate?.day || ""}
					/>
				</>
			)}

			{isOpen && (
				<div
					style={{
						position: "absolute",
						top: "100%",
						right: 0,
						marginTop: "4px",
						backgroundColor: "white",
						border: "1px solid #ccc",
						borderRadius: "4px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
						padding: "12px",
						zIndex: 1000,
						minWidth: "250px",
						direction: "rtl",
						fontFamily: "Vazirmatn, Tahoma, sans-serif",
					}}
				>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(7, 1fr)",
							gap: "4px",
							marginBottom: "12px",
						}}
					>
						{["ش", "ی", "د", "س", "چ", "پ", "ج"].map((dayName) => (
							<div
								key={dayName}
								style={{
									textAlign: "center",
									fontSize: "12px",
									fontWeight: "bold",
									color: "#666",
									padding: "4px",
								}}
							>
								{dayName}
							</div>
						))}
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(7, 1fr)",
							gap: "4px",
						}}
					>
						{days.map((day) => (
							<div
								key={day}
								onClick={() => handleDaySelect(day)}
								style={{
									padding: "8px",
									textAlign: "center",
									cursor: "pointer",
									border: "1px solid #eee",
									borderRadius: "4px",
									fontSize: "12px",
									backgroundColor:
										selectedDate?.day === day &&
										selectedDate?.month === tempMonth &&
										selectedDate?.year === tempYear
											? "#4f46e5"
											: "white",
									color:
										selectedDate?.day === day &&
										selectedDate?.month === tempMonth &&
										selectedDate?.year === tempYear
											? "white"
											: "black",
									fontWeight:
										selectedDate?.day === day &&
										selectedDate?.month === tempMonth &&
										selectedDate?.year === tempYear
											? "bold"
											: "normal",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = "#f3f4f6";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										selectedDate?.day === day &&
										selectedDate?.month === tempMonth &&
										selectedDate?.year === tempYear
											? "#4f46e5"
											: "white";
								}}
							>
								{day}
							</div>
						))}
					</div>

					<div
						style={{
							marginTop: "12px",
							display: "flex",
							gap: "8px",
							justifyContent: "center",
						}}
					>
						<select
							value={tempMonth}
							onChange={handleMonthChange}
							style={{
								padding: "6px 12px",
								borderRadius: "4px",
								border: "1px solid #ddd",
								fontFamily: "Vazirmatn, Tahoma, sans-serif",
								fontSize: "14px",
								minWidth: "100px",
							}}
						>
							{persianMonths.map((month, idx) => (
								<option
									key={idx}
									value={idx + 1}
								>
									{month}
								</option>
							))}
						</select>

						<select
							value={tempYear}
							onChange={handleYearChange}
							style={{
								padding: "6px 12px",
								borderRadius: "4px",
								border: "1px solid #ddd",
								fontFamily: "Vazirmatn, Tahoma, sans-serif",
								fontSize: "14px",
								minWidth: "100px",
							}}
						>
							{years.map((year) => (
								<option
									key={year}
									value={year}
								>
									{year}
								</option>
							))}
						</select>
					</div>
				</div>
			)}
		</div>
	);
};

export default PersianDatePickerCustom;

const formatToRFC3339 = (date: PersianDate): string => {
	return `${date.year}-${String(date.month).padStart(2, "0")}-${String(
		date.day,
	).padStart(2, "0")}T00:00:00Z`;
};

export { formatToRFC3339 };
