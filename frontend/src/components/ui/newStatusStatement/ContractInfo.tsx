// Updated ContractInformation.tsx:
import { toPersianDigits } from "@/utils/PersianNumberCoverter";
import styles from "./ContractInfo.module.css";
import {
	Building2,
	User,
	Hash,
	DollarSign,
	FolderOpen,
	TrendingUp,
	FileText,
	Calendar,
	Percent,
} from "lucide-react";

export default function ContractInformation({
	first_name,
	last_name,
	legal_entity,
	preferential_id,
	national_id,
	project_name,
	project_phase,
}: {
	first_name: string;
	last_name: string;
	legal_entity: boolean;
	preferential_id: string;
	national_id: string;
	project_name: string;
	project_phase: number;
}) {
	return (
		<div className={styles.Container}>
			<div className={styles.SectionHeader}>
				<FileText size={20} />
				<span>اطلاعات قرارداد</span>
			</div>

			<div className={styles.InfoGrid}>
				<div className={styles.InfoCard}>
					<div className={styles.InfoCardHeader}>
						<div
							className={styles.InfoIcon}
							style={{
								background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
							}}
						>
							{legal_entity ? <Building2 size={18} /> : <User size={18} />}
						</div>
						<h4 className={styles.InfoTitle}>پیمانکار</h4>
					</div>
					<div className={styles.InfoContent}>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>نوع:</span>
							<span
								className={`${styles.InfoValue} ${legal_entity ? styles.Legal : styles.Natural}`}
							>
								{legal_entity ? "حقوقی" : "حقیقی"}
							</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>نام کامل:</span>
							<span className={styles.InfoValue}>
								{first_name} {last_name}
							</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>شناسه ملی:</span>
							<span className={styles.InfoValue}>
								{toPersianDigits(national_id)}
							</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>شناسه تفضیلی:</span>
							<span className={styles.InfoValue}>
								{preferential_id ? toPersianDigits(preferential_id) : "---"}
							</span>
						</div>
					</div>
				</div>

				<div className={styles.InfoCard}>
					<div className={styles.InfoCardHeader}>
						<div
							className={styles.InfoIcon}
							style={{
								background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
							}}
						>
							<FolderOpen size={18} />
						</div>
						<h4 className={styles.InfoTitle}>پروژه</h4>
					</div>
					<div className={styles.InfoContent}>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>نام پروژه:</span>
							<span className={styles.InfoValue}>{project_name}</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>فاز:</span>
							<span className={styles.InfoValue}>
								{toPersianDigits(project_phase)}
							</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>مبلغ قرارداد:</span>
							<span className={styles.InfoValue}>
								{toPersianDigits("0")} ریال
							</span>
						</div>
					</div>
				</div>

				<div className={styles.InfoCard}>
					<div className={styles.InfoCardHeader}>
						<div
							className={styles.InfoIcon}
							style={{
								background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
							}}
						>
							<TrendingUp size={18} />
						</div>
						<h4 className={styles.InfoTitle}>آمار صورتحساب</h4>
					</div>
					<div className={styles.InfoContent}>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>تعداد صورت وضعیت‌ها:</span>
							<span className={styles.InfoValue}>{toPersianDigits(0)}</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>آخرین پیشرفت فیزیکی:</span>
							<span className={styles.InfoValue}>{toPersianDigits(0)}%</span>
						</div>
						<div className={styles.InfoItem}>
							<span className={styles.InfoLabel}>میانگین پیشرفت ماهانه:</span>
							<span className={styles.InfoValue}>{toPersianDigits(0)}%</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
