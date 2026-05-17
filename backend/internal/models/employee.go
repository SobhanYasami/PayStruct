package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/shopspring/decimal"
)

type Employee struct {
	BaseModel
	CompanyID  uuid.UUID `gorm:"type:uuid;not null;index" json:"company_id"`
	NationalID string    `gorm:"size:32;not null;uniqueIndex" json:"national_id"`

	FirstName string `gorm:"size:120;not null" json:"first_name"`
	LastName  string `gorm:"size:120;not null" json:"last_name"`
	Email     string `gorm:"size:320;uniqueIndex" json:"email,omitempty"`
	Phone     string `gorm:"size:32" json:"phone,omitempty"`

	Department string `gorm:"size:128;index" json:"department,omitempty"`
	Position   string `gorm:"size:128" json:"position,omitempty"`

	BaseSalary     decimal.Decimal `gorm:"type:numeric(20,8);not null;default:0" json:"base_salary"`
	SalaryCurrency string          `gorm:"size:3;not null;default:'IRR'" json:"salary_currency"`

	HiredAt      *time.Time `gorm:"index" json:"hired_at,omitempty"`
	TerminatedAt *time.Time `gorm:"index" json:"terminated_at,omitempty"`

	EmploymentType EmploymentType `gorm:"type:varchar(16);not null;index;check:employment_type IN ('official','contractual')" json:"employment_type"`
	Roles          pq.StringArray `gorm:"type:text[];not null;default:'{}'" json:"roles"`
	IsHead         bool           `gorm:"not null;default:false;index" json:"is_head"`

	PasswordHash []byte `gorm:"type:bytea" json:"-"`
	Active       bool   `gorm:"not null;default:true;index" json:"active"`

	Company *Company `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
}

func (Employee) TableName() string { return "employees" }

func (e *Employee) HasRole(r Role) bool {
	for _, x := range e.Roles {
		if Role(x) == r {
			return true
		}
	}
	return false
}

func (e *Employee) FullName() string {
	if e.FirstName == "" {
		return e.LastName
	}
	if e.LastName == "" {
		return e.FirstName
	}
	return e.FirstName + " " + e.LastName
}
