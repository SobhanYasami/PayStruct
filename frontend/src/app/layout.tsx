import type { Metadata } from "next";
import "./globals.css";

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
		<html lang='fa'>
			<body className={``}>{children}</body>
		</html>
	);
}
