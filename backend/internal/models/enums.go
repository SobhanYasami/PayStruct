package model

import (
	"database/sql/driver"
)

// EmploymentType is the disjoint specialization on Employee per the EER:
// every employee is either Official or Contractual, never both.
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

// Role is the overlapping specialization on Employee. Stored as TEXT[] on
// the row; an employee can hold zero or more concurrently (the EER's "O"
// circle = overlap, with no totality constraint).
type Role string

const (
	RoleManager     Role = "manager"
	RoleJuridical   Role = "juridical"
	RoleFinancial   Role = "financial"
	RoleEngineering Role = "engineering"
	RoleSecurity    Role = "security"
)

func (r Role) Valid() bool {
	switch r {
	case RoleManager, RoleJuridical, RoleFinancial, RoleEngineering, RoleSecurity:
		return true
	}
	return false
}

// AllRoles returns every defined role. Useful for admin UIs and validation.
func AllRoles() []Role {
	return []Role{
		RoleManager, RoleJuridical, RoleFinancial, RoleEngineering, RoleSecurity,
	}
}

// ProjectStatus mirrors the lifecycle described in ProjectPageFeatures.md.
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
	ContractDraft     ContractStatus = "draft"
	ContractSigned    ContractStatus = "signed"
	ContractActive    ContractStatus = "active"
	ContractClosed    ContractStatus = "closed"
	ContractCancelled ContractStatus = "cancelled"
)

func (s ContractStatus) Valid() bool {
	switch s {
	case ContractDraft, ContractSigned, ContractActive, ContractClosed, ContractCancelled:
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

// StatementStatus tracks the Status Statement document workflow.
type StatementStatus string

const (
	StatementDraft     StatementStatus = "draft"
	StatementSubmitted StatementStatus = "submitted"
	StatementApproved  StatementStatus = "approved"
	StatementRejected  StatementStatus = "rejected"
	StatementPaid      StatementStatus = "paid"
)

func (s StatementStatus) Valid() bool {
	switch s {
	case StatementDraft, StatementSubmitted, StatementApproved, StatementRejected, StatementPaid:
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

// DeductionKind classifies a deduction line (tax, retention, penalty, …).
// Kept open-ended (string) rather than an enum because each tenant's tax
// regime introduces its own categories — but pin the common ones as
// constants for type-safe use in code.
type DeductionKind string

const (
	DeductionTax       DeductionKind = "tax"
	DeductionRetention DeductionKind = "retention"
	DeductionPenalty   DeductionKind = "penalty"
	DeductionAdvance   DeductionKind = "advance"
	DeductionInsurance DeductionKind = "insurance"
	DeductionOther     DeductionKind = "other"
)
