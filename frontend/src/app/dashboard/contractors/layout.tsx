"use client";

import NewContractor from "@/components/ui/NewContractor";
import styles from "./layout.module.css";
import PageSideBar from "@/components/ui/PageSideBar";
import {
	DashboardProvider,
	useDashboard,
} from "@/providers/context/DashboardContext";
import NewContract from "@/components/ui/NewContract";
import NewWBS from "@/components/ui/NewWBS";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;
const Contract_URL = `${API_URL}/management/contracts/`;
const WBS_URL = `${API_URL}/management/contracts/wbs`;

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
	const { isPopOpen, setIsPopOpen, formName, setFormName } = useDashboard();

	return (
		<section className={styles.main}>
			<PageSideBar
				isPopOpen={isPopOpen}
				setIsPopOpen={setIsPopOpen}
				formName={formName}
				setFormName={setFormName}
			/>
			<div className={styles.childrenContainer}>
				{isPopOpen && (
					<Overlay>
						{formName == "new-contractor" && (
							<NewContractor
								setIsPopOpen={setIsPopOpen}
								apiUrl={Contractor_URL}
							/>
						)}
						{formName == "new-contract" && (
							<NewContract
								setIsPopOpen={setIsPopOpen}
								apiUrl={Contract_URL}
							/>
						)}
						{formName == "new-wbs" && (
							<NewWBS
								setIsPopOpen={setIsPopOpen}
								apiUrl={WBS_URL}
							/>
						)}
					</Overlay>
				)}
				{children}
			</div>
		</section>
	);
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<DashboardProvider>
			<DashboardLayoutContent>{children}</DashboardLayoutContent>
		</DashboardProvider>
	);
}

function Overlay({ children }: { children: React.ReactNode }) {
	return <div className={styles.Overlay}>{children}</div>;
}
