package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ! BaseModel contains common fields for all models
type User struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey"` // Changed this
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"`

	FirstName string `json:"first_name" gorm:"type:varchar(100);not null"`
	LastName  string `json:"last_name" gorm:"type:varchar(100)"`
}

// ! BeforeCreate hook for BaseModel
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// !
type Employee struct {
	User
	UserName string `json:"user_name" gorm:"type:varchar(50);not null;uniqueIndex"`
	Password string `json:"password" gorm:"type:varchar(255);not null"`
	Phone    string `json:"phone,omitempty" gorm:"type:varchar(15);uniqueIndex;default:null"`
	Role     string `json:"role" gorm:"type:varchar(30);not null;index"`
	IsActive bool   `json:"is_active" gorm:"default:true"`
}

// !
type Contractor struct {
	User
	LegalEntity    bool   `json:"legal_entity" gorm:"default:false;not null"`
	PreferentialID string `json:"preferential_id,omitempty" gorm:"size:100"`
	NationalID     string `json:"national_id,omitempty" gorm:"size:100"`

	CreatedBy uuid.UUID `json:"created_by,omitempty" gorm:"type:char(36);index"`
	UpdatedBy uuid.UUID `json:"updated_by,omitempty" gorm:"type:char(36)"`
	DeletedBy uuid.UUID `json:"deleted_by,omitempty" gorm:"type:char(36)"`
}

// Todo: --------------------------------
type Customer struct {
	User
}
