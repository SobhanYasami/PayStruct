"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/providers/context/DashboardContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
	Trash2,
	Search,
	Filter,
	FileText,
	DollarSign,
	Calendar,
	Percent,
	Shield,
	TrendingUp,
	Download,
	Eye,
	Edit3,
	MoreVertical,
	ChevronDown,
	ChevronUp,
	Building2,
	User,
	Loader2,
	AlertCircle,
	RefreshCw,
	Plus,
	BarChart3,
	Clock,
	CalendarCheck,
} from "lucide-react";

import styles from "./page.module.css";
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
	start_date: string;
	end_date: string;
	insurance_rate: number;
	performance_bond: number;
	added_value_tax: number;
	contractor?: Contractor;
	project?: Project;
};

async function getAllContractors(): Promise<Contractor[]> {
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
		throw new Error(err.message || "Failed to get contractors");
	}

	const apiResponse: ApiRes = await res.json();
	if (!Array.isArray(apiResponse.data)) {
		throw new Error("Invalid response format: data is not an array");
	}

	return apiResponse.data as Contractor[];
}

async function getAllProjects(): Promise<Project[]> {
	const token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("Unauthorized");
	}
	const res = await fetch(`${Project_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to get projects");
	}

	const apiResponse: ApiRes = await res.json();
	if (!Array.isArray(apiResponse.data)) {
		throw new Error("Invalid response format: data is not an array");
	}

	return apiResponse.data as Project[];
}

async function getAllContracts(): Promise<Contract[]> {
	const token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("Unauthorized");
	}
	const res = await fetch(`${Contract_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to get contracts");
	}

	const apiResponse: ApiRes = await res.json();
	if (!Array.isArray(apiResponse.data)) {
		throw new Error("Invalid response format: data is not an array");
	}

	return apiResponse.data as Contract[];
}

export default function ContractsPage() {
	const { isPopOpen, setIsPopOpen, formName, setFormName } = useDashboard();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState<keyof Contract>("contract_number");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [selectedContract, setSelectedContract] = useState<Contract | null>(
		null,
	);
	const [showDetails, setShowDetails] = useState(false);
	const [filterStatus, setFilterStatus] = useState<
		"all" | "active" | "expired"
	>("all");

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

	// Enhanced contracts data with related entities
	const enhancedContracts =
		contracts?.map((contract) => ({
			...contract,
			contractor: contractors?.find((c) => c.ID === contract.contractor_id),
			project: projects?.find((p) => p.ID === contract.project_id),
		})) || [];

	// Calculate statistics
	const stats = {
		total: enhancedContracts.length,
		totalBudget: enhancedContracts.reduce((sum, c) => sum + c.gross_budget, 0),
		active: enhancedContracts.filter((c) => {
			const endDate = new Date(c.end_date);
			const today = new Date();
			return endDate > today;
		}).length,
		expired: enhancedContracts.filter((c) => {
			const endDate = new Date(c.end_date);
			const today = new Date();
			return endDate < today;
		}).length,
		avgBudget:
			enhancedContracts.length > 0
				? enhancedContracts.reduce((sum, c) => sum + c.gross_budget, 0) /
					enhancedContracts.length
				: 0,
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		queryClient.invalidateQueries({ queryKey: ["contracts"] });
	};

	const handleSort = (field: keyof Contract) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const handleRetry = () => {
		queryClient.invalidateQueries({ queryKey: ["contracts"] });
	};

	const handleDelete = async (id: string, contractNumber: string) => {
		if (!confirm(`آیا از حذف قرارداد "${contractNumber}" اطمینان دارید؟`)) {
			return;
		}

		try {
			const token = localStorage.getItem("usr-token");
			const res = await fetch(`${Contract_URL}${id}`, {
				method: "DELETE",
				headers: {
					Authorization: `bearer ${token}`,
				},
			});

			if (!res.ok) {
				throw new Error("Failed to delete contract");
			}

			toast.success("قرارداد با موفقیت حذف شد");
			queryClient.invalidateQueries({ queryKey: ["contracts"] });
		} catch (error) {
			toast.error("خطا در حذف قرارداد");
			console.error(error);
		}
	};

	const handleViewDetails = (contract: Contract) => {
		setSelectedContract(contract);
		setShowDetails(true);
	};

	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("fa-IR");
		} catch (error) {
			return "---";
		}
	};

	const getContractStatus = (endDate: string) => {
		const end = new Date(endDate);
		const today = new Date();
		const diffTime = end.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0)
			return { label: "منقضی شده", color: "#ef4444", bg: "#fef2f2" };
		if (diffDays <= 30)
			return { label: "نزدیک به اتمام", color: "#f59e0b", bg: "#fffbeb" };
		return { label: "فعال", color: "#10b981", bg: "#f0fdf4" };
	};

	const SortIcon = ({ field }: { field: keyof Contract }) => {
		if (sortField !== field) return null;
		return sortDirection === "asc" ? (
			<ChevronUp size={14} />
		) : (
			<ChevronDown size={14} />
		);
	};

	// Filter and sort contracts
	const filteredAndSortedContracts = enhancedContracts
		.filter((contract) => {
			const matchesSearch =
				searchQuery === "" ||
				contract.contract_number
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				contract.contractor?.first_name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				contract.contractor?.last_name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				contract.project?.name
					?.toLowerCase()
					.includes(searchQuery.toLowerCase());

			const matchesFilter =
				filterStatus === "all" ||
				(filterStatus === "active" &&
					getContractStatus(contract.end_date).label === "فعال") ||
				(filterStatus === "expired" &&
					getContractStatus(contract.end_date).label === "منقضی شده");

			return matchesSearch && matchesFilter;
		})
		.sort((a, b) => {
			let aValue = a[sortField];
			let bValue = b[sortField];

			if (typeof aValue === "string" && typeof bValue === "string") {
				return sortDirection === "asc"
					? aValue.localeCompare(bValue)
					: bValue.localeCompare(aValue);
			} else if (typeof aValue === "number" && typeof bValue === "number") {
				return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
			}

			return 0;
		});

	return (
		<div className={styles.PageContainer}>
			{/* Header */}
			<div className={styles.Header}>
				<div className={styles.HeaderLeft}>
					<div className={styles.TitleSection}>
						<div className={styles.TitleIcon}>
							<FileText size={28} />
						</div>
						<div>
							<h1 className={styles.PageTitle}>مدیریت قراردادها</h1>
							<p className={styles.PageSubtitle}>
								مشاهده، جستجو و مدیریت اطلاعات قراردادها
							</p>
						</div>
					</div>
				</div>

				<div className={styles.HeaderRight}>
					<button
						className={styles.AddButton}
						onClick={() => setFormName("new-contract")}
					>
						<Plus size={18} />
						قرارداد جدید
					</button>
					<button
						className={styles.RefreshButton}
						onClick={handleRetry}
						disabled={isContractPending}
					>
						<RefreshCw
							size={18}
							className={isContractPending ? styles.Spinning : ""}
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
						<FileText size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(stats.total)}
						</span>
						<span className={styles.StatLabel}>کل قراردادها</span>
					</div>
				</div>

				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
						}}
					>
						<TrendingUp size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{NumberConverter.formatCurrency(stats.totalBudget)}
						</span>
						<span className={styles.StatLabel}>جمع مبالغ</span>
					</div>
				</div>

				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
						}}
					>
						<Clock size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(stats.active)}
						</span>
						<span className={styles.StatLabel}>قراردادهای فعال</span>
					</div>
				</div>

				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
						}}
					>
						<BarChart3 size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{NumberConverter.formatCurrency(Math.round(stats.avgBudget))}
						</span>
						<span className={styles.StatLabel}>میانگین مبلغ</span>
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
							placeholder='جستجو بر اساس شماره قرارداد، پیمانکار یا پروژه...'
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
						<span>وضعیت:</span>
						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value as any)}
							className={styles.FilterSelect}
						>
							<option value='all'>همه</option>
							<option value='active'>فعال</option>
							<option value='expired'>منقضی شده</option>
						</select>
					</div>
				</div>
			</div>

			{/* Table Container */}
			<div className={styles.TableContainer}>
				<div className={styles.TableHeader}>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("contract_number")}
					>
						<div className={styles.HeaderCellContent}>
							<FileText size={14} />
							<span>شماره قرارداد</span>
							<SortIcon field='contract_number' />
						</div>
					</div>
					<div className={styles.TableHeaderCell}>
						<div className={styles.HeaderCellContent}>
							<User size={14} />
							<span>پیمانکار</span>
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("gross_budget")}
					>
						<div className={styles.HeaderCellContent}>
							<DollarSign size={14} />
							<span>مبلغ</span>
							<SortIcon field='gross_budget' />
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("insurance_rate")}
					>
						<div className={styles.HeaderCellContent}>
							<Percent size={14} />
							<span>بیمه</span>
							<SortIcon field='insurance_rate' />
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("performance_bond")}
					>
						<div className={styles.HeaderCellContent}>
							<Shield size={14} />
							<span>حسن انجام</span>
							<SortIcon field='performance_bond' />
						</div>
					</div>
					<div className={styles.TableHeaderCell}>
						<div className={styles.HeaderCellContent}>
							<Calendar size={14} />
							<span>تاریخ‌ها</span>
						</div>
					</div>
					<div className={styles.TableHeaderCell}>
						<div className={styles.HeaderCellContent}>
							<span>وضعیت</span>
						</div>
					</div>
					<div className={styles.TableHeaderCell}>
						<span>عملیات</span>
					</div>
				</div>

				{isContractPending ? (
					<div className={styles.LoadingState}>
						<Loader2
							className={styles.Spinner}
							size={32}
						/>
						<p>در حال دریافت لیست قراردادها...</p>
					</div>
				) : isContractError ? (
					<div className={styles.ErrorState}>
						<AlertCircle size={48} />
						<p>خطا در دریافت لیست قراردادها</p>
						<p className={styles.ErrorDetail}>{contractError?.message}</p>
						<button
							onClick={handleRetry}
							className={styles.RetryButton}
						>
							تلاش مجدد
						</button>
					</div>
				) : filteredAndSortedContracts.length === 0 ? (
					<div className={styles.EmptyState}>
						<FileText size={48} />
						<p>هیچ قراردادی یافت نشد</p>
						<p className={styles.EmptySubtext}>
							{searchQuery
								? "نتیجه‌ای برای جستجوی شما یافت نشد"
								: "هنوز قراردادی ثبت نشده است"}
						</p>
						<button
							onClick={() => setFormName("new-contract")}
							className={styles.AddEmptyButton}
						>
							<Plus size={18} />
							افزودن قرارداد جدید
						</button>
					</div>
				) : (
					<div className={styles.TableBody}>
						{filteredAndSortedContracts.map((contract) => {
							const status = getContractStatus(contract.end_date);
							const contractor = contract.contractor;

							return (
								<div
									key={contract.ID}
									className={styles.TableRow}
								>
									<div className={styles.TableCell}>
										<div className={styles.ContractNumber}>
											<span className={styles.ContractNumberText}>
												{toPersianDigits(contract.contract_number)}
											</span>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.ContractorInfo}>
											<div className={styles.ContractorName}>
												{contractor?.first_name} {contractor?.last_name}
											</div>
											<div className={styles.ContractorType}>
												{contractor?.legal_entity ? (
													<Building2
														size={12}
														// title='حقوقی'
													/>
												) : (
													<User
														size={12}
														// title='حقیقی'
													/>
												)}
											</div>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.ContractAmount}>
											<DollarSign size={14} />
											<span>
												{NumberConverter.formatCurrency(contract.gross_budget)}
											</span>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.RateBadge}>
											{toPersianDigits(contract.insurance_rate)}%
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.RateBadge}>
											{toPersianDigits(contract.performance_bond)}%
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.DateInfo}>
											<div className={styles.DateItem}>
												<Calendar size={12} />
												<span>{formatDate(contract.start_date)}</span>
											</div>
											<div className={styles.DateItem}>
												<CalendarCheck size={12} />
												<span>{formatDate(contract.end_date)}</span>
											</div>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div
											className={styles.StatusBadge}
											style={{
												color: status.color,
												backgroundColor: status.bg,
											}}
										>
											{status.label}
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.ActionButtons}>
											<button
												className={styles.ViewButton}
												onClick={() => handleViewDetails(contract)}
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
													handleDelete(contract.ID, contract.contract_number)
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
							);
						})}
					</div>
				)}

				{/* Table Footer */}
				{filteredAndSortedContracts.length > 0 && (
					<div className={styles.TableFooter}>
						<div className={styles.FooterInfo}>
							<span>
								نمایش {toPersianDigits(filteredAndSortedContracts.length)} از{" "}
								{toPersianDigits(enhancedContracts.length)} قرارداد
							</span>
							<span className={styles.FooterTotal}>
								جمع مبالغ:{" "}
								{NumberConverter.formatCurrency(
									filteredAndSortedContracts.reduce(
										(sum, c) => sum + c.gross_budget,
										0,
									),
								)}
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

			{/* Contract Details Modal */}
			{showDetails && selectedContract && (
				<div className={styles.DetailsModal}>
					<div className={styles.DetailsModalContent}>
						<div className={styles.DetailsModalHeader}>
							<h3>جزئیات قرارداد</h3>
							<button
								className={styles.CloseModalButton}
								onClick={() => setShowDetails(false)}
							>
								×
							</button>
						</div>
						<div className={styles.DetailsModalBody}>
							<div className={styles.DetailSection}>
								<h4 className={styles.SectionTitle}>مشخصات قرارداد</h4>
								<div className={styles.DetailGrid}>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>شماره قرارداد:</span>
										<span className={styles.DetailValue}>
											{toPersianDigits(selectedContract.contract_number)}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>مبلغ قرارداد:</span>
										<span className={styles.DetailValue}>
											{NumberConverter.formatCurrency(
												selectedContract.gross_budget,
											)}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>پیمانکار:</span>
										<span className={styles.DetailValue}>
											{selectedContract.contractor?.first_name}{" "}
											{selectedContract.contractor?.last_name}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>نوع پیمانکار:</span>
										<span
											className={`${styles.DetailValue} ${selectedContract.contractor?.legal_entity ? styles.Legal : styles.Natural}`}
										>
											{selectedContract.contractor?.legal_entity
												? "حقوقی"
												: "حقیقی"}
										</span>
									</div>
								</div>
							</div>

							<div className={styles.DetailSection}>
								<h4 className={styles.SectionTitle}>اطلاعات مالی</h4>
								<div className={styles.DetailGrid}>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>نرخ بیمه:</span>
										<span className={styles.DetailValue}>
											{toPersianDigits(selectedContract.insurance_rate)}%
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>حسن انجام کار:</span>
										<span className={styles.DetailValue}>
											{toPersianDigits(selectedContract.performance_bond)}%
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>
											مالیات ارزش افزوده:
										</span>
										<span className={styles.DetailValue}>
											{toPersianDigits(selectedContract.added_value_tax)}%
										</span>
									</div>
								</div>
							</div>

							<div className={styles.DetailSection}>
								<h4 className={styles.SectionTitle}>تاریخ‌ها</h4>
								<div className={styles.DetailGrid}>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>تاریخ شروع:</span>
										<span className={styles.DetailValue}>
											{formatDate(selectedContract.start_date)}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>تاریخ پایان:</span>
										<span className={styles.DetailValue}>
											{formatDate(selectedContract.end_date)}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>وضعیت:</span>
										<span
											className={styles.DetailValue}
											style={{
												color: getContractStatus(selectedContract.end_date)
													.color,
												backgroundColor: getContractStatus(
													selectedContract.end_date,
												).bg,
												padding: "4px 12px",
												borderRadius: "20px",
												fontSize: "13px",
												fontWeight: "600",
											}}
										>
											{getContractStatus(selectedContract.end_date).label}
										</span>
									</div>
								</div>
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
