package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ---------
// Contains Basic Information
// -------
type BaseInfoModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// BeforeCreate hook for User model
func (b *BaseInfoModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		id, err := uuid.NewV7()
		if err != nil {
			return err
		}
		b.ID = id
	}
	return nil
}

// -----
//
// ---------
type Company struct {
	BaseInfoModel
	Name     string     `json:"name" gorm:"type:varchar(200);not null"`
	ParentID *uuid.UUID `json:"parent_id" gorm:"type:uuid;index"` // NULL = mother company
	IsActive bool       `json:"is_active" gorm:"default:true"`
}

// ----------------------------
// Employee Model
// ----------------------------
type Employee struct {
	BaseInfoModel
	FirstName string `json:"first_name" gorm:"type:varchar(100);not null"`
	LastName  string `json:"last_name" gorm:"type:varchar(100)"`

	UserName string `gorm:"type:varchar(50);not null;uniqueIndex:idx_company_username"`
	Password string `json:"-" gorm:"type:varchar(255);not null"`

	Phone    string `json:"phone,omitempty" gorm:"type:varchar(15);default:null"`
	IsActive bool   `json:"is_active" gorm:"default:true"`

	CompanyID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_company_username"`
	Company   Company   `gorm:"constraint:OnDelete:CASCADE;"`
}

// ----
// Role Model for employees
// -----
// values: sudoer - manager_user - technical_user - hr_user - finance_user - lawyer_user
type Role struct {
	BaseInfoModel
	Name        string `gorm:"type:varchar(50);not null;uniqueIndex:idx_company_role"`
	Description string `json:"description" gorm:"type:text"`

	CompanyID *uuid.UUID `gorm:"type:uuid;uniqueIndex:idx_company_role"`
}

// ---
// Permissions
// ---
type Permission struct {
	BaseInfoModel
	Resource string `gorm:"type:varchar(100);uniqueIndex:idx_resource_action"`
	Action   string `gorm:"type:varchar(50);uniqueIndex:idx_resource_action"`
}

// ---
// Many-to-Many Relations
// ---
type RolePermission struct {
	RoleID       uuid.UUID `json:"role_id" gorm:"type:uuid;primaryKey"`
	PermissionID uuid.UUID `json:"permission_id" gorm:"type:uuid;primaryKey"`

	Role       Role       `gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE;"`
	Permission Permission `gorm:"foreignKey:PermissionID;constraint:OnDelete:CASCADE;"`
}

type EmployeeRole struct {
	EmployeeID uuid.UUID `gorm:"type:uuid;primaryKey;index"`
	RoleID     uuid.UUID `gorm:"type:uuid;primaryKey;index"`

	Role     Role     `gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE;"`
	Employee Employee `gorm:"foreignKey:EmployeeID;constraint:OnDelete:CASCADE;"`
}

// ----------------------------
// Contractor Model
// ----------------------------
type Contractor struct {
	BaseInfoModel
	LegalEntity    bool   `json:"legal_entity" gorm:"default:false;not null"`
	PreferentialID string `json:"preferential_id" gorm:"size:100"`
	NationalID     string `json:"national_id" gorm:"size:100;index"`

	CreatedBy uuid.UUID `json:"created_by,omitempty" gorm:"type:uuid;index"`
	UpdatedBy uuid.UUID `json:"updated_by,omitempty" gorm:"type:uuid"`
	DeletedBy uuid.UUID `json:"deleted_by,omitempty" gorm:"type:uuid"`

	CompanyID uuid.UUID `gorm:"type:uuid;not null;index"`
}

// ----------------------------
// Customer Model - extends User
// ----------------------------
type Customer struct {
	BaseInfoModel
	NationalID string `json:"national_id,omitempty" gorm:"size:100"`
	PersonalID string `json:"personal_id,omitempty" gorm:"size:100"`

	CreatedBy uuid.UUID `json:"created_by,omitempty" gorm:"type:uuid;index"`
	UpdatedBy uuid.UUID `json:"updated_by,omitempty" gorm:"type:uuid"`
	DeletedBy uuid.UUID `json:"deleted_by,omitempty" gorm:"type:uuid"`

	CompanyID uuid.UUID `gorm:"type:uuid;not null;index"`
}
