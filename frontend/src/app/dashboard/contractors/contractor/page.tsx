"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/providers/context/DashboardContext";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
	Trash2,
	Search,
	Filter,
	Users,
	Building2,
	User,
	Download,
	Eye,
	Edit3,
	MoreVertical,
	ChevronDown,
	ChevronUp,
	Hash,
	FileText,
	AlertCircle,
	Loader2,
	RefreshCw,
	Plus,
} from "lucide-react";

import styles from "./page.module.css";
import NewContractor from "@/components/ui/NewContractor";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const Contractor_URL = `${API_URL}/management/contractors/`;

type Contractor = {
	ID: string;
	legal_entity: boolean;
	first_name: string;
	last_name: string;
	preferential_id: string;
	national_id: string;
	created_at?: string;
	updated_at?: string;
};

async function getAllContractors() {
	const token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("Unauthorized");
	}

	const res = await fetch(`${Contractor_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to fetch contractors!");
	}

	return res.json();
}

export default function ContractorsPage() {
	const { isPopOpen, setIsPopOpen, formName, setFormName } = useDashboard();
	const [searchQuery, setSearchQuery] = useState("");
	const [filterType, setFilterType] = useState<"all" | "legal" | "natural">(
		"all",
	);
	const [sortField, setSortField] = useState<keyof Contractor>("last_name");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [selectedContractor, setSelectedContractor] =
		useState<Contractor | null>(null);
	const [showDetails, setShowDetails] = useState(false);

	const {
		data: contractorsData,
		isLoading,
		isError,
		refetch,
		error,
	} = useQuery({
		queryKey: ["contractors"],
		queryFn: getAllContractors,
		retry: 1,
	});

	const contractorList: Contractor[] = contractorsData?.data || [];

	const handleRetry = () => {
		refetch();
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		refetch();
	};

	const handleSort = (field: keyof Contractor) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const handleDelete = async (id: string, name: string) => {
		if (!confirm(`آیا از حذف پیمانکار "${name}" اطمینان دارید؟`)) {
			return;
		}

		try {
			const token = localStorage.getItem("usr-token");
			const res = await fetch(`${Contractor_URL}${id}`, {
				method: "DELETE",
				headers: {
					Authorization: `bearer ${token}`,
				},
			});

			if (!res.ok) {
				throw new Error("Failed to delete contractor");
			}

			toast.success("پیمانکار با موفقیت حذف شد");
			refetch();
		} catch (error) {
			toast.error("خطا در حذف پیمانکار");
			console.error(error);
		}
	};

	const handleViewDetails = (contractor: Contractor) => {
		setSelectedContractor(contractor);
		setShowDetails(true);
	};

	const filteredAndSortedContractors = contractorList
		.filter((contractor) => {
			const matchesSearch =
				searchQuery === "" ||
				contractor.first_name
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				contractor.last_name
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				contractor.national_id.includes(searchQuery) ||
				contractor.preferential_id.includes(searchQuery);

			const matchesFilter =
				filterType === "all" ||
				(filterType === "legal" && contractor.legal_entity) ||
				(filterType === "natural" && !contractor.legal_entity);

			return matchesSearch && matchesFilter;
		})
		.sort((a, b) => {
			let aValue = a[sortField];
			let bValue = b[sortField];

			if (typeof aValue === "string" && typeof bValue === "string") {
				return sortDirection === "asc"
					? aValue.localeCompare(bValue)
					: bValue.localeCompare(aValue);
			}

			return 0;
		});

	const stats = {
		total: contractorList.length,
		legal: contractorList.filter((c) => c.legal_entity).length,
		natural: contractorList.filter((c) => !c.legal_entity).length,
	};

	const SortIcon = ({ field }: { field: keyof Contractor }) => {
		if (sortField !== field) return null;
		return sortDirection === "asc" ? (
			<ChevronUp size={14} />
		) : (
			<ChevronDown size={14} />
		);
	};

	return (
		<div className={styles.PageContainer}>
			{/* Header */}
			<div className={styles.Header}>
				<div className={styles.HeaderLeft}>
					<div className={styles.TitleSection}>
						<div className={styles.TitleIcon}>
							<Users size={28} />
						</div>
						<div>
							<h1 className={styles.PageTitle}>مدیریت پیمانکاران</h1>
							<p className={styles.PageSubtitle}>
								مشاهده، جستجو و مدیریت اطلاعات پیمانکاران
							</p>
						</div>
					</div>
				</div>

				<div className={styles.HeaderRight}>
					<button
						className={styles.AddButton}
						onClick={() => setFormName("new-contractor")}
					>
						<Plus size={18} />
						پیمانکار جدید
					</button>
					<button
						className={styles.RefreshButton}
						onClick={handleRetry}
						disabled={isLoading}
					>
						<RefreshCw
							size={18}
							className={isLoading ? styles.Spinning : ""}
						/>
					</button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className={styles.StatsContainer}>
				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
						}}
					>
						<Users size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(stats.total)}
						</span>
						<span className={styles.StatLabel}>کل پیمانکاران</span>
					</div>
				</div>

				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
						}}
					>
						<Building2 size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(stats.legal)}
						</span>
						<span className={styles.StatLabel}>حقوقی</span>
					</div>
				</div>

				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
						}}
					>
						<User size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(stats.natural)}
						</span>
						<span className={styles.StatLabel}>حقیقی</span>
					</div>
				</div>
			</div>

			{/* Search and Filters */}
			<div className={styles.Toolbar}>
				<form
					className={styles.SearchForm}
					onSubmit={handleSearch}
				>
					<div className={styles.SearchInputWrapper}>
						<Search
							size={18}
							className={styles.SearchIcon}
						/>
						<input
							type='text'
							placeholder='جستجو بر اساس نام، نام خانوادگی یا شماره ملی...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={styles.SearchInput}
						/>
						<button
							type='submit'
							className={styles.SearchButton}
						>
							جستجو
						</button>
					</div>
				</form>

				<div className={styles.Filters}>
					<div className={styles.FilterGroup}>
						<Filter size={16} />
						<span>فیلتر نوع:</span>
						<select
							value={filterType}
							onChange={(e) => setFilterType(e.target.value as any)}
							className={styles.FilterSelect}
						>
							<option value='all'>همه</option>
							<option value='legal'>حقوقی</option>
							<option value='natural'>حقیقی</option>
						</select>
					</div>
				</div>
			</div>

			{/* Table Container */}
			<div className={styles.TableContainer}>
				<div className={styles.TableHeader}>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("legal_entity")}
					>
						<div className={styles.HeaderCellContent}>
							<span>نوع</span>
							<SortIcon field='legal_entity' />
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("last_name")}
					>
						<div className={styles.HeaderCellContent}>
							<span>نام کامل</span>
							<SortIcon field='last_name' />
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("national_id")}
					>
						<div className={styles.HeaderCellContent}>
							<span>شماره ملی</span>
							<SortIcon field='national_id' />
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("preferential_id")}
					>
						<div className={styles.HeaderCellContent}>
							<span>شناسه تفضیلی</span>
							<SortIcon field='preferential_id' />
						</div>
					</div>
					<div className={styles.TableHeaderCell}>
						<span>عملیات</span>
					</div>
				</div>

				{isLoading ? (
					<div className={styles.LoadingState}>
						<Loader2
							className={styles.Spinner}
							size={32}
						/>
						<p>در حال دریافت لیست پیمانکاران...</p>
					</div>
				) : isError ? (
					<div className={styles.ErrorState}>
						<AlertCircle size={48} />
						<p>خطا در دریافت لیست پیمانکاران</p>
						<p className={styles.ErrorDetail}>{error?.message}</p>
						<button
							onClick={handleRetry}
							className={styles.RetryButton}
						>
							تلاش مجدد
						</button>
					</div>
				) : filteredAndSortedContractors.length === 0 ? (
					<div className={styles.EmptyState}>
						<Users size={48} />
						<p>هیچ پیمانکاری یافت نشد</p>
						<p className={styles.EmptySubtext}>
							{searchQuery
								? "نتیجه‌ای برای جستجوی شما یافت نشد"
								: "هنوز پیمانکاری ثبت نشده است"}
						</p>
						<button
							onClick={() => setFormName("new-contractor")}
							className={styles.AddEmptyButton}
						>
							<Plus size={18} />
							افزودن پیمانکار جدید
						</button>
					</div>
				) : (
					<div className={styles.TableBody}>
						{filteredAndSortedContractors.map((contractor) => (
							<div
								key={contractor.ID}
								className={styles.TableRow}
							>
								<div className={styles.TableCell}>
									<div
										className={`${styles.ContractorType} ${contractor.legal_entity ? styles.Legal : styles.Natural}`}
									>
										{contractor.legal_entity ? (
											<>
												<Building2 size={14} />
												<span>حقوقی</span>
											</>
										) : (
											<>
												<User size={14} />
												<span>حقیقی</span>
											</>
										)}
									</div>
								</div>

								<div className={styles.TableCell}>
									<div className={styles.ContractorName}>
										<span className={styles.NameText}>
											{contractor.first_name} {contractor.last_name}
										</span>
									</div>
								</div>

								<div className={styles.TableCell}>
									<div className={styles.ContractorID}>
										<Hash size={14} />
										<span>{toPersianDigits(contractor.national_id)}</span>
									</div>
								</div>

								<div className={styles.TableCell}>
									<div className={styles.ContractorPrefID}>
										<FileText size={14} />
										<span>
											{contractor.preferential_id
												? toPersianDigits(contractor.preferential_id)
												: "---"}
										</span>
									</div>
								</div>

								<div className={styles.TableCell}>
									<div className={styles.ActionButtons}>
										<button
											className={styles.ViewButton}
											onClick={() => handleViewDetails(contractor)}
											title='مشاهده جزئیات'
										>
											<Eye size={16} />
										</button>
										<button
											className={styles.EditButton}
											onClick={() => {
												/* TODO: Implement edit */
											}}
											title='ویرایش'
										>
											<Edit3 size={16} />
										</button>
										<button
											className={styles.DeleteButton}
											onClick={() =>
												handleDelete(
													contractor.ID,
													`${contractor.first_name} ${contractor.last_name}`,
												)
											}
											title='حذف'
										>
											<Trash2 size={16} />
										</button>
										<button
											className={styles.MoreButton}
											title='عملیات بیشتر'
										>
											<MoreVertical size={16} />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Table Footer */}
				{filteredAndSortedContractors.length > 0 && (
					<div className={styles.TableFooter}>
						<div className={styles.FooterInfo}>
							<span>
								نمایش {toPersianDigits(filteredAndSortedContractors.length)} از{" "}
								{toPersianDigits(contractorList.length)} پیمانکار
							</span>
						</div>
						<div className={styles.FooterActions}>
							<button className={styles.ExportButton}>
								<Download size={16} />
								خروجی Excel
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Contractor Details Modal */}
			{showDetails && selectedContractor && (
				<div className={styles.DetailsModal}>
					<div className={styles.DetailsModalContent}>
						<div className={styles.DetailsModalHeader}>
							<h3>جزئیات پیمانکار</h3>
							<button
								className={styles.CloseModalButton}
								onClick={() => setShowDetails(false)}
							>
								×
							</button>
						</div>
						<div className={styles.DetailsModalBody}>
							<div className={styles.DetailItem}>
								<span className={styles.DetailLabel}>نام کامل:</span>
								<span className={styles.DetailValue}>
									{selectedContractor.first_name} {selectedContractor.last_name}
								</span>
							</div>
							<div className={styles.DetailItem}>
								<span className={styles.DetailLabel}>نوع:</span>
								<span
									className={`${styles.DetailValue} ${selectedContractor.legal_entity ? styles.Legal : styles.Natural}`}
								>
									{selectedContractor.legal_entity ? "حقوقی" : "حقیقی"}
								</span>
							</div>
							<div className={styles.DetailItem}>
								<span className={styles.DetailLabel}>شماره ملی:</span>
								<span className={styles.DetailValue}>
									{toPersianDigits(selectedContractor.national_id)}
								</span>
							</div>
							<div className={styles.DetailItem}>
								<span className={styles.DetailLabel}>شناسه تفضیلی:</span>
								<span className={styles.DetailValue}>
									{selectedContractor.preferential_id
										? toPersianDigits(selectedContractor.preferential_id)
										: "---"}
								</span>
							</div>
						</div>
						<div className={styles.DetailsModalFooter}>
							<button
								className={styles.CloseDetailsButton}
								onClick={() => setShowDetails(false)}
							>
								بستن
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
