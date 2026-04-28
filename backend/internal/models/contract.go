package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Contractor is the counterparty on a Contract. The EER labels both the
// project-side and the counterparty-side as "Contract" — read the second
// occurrence as a typo for "Contractor" (consistent with
// ContractorsPageFeatures.md).
//
// RegNum is the company registration number (matches Company.RegNum
// shape). TaxID is separate because some jurisdictions split them.
type Contractor struct {
	BaseModel
	Name      string   `gorm:"size:255;not null;index"           json:"name"`
	RegNum    string   `gorm:"size:64;not null;uniqueIndex"      json:"reg_num"`
	TaxID     string   `gorm:"size:64;index"                     json:"tax_id,omitempty"`
	Email     string   `gorm:"size:320;index"                    json:"email,omitempty"`
	Phone     string   `gorm:"size:32"                           json:"phone,omitempty"`
	Address   string   `gorm:"type:text"                         json:"address,omitempty"`
	Specialty string   `gorm:"size:128;index"                    json:"specialty,omitempty"`
	Rating    *float32 `gorm:"check:rating IS NULL OR (rating >= 0 AND rating <= 5)" json:"rating,omitempty"`

	Contracts []Contract `gorm:"foreignKey:ContractorID" json:"-"`
}

func (Contractor) TableName() string { return "contractors" }

// Contract sits between Project (Has, 1:N) and Contractor (With, 1:1
// per contract — N:1 from contract to contractor) and parents the
// StatusStatement weak-entity tree.
//
// (project_id, code) is unique — duplicate contract numbers within a
// project are usually data entry mistakes.
//
// RetentionBps stores the retention percentage as basis points × 100
// (10.00% = 1000) to dodge float drift entirely. CHECK pins it to
// [0, 10000].
type Contract struct {
	BaseModel
	ProjectID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_contracts_project_code" json:"project_id"`
	ContractorID uuid.UUID `gorm:"type:uuid;not null;index"                                  json:"contractor_id"`
	Code         string    `gorm:"size:64;not null;uniqueIndex:idx_contracts_project_code"   json:"code"`
	Title        string    `gorm:"size:255;not null"                                         json:"title"`
	Description  string    `gorm:"type:text"                                                 json:"description,omitempty"`

	Status      ContractStatus  `gorm:"type:varchar(16);not null;default:'draft';index;check:status IN ('draft','signed','active','closed','cancelled')" json:"status"`
	TotalAmount decimal.Decimal `gorm:"type:numeric(20,2);not null;default:0"                                                                            json:"total_amount"`
	Currency    string          `gorm:"size:3;not null;default:'USD';check:char_length(currency)=3"                                                      json:"currency"`

	SignedAt *time.Time `json:"signed_at,omitempty"`
	StartsOn *time.Time `gorm:"index" json:"starts_on,omitempty"`
	EndsOn   *time.Time `gorm:"index" json:"ends_on,omitempty"`

	// Retention as basis-points × 100 (1000 = 10.00%). Avoids float drift
	// when computing per-statement holdback.
	RetentionBps int16 `gorm:"not null;default:0;check:retention_bps >= 0 AND retention_bps <= 10000" json:"retention_bps"`

	Project    *Project          `gorm:"foreignKey:ProjectID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"    json:"-"`
	Contractor *Contractor       `gorm:"foreignKey:ContractorID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	Statements []StatusStatement `gorm:"foreignKey:ContractID"                                                                json:"-"`
}

func (Contract) TableName() string { return "contracts" }
