"use client";

import React, { useState } from "react";

interface CustomerForm {
	fullName: string;
	personalNumber: string;
	nationalNumber: string;
	paymentType: string;
	paymentAmount: string;
}

export default function Customers() {
	const [form, setForm] = useState<CustomerForm>({
		fullName: "",
		personalNumber: "",
		nationalNumber: "",
		paymentType: "",
		paymentAmount: "",
	});

	const [submitted, setSubmitted] = useState(false);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (
			!form.fullName ||
			!form.personalNumber ||
			!form.nationalNumber ||
			!form.paymentType ||
			!form.paymentAmount
		) {
			alert("لطفاً تمام فیلدها را تکمیل کنید.");
			return;
		}

		console.log("Customer Added:", form);
		setSubmitted(true);
		setForm({
			fullName: "",
			personalNumber: "",
			nationalNumber: "",
			paymentType: "",
			paymentAmount: "",
		});
	};

	return (
		<div
			dir='rtl'
			className='min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8'
		>
			<div className='max-w-2xl mx-auto bg-white shadow-md rounded-xl p-6 border border-gray-200'>
				<h1 className='text-2xl font-bold text-gray-800 mb-6 text-center'>
					افزودن مشتری جدید
				</h1>

				<form
					onSubmit={handleSubmit}
					className='space-y-4'
				>
					{/* Full Name */}
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							نام و نام خانوادگی
						</label>
						<input
							type='text'
							name='fullName'
							value={form.fullName}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
							placeholder='مثلاً: علی رضایی'
						/>
					</div>

					{/* Personal Number */}
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							شماره پرسنلی
						</label>
						<input
							type='text'
							name='personalNumber'
							value={form.personalNumber}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
							placeholder='مثلاً: ۱۲۳۴۵'
						/>
					</div>

					{/* National Number */}
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							کد ملی
						</label>
						<input
							type='text'
							name='nationalNumber'
							value={form.nationalNumber}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
							placeholder='مثلاً: ۰۰۵۴۴۱۲۳۴۵'
						/>
					</div>

					{/* Payment Type */}
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							نوع اولین پرداخت
						</label>
						<select
							name='paymentType'
							value={form.paymentType}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none'
						>
							<option value=''>انتخاب کنید</option>
							<option value='cheque'>چک</option>
							<option value='direct'>واریز مستقیم</option>
							<option value='receipt'>فیش بانکی</option>
							<option value='cash'>نقدی</option>
							<option value='installment'>اقساط</option>
						</select>
					</div>

					{/* Payment Amount */}
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							مبلغ پرداخت (تومان)
						</label>
						<input
							type='number'
							name='paymentAmount'
							value={form.paymentAmount}
							onChange={handleChange}
							className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none'
							placeholder='مثلاً: ۵۰۰۰۰۰۰'
						/>
					</div>

					{/* Submit Button */}
					<div className='pt-4'>
						<button
							type='submit'
							className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors'
						>
							افزودن مشتری
						</button>
					</div>
				</form>

				{submitted && (
					<div className='mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-center text-sm'>
						✅ مشتری با موفقیت ثبت شد!
					</div>
				)}
			</div>
		</div>
	);
}
