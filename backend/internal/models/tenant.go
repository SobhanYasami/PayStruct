package model

import (
	"time"

	"github.com/google/uuid"
)

// RefreshToken stores the hash of an issued refresh token. The actual token
// value is never persisted — only its SHA-256 hash (hex-encoded).
type RefreshToken struct {
	BaseModel
	UserID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	TokenHash string     `gorm:"size:128;not null;uniqueIndex" json:"-"`
	ExpiresAt time.Time  `gorm:"not null;index" json:"expires_at"`
	RevokedAt *time.Time `gorm:"index" json:"revoked_at,omitempty"`

	User *Employee `gorm:"foreignKey:UserID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (RefreshToken) TableName() string { return "refresh_tokens" }
