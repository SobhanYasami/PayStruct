import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import TanstakProvider from "@/providers/TanstakProvider";

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
			<body className={`relative`}>
				<Toaster />
				<TanstakProvider>
					<Navbar />
					{children}
				</TanstakProvider>
			</body>
		</html>
	);
}
