import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
	title: "PayStruct",
	description: "Finance Manager for Companies",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body className={``}>
				<Navbar />
				{children}
			</body>
		</html>
	);
}
