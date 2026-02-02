"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useDashboard } from "@/providers/context/DashboardContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Trash } from "lucide-react";

import styles from "./page.module.css";
import NewContractor from "@/components/ui/NewContractor";

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
			<h3 className={styles.PageHeader}>پیمانکاران</h3>
			<div className={styles.SearchBar}>
				<form className={styles.SearchForm}>
					<input type='text' />
					<button type='submit'>جست و جو</button>
				</form>
			</div>
			<div className={styles.ListContainer}>
				<p className={styles.ListHeader}> لیست پیمانکاران</p>
				{isPending && (
					<p className={styles.Skeleton}>در حال دریافت لیست پیمانکاران...</p>
				)}
				{isError && (
					<p className={styles.ErrorMessage}>خطا در دریافت لیست پیمانکاران</p>
				)}
				<ul className={styles.UL}>
					<li className={styles.ListRowHeader}>
						<p className={styles.col1}>نوع پیمانکار</p>
						<p className={styles.col2}>نام کامل</p>
						<p className={styles.col3}>شماره ملی</p>
						<p className={styles.col4}>شناسه تفضیلی</p>
					</li>
					{contractorList &&
						contractorList.map((cntrs) => (
							<li
								className={styles.ListRow}
								key={cntrs.ID}
							>
								<p
									className={
										cntrs.legal_entity ? styles.Legal : styles.NonLegal
									}
								>
									{cntrs.legal_entity ? "حقوقی" : "حقیقی"}
								</p>
								<p className={styles.fullNameCol}>
									{cntrs.first_name} {cntrs.last_name}
								</p>
								<p className={styles.nationalID}>{cntrs.national_id}</p>
								<p className={styles.preferentialID}>{cntrs.preferential_id}</p>
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
