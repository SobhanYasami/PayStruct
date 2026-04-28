package model

import (
	"github.com/google/uuid"
)

// Company is the strong entity at the apex of the EER.
//
// Two candidate keys per the diagram: the surrogate UUID PK from BaseModel,
// and the natural RegNum (national registration number). RegNum is enforced
// UNIQUE NOT NULL — a candidate key that lives as a unique index, not the
// PK, so we keep predictable, opaque identifiers in URLs.
//
// Self-reference: ParentID models the EER "Parent of" 1:N relationship
// (corporate hierarchy / subsidiaries). NULL = root company. Deleting a
// parent SETs NULL on children rather than cascading — a hierarchy collapse
// shouldn't silently drop subsidiaries.
//
// 1:1 link to Manager: per the EER's "Has-1" between Company and Manager.
// The FK is nullable to break the chicken-and-egg with Employee.CompanyID
// at insert time. Application invariant (NOT enforced at the DB level
// without a trigger): the referenced Employee must have RoleManager.
type Company struct {
	BaseModel
	Name   string `gorm:"size:255;not null;index"                          json:"name"`
	RegNum string `gorm:"size:64;not null;uniqueIndex:idx_companies_reg"   json:"reg_num"`

	// Self-referential parent (nullable: root nodes).
	ParentID *uuid.UUID `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Parent   *Company   `gorm:"foreignKey:ParentID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"-"`
	Children []Company  `gorm:"foreignKey:ParentID;references:ID"                                              json:"-"`

	// 1:1 manager. UNIQUE on manager_id keeps it strictly 1:1 (one
	// employee cannot manage two companies simultaneously).
	ManagerID *uuid.UUID `gorm:"type:uuid;uniqueIndex:idx_companies_manager"                                      json:"manager_id,omitempty"`
	Manager   *Employee  `gorm:"foreignKey:ManagerID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"-"`

	// 1:N collections (back-references).
	Employees []Employee `gorm:"foreignKey:CompanyID" json:"-"`
	Projects  []Project  `gorm:"foreignKey:CompanyID" json:"-"`
}

func (Company) TableName() string { return "companies" }
