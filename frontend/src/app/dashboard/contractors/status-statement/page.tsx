"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useDashboard } from "@/providers/context/DashboardContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Trash } from "lucide-react";

import styles from "./page.module.css";
import NewContractor from "@/components/ui/NewContractor";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;
const Contract_URL = `${API_URL}/management/contract/`;

type Contractor = {
	ID: string;
	legal_entity: boolean;
	first_name: string;
	last_name: string;
	preferential_id: string;
	national_id: string;
};

type StatusStatement = {
	ID: string;
	contractor_id: string;
	project_id: string;
	progress_percent: number;
	statement_date_start: Date;
	statement_date_end: Date;
	status: string;
	number: number;
};

async function getAllContractors() {
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
		throw new Error(err.message || "Creating project failed!");
	}

	return res.json();
}

export default function page() {
	const { isPopOpen, setIsPopOpen, formName, setFormName } = useDashboard();
	const [contractorList, setContractorList] = useState<Contractor[]>();
	const [isPending, setIsPending] = useState(false);
	const [isError, setIsError] = useState("");

	useEffect(() => {
		const res = getAllContractors();
		res.then((data) => {
			setContractorList(data.data);
			console.log(data.data);
		});
		res.catch((err) => {
			console.log(err);
			setIsError("error getting contractors");
			toast.error(err);
		});
	}, []);

	return (
		<div className={styles.PageContainer}>
			<h3 className={styles.PageHeader}>صورت وضعیت ها</h3>
			<div className={styles.SearchBar}>
				<form className={styles.SearchForm}>
					<input type='text' />
					<button type='submit'>جست و جو</button>
				</form>
			</div>
			<div className={styles.ListContainer}>
				<p className={styles.ListHeader}> لیست صورت وضعیت های صادر شده</p>
				{isPending && (
					<p className={styles.Skeleton}>در حال دریافت لیست پیمانکاران...</p>
				)}
				{isError && (
					<p className={styles.ErrorMessage}>خطا در دریافت لیست پیمانکاران</p>
				)}
			</div>
		</div>
	);
}
