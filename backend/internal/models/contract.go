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
	Type       string `gorm:"type:varchar(16);not null;index;check:type IN ('individual','company')" json:"type"`
	FName      string `gorm:"size:120;not null;index" json:"first_name"`
	LName      string `gorm:"size:120;not null;index" json:"last_name"`
	DetailedID string `gorm:"size:64;not null;uniqueIndex" json:"detailed_id"`
	NationalID string `gorm:"size:32;not null;uniqueIndex" json:"national_id"`

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
	ContractorID uuid.UUID `gorm:"type:uuid;not null;index" json:"contractor_id"`
	Code         string    `gorm:"size:64;not null;uniqueIndex:idx_contracts_project_code" json:"code"`
	Title        string    `gorm:"size:255;not null" json:"title"`
	Description  string    `gorm:"type:text" json:"description,omitempty"`

	Status     ContractStatus  `gorm:"type:varchar(16);not null;default:'draft';index;check:status IN ('draft','signed','active','closed','cancelled')" json:"status"`
	TotalPrice decimal.Decimal `gorm:"type:numeric(20,2);not null;default:0"                                                                            json:"total_amount"`
	Currency   string          `gorm:"size:3;not null;default:'Rial';check:char_length(currency)=3"                                                      json:"currency"`

	SignedAt *time.Time `json:"signed_at,omitempty"`
	StartsOn *time.Time `gorm:"index" json:"starts_on,omitempty"`
	EndsOn   *time.Time `gorm:"index" json:"ends_on,omitempty"`

	// Retention as basis-points × 100 (1000 = 10.00%). Avoids float drift
	// when computing per-statement holdback.
	RetentionBps      int16 `gorm:"not null;default:0;check:retention_bps >= 0 AND retention_bps <= 10000" json:"retention_bps"`
	InsuranceRateBps  int16 `gorm:"not null;default:0;check:insurance_rate_bps >= 0 AND insurance_rate_bps <= 10000" json:"insurance_rate_bps"`
	AddedValueRateBps int16 `gorm:"not null;default:0;check:added_value_rate_bps >= 0 AND added_value_rate_bps <= 10000" json:"added_value_rate_bps"`

	ScanedFileUrl string `json:"scanfile_url"`

	Project    *Project          `gorm:"foreignKey:ProjectID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"    json:"-"`
	Contractor *Contractor       `gorm:"foreignKey:ContractorID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	Statements []StatusStatement `gorm:"foreignKey:ContractID"                                                                json:"-"`
	WBSItems   []WBS             `gorm:"foreignKey:ContractID"                                                                json:"-"`
}

func (Contract) TableName() string { return "contracts" }

// WBS (Work Breakdown Structure) is a weak entity owned by Contract (Has, 1:N).
//
// Identification:
//   - Surrogate UUID PK from BaseModel for stable FK targets.
//   - Composite natural key (ContractID, ItemCode) enforced via unique index.
//     ItemCode is the human-facing code (e.g. "1.1", "2.3.4") that appears
//     on printed BoQ sheets and maps directly to WorksDone.BoQItemCode.
//
// TotalPrice is a computed snapshot (Quantity × UnitPrice). Keep it in sync
// with an AfterSave hook or recompute in the service before persisting.
type WBS struct {
	BaseModel

	ContractID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_wbs_contract_item" json:"contract_id"`
	ItemCode   string    `gorm:"size:32;not null;uniqueIndex:idx_wbs_contract_item"   json:"item_code"`

	Description string          `gorm:"type:text"                             json:"description,omitempty"`
	Unit        string          `gorm:"size:32;not null"                      json:"unit"`
	Quantity    decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0" json:"quantity"`
	UnitPrice   decimal.Decimal `gorm:"type:numeric(20,2);not null;default:0" json:"unit_price"`
	TotalPrice  decimal.Decimal `gorm:"type:numeric(20,2);not null;default:0" json:"total_price"`

	Contract *Contract `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
}

func (WBS) TableName() string { return "wbs_items" }
