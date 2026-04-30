"use client";

import NewContractor from "@/components/ui/NewContractor";
import NewContract from "@/components/ui/NewContract";
import NewWBS from "@/components/ui/NewWBS";
import NewStatusStatement from "@/components/ui/NewStatusStatement";
import styles from "./layout.module.css";
import {
	DashboardProvider,
	useDashboard,
} from "@/providers/context/DashboardContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;
const Contract_URL = `${API_URL}/management/contracts/`;
const WBS_URL = `${API_URL}/management/wbs/`;
const StatusStatement_URL = `${API_URL}/management/contracts/status-statement/`;

function ContractorsLayoutContent({ children }: { children: React.ReactNode }) {
	const { isPopOpen, setIsPopOpen, formName } = useDashboard();

	return (
		<div style={{ position: "relative" }}>
			{isPopOpen && (
				<div className={styles.Overlay}>
					{formName === "new-contractor" && (
						<NewContractor
							setIsPopOpen={setIsPopOpen}
							apiUrl={Contractor_URL}
						/>
					)}
					{formName === "new-contract" && (
						<NewContract
							setIsPopOpen={setIsPopOpen}
							apiUrl={Contract_URL}
						/>
					)}
					{formName === "new-wbs" && (
						<NewWBS
							setIsPopOpen={setIsPopOpen}
							apiUrl={WBS_URL}
						/>
					)}
					{formName === "new-status-sttmnt" && (
						<NewStatusStatement
							setIsPopOpen={setIsPopOpen}
							apiUrl={StatusStatement_URL}
						/>
					)}
				</div>
			)}
			{children}
		</div>
	);
}

export default function ContractorsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<DashboardProvider>
			<ContractorsLayoutContent>{children}</ContractorsLayoutContent>
		</DashboardProvider>
	);
}
