package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ApprovalEvent is an immutable audit record of every status transition on
// any approvable entity (InterimStatement, Contract, …). No BaseModel embed
// because approval events are never soft-deleted.
type ApprovalEvent struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey"                                      json:"id"`
	EntityType string    `gorm:"size:64;not null;index:idx_approval_entity"                json:"entity_type"`
	EntityID   uuid.UUID `gorm:"type:uuid;not null;index:idx_approval_entity"              json:"entity_id"`
	ActorID    uuid.UUID `gorm:"type:uuid;not null;index"                                  json:"actor_id"`
	FromStatus string    `gorm:"size:32;not null"                                          json:"from_status"`
	ToStatus   string    `gorm:"size:32;not null"                                          json:"to_status"`
	Comment    string    `gorm:"type:text"                                                 json:"comment,omitempty"`
	CreatedAt  time.Time `gorm:"not null;default:now();index"                              json:"created_at"`
}

func (a *ApprovalEvent) BeforeCreate(_ *gorm.DB) error {
	if a.ID != uuid.Nil {
		return nil
	}
	v7, err := uuid.NewV7()
	if err != nil {
		return err
	}
	a.ID = v7
	return nil
}

func (ApprovalEvent) TableName() string { return "approval_events" }

// Attachment stores metadata for files uploaded against any entity.
type Attachment struct {
	BaseModel
	CompanyID    uuid.UUID `gorm:"type:uuid;not null;index"  json:"company_id"`
	EntityType   string    `gorm:"size:64;not null;index"    json:"entity_type"`
	EntityID     uuid.UUID `gorm:"type:uuid;not null;index"  json:"entity_id"`
	FileName     string    `gorm:"size:255;not null"         json:"file_name"`
	StorageKey   string    `gorm:"size:512;not null"         json:"storage_key"`
	MimeType     string    `gorm:"size:128;not null"         json:"mime_type"`
	SizeBytes    int64     `gorm:"not null"                  json:"size_bytes"`
	UploadedByID uuid.UUID `gorm:"type:uuid;not null;index"  json:"uploaded_by_id"`

	Company    *Company  `gorm:"foreignKey:CompanyID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
	UploadedBy *Employee `gorm:"foreignKey:UploadedByID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"-"`
}

func (Attachment) TableName() string { return "attachments" }
