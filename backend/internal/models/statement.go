package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// InterimStatement (formerly StatusStatement) is the periodic payment
// certificate owned by a Contract. The 5-stage approval workflow is tracked
// via ApprovalEvent rows, not fields on this struct.
type InterimStatement struct {
	BaseModel
	CompanyID  uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	ContractID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_statements_contract_seq" json:"contract_id"`
	SequenceNo int       `gorm:"not null;uniqueIndex:idx_statements_contract_seq;check:sequence_no > 0" json:"sequence_no"`

	PeriodStart time.Time `gorm:"not null;index" json:"period_start"`
	PeriodEnd   time.Time `gorm:"not null;index" json:"period_end"`
	IssuedOn    time.Time `gorm:"not null" json:"issued_on"`

	Status   StatementStatus `gorm:"type:varchar(20);not null;default:'draft';index;check:status IN ('draft','submitted','finance_review','pm_review','director_review','approved','rejected')" json:"status"`
	Currency string          `gorm:"size:3;not null;check:char_length(currency)=3" json:"currency"`

	// Cached aggregates — recomputed by Recompute() before save.
	GrossAmount          decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"gross_amount"`
	ExtraAmount          decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"extra_amount"`
	DeductionAmount      decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"deduction_amount"`
	RetentionAmount      decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"retention_amount"`
	AdvanceRecovered     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"advance_recovered"`
	VatAmount            decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"vat_amount"`
	SocialSecurityAmount decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"social_security_amount"`
	LdAmount             decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"ld_amount"`
	NetAmount            decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"net_amount"`

	PrevProgressPct *decimal.Decimal `gorm:"type:numeric(7,4)" json:"prev_progress_pct,omitempty"`
	ProgressPct     *decimal.Decimal `gorm:"type:numeric(7,4)" json:"progress_pct,omitempty"`

	// FX snapshot locked at approval time.
	FxRate     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:1" json:"fx_rate"`
	FxRateDate *time.Time      `json:"fx_rate_date,omitempty"`

	Notes string `gorm:"type:text" json:"notes,omitempty"`

	Company  *Company  `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"  json:"-"`
	Contract *Contract `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`

	WorkDoneItems    []WorkDoneItem           `gorm:"foreignKey:StatementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"work_done_items,omitempty"`
	ExtraWorkItems   []ExtraWorkItem          `gorm:"foreignKey:StatementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"extra_work_items,omitempty"`
	DeductionItems   []StatementDeductionItem `gorm:"foreignKey:StatementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"deduction_items,omitempty"`
}

func (InterimStatement) TableName() string { return "interim_statements" }

// Recompute updates all cached aggregate fields from in-memory child slices.
// grossBudget is the parent contract's gross_budget (used for progress %).
func (s *InterimStatement) Recompute(retentionBps, advanceBps, vatBps, socialSecBps int, advanceOutstanding, grossBudget decimal.Decimal) {
	gross := decimal.Zero
	for i := range s.WorkDoneItems {
		gross = gross.Add(s.WorkDoneItems[i].Amount)
	}
	extra := decimal.Zero
	for i := range s.ExtraWorkItems {
		extra = extra.Add(s.ExtraWorkItems[i].Amount)
	}
	customDeductions := decimal.Zero
	for i := range s.DeductionItems {
		customDeductions = customDeductions.Add(s.DeductionItems[i].Amount)
	}

	grossTotal := gross.Add(extra)
	bpsDivisor := decimal.NewFromInt(10000)

	retention := grossTotal.Mul(decimal.NewFromInt(int64(retentionBps))).Div(bpsDivisor)
	advanceRate := grossTotal.Mul(decimal.NewFromInt(int64(advanceBps))).Div(bpsDivisor)
	advance := decimal.Min(advanceRate, advanceOutstanding)
	vat := grossTotal.Sub(retention).Mul(decimal.NewFromInt(int64(vatBps))).Div(bpsDivisor)
	socialSec := grossTotal.Mul(decimal.NewFromInt(int64(socialSecBps))).Div(bpsDivisor)
	net := grossTotal.Sub(retention).Sub(advance).Add(vat).Sub(socialSec).Sub(s.LdAmount).Sub(customDeductions)

	s.GrossAmount = gross
	s.ExtraAmount = extra
	s.DeductionAmount = customDeductions
	s.RetentionAmount = retention
	s.AdvanceRecovered = advance
	s.VatAmount = vat
	s.SocialSecurityAmount = socialSec
	s.NetAmount = net

	if grossBudget.GreaterThan(decimal.Zero) {
		pct := gross.Div(grossBudget).Mul(decimal.NewFromInt(100))
		s.ProgressPct = &pct
	}
}

// WorkDoneItem is a line item for completed contract scope tied to a ContractLineItem.
// User provides only QuantityDone; Description/UnitCode/UnitPrice copied from the WBS item.
type WorkDoneItem struct {
	BaseModel
	StatementID uuid.UUID  `gorm:"type:uuid;not null;uniqueIndex:idx_work_done_stmt_line" json:"statement_id"`
	LineItemID  *uuid.UUID `gorm:"type:uuid;index" json:"line_item_id,omitempty"`
	LineNo      int        `gorm:"not null;uniqueIndex:idx_work_done_stmt_line;check:line_no > 0" json:"line_no"`
	BoQItemCode string          `gorm:"size:64;index" json:"boq_item_code,omitempty"`
	Description string          `gorm:"type:text;not null" json:"description"`
	UnitCode    string          `gorm:"size:32" json:"unit_code,omitempty"`
	Quantity    decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0" json:"quantity"`
	UnitPrice   decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"unit_price"`
	Amount      decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"amount"`

	Statement *InterimStatement `gorm:"foreignKey:StatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (WorkDoneItem) TableName() string { return "work_done_items" }

// ExtraWorkItem records out-of-scope additions with unit/quantity/price breakdown.
type ExtraWorkItem struct {
	BaseModel
	StatementID uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex:idx_extra_work_stmt_line" json:"statement_id"`
	LineNo      int             `gorm:"not null;uniqueIndex:idx_extra_work_stmt_line;check:line_no > 0" json:"line_no"`
	Description string          `gorm:"type:text;not null" json:"description"`
	Unit        string          `gorm:"size:32" json:"unit,omitempty"`
	Quantity    decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0" json:"quantity"`
	UnitPrice   decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"unit_price"`
	Amount      decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"amount"`
	Reason      string          `gorm:"type:text" json:"reason,omitempty"`

	// Variation / client approval tracking.
	VariationRef     string `gorm:"size:128" json:"variation_ref,omitempty"`
	ApprovedByClient bool   `gorm:"not null;default:false" json:"approved_by_client"`
	ApprovalRef      string `gorm:"size:128" json:"approval_ref,omitempty"`

	Statement *InterimStatement `gorm:"foreignKey:StatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (ExtraWorkItem) TableName() string { return "extra_work_items" }

// StatementDeductionItem is a user-provided deduction line (e.g. penalty, withholding).
type StatementDeductionItem struct {
	BaseModel
	StatementID uuid.UUID       `gorm:"type:uuid;not null;index" json:"statement_id"`
	LineNo      int             `gorm:"not null" json:"line_no"`
	Description string          `gorm:"type:text;not null" json:"description"`
	Unit        string          `gorm:"size:32" json:"unit,omitempty"`
	Quantity    decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0" json:"quantity"`
	UnitPrice   decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"unit_price"`
	Amount      decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"amount"`

	Statement *InterimStatement `gorm:"foreignKey:StatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (StatementDeductionItem) TableName() string { return "statement_deduction_items" }
