package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/shopspring/decimal"
)

// Project is owned by Company (1:N) and parents Contracts (1:N).
//
// `Code` is the human-readable identifier shown in the UI ("PRJ-2025-0042").
// Unique per company — two tenants can both have "PRJ-001" without
// collision; enforced by composite unique index (company_id, code).
//
// Money fields use numeric(20,2) backed by shopspring/decimal. Float64 is
// a non-starter for finance: 0.1 + 0.2 ≠ 0.3 in IEEE-754 binary64.
//
// Tags is text[] with a GIN index (declared in MigrateIndexes) for
// containment queries: `tags @> ARRAY['urgent']`.
type Project struct {
	BaseModel
	CompanyID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_projects_company_code"      json:"company_id"`
	Code        string    `gorm:"size:64;not null;uniqueIndex:idx_projects_company_code"        json:"code"`
	Name        string    `gorm:"size:255;not null;index"                                       json:"name"`
	Description string    `gorm:"type:text"                                                     json:"description,omitempty"`
	Category    string    `gorm:"size:64;index"                                                 json:"category,omitempty"`

	Status   ProjectStatus `gorm:"type:varchar(16);not null;default:'planning';index;check:status IN ('planning','active','on_hold','completed','cancelled')" json:"status"`
	Priority Priority      `gorm:"type:varchar(16);not null;default:'medium';index;check:priority IN ('low','medium','high','critical')"                       json:"priority"`

	StartDate *time.Time `gorm:"index" json:"start_date,omitempty"`
	EndDate   *time.Time `gorm:"index" json:"end_date,omitempty"`

	BudgetEstimate decimal.Decimal `gorm:"type:numeric(20,2);not null;default:0" json:"budget_estimate"`
	BudgetActual   decimal.Decimal `gorm:"type:numeric(20,2);not null;default:0" json:"budget_actual"`
	Currency       string          `gorm:"size:3;not null;default:'USD';check:char_length(currency)=3" json:"currency"`

	Tags pq.StringArray `gorm:"type:text[];not null;default:'{}'" json:"tags"`

	// Owning company. RESTRICT delete: orphaning a project would cascade
	// surprises into contracts and status statements; force the caller to
	// archive children explicitly.
	Company   *Company   `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	Contracts []Contract `gorm:"foreignKey:ProjectID"                                                              json:"-"`
}

func (Project) TableName() string { return "projects" }
