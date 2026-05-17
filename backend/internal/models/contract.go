package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Contractor is the external counterparty on a Contract. ContractorType
// distinguishes individual persons from legal entities.
type Contractor struct {
	BaseModel
	Type           string `gorm:"type:varchar(16);not null;index;check:type IN ('individual','company')" json:"type"`
	DisplayName    string `gorm:"size:255;not null;index" json:"display_name"`
	LegalName      string `gorm:"size:255;not null" json:"legal_name"`
	TaxID          *string `gorm:"size:64;uniqueIndex:idx_contractors_tax" json:"tax_id,omitempty"`
	RegistrationNo *string `gorm:"size:64;uniqueIndex:idx_contractors_reg" json:"registration_no,omitempty"`

	// NationalID is relevant for individual contractors.
	NationalID      string `gorm:"size:32;index" json:"national_id,omitempty"`
	DefaultCurrency string `gorm:"size:3;not null;default:'IRR'" json:"default_currency"`

	// BankAccountJSON and ContactJSON store structured data as JSONB.
	BankAccountJSON string `gorm:"type:jsonb;default:'{}'" json:"bank_account,omitempty"`
	ContactJSON     string `gorm:"type:jsonb;default:'{}'" json:"contact,omitempty"`

	Rating *float32 `gorm:"check:rating IS NULL OR (rating >= 0 AND rating <= 5)" json:"rating,omitempty"`

	Contracts []Contract `gorm:"foreignKey:ContractorID" json:"-"`
}

func (Contractor) TableName() string { return "contractors" }

// Contract is owned by a Project and references a Contractor. All basis-point
// (bps) fields store percentages as integer basis-points: 1000 = 10.00%.
type Contract struct {
	BaseModel
	CompanyID    uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	ProjectID    uuid.UUID `gorm:"type:uuid;not null;index" json:"project_id"`
	ContractorID uuid.UUID `gorm:"type:uuid;not null;index" json:"contractor_id"`

	// ContractNo is unique within a company.
	ContractNo  string       `gorm:"size:64;not null;uniqueIndex:idx_contracts_company_no" json:"contract_no"`
	Title       string       `gorm:"size:255;not null" json:"title"`
	Description string       `gorm:"type:text" json:"description,omitempty"`
	Type        ContractType `gorm:"type:varchar(24);not null;default:'lump_sum';check:type IN ('lump_sum','unit_rate','cost_plus','time_material')" json:"type"`

	Status        ContractStatus  `gorm:"type:varchar(16);not null;default:'draft';index;check:status IN ('draft','signed','active','closed','cancelled')" json:"status"`
	ContractValue decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"contract_value"`
	Currency      string          `gorm:"size:3;not null;default:'IRR';check:char_length(currency)=3" json:"currency"`

	// Basis-point financial parameters. 1000 bps = 10.00%.
	RetentionPctBps      int `gorm:"not null;default:0;check:retention_pct_bps >= 0 AND retention_pct_bps <= 10000" json:"retention_pct_bps"`
	AdvancePctBps        int `gorm:"not null;default:0;check:advance_pct_bps >= 0 AND advance_pct_bps <= 10000" json:"advance_pct_bps"`
	VatPctBps            int `gorm:"not null;default:0;check:vat_pct_bps >= 0 AND vat_pct_bps <= 10000" json:"vat_pct_bps"`
	SocialSecurityPctBps int `gorm:"not null;default:0;check:social_security_pct_bps >= 0 AND social_security_pct_bps <= 10000" json:"social_security_pct_bps"`

	SignedAt *time.Time `json:"signed_at,omitempty"`
	StartsOn *time.Time `gorm:"index" json:"starts_on,omitempty"`
	EndsOn   *time.Time `gorm:"index" json:"ends_on,omitempty"`

	ScannedFileURL string `gorm:"size:512" json:"scanned_file_url,omitempty"`

	Company    *Company          `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"    json:"-"`
	Project    *Project          `gorm:"foreignKey:ProjectID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"    json:"-"`
	Contractor *Contractor       `gorm:"foreignKey:ContractorID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	Statements []InterimStatement `gorm:"foreignKey:ContractID"                                                               json:"-"`
	LineItems  []ContractLineItem `gorm:"foreignKey:ContractID"                                                               json:"-"`
}

func (Contract) TableName() string { return "contracts" }

// ContractLineItem is the Bill-of-Quantities line (formerly WBS).
type ContractLineItem struct {
	BaseModel
	ContractID   uuid.UUID       `gorm:"type:uuid;not null;index"                                json:"contract_id"`
	SortOrder    int             `gorm:"not null;default:0"                                      json:"sort_order"`
	Description  string          `gorm:"type:text;not null"                                      json:"description"`
	Unit         string          `gorm:"size:32;not null"                                        json:"unit"`
	Quantity     decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0"                   json:"quantity"`
	UnitRate     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0"                   json:"unit_rate"`
	CurrencyCode string          `gorm:"size:3;not null;default:'IRR';check:char_length(currency_code)=3" json:"currency_code"`

	Contract *Contract `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
}

func (ContractLineItem) TableName() string { return "contract_line_items" }
