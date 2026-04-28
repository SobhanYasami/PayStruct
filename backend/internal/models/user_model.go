package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ! ===================================================================================================
// ! Contains Basic Information
// ! --------------------------------
type BaseInfoModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"` // soft delete support
}

// ! BeforeCreate hook for User model
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

// ! ==================================================================================================
// ! Company Model
// ! ------------------------
type Company struct {
	BaseInfoModel
	Name               string `json:"name" gorm:"type:varchar(200);not null"`
	RegistrationNumber string `json:"registration_number" gorm:"varchar(40);not null"`
	TaxIdNumber        string `json:"tax_id_number" gorm:"varchar(40);not null"`
	IsActive           bool   `json:"is_active" gorm:"default:true"`

	ParentID  *uuid.UUID `json:"parent_id" gorm:"type:uuid;index"` // NULL = mother company
	AddressID uuid.UUID  `json:"address_id" gorm:"type:uuid;index"`
	ContactID uuid.UUID  `json:"contact_id" gorm:"type:uuid;index"`

	CreatedBy *uuid.UUID `gorm:"type:uuid;index"`
	UpdatedBy *uuid.UUID `gorm:"type:uuid;index"`
	DeletedBy *uuid.UUID `gorm:"type:uuid;index"`
}

type Address struct {
	BaseInfoModel
	Street     string `json:"street" gorm:"type:varchar(255);not null"`
	City       string `json:"city" gorm:"type:varchar(100);not null"`
	State      string `json:"state" gorm:"type:varchar(100)"`
	Country    string `json:"country" gorm:"type:varchar(100)"`
	PostalCode string `json:"postal_code" gorm:"type:varchar(20)"`

	Company Company `gorm:"constraint:OnDelete:CASCADE;"`
}

type Contact struct {
	BaseInfoModel
	PhoneNumber string `json:"phone_number" gorm:"type:varchar(20);default:null"`
	Email       string `json:"email" gorm:"type:varchar(255);default:null"`
	Website     string `json:"website" gorm:"type:varchar(255);default:null"`

	Company Company `gorm:"constraint:OnDelete:CASCADE;"`
}

// ! ===============================================================================================
// ! Employee Model
// ! ----------------------------
type Employee struct {
	BaseInfoModel
	FirstName string `json:"first_name" gorm:"type:varchar(100);not null"`
	LastName  string `json:"last_name" gorm:"type:varchar(100)"`

	UserName string `gorm:"type:varchar(50);not null;uniqueIndex:idx_company_username"`
	Password string `json:"-" gorm:"type:varchar(255);not null"`

	RegisterationID string `json:"registration_id" gorm:"type:varchar(10);not null"`
	Phone           string `json:"phone,omitempty" gorm:"type:varchar(15);default:null"`
	IsActive        bool   `json:"is_active" gorm:"default:true"`

	CompanyID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_company_username"`
	Company   Company   `gorm:"constraint:OnDelete:CASCADE;"`
}

// ! -------------
// ! Roles
// ! --------------
type RoleCode string

const (
	RoleSudoer          RoleCode = "sudoer"
	RoleManagerUser     RoleCode = "manager_user"
	RoleEngineeringUser RoleCode = "engineering_user"
	RoleHRUser          RoleCode = "hr_user"
	RoleFinancialUser   RoleCode = "financial_user"
	RoleLawUser         RoleCode = "law_user"
)

type Role struct {
	BaseInfoModel
	Code RoleCode `json:"code" gorm:"type:varchar(50);not null;uniqueIndex:idx_company_role"`

	CompanyID *uuid.UUID `gorm:"type:uuid;uniqueIndex:idx_company_role"`
}

//! ----------------
//! Permissions
//! -----------------

type Permission struct {
	BaseInfoModel
	Resource string `gorm:"uniqueIndex:idx_resource_action"`
	Action   string `gorm:"uniqueIndex:idx_resource_action"`
}

// ! ==============================================================================================
// ! Many-to-Many Relations
// ! -----------------------
type RoleCompany struct {
	RoleID    uuid.UUID `json:"role_id" gorm:"type:uuid;primaryKey"`
	CompanyID uuid.UUID `json:"company_id" gorm:"type:uuid;primaryKey"`

	Role    Role    `gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE;"`
	Company Company `gorm:"foreignKey:CompanyID;constraint:OnDelete:CASCADE;"`
}
type RolePermission struct {
	RoleID       uuid.UUID `json:"role_id" gorm:"type:uuid;primaryKey"`
	PermissionID uuid.UUID `json:"permission_id" gorm:"type:uuid;primaryKey"`

	Role       Role       `gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE;"`
	Permission Permission `gorm:"foreignKey:PermissionID;constraint:OnDelete:CASCADE;"`
}

type RoleEmployee struct {
	EmployeeID uuid.UUID `gorm:"type:uuid;primaryKey;index"`
	RoleID     uuid.UUID `gorm:"type:uuid;primaryKey;index"`

	Role     Role     `gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE;"`
	Employee Employee `gorm:"foreignKey:EmployeeID;constraint:OnDelete:CASCADE;"`
}

// ! ===============================================================================================
// ! Contractor Model
// ! ----------------------------
type Contractor struct {
	BaseInfoModel
	FirstName      string `json:"first_name" gorm:"type:varchar(100);not null"`
	LastName       string `json:"last_name" gorm:"type:varchar(100)"`
	IsLegalEntity  bool   `json:"is_legal_entity" gorm:"default:false;not null"`
	PreferentialID string `json:"preferential_id" gorm:"size:100"`
	NationalID     string `json:"national_id" gorm:"size:100;index"`

	CreatedBy uuid.UUID `json:"created_by,omitempty" gorm:"type:uuid;index"`
	UpdatedBy uuid.UUID `json:"updated_by,omitempty" gorm:"type:uuid"`
	DeletedBy uuid.UUID `json:"deleted_by,omitempty" gorm:"type:uuid"`

	CompanyID uuid.UUID `gorm:"type:uuid;not null;index"`
}
