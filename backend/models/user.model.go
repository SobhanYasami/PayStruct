package models

import (
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        uuid.UUID `json:"id" gorm:"type:char(36);primaryKey"`
	FirstName string    `json:"first_name" gorm:"type:varchar(255)"`
	LastName  string    `json:"last_name" gorm:"type:varchar(255)"`
	Phone     string    `json:"phone,omitempty" gorm:"type:varchar(20);uniqueIndex;default:null"`
	UserName  string    `json:"user_name" gorm:"type:varchar(255);not null;uniqueIndex"`
	Password  string    `json:"password" gorm:"type:varchar(255);not null"`
	Role      string    `json:"role" gorm:"type:varchar(255)"`
	CreatedAt int64     `gorm:"autoCreateTime"`
	UpdatedAt int64     `gorm:"autoUpdateTime"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

type JWTClaims struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}
