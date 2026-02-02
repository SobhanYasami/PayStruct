"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type DashboardFormName =
	| "new-contractor"
	| "new-contract"
	| "new-wbs"
	| "new-status-sttmnt"
	| null;

type DashboardContextType = {
	isPopOpen: boolean;
	setIsPopOpen: React.Dispatch<React.SetStateAction<boolean>>;

	formName: DashboardFormName;
	setFormName: React.Dispatch<React.SetStateAction<DashboardFormName>>;
};

const DashboardContext = createContext<DashboardContextType | undefined>(
	undefined,
);

export function DashboardProvider({ children }: { children: ReactNode }) {
	const [isPopOpen, setIsPopOpen] = useState(false);
	const [formName, setFormName] = useState<DashboardFormName>(null);

	return (
		<DashboardContext.Provider
			value={{
				isPopOpen,
				setIsPopOpen,
				formName,
				setFormName,
			}}
		>
			{children}
		</DashboardContext.Provider>
	);
}

export function useDashboard() {
	const context = useContext(DashboardContext);
	if (!context) {
		throw new Error("useDashboard must be used within a DashboardProvider");
	}
	return context;
}
