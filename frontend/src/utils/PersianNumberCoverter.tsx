// Extended helper functions with more features
export class NumberConverter {
	// Persian digits
	private static readonly persianDigits = [
		"۰",
		"۱",
		"۲",
		"۳",
		"۴",
		"۵",
		"۶",
		"۷",
		"۸",
		"۹",
	];

	// Arabic digits
	private static readonly arabicDigits = [
		"٠",
		"١",
		"٢",
		"٣",
		"٤",
		"٥",
		"٦",
		"٧",
		"٨",
		"٩",
	];

	// English digits
	private static readonly englishDigits = [
		"0",
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8",
		"9",
	];

	/**
	 * Convert English digits to Persian digits
	 * @param input - string or number containing English digits
	 * @returns string with Persian digits
	 */
	static toPersian(input: string | number): string {
		if (typeof input === "number") {
			input = input.toString();
		}

		return input.replace(/\d/g, (digit) => {
			return this.persianDigits[parseInt(digit)];
		});
	}

	/**
	 * Convert any digits (Persian/Arabic/English) to English digits
	 * @param input - string containing digits in any format
	 * @returns string with English digits
	 */
	static toEnglish(input: string): string {
		return input
			.split("")
			.map((char) => {
				// Check Persian digits
				const persianIndex = this.persianDigits.indexOf(char);
				if (persianIndex !== -1) {
					return persianIndex.toString();
				}

				// Check Arabic digits
				const arabicIndex = this.arabicDigits.indexOf(char);
				if (arabicIndex !== -1) {
					return arabicIndex.toString();
				}

				// Already English or non-digit character
				return char;
			})
			.join("");
	}

	/**
	 * Format number with Persian digits and thousands separator
	 * @param number - The number to format
	 * @param decimals - Number of decimal places (default: 0)
	 * @returns Formatted string with Persian digits and commas
	 */
	static formatNumber(number: number, decimals: number = 0): string {
		// Format with English digits first
		const formatted = number.toLocaleString("en-US", {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		});

		// Convert to Persian digits
		return this.toPersian(formatted);
	}

	/**
	 * Convert currency amount with Persian digits and ریال symbol
	 * @param amount - The amount to format
	 * @param decimals - Number of decimal places (default: 0)
	 * @returns Formatted currency string
	 */
	static formatCurrency(amount: number, decimals: number = 0): string {
		const formatted = this.formatNumber(amount, decimals);
		return `${formatted}`;
	}

	/**
	 * Parse a string with Persian/Arabic digits to number
	 * @param input - String with Persian/Arabic/English digits
	 * @returns Parsed number
	 */
	static parseNumber(input: string): number {
		const englishString = this.toEnglish(input);
		// Remove any non-digit characters except decimal point and minus sign
		const cleaned = englishString.replace(/[^\d.-]/g, "");
		return parseFloat(cleaned);
	}

	/**
	 * Check if a string contains only digits (any format)
	 * @param input - String to check
	 * @returns boolean
	 */
	static isDigitsOnly(input: string): boolean {
		const englishString = this.toEnglish(input);
		return /^\d+$/.test(englishString);
	}
}

// Usage examples:
export function toPersianDigits(number: string | number): string {
	return NumberConverter.toPersian(number);
}

export function toEnglishDigits(persianNumber: string): string {
	return NumberConverter.toEnglish(persianNumber);
}

// More utility exports
export const formatNumber = NumberConverter.formatNumber;
export const formatCurrency = NumberConverter.formatCurrency;
export const parseNumber = NumberConverter.parseNumber;
export const isDigitsOnly = NumberConverter.isDigitsOnly;
