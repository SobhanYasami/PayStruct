package model

import (
	"time"

	"github.com/shopspring/decimal"
)

// Currency is a reference table of ISO 4217 currency codes.
type Currency struct {
	Code          string `gorm:"size:3;primaryKey" json:"code"`
	Name          string `gorm:"size:128;not null" json:"name"`
	Symbol        string `gorm:"size:8" json:"symbol,omitempty"`
	DecimalPlaces int    `gorm:"not null;default:2" json:"decimal_places"`
	IsActive      bool   `gorm:"not null;default:true;index" json:"is_active"`
}

func (Currency) TableName() string { return "currencies" }

// FXRate records exchange rates between two currencies on a specific date.
// The triple (FromCode, ToCode, EffectiveDate) is unique.
type FXRate struct {
	BaseModel
	FromCode      string          `gorm:"size:3;not null;uniqueIndex:idx_fx_from_to_date" json:"from_code"`
	ToCode        string          `gorm:"size:3;not null;uniqueIndex:idx_fx_from_to_date" json:"to_code"`
	Rate          decimal.Decimal `gorm:"type:numeric(20,8);not null" json:"rate"`
	EffectiveDate time.Time       `gorm:"not null;uniqueIndex:idx_fx_from_to_date" json:"effective_date"`
	Source        string          `gorm:"size:64" json:"source,omitempty"`
}

func (FXRate) TableName() string { return "fx_rates" }
