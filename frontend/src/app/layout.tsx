import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
	title: "PayStruct",
	description: "نرم افزار مدیریت پیمانکارن،سرمایه گذاران و کارمندان ",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang='fa'
			className='h-full'
		>
			<body
				className={`h-full`}
				dir='rtl'
			>
				<Navbar />
				{children}
			</body>
		</html>
	);
}
