package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ! =====================================================================================================
// ! BaseModel contains common fields for all models
// ! ----------------------------
type BaseModel struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	CreatedBy *uuid.UUID `gorm:"type:uuid;index"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid;index"`
	DeletedBy *uuid.UUID `gorm:"type:uuid;index"`
}

// BeforeCreate hook for BaseModel
func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		b.ID = id
	}
	return nil
}

// ! ======================================================================================================
// ! Project Model
// ! ----------------------------
type ProjectPhase uint8

const (
	PhasePlanning         ProjectPhase = 0
	PhaseConceptualDesign ProjectPhase = 1
	PhaseDetailedDesign   ProjectPhase = 2
	PhaseConstruction     ProjectPhase = 3
	PhaseCommissioning    ProjectPhase = 4
)

type Project struct {
	BaseModel
	Name  string       `gorm:"size:100;not null;uniqueIndex:idx_company_project_name"`
	Phase ProjectPhase `gorm:"not null;default:0"`

	CompanyID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_company_project_name"`
	Company   Company   `gorm:"constraint:OnDelete:CASCADE;"`
}

// ! ================================================================================================================
// ! ContractorProject Model - represents Projects assigned to Contractors
// ! ----------------------------
type ContractorProject struct {
	ContractorID uuid.UUID `json:"contractor_id" gorm:"type:uuid;primaryKey"`
	ProjectID    uuid.UUID `json:"project_id" gorm:"type:uuid;primaryKey"`

	Contractor Contractor `gorm:"foreignKey:ContractorID;constraint:OnDelete:CASCADE;"`
	Project    Project    `gorm:"foreignKey:ProjectID;constraint:OnDelete:CASCADE;"`
}

// ! ====================================================================================================
// ! Contract Model
// ! ----------------------------
type Contract struct {
	BaseModel

	ContractNumber string          `gorm:"size:100;not null;uniqueIndex:idx_company_contract_number"`
	GrossBudget    decimal.Decimal `gorm:"type:decimal(18,2);not null"`

	StartDate time.Time `gorm:"not null;index"`
	EndDate   time.Time `gorm:"not null;index"`

	InsuranceRate   decimal.Decimal `gorm:"type:decimal(4,2)"`
	PerformanceBond decimal.Decimal `gorm:"type:decimal(4,2)"`
	AddedValueTax   decimal.Decimal `gorm:"type:decimal(4,2)"`

	ScannedFileURL string `gorm:"size:500"`

	CompanyID    uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_company_contract_number"`
	Company      Company    `gorm:"constraint:OnDelete:CASCADE;"`
	ContractorID uuid.UUID  `gorm:"type:uuid;not null;index"`
	Contractor   Contractor `gorm:"constraint:OnDelete:CASCADE;"`
	ProjectID    uuid.UUID  `gorm:"type:uuid;not null;index"`
	Project      Project    `gorm:"constraint:OnDelete:CASCADE;"`
}

// ! ==============================================================================================================
// ! ContractWBS Model - represents Work Breakdown Structure
// ! ----------------------------

type ItemDetails struct {
	Description string          `json:"description" gorm:"type:varchar(500);not null"`
	Unit        string          `json:"unit" gorm:"size:100;not null"`
	Quantity    decimal.Decimal `json:"quantity" gorm:"type:decimal(22,4);not null"`
	UnitPrice   decimal.Decimal `json:"unit_price" gorm:"type:decimal(22,4);not null"`
	TotalPrice  decimal.Decimal `json:"total_price" gorm:"type:decimal(22,2);not null"`
}

func (it *ItemDetails) BeforeSave(tx *gorm.DB) error {
	it.TotalPrice = it.Quantity.Mul(it.UnitPrice)
	return nil
}

type WBS struct {
	BaseModel
	ContractID uuid.UUID `json:"contract_id" gorm:"type:uuid;not null;index"`
	Contract   Contract  `gorm:"constraint:OnDelete:CASCADE;"`

	ItemDetails
}

// ! =================================================================================================================
// ! StatusStatement Model - represents progress status statements for contracts
// ! ----------------------------
type StatementStatus string

const (
	StatusDraft     StatementStatus = "draft"
	StatusSubmitted StatementStatus = "submitted"
	StatusApproved  StatementStatus = "approved"
	StatusRejected  StatementStatus = "rejected"
)

type StatusStatement struct {
	BaseModel
	ContractID uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:idx_contract_statement_number"`
	Contract   Contract  `gorm:"constraint:OnDelete:CASCADE;"`

	ProgressPercent    decimal.Decimal `json:"progress_percent" gorm:"type:decimal(5,2)"`
	StatementDateStart time.Time       `json:"statement_date_start" gorm:"not null"`
	StatementDateEnd   time.Time       `json:"statement_date_end" gorm:"not null"`
	Status             StatementStatus `gorm:"type:varchar(20);not null;index"`
	Number             uint16          `gorm:"not null;uniqueIndex:idx_contract_statement_number"`
	ApprovedByID       *uuid.UUID      `gorm:"type:uuid;index"`
	ApprovedAt         *time.Time
}

// ! ============
// ! Performed tasks
// ! -----------------------
type TasksPerformed struct {
	BaseModel
	StatusStatementID uuid.UUID       `gorm:"type:uuid;not null;index"`
	StatusStatement   StatusStatement `gorm:"foreignKey:StatusStatementID;constraint:OnDelete:CASCADE;"`

	ItemDetails
}

// ! ============
// ! Extra Performed tasks
// ! -----------------------
type ExtraTasksPerformed struct {
	BaseModel
	StatusStatementID uuid.UUID       `gorm:"type:uuid;not null;index"`
	StatusStatement   StatusStatement `gorm:"foreignKey:StatusStatementID;constraint:OnDelete:CASCADE;"`

	ItemDetails
}

// ! ============
// ! Deductions and Penalties
// ! -----------------------
type Deductions struct {
	BaseModel
	StatusStatementID uuid.UUID       `gorm:"type:uuid;not null;index"`
	StatusStatement   StatusStatement `gorm:"foreignKey:StatusStatementID;constraint:OnDelete:CASCADE;"`

	ItemDetails
}
