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
	RetentionAmount      decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"retention_amount"`
	AdvanceRecovered     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"advance_recovered"`
	VatAmount            decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"vat_amount"`
	SocialSecurityAmount decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"social_security_amount"`
	LdAmount             decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"ld_amount"`
	NetAmount            decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"net_amount"`

	ProgressPct *decimal.Decimal `gorm:"type:numeric(5,2);check:progress_pct IS NULL OR (progress_pct >= 0 AND progress_pct <= 100)" json:"progress_pct,omitempty"`

	// FX snapshot locked at approval time.
	FxRate     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:1" json:"fx_rate"`
	FxRateDate *time.Time      `json:"fx_rate_date,omitempty"`

	Notes string `gorm:"type:text" json:"notes,omitempty"`

	Company  *Company  `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"  json:"-"`
	Contract *Contract `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`

	WorkDoneItems  []WorkDoneItem  `gorm:"foreignKey:StatementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	ExtraWorkItems []ExtraWorkItem `gorm:"foreignKey:StatementID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (InterimStatement) TableName() string { return "interim_statements" }

// Recompute updates cached aggregate fields from in-memory child slices.
// The calculation follows the ContractLedger formula using the parent
// contract's bps parameters (passed in).
func (s *InterimStatement) Recompute(retentionBps, advanceBps, vatBps, socialSecBps int, advanceOutstanding decimal.Decimal) {
	gross := decimal.Zero
	for i := range s.WorkDoneItems {
		gross = gross.Add(s.WorkDoneItems[i].Amount)
	}
	extra := decimal.Zero
	for i := range s.ExtraWorkItems {
		extra = extra.Add(s.ExtraWorkItems[i].Amount)
	}

	grossTotal := gross.Add(extra)
	bpsDivisor := decimal.NewFromInt(10000)

	retention := grossTotal.Mul(decimal.NewFromInt(int64(retentionBps))).Div(bpsDivisor)
	advanceRate := grossTotal.Mul(decimal.NewFromInt(int64(advanceBps))).Div(bpsDivisor)
	advance := decimal.Min(advanceRate, advanceOutstanding)
	vat := grossTotal.Sub(retention).Mul(decimal.NewFromInt(int64(vatBps))).Div(bpsDivisor)
	socialSec := grossTotal.Mul(decimal.NewFromInt(int64(socialSecBps))).Div(bpsDivisor)
	net := grossTotal.Sub(retention).Sub(advance).Add(vat).Sub(socialSec).Sub(s.LdAmount)

	s.GrossAmount = gross
	s.ExtraAmount = extra
	s.RetentionAmount = retention
	s.AdvanceRecovered = advance
	s.VatAmount = vat
	s.SocialSecurityAmount = socialSec
	s.NetAmount = net
}

// WorkDoneItem is a line item for completed contract scope (formerly WorksDone).
type WorkDoneItem struct {
	BaseModel
	StatementID uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex:idx_work_done_stmt_line" json:"statement_id"`
	LineNo      int             `gorm:"not null;uniqueIndex:idx_work_done_stmt_line;check:line_no > 0" json:"line_no"`
	BoQItemCode string          `gorm:"size:64;index" json:"boq_item_code,omitempty"`
	Description string          `gorm:"type:text;not null" json:"description"`
	UnitCode    string          `gorm:"size:32" json:"unit_code,omitempty"`
	Quantity    decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0" json:"quantity"`
	UnitPrice   decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"unit_price"`
	Amount      decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"amount"`

	Statement *InterimStatement `gorm:"foreignKey:StatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (WorkDoneItem) TableName() string { return "work_done_items" }

// ExtraWorkItem records out-of-scope additions (formerly ExtraWork).
type ExtraWorkItem struct {
	BaseModel
	StatementID uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex:idx_extra_work_stmt_line" json:"statement_id"`
	LineNo      int             `gorm:"not null;uniqueIndex:idx_extra_work_stmt_line;check:line_no > 0" json:"line_no"`
	Description string          `gorm:"type:text;not null" json:"description"`
	Reason      string          `gorm:"type:text" json:"reason,omitempty"`
	Amount      decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"amount"`

	// Variation / client approval tracking.
	VariationRef      string `gorm:"size:128" json:"variation_ref,omitempty"`
	ApprovedByClient  bool   `gorm:"not null;default:false" json:"approved_by_client"`
	ApprovalRef       string `gorm:"size:128" json:"approval_ref,omitempty"`

	Statement *InterimStatement `gorm:"foreignKey:StatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (ExtraWorkItem) TableName() string { return "extra_work_items" }
