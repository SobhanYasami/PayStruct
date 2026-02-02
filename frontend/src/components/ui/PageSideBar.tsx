import { Dispatch, SetStateAction } from "react";
import styles from "./PageSideBar.module.css";
import Link from "next/link";
import { DashboardFormName } from "@/providers/context/DashboardContext";

export default function PageSideBar({
	isPopOpen,
	setIsPopOpen,
	formName,
	setFormName,
}: {
	isPopOpen: boolean;
	setIsPopOpen: (value: boolean) => void;
	formName: DashboardFormName;
	setFormName: React.Dispatch<React.SetStateAction<DashboardFormName>>;
}) {
	const handleBtnClick = (formName: DashboardFormName) => {
		console.log(`form name is: ${formName}`);
		setFormName(formName);
		setIsPopOpen(!isPopOpen);
	};
	return (
		<div className={styles.Container}>
			<PartContainer>
				<PartHeader
					title='منوی مدیریتی'
					path=''
				/>
			</PartContainer>
			<PartContainer>
				<PartHeader
					title='پیمانکاران'
					path='contractor'
				/>
				<PartItems>
					<button onClick={() => handleBtnClick("new-contractor")}>
						ایجاد پیمانکار جدید
					</button>
				</PartItems>
			</PartContainer>
			<PartContainer>
				<PartHeader
					title='قراردادها'
					path='contract'
				/>
				<PartItems>
					<button onClick={() => handleBtnClick("new-contract")}>
						ایجاد قرارداد جدید
					</button>
				</PartItems>
				<PartItems>
					<button onClick={() => handleBtnClick("new-wbs")}>
						ایجاد ساختار شکست قرارداد{" "}
					</button>
				</PartItems>
			</PartContainer>
			<PartContainer>
				<PartHeader
					title='صورت وضعیت ها'
					path='status-statement'
				/>
				<PartItems>
					<button onClick={() => handleBtnClick("new-status-sttmnt")}>
						ایجاد صورت وضعیت جدید
					</button>
				</PartItems>
			</PartContainer>
		</div>
	);
}

function PartContainer({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <div className={styles.PartContainer}>{children}</div>;
}

function PartHeader({ title, path }: { title: string; path: string }) {
	return (
		<Link
			href={`/dashboard/contractors/${path}`}
			className={styles.PartHeader}
		>
			{title}
		</Link>
	);
}

function PartItems({ children }: { children: React.ReactNode }) {
	return <div className={styles.PartItems}>{children}</div>;
}
