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
	const [tempMonth, setTempMonth] = useState<number>(value?.month || 1);
	const [tempYear, setTempYear] = useState<number>(value?.year || 1403);

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

	// Generate years (100 years range)
	const currentYear = 1404;
	const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

	// Days 1-31 (simplified)
	const days = Array.from({ length: 31 }, (_, i) => i + 1);

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
					border: "1px solid #ffffff",
					borderRadius: "4px",
					cursor: "pointer",
					textAlign: "right",
					backgroundColor: "#ffffff",
					direction: "rtl",
					fontFamily: "Vazirmatn, Tahoma, sans-serif",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					minHeight: "20px",
					width: "100%",
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
										selectedDate?.day === day ? "#4f46e5" : "white",
									color: selectedDate?.day === day ? "white" : "black",
									fontWeight: selectedDate?.day === day ? "bold" : "normal",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = "#f3f4f6";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor =
										selectedDate?.day === day ? "#4f46e5" : "white";
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
