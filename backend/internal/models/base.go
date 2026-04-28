// Package model holds the persistent domain entities for PayStruct.
//
// Schema is derived from the EER diagram (EER Diagram 1405.01.09.drawio).
// Conventions:
//   - All entities embed BaseModel (UUIDv7 PK, soft-delete, audit ts).
//   - Money fields are numeric(20,2) backed by shopspring/decimal — never float.
//   - Foreign keys use ON DELETE RESTRICT for parent integrity, except weak
//     entities (Status Statement and its children) which CASCADE.
//   - All enum-shaped fields are constrained with both a Go type and a DB
//     CHECK so the invariant survives ad-hoc SQL writes.
package model

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseModel is embedded into every persistent entity. UUIDv7 is monotonic,
// so primary-key index pages stay write-friendly (no random insertion hot
// spots) without leaking row counts the way a bigserial would.
type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"             json:"id"`
	CreatedAt time.Time      `gorm:"index;not null;default:now()"     json:"created_at"`
	UpdatedAt time.Time      `gorm:"not null;default:now()"           json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"                            json:"-"`
}

// BeforeCreate assigns a UUIDv7 if the caller did not supply one. Returning
// an error rather than panicking matches GORM's hook contract; the caller's
// transaction will rollback cleanly.
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

// AllModels enumerates every concrete type. Pass to gorm.AutoMigrate or feed
// to a migration generator (e.g. atlas, goose) to keep schema in lockstep
// with code.
func AllModels() []any {
	return []any{
		&Company{},
		&Employee{},
		&Project{},
		&Contractor{},
		&Contract{},
		&StatusStatement{},
		&WorksDone{},
		&ExtraWork{},
		&Deduction{},
	}
}

// errInvalidEnum is returned by Scan implementations on unrecognized values.
// Wrap with %w so callers can errors.Is against it.
var errInvalidEnum = errors.New("model: invalid enum value")

func enumScanErr(typ string, v any) error {
	return fmt.Errorf("%w: %s got %T(%v)", errInvalidEnum, typ, v, v)
}
