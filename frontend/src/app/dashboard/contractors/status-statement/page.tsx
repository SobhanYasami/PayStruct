"use client";

import { useState } from "react";
import { useDashboard } from "@/providers/context/DashboardContext";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
	Search,
	Filter,
	Receipt,
	TrendingUp,
	Calendar,
	DollarSign,
	Building2,
	User,
	FileText,
	Download,
	Eye,
	Edit3,
	Trash2,
	MoreVertical,
	ChevronDown,
	ChevronUp,
	AlertCircle,
	Loader2,
	RefreshCw,
	Plus,
	BarChart3,
	CheckCircle,
	Clock,
	XCircle,
	Percent,
	Hash,
	Printer,
	Share2,
} from "lucide-react";

import styles from "./page.module.css";
import { toPersianDigits } from "@/utils/PersianNumberCoverter";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STATUS_STATEMENT_URL = `${API_URL}/management/contracts/status-statement/`;
const CONTRACTOR_URL = `${API_URL}/management/contractors/`;

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
	statement_date_start: string;
	statement_date_end: string;
	status: "pending" | "approved" | "rejected" | "paid";
	number: number;
	contract_number: string;
	total_amount: number;
	project_name: string;
	contractor?: Contractor;
	created_at?: string;
	updated_at?: string;
};

async function getAllStatusStatements(): Promise<StatusStatement[]> {
	const token = localStorage.getItem("usr-token");
	if (!token) {
		throw new Error("Unauthorized");
	}

	const res = await fetch(`${STATUS_STATEMENT_URL}`, {
		method: "GET",
		headers: {
			Authorization: `bearer ${token}`,
		},
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.message || "Failed to fetch status statements");
	}

	const data = await res.json();
	return data.data || [];
}

export default function StatusStatementsPage() {
	const { isPopOpen, setIsPopOpen, formName, setFormName } = useDashboard();
	const [searchQuery, setSearchQuery] = useState("");
	const [filterStatus, setFilterStatus] = useState<
		"all" | "pending" | "approved" | "rejected" | "paid"
	>("all");
	const [sortField, setSortField] = useState<keyof StatusStatement>("number");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [selectedStatement, setSelectedStatement] =
		useState<StatusStatement | null>(null);
	const [showDetails, setShowDetails] = useState(false);

	const {
		data: statements,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery<StatusStatement[]>({
		queryKey: ["status-statements"],
		queryFn: getAllStatusStatements,
		retry: 1,
	});

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		refetch();
	};

	const handleSort = (field: keyof StatusStatement) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
	};

	const handleRetry = () => {
		refetch();
	};

	const handleDelete = async (id: string, number: number) => {
		if (
			!confirm(
				`آیا از حذف صورت وضعیت شماره ${toPersianDigits(number)} اطمینان دارید؟`,
			)
		) {
			return;
		}

		try {
			const token = localStorage.getItem("usr-token");
			const res = await fetch(`${STATUS_STATEMENT_URL}${id}`, {
				method: "DELETE",
				headers: {
					Authorization: `bearer ${token}`,
				},
			});

			if (!res.ok) {
				throw new Error("Failed to delete status statement");
			}

			toast.success("صورت وضعیت با موفقیت حذف شد");
			refetch();
		} catch (error) {
			toast.error("خطا در حذف صورت وضعیت");
			console.error(error);
		}
	};

	const handleViewDetails = (statement: StatusStatement) => {
		setSelectedStatement(statement);
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

	const getStatusInfo = (status: StatusStatement["status"]) => {
		switch (status) {
			case "pending":
				return {
					label: "در انتظار تایید",
					color: "#f59e0b",
					bg: "#fffbeb",
					icon: <Clock size={14} />,
				};
			case "approved":
				return {
					label: "تایید شده",
					color: "#10b981",
					bg: "#f0fdf4",
					icon: <CheckCircle size={14} />,
				};
			case "rejected":
				return {
					label: "رد شده",
					color: "#ef4444",
					bg: "#fef2f2",
					icon: <XCircle size={14} />,
				};
			case "paid":
				return {
					label: "پرداخت شده",
					color: "#8b5cf6",
					bg: "#f5f3ff",
					icon: <DollarSign size={14} />,
				};
			default:
				return {
					label: "نامشخص",
					color: "#64748b",
					bg: "#f8fafc",
					icon: <AlertCircle size={14} />,
				};
		}
	};

	const calculateStats = () => {
		if (!statements)
			return {
				total: 0,
				pending: 0,
				approved: 0,
				rejected: 0,
				paid: 0,
				totalAmount: 0,
			};

		let totalAmount = 0;
		const stats = {
			total: statements.length,
			pending: statements.filter((s) => s.status === "pending").length,
			approved: statements.filter((s) => s.status === "approved").length,
			rejected: statements.filter((s) => s.status === "rejected").length,
			paid: statements.filter((s) => s.status === "paid").length,
			totalAmount: 0,
		};

		statements.forEach((statement) => {
			totalAmount += statement.total_amount || 0;
		});

		stats.totalAmount = totalAmount;
		return stats;
	};

	const SortIcon = ({ field }: { field: keyof StatusStatement }) => {
		if (sortField !== field) return null;
		return sortDirection === "asc" ? (
			<ChevronUp size={14} />
		) : (
			<ChevronDown size={14} />
		);
	};

	// Filter and sort statements
	const filteredAndSortedStatements =
		statements
			?.filter((statement) => {
				const matchesSearch =
					searchQuery === "" ||
					statement.number.toString().includes(searchQuery) ||
					statement.contract_number
						?.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					statement.project_name
						?.toLowerCase()
						.includes(searchQuery.toLowerCase());

				const matchesFilter =
					filterStatus === "all" || statement.status === filterStatus;

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
			}) || [];

	const stats = calculateStats();

	return (
		<div className={styles.PageContainer}>
			{/* Header */}
			<div className={styles.Header}>
				<div className={styles.HeaderLeft}>
					<div className={styles.TitleSection}>
						<div className={styles.TitleIcon}>
							<Receipt size={28} />
						</div>
						<div>
							<h1 className={styles.PageTitle}>مدیریت صورت وضعیت‌ها</h1>
							<p className={styles.PageSubtitle}>
								مشاهده، جستجو و مدیریت صورت وضعیت‌های صادر شده
							</p>
						</div>
					</div>
				</div>

				<div className={styles.HeaderRight}>
					<button
						className={styles.AddButton}
						onClick={() => setFormName("new-status-sttmnt")}
					>
						<Plus size={18} />
						صورت وضعیت جدید
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
						<Receipt size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(stats.total)}
						</span>
						<span className={styles.StatLabel}>کل صورت وضعیت‌ها</span>
					</div>
				</div>

				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
						}}
					>
						<Clock size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(stats.pending)}
						</span>
						<span className={styles.StatLabel}>در انتظار تایید</span>
					</div>
				</div>

				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
						}}
					>
						<CheckCircle size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(stats.approved)}
						</span>
						<span className={styles.StatLabel}>تایید شده</span>
					</div>
				</div>

				<div className={styles.StatCard}>
					<div
						className={styles.StatIcon}
						style={{
							background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
						}}
					>
						<DollarSign size={20} />
					</div>
					<div className={styles.StatContent}>
						<span className={styles.StatValue}>
							{toPersianDigits(Math.round(stats.totalAmount / 1000000))}M
						</span>
						<span className={styles.StatLabel}>جمع مبالغ (میلیون ریال)</span>
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
							placeholder='جستجو بر اساس شماره صورت وضعیت، شماره قرارداد یا نام پروژه...'
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
							<option value='pending'>در انتظار تایید</option>
							<option value='approved'>تایید شده</option>
							<option value='rejected'>رد شده</option>
							<option value='paid'>پرداخت شده</option>
						</select>
					</div>
				</div>
			</div>

			{/* Table Container */}
			<div className={styles.TableContainer}>
				<div className={styles.TableHeader}>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("number")}
					>
						<div className={styles.HeaderCellContent}>
							<Hash size={14} />
							<span>شماره</span>
							<SortIcon field='number' />
						</div>
					</div>
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
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("project_name")}
					>
						<div className={styles.HeaderCellContent}>
							<Building2 size={14} />
							<span>پروژه</span>
							<SortIcon field='project_name' />
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("progress_percent")}
					>
						<div className={styles.HeaderCellContent}>
							<Percent size={14} />
							<span>پیشرفت</span>
							<SortIcon field='progress_percent' />
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("total_amount")}
					>
						<div className={styles.HeaderCellContent}>
							<DollarSign size={14} />
							<span>مبلغ</span>
							<SortIcon field='total_amount' />
						</div>
					</div>
					<div
						className={styles.TableHeaderCell}
						onClick={() => handleSort("statement_date_start")}
					>
						<div className={styles.HeaderCellContent}>
							<Calendar size={14} />
							<span>تاریخ</span>
							<SortIcon field='statement_date_start' />
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

				{isLoading ? (
					<div className={styles.LoadingState}>
						<Loader2
							className={styles.Spinner}
							size={32}
						/>
						<p>در حال دریافت لیست صورت وضعیت‌ها...</p>
					</div>
				) : isError ? (
					<div className={styles.ErrorState}>
						<AlertCircle size={48} />
						<p>خطا در دریافت لیست صورت وضعیت‌ها</p>
						<p className={styles.ErrorDetail}>{error?.message}</p>
						<button
							onClick={handleRetry}
							className={styles.RetryButton}
						>
							تلاش مجدد
						</button>
					</div>
				) : filteredAndSortedStatements.length === 0 ? (
					<div className={styles.EmptyState}>
						<Receipt size={48} />
						<p>هیچ صورت وضعیتی یافت نشد</p>
						<p className={styles.EmptySubtext}>
							{searchQuery
								? "نتیجه‌ای برای جستجوی شما یافت نشد"
								: "هنوز صورت وضعیتی ثبت نشده است"}
						</p>
						<button
							onClick={() => setFormName("new-status-sttmnt")}
							className={styles.AddEmptyButton}
						>
							<Plus size={18} />
							ایجاد صورت وضعیت جدید
						</button>
					</div>
				) : (
					<div className={styles.TableBody}>
						{filteredAndSortedStatements.map((statement) => {
							const statusInfo = getStatusInfo(statement.status);

							return (
								<div
									key={statement.ID}
									className={styles.TableRow}
								>
									<div className={styles.TableCell}>
										<div className={styles.StatementNumber}>
											<Hash size={14} />
											<span className={styles.NumberText}>
												{toPersianDigits(statement.number)}
											</span>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.ContractNumber}>
											<FileText size={14} />
											<span>{statement.contract_number || "---"}</span>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.ProjectInfo}>
											<Building2 size={14} />
											<span className={styles.ProjectName}>
												{statement.project_name || "---"}
											</span>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.ProgressContainer}>
											<div className={styles.ProgressTrack}>
												<div
													className={styles.ProgressFill}
													style={{
														width: `${statement.progress_percent || 0}%`,
													}}
												/>
											</div>
											<span className={styles.ProgressText}>
												{toPersianDigits(statement.progress_percent || 0)}%
											</span>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.Amount}>
											<DollarSign size={14} />
											<span>
												{toPersianDigits(
													(statement.total_amount || 0).toLocaleString(),
												)}{" "}
												ریال
											</span>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.DateInfo}>
											<div className={styles.DateItem}>
												<Calendar size={12} />
												<span>
													{formatDate(statement.statement_date_start)}
												</span>
											</div>
											<div className={styles.DateItem}>
												<span>تا</span>
												<span>{formatDate(statement.statement_date_end)}</span>
											</div>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div
											className={styles.StatusBadge}
											style={{
												color: statusInfo.color,
												backgroundColor: statusInfo.bg,
											}}
										>
											{statusInfo.icon}
											<span>{statusInfo.label}</span>
										</div>
									</div>

									<div className={styles.TableCell}>
										<div className={styles.ActionButtons}>
											<button
												className={styles.ViewButton}
												onClick={() => handleViewDetails(statement)}
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
													handleDelete(statement.ID, statement.number)
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
				{filteredAndSortedStatements.length > 0 && (
					<div className={styles.TableFooter}>
						<div className={styles.FooterInfo}>
							<span>
								نمایش {toPersianDigits(filteredAndSortedStatements.length)} از{" "}
								{toPersianDigits(statements?.length || 0)} صورت وضعیت
							</span>
							<span className={styles.FooterTotal}>
								جمع مبالغ:{" "}
								{toPersianDigits(
									filteredAndSortedStatements
										.reduce((sum, s) => sum + (s.total_amount || 0), 0)
										.toLocaleString(),
								)}{" "}
								ریال
							</span>
						</div>
						<div className={styles.FooterActions}>
							<button className={styles.PrintButton}>
								<Printer size={16} />
								چاپ گزارش
							</button>
							<button className={styles.ExportButton}>
								<Download size={16} />
								خروجی Excel
							</button>
							<button className={styles.ShareButton}>
								<Share2 size={16} />
								اشتراک گذاری
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Status Statement Details Modal */}
			{showDetails && selectedStatement && (
				<div className={styles.DetailsModal}>
					<div className={styles.DetailsModalContent}>
						<div className={styles.DetailsModalHeader}>
							<h3>جزئیات صورت وضعیت</h3>
							<button
								className={styles.CloseModalButton}
								onClick={() => setShowDetails(false)}
							>
								×
							</button>
						</div>
						<div className={styles.DetailsModalBody}>
							<div className={styles.DetailSection}>
								<h4 className={styles.SectionTitle}>مشخصات صورت وضعیت</h4>
								<div className={styles.DetailGrid}>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>
											شماره صورت وضعیت:
										</span>
										<span className={styles.DetailValue}>
											{toPersianDigits(selectedStatement.number)}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>شماره قرارداد:</span>
										<span className={styles.DetailValue}>
											{selectedStatement.contract_number || "---"}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>نام پروژه:</span>
										<span className={styles.DetailValue}>
											{selectedStatement.project_name || "---"}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>مبلغ صورت وضعیت:</span>
										<span className={styles.DetailValue}>
											{toPersianDigits(
												(selectedStatement.total_amount || 0).toLocaleString(),
											)}{" "}
											ریال
										</span>
									</div>
								</div>
							</div>

							<div className={styles.DetailSection}>
								<h4 className={styles.SectionTitle}>وضعیت و پیشرفت</h4>
								<div className={styles.DetailGrid}>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>درصد پیشرفت:</span>
										<div className={styles.ProgressDetail}>
											<div className={styles.ProgressTrack}>
												<div
													className={styles.ProgressFill}
													style={{
														width: `${selectedStatement.progress_percent || 0}%`,
													}}
												/>
											</div>
											<span className={styles.ProgressText}>
												{toPersianDigits(
													selectedStatement.progress_percent || 0,
												)}
												%
											</span>
										</div>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>وضعیت:</span>
										<span
											className={styles.DetailValue}
											style={{
												color: getStatusInfo(selectedStatement.status).color,
												backgroundColor: getStatusInfo(selectedStatement.status)
													.bg,
												padding: "6px 12px",
												borderRadius: "20px",
												fontSize: "13px",
												fontWeight: "600",
												display: "inline-flex",
												alignItems: "center",
												gap: "6px",
											}}
										>
											{getStatusInfo(selectedStatement.status).icon}
											{getStatusInfo(selectedStatement.status).label}
										</span>
									</div>
								</div>
							</div>

							<div className={styles.DetailSection}>
								<h4 className={styles.SectionTitle}>تاریخ‌ها</h4>
								<div className={styles.DetailGrid}>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>تاریخ شروع دوره:</span>
										<span className={styles.DetailValue}>
											{formatDate(selectedStatement.statement_date_start)}
										</span>
									</div>
									<div className={styles.DetailItem}>
										<span className={styles.DetailLabel}>
											تاریخ پایان دوره:
										</span>
										<span className={styles.DetailValue}>
											{formatDate(selectedStatement.statement_date_end)}
										</span>
									</div>
								</div>
							</div>
						</div>
						<div className={styles.DetailsModalFooter}>
							<div className={styles.ModalActions}>
								<button className={styles.PrintModalButton}>
									<Printer size={16} />
									چاپ صورت وضعیت
								</button>
								<button className={styles.DownloadModalButton}>
									<Download size={16} />
									دانلود PDF
								</button>
								<button
									className={styles.CloseDetailsButton}
									onClick={() => setShowDetails(false)}
								>
									بستن
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
