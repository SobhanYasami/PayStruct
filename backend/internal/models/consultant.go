package model

import (
	"time"

	"github.com/google/uuid"
)

// Consultant is a consulting engineering firm engaged for design, supervision,
// or advisory services on a project. Unlike Contractor (execution), consultants
// provide technical and supervisory oversight.
type Consultant struct {
	BaseModel

	// Owning company — nullable so shared consultants remain visible to all.
	CompanyID   *uuid.UUID `gorm:"type:uuid;index"  json:"company_id,omitempty"`
	CreatedByID *uuid.UUID `gorm:"type:uuid"        json:"created_by_id,omitempty"`

	Name      string `gorm:"size:255;not null;index"    json:"name"`
	LegalName string `gorm:"size:255"                   json:"legal_name,omitempty"`

	RegistrationNo *string `gorm:"size:64;uniqueIndex:idx_consultants_reg" json:"registration_no,omitempty"`
	TaxID          *string `gorm:"size:64;uniqueIndex:idx_consultants_tax" json:"tax_id,omitempty"`

	// Engineering-specific fields.
	Specialization string     `gorm:"size:128"  json:"specialization,omitempty"`
	LicenseNo      string     `gorm:"size:128"  json:"license_no,omitempty"`
	LicenseExpiry  *time.Time `gorm:"index"     json:"license_expiry,omitempty"`

	DefaultCurrency string `gorm:"size:3;not null;default:'IRR'" json:"default_currency"`
	ContactJSON     string `gorm:"type:jsonb;default:'{}'"        json:"contact,omitempty"`

	Rating   *float32 `gorm:"check:rating IS NULL OR (rating >= 0 AND rating <= 5)" json:"rating,omitempty"`
	IsActive bool     `gorm:"not null;default:true"                                 json:"is_active"`

	OwnerCompany *Company  `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"  json:"-"`
	CreatedBy    *Employee `gorm:"foreignKey:CreatedByID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"-"`
}

func (Consultant) TableName() string { return "consultants" }
