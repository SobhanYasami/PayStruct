package model

import (
	"database/sql/driver"
)

type EmploymentType string

const (
	EmploymentOfficial    EmploymentType = "official"
	EmploymentContractual EmploymentType = "contractual"
)

func (t EmploymentType) Valid() bool {
	switch t {
	case EmploymentOfficial, EmploymentContractual:
		return true
	}
	return false
}

func (t *EmploymentType) Scan(v any) error {
	s, ok := v.(string)
	if !ok {
		return enumScanErr("EmploymentType", v)
	}
	cast := EmploymentType(s)
	if !cast.Valid() {
		return enumScanErr("EmploymentType", v)
	}
	*t = cast
	return nil
}

func (t EmploymentType) Value() (driver.Value, error) { return string(t), nil }

type Role string

const (
	// Head/signature roles — employees with these have signing authority; IsHead = true.
	RoleManager         Role = "manager"
	RoleFinanceHead     Role = "finance_head"
	RoleJuridicalHead   Role = "juridical_head"
	RoleEngineeringHead Role = "engineering_head"
	RoleSecurityHead    Role = "security_head" // optional department head

	// Regular operational roles.
	RoleAdmin       Role = "admin"
	RoleFinance     Role = "finance"
	RoleEngineering Role = "engineering"
	RoleSecurity    Role = "security"
)

func (r Role) Valid() bool {
	switch r {
	case RoleManager, RoleFinanceHead, RoleJuridicalHead, RoleEngineeringHead, RoleSecurityHead,
		RoleAdmin, RoleFinance, RoleEngineering, RoleSecurity:
		return true
	}
	return false
}

// IsHeadRole reports whether r carries signature / department-head authority.
func IsHeadRole(r Role) bool {
	switch r {
	case RoleManager, RoleFinanceHead, RoleJuridicalHead, RoleEngineeringHead, RoleSecurityHead:
		return true
	}
	return false
}

func HeadRoles() []Role {
	return []Role{RoleManager, RoleFinanceHead, RoleJuridicalHead, RoleEngineeringHead, RoleSecurityHead}
}

func AllRoles() []Role {
	return []Role{
		RoleManager, RoleFinanceHead, RoleJuridicalHead, RoleEngineeringHead, RoleSecurityHead,
		RoleAdmin, RoleFinance, RoleEngineering, RoleSecurity,
	}
}

type ProjectStatus string

const (
	ProjectPlanning  ProjectStatus = "planning"
	ProjectActive    ProjectStatus = "active"
	ProjectOnHold    ProjectStatus = "on_hold"
	ProjectCompleted ProjectStatus = "completed"
	ProjectCancelled ProjectStatus = "cancelled"
)

func (s ProjectStatus) Valid() bool {
	switch s {
	case ProjectPlanning, ProjectActive, ProjectOnHold, ProjectCompleted, ProjectCancelled:
		return true
	}
	return false
}

func (s *ProjectStatus) Scan(v any) error {
	str, ok := v.(string)
	if !ok {
		return enumScanErr("ProjectStatus", v)
	}
	cast := ProjectStatus(str)
	if !cast.Valid() {
		return enumScanErr("ProjectStatus", v)
	}
	*s = cast
	return nil
}

func (s ProjectStatus) Value() (driver.Value, error) { return string(s), nil }

type Priority string

const (
	PriorityLow      Priority = "low"
	PriorityMedium   Priority = "medium"
	PriorityHigh     Priority = "high"
	PriorityCritical Priority = "critical"
)

func (p Priority) Valid() bool {
	switch p {
	case PriorityLow, PriorityMedium, PriorityHigh, PriorityCritical:
		return true
	}
	return false
}

func (p *Priority) Scan(v any) error {
	str, ok := v.(string)
	if !ok {
		return enumScanErr("Priority", v)
	}
	cast := Priority(str)
	if !cast.Valid() {
		return enumScanErr("Priority", v)
	}
	*p = cast
	return nil
}

func (p Priority) Value() (driver.Value, error) { return string(p), nil }

type ContractStatus string

const (
	ContractDraft              ContractStatus = "draft"
	ContractPendingEngineering ContractStatus = "pending_engineering"
	ContractPendingFinance     ContractStatus = "pending_finance"
	ContractPendingLegal       ContractStatus = "pending_legal"
	ContractPendingCEO         ContractStatus = "pending_ceo"
	ContractReadyToPrint       ContractStatus = "ready_to_print"
	ContractSigned             ContractStatus = "signed"
	ContractActive             ContractStatus = "active"
	ContractClosed             ContractStatus = "closed"
	ContractCancelled          ContractStatus = "cancelled"
)

func (s ContractStatus) Valid() bool {
	switch s {
	case ContractDraft, ContractPendingEngineering, ContractPendingFinance,
		ContractPendingLegal, ContractPendingCEO, ContractReadyToPrint,
		ContractSigned, ContractActive, ContractClosed, ContractCancelled:
		return true
	}
	return false
}

func (s *ContractStatus) Scan(v any) error {
	str, ok := v.(string)
	if !ok {
		return enumScanErr("ContractStatus", v)
	}
	cast := ContractStatus(str)
	if !cast.Valid() {
		return enumScanErr("ContractStatus", v)
	}
	*s = cast
	return nil
}

func (s ContractStatus) Value() (driver.Value, error) { return string(s), nil }

type ContractType string

const (
	// Payment-based types
	ContractLumpSum      ContractType = "lump_sum"       // مقطوع
	ContractUnitRate     ContractType = "unit_rate"       // فهرست‌بها
	ContractCostPlus     ContractType = "cost_plus"       // امانی
	ContractTimeMaterial ContractType = "time_material"   // legacy — kept for existing rows

	// Execution / management types
	ContractConstructionManagement ContractType = "construction_management" // مدیریت پیمان
	ContractDesignBidBuild         ContractType = "design_bid_build"        // طراحی-مناقصه-ساخت
	ContractDesignBuild            ContractType = "design_build"            // طراحی-ساخت / EPC

	// Work delegation types
	ContractLaborOnly   ContractType = "labor_only"  // پیمانکاری دستمزدی
	ContractTurnkey     ContractType = "turnkey"     // کلید در دست
	ContractPercentage  ContractType = "percentage"  // پیمانکاری درصدی
)

func (t ContractType) Valid() bool {
	switch t {
	case ContractLumpSum, ContractUnitRate, ContractCostPlus, ContractTimeMaterial,
		ContractConstructionManagement, ContractDesignBidBuild, ContractDesignBuild,
		ContractLaborOnly, ContractTurnkey, ContractPercentage:
		return true
	}
	return false
}

func (t *ContractType) Scan(v any) error {
	str, ok := v.(string)
	if !ok {
		return enumScanErr("ContractType", v)
	}
	cast := ContractType(str)
	if !cast.Valid() {
		return enumScanErr("ContractType", v)
	}
	*t = cast
	return nil
}

func (t ContractType) Value() (driver.Value, error) { return string(t), nil }

// StatementStatus tracks the 5-stage approval workflow for InterimStatement.
type StatementStatus string

const (
	StatementDraft          StatementStatus = "draft"
	StatementSubmitted      StatementStatus = "submitted"
	StatementFinanceReview  StatementStatus = "finance_review"
	StatementPMReview       StatementStatus = "pm_review"
	StatementDirectorReview StatementStatus = "director_review"
	StatementApproved       StatementStatus = "approved"
	StatementRejected       StatementStatus = "rejected"
)

func (s StatementStatus) Valid() bool {
	switch s {
	case StatementDraft, StatementSubmitted, StatementFinanceReview,
		StatementPMReview, StatementDirectorReview, StatementApproved, StatementRejected:
		return true
	}
	return false
}

func (s *StatementStatus) Scan(v any) error {
	str, ok := v.(string)
	if !ok {
		return enumScanErr("StatementStatus", v)
	}
	cast := StatementStatus(str)
	if !cast.Valid() {
		return enumScanErr("StatementStatus", v)
	}
	*s = cast
	return nil
}

func (s StatementStatus) Value() (driver.Value, error) { return string(s), nil }

type RetentionType string

const (
	RetentionPerformanceBond  RetentionType = "performance_bond"
	RetentionDefectLiability  RetentionType = "defect_liability"
)

func (t RetentionType) Valid() bool {
	switch t {
	case RetentionPerformanceBond, RetentionDefectLiability:
		return true
	}
	return false
}

type AdvanceRecordType string

const (
	AdvancePayment  AdvanceRecordType = "advance"
	AdvanceRecovery AdvanceRecordType = "recovery"
)

func (t AdvanceRecordType) Valid() bool {
	switch t {
	case AdvancePayment, AdvanceRecovery:
		return true
	}
	return false
}

type LDType string

const (
	LDDelay       LDType = "delay"
	LDPerformance LDType = "performance"
	LDOther       LDType = "other"
)

func (t LDType) Valid() bool {
	switch t {
	case LDDelay, LDPerformance, LDOther:
		return true
	}
	return false
}
