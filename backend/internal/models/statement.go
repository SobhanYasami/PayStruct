package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// StatusStatement is a weak entity owned by Contract (Has, 1:N).
//
// Identification:
//   - Surrogate UUID PK (BaseModel.ID) for stable URLs and FK targets.
//   - Composite natural key (ContractID, SequenceNo) enforced via unique
//     index. SequenceNo is the human-facing "صورت‌وضعیت شماره N" number.
//
// Concurrency:
//   - Allocate SequenceNo inside a transaction with `SELECT … FOR UPDATE`
//     on the parent contract row, otherwise two concurrent inserts can
//     win the same number until the unique index rejects one.
//
// Snapshot fields:
//   - Currency is copied from the parent Contract at issue time. A
//     contract re-denomination (rare, but possible) must not retroactively
//     mutate already-issued statements.
//
// Aggregates (GrossAmount, ExtraAmount, DeductionAmount, NetAmount):
//   - Cached for fast list views. Recompute in an AfterSave hook on the
//     child entities (or move to a materialized view if rollups become
//     hot). Source of truth is the children.
//
// Lifecycle:
//   - draft → submitted → approved → paid (terminal)
//   - draft → submitted → rejected → (back to draft on re-edit)
//   - Status transitions belong in a service-layer state machine, not
//     ad-hoc UPDATE statements.
type StatusStatement struct {
	BaseModel
	ContractID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_statements_contract_seq" json:"contract_id"`
	SequenceNo int       `gorm:"not null;uniqueIndex:idx_statements_contract_seq;check:sequence_no > 0" json:"sequence_no"`

	PeriodStart time.Time `gorm:"not null;index" json:"period_start"`
	PeriodEnd   time.Time `gorm:"not null;index" json:"period_end"`
	IssuedOn    time.Time `gorm:"not null"        json:"issued_on"`

	Status   StatementStatus `gorm:"type:varchar(16);not null;default:'draft';index;check:status IN ('draft','submitted','approved','rejected','paid')" json:"status"`
	Currency string          `gorm:"size:3;not null;check:char_length(currency)=3"                                                                       json:"currency"`

	GrossAmount     decimal.Decimal  `gorm:"type:numeric(20,2);not null;default:0" json:"gross_amount"`
	ExtraAmount     decimal.Decimal  `gorm:"type:numeric(20,2);not null;default:0" json:"extra_amount"`
	DeductionAmount decimal.Decimal  `gorm:"type:numeric(20,2);not null;default:0" json:"deduction_amount"`
	NetAmount       decimal.Decimal  `gorm:"type:numeric(20,2);not null;default:0" json:"net_amount"`
	ProgressPct     *decimal.Decimal `gorm:"type:numeric(5,2);check:progress_pct IS NULL OR (progress_pct >= 0 AND progress_pct <= 100)" json:"progress_pct,omitempty"`

	Notes string `gorm:"type:text" json:"notes,omitempty"`

	// Approval audit. Nullable until the statement is approved/rejected.
	ApprovedByID *uuid.UUID `gorm:"type:uuid;index" json:"approved_by_id,omitempty"`
	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
	ApprovedBy   *Employee  `gorm:"foreignKey:ApprovedByID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"-"`

	Contract   *Contract   `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	WorksDone  []WorksDone `gorm:"foreignKey:StatementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	ExtraWorks []ExtraWork `gorm:"foreignKey:StatementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	Deductions []Deduction `gorm:"foreignKey:StatementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (StatusStatement) TableName() string { return "status_statements" }

// Recompute updates the cached aggregate fields from the in-memory child
// slices. Call before persisting or rely on hooks attached to the children.
//
// Net = Gross + Extra − Deductions. Decimal arithmetic preserves precision
// across the chain.
func (s *StatusStatement) Recompute() {
	gross := decimal.Zero
	for i := range s.WorksDone {
		gross = gross.Add(s.WorksDone[i].Amount)
	}
	extra := decimal.Zero
	for i := range s.ExtraWorks {
		extra = extra.Add(s.ExtraWorks[i].Amount)
	}
	ded := decimal.Zero
	for i := range s.Deductions {
		ded = ded.Add(s.Deductions[i].Amount)
	}
	s.GrossAmount = gross
	s.ExtraAmount = extra
	s.DeductionAmount = ded
	s.NetAmount = gross.Add(extra).Sub(ded)
}

// WorksDone — line items for completed contract scope per the EER.
//
// Quantity is numeric(20,4) because BoQ units (e.g. m², m³, kg) often need
// 3–4 decimal places before the per-statement total is rounded to (20,2).
// Amount is the snapshot of Quantity × UnitPrice rounded to currency
// precision; storing both avoids reconstructing it for printed reports if
// the rounding policy ever changes.
type WorksDone struct {
	BaseModel
	StatementID uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex:idx_works_done_stmt_line" json:"statement_id"`
	LineNo      int             `gorm:"not null;uniqueIndex:idx_works_done_stmt_line;check:line_no > 0" json:"line_no"`
	BoQItemCode string          `gorm:"size:64;index" json:"boq_item_code,omitempty"`
	Description string          `gorm:"type:text;not null"        json:"description"`
	UnitCode    string          `gorm:"size:32"                   json:"unit_code,omitempty"`
	Quantity    decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0" json:"quantity"`
	UnitPrice   decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0" json:"unit_price"`
	Amount      decimal.Decimal `gorm:"type:numeric(20,2);not null;default:0" json:"amount"`

	Statement *StatusStatement `gorm:"foreignKey:StatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (WorksDone) TableName() string { return "works_done" }

// ExtraWork — out-of-scope additions per the EER.
//
// ApprovedByID gates inclusion in the statement total in stricter
// workflows. Service layer should reject ExtraWork rows with NULL
// ApprovedByID when transitioning the parent statement to "approved".
type ExtraWork struct {
	BaseModel
	StatementID  uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex:idx_extra_works_stmt_line" json:"statement_id"`
	LineNo       int             `gorm:"not null;uniqueIndex:idx_extra_works_stmt_line;check:line_no > 0" json:"line_no"`
	Description  string          `gorm:"type:text;not null"        json:"description"`
	Reason       string          `gorm:"type:text"                  json:"reason,omitempty"`
	ApprovedByID *uuid.UUID      `gorm:"type:uuid;index" json:"approved_by_id,omitempty"`
	ApprovedAt   *time.Time      `json:"approved_at,omitempty"`
	Amount       decimal.Decimal `gorm:"type:numeric(20,2);not null;default:0" json:"amount"`

	Statement  *StatusStatement `gorm:"foreignKey:StatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"   json:"-"`
	ApprovedBy *Employee        `gorm:"foreignKey:ApprovedByID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"-"`
}

func (ExtraWork) TableName() string { return "extra_works" }

// Deduction — taxes, retention, penalties, advances, etc.
//
// Kind is a free-ish string (see DeductionKind constants for the common
// set). Open-ended because multi-jurisdiction tax codes routinely exceed
// any closed enum; lock it down per-tenant in the application layer.
type Deduction struct {
	BaseModel
	StatementID uuid.UUID     `gorm:"type:uuid;not null;uniqueIndex:idx_deductions_stmt_line" json:"statement_id"`
	LineNo      int           `gorm:"not null;uniqueIndex:idx_deductions_stmt_line;check:line_no > 0" json:"line_no"`
	Kind        DeductionKind `gorm:"size:64;not null;index"     json:"kind"`
	Description string        `gorm:"type:text;not null"          json:"description"`
	// RatePct is optional when the deduction is a percentage of gross
	// (tax %, retention %). NULL = flat amount.
	RatePct *decimal.Decimal `gorm:"type:numeric(7,4);check:rate_pct IS NULL OR (rate_pct >= 0 AND rate_pct <= 100)" json:"rate_pct,omitempty"`
	Amount  decimal.Decimal  `gorm:"type:numeric(20,2);not null;default:0" json:"amount"`

	Statement *StatusStatement `gorm:"foreignKey:StatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (Deduction) TableName() string { return "deductions" }
