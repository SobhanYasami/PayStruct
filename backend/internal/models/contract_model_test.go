package models

import (
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

func TestContractWBS_BeforeSaveHook(t *testing.T) {
	db, err := SetupTestDB()
	if err != nil {
		t.Fatal(err)
	}

	err = db.AutoMigrate(&ContractWBS{})
	if err != nil {
		t.Fatal(err)
	}

	wbs := ContractWBS{
		Quantity:  decimal.NewFromInt(10),
		UnitPrice: decimal.NewFromInt(50),
	}

	if err := db.Create(&wbs).Error; err != nil {
		t.Fatal(err)
	}

	expected := decimal.NewFromInt(500)

	if !wbs.TotalPrice.Equal(expected) {
		t.Errorf("expected %s, got %s", expected, wbs.TotalPrice)
	}
}

func TestBaseModel_GeneratesUUIDOnCreate(t *testing.T) {
	db, err := SetupTestDB()
	if err != nil {
		t.Fatal(err)
	}

	err = db.AutoMigrate(&Company{})
	if err != nil {
		t.Fatal(err)
	}

	company := Company{Name: "TestCo"}

	if err := db.Create(&company).Error; err != nil {
		t.Fatal(err)
	}

	if company.ID == uuid.Nil {
		t.Error("expected UUID to be generated")
	}
}

func TestProject_DefaultPhase(t *testing.T) {
	db, _ := SetupTestDB()
	db.AutoMigrate(&Company{}, &Project{})

	company := Company{Name: "TestCo"}
	db.Create(&company)

	project := Project{
		Name:      "Test",
		CompanyID: company.ID,
	}

	db.Create(&project)

	if project.Phase != PhasePlanning {
		t.Errorf("expected default phase %d, got %d", PhasePlanning, project.Phase)
	}
}

func TestTotalCalculation(t *testing.T, model interface {
	GetTotal() decimal.Decimal
}) {
	expected := decimal.NewFromInt(500)

	if !model.GetTotal().Equal(expected) {
		t.Errorf("expected %s, got %s", expected, model.GetTotal())
	}
}
