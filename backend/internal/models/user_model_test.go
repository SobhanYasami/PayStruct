package models

import (
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestBeforeCreateGeneratesUUID(t *testing.T) {
	var model BaseInfoModel

	err := model.BeforeCreate(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if model.ID == uuid.Nil {
		t.Fatal("expected UUID to be generated, got Nil")
	}
}

func TestBeforeCreateDoesNotOverrideExistingID(t *testing.T) {
	existingID := uuid.New()

	tests := []struct {
		name string
		id   uuid.UUID
	}{
		{"has existing ID", existingID},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			model := BaseInfoModel{
				ID: tt.id,
			}

			err := model.BeforeCreate(nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if model.ID != existingID {
				t.Errorf("expected ID to remain %v, got %v", existingID, model.ID)
			}
		})
	}
}

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open db: %v", err)
	}

	err = db.AutoMigrate(&Company{}, &Employee{})
	if err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	return db
}

func TestEmployeeUsernameUniquePerCompany(t *testing.T) {
	db := setupTestDB(t)

	company := Company{Name: "Test Co"}
	if err := db.Create(&company).Error; err != nil {
		t.Fatalf("failed to create company: %v", err)
	}

	e1 := Employee{
		UserName:  "john",
		Password:  "123",
		CompanyID: company.ID,
	}

	e2 := Employee{
		UserName:  "john",
		Password:  "456",
		CompanyID: company.ID,
	}

	if err := db.Create(&e1).Error; err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if err := db.Create(&e2).Error; err == nil {
		t.Fatal("expected unique constraint error, got nil")
	}
}
