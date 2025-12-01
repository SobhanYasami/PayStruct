package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	CreatedBy uuid.UUID `json:"created_by,omitempty" gorm:"type:char(36);index"`
	UpdatedBy uuid.UUID `json:"updated_by,omitempty" gorm:"type:char(36)"`
	DeletedBy uuid.UUID `json:"deleted_by,omitempty" gorm:"type:char(36)"`

	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:""`
}

func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// > ----------------------    ###############################    -----------------------------------  //>
type Project struct {
	BaseModel
	Name  string `json:"name" gorm:"size:100;not null;index:idx_project_name"`
	Phase uint8  `json:"phase" gorm:"not null;default:0"`
}

type Contract struct {
	BaseModel
	ContractorID uuid.UUID `json:"contractor_id" gorm:"type:char(36);not null;index"`
	ProjectID    uuid.UUID `json:"project_id" gorm:"type:char(36);not null;index"`

	ContractNo      string    `json:"contract_no" gorm:"size:100;not null;uniqueIndex"`
	GrossBudget     float32   `json:"gross_budget" gorm:"type:decimal(18,2);not null"`
	StartDate       time.Time `json:"start_date" gorm:"not null;index"`
	Duration        uint16    `json:"duration" gorm:"not null;comment:Duration in days"`
	EndDate         time.Time `json:"end_date" gorm:"not null;index"`
	InsuranceRate   float32   `json:"insurance_rate" gorm:"type:decimal(4,2)"`
	PerformanceBond float32   `json:"performance_bond" gorm:"type:decimal(4,2)"`
	AddedValueTax   float32   `json:"added_value_tax" gorm:"type:decimal(4,2)"`
	ScanedFileUrl   string    `json:"scanfile_url"`
}

type ContractWBS struct {
	BaseModel
	ContractorID uuid.UUID `json:"contractor_id" gorm:"type:char(36);not null;index"`
	ProjectID    uuid.UUID `json:"project_id" gorm:"type:char(36);not null;index"`

	Description string  `json:"description" gorm:"type:varchar(500);not null"`
	Unit        string  `json:"unit" gorm:"size:100;not null"`
	Quantity    float64 `json:"quantity" gorm:"type:decimal(20,2);not null"`
	UnitPrice   float64 `json:"unit_price" gorm:"type:decimal(30,2);not null"`
	TotalPrice  float64 `json:"total_price" gorm:"type:decimal(40,2);not null"`
}

// **
// *
// todo  /> ######################## |>

// ! Many-to-Many Relationships
type ContractorProject struct {
	BaseModel
	ContractorID uuid.UUID `json:"contractor_id" gorm:"type:char(36);not null;index"`
	ProjectID    uuid.UUID `json:"project_id" gorm:"type:char(36);not null;index"`
}

// ! Many-to-One Relationships
type StatusStatement struct {
	BaseModel
	ContractorID uuid.UUID `json:"contractor_id" gorm:"type:char(36);not null;index"`
	ProjectID    uuid.UUID `json:"project_id" gorm:"type:char(36);not null;index"`

	ProgressPercent    float32   `json:"progress_percent" gorm:"type:decimal(5,2);not null"`
	StatementDateStart time.Time `json:"statement_date_start" gorm:"not null"`
	StatementDateEnd   time.Time `json:"statement_date_end" gorm:"not null"`
	Status             string    `json:"status" gorm:"size:20;not null;index"`
	Number             uint16    `json:"number" gorm:"not null;index"`
	ApprovedBy         string    `json:"approved_by,omitempty" gorm:"size:100"`
	ApprovedAt         time.Time `json:"approved_at"`
}

type TasksPerformed struct {
	BaseModel
	StatusStatementID uuid.UUID `json:"status_statement_id" gorm:"type:char(36);index"`

	Description string  `json:"description" gorm:"type:varchar(500);not null"`
	Unit        string  `json:"unit" gorm:"size:100;not null"`
	Quantity    float64 `json:"quantity" gorm:"type:decimal(20,2);not null"`
	UnitPrice   float64 `json:"unit_price" gorm:"type:decimal(30,2);not null"`
	TotalPrice  float64 `json:"total_price" gorm:"type:decimal(40,2);not null"`
}

type AdditionalWorks struct {
	BaseModel
	StatusStatementID uuid.UUID `json:"status_statement_id" gorm:"type:char(36);index"`

	Description string  `json:"description" gorm:"type:varchar(500);not null"`
	Unit        string  `json:"unit" gorm:"size:100;not null"`
	Quantity    float64 `json:"quantity" gorm:"type:decimal(20,2);not null"`
	UnitPrice   float64 `json:"unit_price" gorm:"type:decimal(30,2);not null"`
	TotalPrice  float64 `json:"total_price" gorm:"type:decimal(40,2);not null"`
}

type Deductions struct {
	BaseModel
	StatusStatementID uuid.UUID `json:"status_statement_id" gorm:"type:char(36);index"`

	Description string  `json:"description" gorm:"type:varchar(500);not null"`
	Unit        string  `json:"unit" gorm:"size:100;not null"`
	Quantity    float64 `json:"quantity" gorm:"type:decimal(20,2);not null"`
	UnitPrice   float64 `json:"unit_price" gorm:"type:decimal(30,2);not null"`
	TotalPrice  float64 `json:"total_price" gorm:"type:decimal(40,2);not null"`
}

// * tasksperformed + additionalworks - deductions
type CumulativeTasksPerformed struct {
	BaseModel
	StatusStatementID uuid.UUID `json:"status_statement_id" gorm:"type:char(36);index"`
	CumulativePrice   float64   `json:"cumulative_price" gorm:"type:decimal(40,2);not null"`
}

type StatusStatmentComm struct {
	BaseModel
	StatusStatementID uuid.UUID `json:"status_statement_id" gorm:"type:char(36);index"`

	TechStatus    string `json:"tech_status" gorm:"type:varchar(100);not null"`
	FinanceStatus string `json:"finance_status" gorm:"type:varchar(100);not null"`
	LegalStatus   string `json:"legal_status" gorm:"type:varchar(100);not null"`
}

// todo:
// ! Many-to-Many Relationships
type ProjectItem struct {
	BaseModel
	ProjectID uuid.UUID `json:"project_id" gorm:"type:char(36);index"`
	ItemID    uuid.UUID `json:"item_id" gorm:"type:char(36);index"`
}

type ContractorItem struct {
	BaseModel
	ContractorID uuid.UUID `json:"contractor_id" gorm:"type:char(36);index"`
	ItemID       uuid.UUID `json:"item_id" gorm:"type:char(36);index"`
}

type SummaryItem struct {
	BaseModel
	Name        string  `json:"name" gorm:"type:text"`
	Description string  `json:"description" gorm:"type:text"`
	Price       float64 `json:"price" gorm:"type:float"`
}
