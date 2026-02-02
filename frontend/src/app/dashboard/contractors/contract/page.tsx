"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useDashboard } from "@/providers/context/DashboardContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Trash } from "lucide-react";

import styles from "./page.module.css";
import NewContractor from "@/components/ui/NewContractor";
import {
	formatCurrency,
	NumberConverter,
	toPersianDigits,
} from "@/utils/PersianNumberCoverter";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;
const Project_URL = `${API_URL}/management/projects/`;
const Contract_URL = `${API_URL}/management/contracts/`;

type ApiRes = {
	status: string;
	message: string;
	data: any[];
};

type Contractor = {
	ID: string;
	legal_entity: boolean;
	first_name: string;
	last_name: string;
	preferential_id: string;
	national_id: string;
};

type Project = {
	ID: string;
	name: string;
	phase: string;
};

type Contract = {
	ID: string;
	contractor_id: string;
	project_id: string;
	contract_number: string;
	gross_budget: number;
	start_date: Date;
	end_date: Date;
	insurance_rate: number;
	performance_bond: number;
	added_value_tax: number;
};

async function getAllContractors(): Promise<Contractor[]> {
	let token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("UnAuthorized");
	}
	const res = await fetch(`${Contractor_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "failure in getting contractors");
	}

	const apiResponse: ApiRes = await res.json();

	// Validate that data is an array
	if (!Array.isArray(apiResponse.data)) {
		throw new Error("Invalid response format: data is not an array");
	}

	// You might want to add runtime validation here
	return apiResponse.data as Contractor[];
}

async function getAllProjects(): Promise<Project[]> {
	let token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("UnAuthorized");
	}
	const res = await fetch(`${Project_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "failure in getting projects");
	}

	const apiResponse: ApiRes = await res.json();

	// Validate that data is an array
	if (!Array.isArray(apiResponse.data)) {
		throw new Error("Invalid response format: data is not an array");
	}

	// You might want to add runtime validation here
	return apiResponse.data as Project[];
}

async function getAllContracts() {
	let token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("UnAuthorized");
	}
	const res = await fetch(`${Contract_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "failure in getting contracts");
	}

	const apiResponse: ApiRes = await res.json();

	// Validate that data is an array
	if (!Array.isArray(apiResponse.data)) {
		throw new Error("Invalid response format: data is not an array");
	}

	// You might want to add runtime validation here
	return apiResponse.data as Contract[];
}

export default function page() {
	const { isPopOpen, setIsPopOpen, formName, setFormName } = useDashboard();
	const queryClient = useQueryClient();

	const [contractTotalCount, setContractTotalCount] = useState<number>(0);
	const [contractTotalBudget, setContractTotalBudget] = useState<number>(0);

	const {
		isPending: isContractorPending,
		isError: isContractorError,
		data: contractors,
		error: contractorError,
	} = useQuery<Contractor[], Error>({
		queryKey: ["contractors"],
		queryFn: getAllContractors,
	});

	const {
		isPending: isProjectPending,
		isError: isProjectError,
		data: projects,
		error: projectError,
	} = useQuery<Project[], Error>({
		queryKey: ["projects"],
		queryFn: getAllProjects,
	});

	const {
		isPending: isContractPending,
		isError: isContractError,
		data: contracts,
		error: contractError,
	} = useQuery<Contract[], Error>({
		queryKey: ["contracts"],
		queryFn: getAllContracts,
	});

	if (isContractorError) {
		toast.error("error in getting contractors informations");
	}
	if (isProjectError) {
		toast.error("error getting projects information");
	}
	if (isContractError) {
		toast.error("error in getting contracts inforamtions");
	}

	useEffect(() => {
		if (contracts) {
			setContractTotalCount(contracts.length);
			let totalPrice = 0;
			contracts.map((item) => {
				totalPrice += item.gross_budget;
			});
			setContractTotalBudget(totalPrice);
		}
	}, [contracts]);

	if (contracts) {
		console.log("contracts list", contracts);
	}

	return (
		<div className={styles.PageContainer}>
			<h3 className={styles.PageHeader}>قراردادها</h3>
			<div className={styles.SearchBar}>
				<form className={styles.SearchForm}>
					<input type='text' />
					<button type='submit'>جست و جو</button>
				</form>
			</div>
			<div className={styles.ListContainer}>
				<p className={styles.ListHeader}> لیست قراردادها</p>
				<div className={styles.contractStats}>
					<div className={styles.contractStatItems}>
						<p>تعداد کل قراردادها:</p>
						<p>{toPersianDigits(contractTotalCount)}</p>
					</div>
					<div className={styles.contractStatItems}>
						<p>مبلغ ناخالص کل قراردادها:</p>
						<p>{NumberConverter.formatCurrency(contractTotalBudget)}</p>
					</div>
				</div>
				<ul className={styles.UL}>
					<li className={styles.ListRowHeader}>
						<p className={styles.col1}>شماره قرارداد</p>
						<p className={styles.col2}>نام پیمانکار</p>
						<p className={styles.col3}>مبلغ قرارداد (ریال)</p>
						<p className={styles.col4}>بیمه (%)</p>
						<p className={styles.col5}> حسن انجام کار (%)</p>
						<p className={styles.col6}>مالیات (%)</p>
						<p className={styles.col7}>تاریخ شروع</p>
						<p className={styles.col8}>تاریخ پایان</p>
					</li>
					{isContractPending && (
						<p className={styles.Skeleton}>در حال دریافت لیست قراردادها...</p>
					)}
					{contracts &&
						contracts.map((cnts) => (
							<li
								className={styles.ListRow}
								key={cnts.ID}
							>
								<p className={styles.col1}>
									{toPersianDigits(cnts.contract_number)}
								</p>
								<p className={styles.col2}>
									{contractors?.find((item) => item.ID === cnts.contractor_id)
										?.first_name || ""}{" "}
									{contractors?.find((item) => item.ID === cnts.contractor_id)
										?.last_name || "یافت نشد"}
								</p>
								<p className={styles.col3}>
									{NumberConverter.formatCurrency(cnts.gross_budget)}
								</p>
								<p className={styles.col4}>
									{toPersianDigits(cnts.insurance_rate)}
								</p>
								<p className={styles.col5}>
									{toPersianDigits(cnts.performance_bond)}
								</p>
								<p className={styles.col6}>
									{toPersianDigits(cnts.added_value_tax)}
								</p>
								<p className={styles.col7}>--</p>
								<p className={styles.col8}>--</p>
								<button className={styles.DelBtn}>
									<Trash size={15} />
								</button>
							</li>
						))}
				</ul>
			</div>
		</div>
	);
}
