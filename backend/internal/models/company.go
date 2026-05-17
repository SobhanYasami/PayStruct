package model

import (
	"github.com/google/uuid"
)

type Company struct {
	BaseModel
	Name       string `gorm:"size:255;not null;index"                              json:"name"`
	RegNum     string `gorm:"size:64;not null;uniqueIndex:idx_companies_reg"       json:"reg_num"`
	CountryCode string `gorm:"size:2;not null;default:'IR'"                        json:"country_code"`
	TaxID      *string `gorm:"size:64;uniqueIndex:idx_companies_tax"               json:"tax_id,omitempty"`
	IsActive   bool   `gorm:"not null;default:true;index"                          json:"is_active"`

	// Self-referential: nil = root company.
	ParentID      *uuid.UUID `gorm:"type:uuid;index"                                                                  json:"parent_id,omitempty"`
	Parent        *Company   `gorm:"foreignKey:ParentID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"  json:"-"`
	Children      []Company  `gorm:"foreignKey:ParentID;references:ID"                                                json:"-"`

	// Root tenant anchor: nil means this company IS the root.
	RootCompanyID *uuid.UUID `gorm:"type:uuid;index" json:"root_company_id,omitempty"`
	RootCompany   *Company   `gorm:"foreignKey:RootCompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;constraint:false" json:"-"`

	// Manager link — no DB-level FK to avoid companies ↔ employees cycle.
	ManagerID *uuid.UUID `gorm:"type:uuid;uniqueIndex:idx_companies_manager" json:"manager_id,omitempty"`
	Manager   *Employee  `gorm:"foreignKey:ManagerID;references:ID;constraint:false" json:"-"`

	// Department heads — constraint:false for same cycle reason.
	EngineeringHeadID *uuid.UUID `gorm:"type:uuid;index" json:"engineering_head_id,omitempty"`
	FinancialHeadID   *uuid.UUID `gorm:"type:uuid;index" json:"financial_head_id,omitempty"`
	JuridicalHeadID   *uuid.UUID `gorm:"type:uuid;index" json:"juridical_head_id,omitempty"`
	SecurityHeadID    *uuid.UUID `gorm:"type:uuid;index" json:"security_head_id,omitempty"`

	EngineeringHead *Employee `gorm:"foreignKey:EngineeringHeadID;references:ID;constraint:false" json:"-"`
	FinancialHead   *Employee `gorm:"foreignKey:FinancialHeadID;references:ID;constraint:false"   json:"-"`
	JuridicalHead   *Employee `gorm:"foreignKey:JuridicalHeadID;references:ID;constraint:false"   json:"-"`
	SecurityHead    *Employee `gorm:"foreignKey:SecurityHeadID;references:ID;constraint:false"    json:"-"`

	Employees []Employee `gorm:"foreignKey:CompanyID" json:"-"`
	Projects  []Project  `gorm:"foreignKey:CompanyID" json:"-"`
}

func (Company) TableName() string { return "companies" }
