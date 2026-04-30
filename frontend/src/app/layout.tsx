import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
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
		<html lang='fa' dir='rtl'>
			<body>
				<Toaster position='top-center' />
				<TanstakProvider>{children}</TanstakProvider>
			</body>
		</html>
	);
}
