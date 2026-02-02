"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;

//
/* ----------   Reusable Components --------------   */

export default function Contractors() {
	return (
		<main
			className={styles.page}
			dir='rtl'
		>
			<div className={styles.wrapper}></div>
		</main>
	);
}
