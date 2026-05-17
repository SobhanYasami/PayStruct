package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// RetentionRecord tracks performance bond and defect-liability retention
// deducted and released per InterimStatement.
type RetentionRecord struct {
	BaseModel
	InterimStatementID uuid.UUID     `gorm:"type:uuid;not null;index" json:"interim_statement_id"`
	ContractID         uuid.UUID     `gorm:"type:uuid;not null;index" json:"contract_id"`
	RetentionType      RetentionType `gorm:"size:32;not null;check:retention_type IN ('performance_bond','defect_liability')" json:"retention_type"`
	PctBps             int           `gorm:"not null;default:0" json:"pct_bps"`
	DeductedAmount     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"deducted_amount"`
	ReleasedAmount     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"released_amount"`
	CurrencyCode       string          `gorm:"size:3;not null" json:"currency_code"`
	ReleaseDate        *time.Time      `json:"release_date,omitempty"`
	Notes              string          `gorm:"type:text" json:"notes,omitempty"`

	InterimStatement *InterimStatement `gorm:"foreignKey:InterimStatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	Contract         *Contract         `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"         json:"-"`
}

func (RetentionRecord) TableName() string { return "retention_records" }

// AdvancePaymentRecord tracks advance payments issued and recoveries deducted
// from interim statements.
type AdvancePaymentRecord struct {
	BaseModel
	ContractID         uuid.UUID         `gorm:"type:uuid;not null;index" json:"contract_id"`
	RecordType         AdvanceRecordType `gorm:"size:16;not null;check:record_type IN ('advance','recovery')" json:"record_type"`
	InterimStatementID *uuid.UUID        `gorm:"type:uuid;index" json:"interim_statement_id,omitempty"`
	Amount             decimal.Decimal   `gorm:"type:numeric(20,8);not null;default:0" json:"amount"`
	CurrencyCode       string            `gorm:"size:3;not null" json:"currency_code"`
	RecoveryPctBps     int               `gorm:"not null;default:0" json:"recovery_pct_bps"`
	CumulativeRecovered decimal.Decimal  `gorm:"type:numeric(20,8);not null;default:0" json:"cumulative_recovered"`
	OutstandingBalance decimal.Decimal   `gorm:"type:numeric(20,8);not null;default:0" json:"outstanding_balance"`
	TxnDate            time.Time         `gorm:"not null;index" json:"txn_date"`
	Notes              string            `gorm:"type:text" json:"notes,omitempty"`

	Contract         *Contract         `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"                  json:"-"`
	InterimStatement *InterimStatement `gorm:"foreignKey:InterimStatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"-"`
}

func (AdvancePaymentRecord) TableName() string { return "advance_payment_records" }

// LiquidatedDamage records delay, performance, or other penalty amounts
// applied to an InterimStatement.
type LiquidatedDamage struct {
	BaseModel
	InterimStatementID uuid.UUID       `gorm:"type:uuid;not null;index" json:"interim_statement_id"`
	ContractID         uuid.UUID       `gorm:"type:uuid;not null;index" json:"contract_id"`
	LdType             LDType          `gorm:"size:16;not null;check:ld_type IN ('delay','performance','other')" json:"ld_type"`
	RatePerDay         decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"rate_per_day"`
	DaysApplied        int             `gorm:"not null;default:0" json:"days_applied"`
	Amount             decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"amount"`
	CurrencyCode       string          `gorm:"size:3;not null" json:"currency_code"`
	PeriodFrom         time.Time       `gorm:"not null" json:"period_from"`
	PeriodTo           time.Time       `gorm:"not null" json:"period_to"`
	Waived             bool            `gorm:"not null;default:false" json:"waived"`
	WaiverReason       string          `gorm:"type:text" json:"waiver_reason,omitempty"`
	CreatedByID        uuid.UUID       `gorm:"type:uuid;not null;index" json:"created_by_id"`

	InterimStatement *InterimStatement `gorm:"foreignKey:InterimStatementID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	Contract         *Contract         `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"         json:"-"`
}

func (LiquidatedDamage) TableName() string { return "liquidated_damages" }
