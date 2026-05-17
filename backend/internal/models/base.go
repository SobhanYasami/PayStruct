package model

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"             json:"id"`
	CreatedAt time.Time      `gorm:"index;not null;default:now()"     json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:now()"           json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"                            json:"-"`
}

func (b *BaseModel) BeforeCreate(_ *gorm.DB) error {
	if b.ID != uuid.Nil {
		return nil
	}
	v7, err := uuid.NewV7()
	if err != nil {
		return errors.Join(errors.New("model: uuid v7 generation failed"), err)
	}
	b.ID = v7
	return nil
}

// AllModels enumerates every concrete type in FK-safe order.
func AllModels() []any {
	return []any{
		// independent / root
		&Currency{},
		&Company{},
		// company-owned
		&Employee{},
		&Project{},
		&RefreshToken{},
		// contract side
		&Contractor{},
		&Contract{},
		&ContractLineItem{},
		// financial
		&FXRate{},
		// statement tree
		&InterimStatement{},
		&WorkDoneItem{},
		&ExtraWorkItem{},
		&RetentionRecord{},
		&AdvancePaymentRecord{},
		&LiquidatedDamage{},
		// audit
		&ApprovalEvent{},
		&Attachment{},
	}
}

var errInvalidEnum = errors.New("model: invalid enum value")

func enumScanErr(typ string, v any) error {
	return fmt.Errorf("%w: %s got %T(%v)", errInvalidEnum, typ, v, v)
}
