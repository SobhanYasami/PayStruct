package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Contractor is the external counterparty on a Contract.
// Type "individual" uses FirstName+LastName; "company" uses CompanyName.
type Contractor struct {
	BaseModel

	// Owning company — nullable so legacy rows remain accessible to all.
	CompanyID   *uuid.UUID `gorm:"type:uuid;index"                                                                         json:"company_id,omitempty"`
	CreatedByID *uuid.UUID `gorm:"type:uuid"                                                                               json:"created_by_id,omitempty"`

	Type string `gorm:"type:varchar(16);not null;index;check:type IN ('individual','company')" json:"type"`

	// Individual fields.
	FirstName string `gorm:"size:128" json:"first_name,omitempty"`
	LastName  string `gorm:"size:128" json:"last_name,omitempty"`

	// Company fields.
	CompanyName string `gorm:"size:255" json:"company_name,omitempty"`

	// DisplayName is derived (FirstName+" "+LastName or CompanyName) and stored for indexing.
	DisplayName string `gorm:"size:255;not null;index" json:"display_name"`

	// LegalName is the formal registered name (optional; nullable in DB).
	LegalName string `gorm:"size:255" json:"legal_name,omitempty"`

	TaxID          *string `gorm:"size:64;uniqueIndex:idx_contractors_tax" json:"tax_id,omitempty"`
	RegistrationNo *string `gorm:"size:64;uniqueIndex:idx_contractors_reg" json:"registration_no,omitempty"`

	NationalID     string `gorm:"size:32;index" json:"national_id,omitempty"`
	PreferentialID string `gorm:"size:64"       json:"preferential_id,omitempty"`

	DefaultCurrency string `gorm:"size:3;not null;default:'IRR'" json:"default_currency"`

	BankAccountJSON string `gorm:"type:jsonb;default:'{}'" json:"bank_account,omitempty"`
	ContactJSON     string `gorm:"type:jsonb;default:'{}'" json:"contact,omitempty"`

	Rating *float32 `gorm:"check:rating IS NULL OR (rating >= 0 AND rating <= 5)" json:"rating,omitempty"`

	OwnerCompany *Company  `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"  json:"-"`
	CreatedBy    *Employee `gorm:"foreignKey:CreatedByID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"-"`
	Contracts    []Contract `gorm:"foreignKey:ContractorID"                                                           json:"-"`
}

func (Contractor) TableName() string { return "contractors" }

// Contract is owned by a Project and references a Contractor. All basis-point
// (bps) fields store percentages as integer basis-points: 1000 = 10.00%.
type Contract struct {
	BaseModel
	// CompanyID + ContractNo form a composite unique index (contract numbers are scoped per company).
	CompanyID    uuid.UUID  `gorm:"type:uuid;not null;index;uniqueIndex:idx_contracts_company_no" json:"company_id"`
	ProjectID    uuid.UUID  `gorm:"type:uuid;not null;index"                                       json:"project_id"`
	ContractorID uuid.UUID  `gorm:"type:uuid;not null;index"                                       json:"contractor_id"`
	EmployerID   *uuid.UUID `gorm:"type:uuid;index"                                                json:"employer_id,omitempty"`
	ConsultantID *uuid.UUID `gorm:"type:uuid;index"                                                json:"consultant_id,omitempty"`

	// ContractNo format: <jalali-year>/<sequence>, e.g. "1404/3". Unique per company.
	ContractNo  string       `gorm:"size:64;not null;uniqueIndex:idx_contracts_company_no" json:"contract_no"`
	Title       string       `gorm:"size:255;not null" json:"title"`
	Description string       `gorm:"type:text" json:"description,omitempty"`
	Type        ContractType `gorm:"type:varchar(32);not null;default:'lump_sum';check:type IN ('lump_sum','unit_rate','cost_plus','time_material','construction_management','design_bid_build','design_build','labor_only','turnkey','percentage')" json:"type"`

	Status      ContractStatus  `gorm:"type:varchar(32);not null;default:'draft';index;check:status IN ('draft','pending_engineering','pending_finance','pending_legal','pending_ceo','ready_to_print','signed','active','closed','cancelled')" json:"status"`
	GrossBudget decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"gross_budget"`
	Currency    string          `gorm:"size:3;not null;default:'IRR';check:char_length(currency)=3" json:"currency"`

	// Basis-point financial parameters. 1000 bps = 10.00%.
	PerformanceBondPctBps int `gorm:"not null;default:0;check:performance_bond_pct_bps >= 0 AND performance_bond_pct_bps <= 10000" json:"performance_bond_pct_bps"`
	InsuranceRatePctBps   int `gorm:"not null;default:0;check:insurance_rate_pct_bps >= 0 AND insurance_rate_pct_bps <= 10000" json:"insurance_rate_pct_bps"`
	VatPctBps             int `gorm:"not null;default:0;check:vat_pct_bps >= 0 AND vat_pct_bps <= 10000" json:"vat_pct_bps"`

	// Kept for backward compat with statement calculations.
	RetentionPctBps      int `gorm:"not null;default:0;check:retention_pct_bps >= 0 AND retention_pct_bps <= 10000" json:"retention_pct_bps"`
	AdvancePctBps        int `gorm:"not null;default:0;check:advance_pct_bps >= 0 AND advance_pct_bps <= 10000" json:"advance_pct_bps"`
	SocialSecurityPctBps int `gorm:"not null;default:0;check:social_security_pct_bps >= 0 AND social_security_pct_bps <= 10000" json:"social_security_pct_bps"`

	SignedAt *time.Time `json:"signed_at,omitempty"`
	StartsOn *time.Time `gorm:"index" json:"starts_on,omitempty"`
	EndsOn   *time.Time `gorm:"index" json:"ends_on,omitempty"`

	ScannedFileURL string `gorm:"size:512" json:"scanned_file_url,omitempty"`

	// Unit-rate contract fields.
	BOQVersion          string          `gorm:"size:128"                                                                                   json:"boq_version,omitempty"`
	ContractCoefficient decimal.Decimal `gorm:"type:numeric(8,4);not null;default:1"                                                       json:"contract_coefficient"`

	// Cost-plus contract fields.
	ManagementFeePctBps  int    `gorm:"not null;default:0;check:management_fee_pct_bps >= 0 AND management_fee_pct_bps <= 10000" json:"management_fee_pct_bps"`
	FeeCalculationMethod string `gorm:"size:32"                                                                                json:"fee_calculation_method,omitempty"`

	Company    *Company           `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"    json:"-"`
	Project    *Project           `gorm:"foreignKey:ProjectID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"    json:"-"`
	Contractor *Contractor        `gorm:"foreignKey:ContractorID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	Employer   *Company           `gorm:"foreignKey:EmployerID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"   json:"-"`
	Consultant *Consultant        `gorm:"foreignKey:ConsultantID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"-"`
	Statements []InterimStatement `gorm:"foreignKey:ContractID"                                                               json:"-"`
	LineItems  []ContractLineItem `gorm:"foreignKey:ContractID"                                                               json:"-"`
}

func (Contract) TableName() string { return "contracts" }

// ContractLineItem is the Bill-of-Quantities (WBS) line for a contract.
// ContractorID and ProjectID are denormalized from the parent contract for
// query convenience.
type ContractLineItem struct {
	BaseModel
	ContractID   uuid.UUID  `gorm:"type:uuid;not null;index"  json:"contract_id"`
	ContractorID *uuid.UUID `gorm:"type:uuid;index"           json:"contractor_id,omitempty"`
	ProjectID    *uuid.UUID `gorm:"type:uuid;index"           json:"project_id,omitempty"`
	SortOrder    int             `gorm:"not null;default:0"                                      json:"sort_order"`
	Description  string          `gorm:"type:text;not null"                                      json:"description"`
	Unit         string          `gorm:"size:32;not null"                                        json:"unit"`
	Quantity     decimal.Decimal `gorm:"type:numeric(20,4);not null;default:0"                   json:"quantity"`
	UnitRate     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0"                   json:"unit_rate"`
	CurrencyCode string          `gorm:"size:3;not null;default:'IRR';check:char_length(currency_code)=3" json:"currency_code"`

	Contract *Contract `gorm:"foreignKey:ContractID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
}

func (ContractLineItem) TableName() string { return "contract_line_items" }
