package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
	"gorm.io/gorm"
)

// --------------------------
// CompanyService handles operations related to companies.
// --------------------------
type CompanyService struct {
	db *gorm.DB
}

func NewCompanyService(db *gorm.DB) *CompanyService {
	return &CompanyService{db: db}
}

// ! 1) Create Main Company
func (s *CompanyService) CreateCompany(ctx context.Context, name string, parentID *uuid.UUID, createdBy uuid.UUID) (*models.Company, error) {
	//? 1. Validate input
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("company name cannot be empty")
	}

	//? 2. enforce max length
	if len(name) > 100 {
		return nil, fmt.Errorf("company name too long")
	}

	//? 3. Check parent exists if parentID is provided
	if parentID != nil {
		var parent models.Company
		if err := s.db.WithContext(ctx).First(&parent, "id = ? AND is_active = TRUE", *parentID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("parent company not found")
			}
			return nil, fmt.Errorf("failed to verify parent company: %w", err)
		}
	}

	//? 4. Check for duplicate name under same parent (scalability & robustness)
	var count int64
	query := s.db.WithContext(ctx).Model(&models.Company{}).Where("name = ?", name)
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	if err := query.Count(&count).Error; err != nil {
		return nil, fmt.Errorf("failed to check duplicate company: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("company with the same name already exists under this parent")
	}

	// 5️⃣ Prepare company struct
	company := &models.Company{
		Name:      name,
		IsActive:  true,
		ParentID:  parentID,
		CreatedBy: &createdBy,
		UpdatedBy: &createdBy,
	}

	//? 6. Use transaction (robustness & scalability)
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(company).Error; err != nil {
			return fmt.Errorf("failed to create company: %w", err)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return company, nil
}

// ! 2) Get Main Company Details
func (s *CompanyService) GetCompanyDetails(ctx context.Context, companyID uuid.UUID) (*models.Company, error) {
	var company models.Company
	if err := s.db.WithContext(ctx).First(&company, "id = ? AND is_active = TRUE", companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("company not found")
		}
		return nil, fmt.Errorf("failed to get company details: %w", err)
	}
	return &company, nil
}

// ! 3) Update Main Company Details
func (s *CompanyService) UpdateCompany(ctx context.Context, companyID uuid.UUID, name string, parentID *uuid.UUID, updatedBy uuid.UUID) (*models.Company, error) {
	//? 1. Validate input
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("company name cannot be empty")
	}

	//? 2. enforce max length
	if len(name) > 100 {
		return nil, fmt.Errorf("company name too long")
	}

	//? 3. Check company exists
	var company models.Company
	if err := s.db.WithContext(ctx).First(&company, "id = ? AND is_active = TRUE", companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("company not found")
		}
		return nil, fmt.Errorf("failed to get company: %w", err)
	}

	//? 4. Check parent exists if parentID is provided
	if parentID != nil {
		var parent models.Company
		if err := s.db.WithContext(ctx).First(&parent, "id = ? AND is_active = TRUE", *parentID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("parent company not found")
			}
			return nil, fmt.Errorf("failed to verify parent company: %w", err)
		}
	}

	//? 5. Check for duplicate name under same parent (scalability & robustness)
	var count int64
	query := s.db.WithContext(ctx).Model(&models.Company{}).Where("name = ? AND id != ?", name, companyID)
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	} else {
		query = query.Where("parent_id IS NULL")
	}
	if err := query.Count(&count).Error; err != nil {
		return nil, fmt.Errorf("failed to check duplicate company: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("company with the same name already exists under this parent")
	}

	//? 6. Update fields
	company.Name = name
	company.ParentID = parentID
	company.UpdatedBy = &updatedBy

	//? 7. Use transaction (robustness & scalability)
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&company).Error; err != nil {
			return fmt.Errorf("failed to update company: %w", err)
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return &company, nil
}

// ! 4) Delete Main Company (Soft Delete)
func (s *CompanyService) DeleteCompany(ctx context.Context, companyID uuid.UUID, deletedBy uuid.UUID) error {
	//? 1. Check company exists
	var company models.Company
	if err := s.db.WithContext(ctx).First(&company, "id = ? AND is_active = TRUE", companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("company not found")
		}
		return fmt.Errorf("failed to get company: %w", err)
	}

	//? 2. Soft delete (set is_active to false)
	company.IsActive = false
	company.UpdatedBy = &deletedBy

	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&company).Error; err != nil {
			return fmt.Errorf("failed to delete company: %w", err)
		}
		return nil
	}); err != nil {
		return err
	}

	return nil
}

// ! 5) List All Companies (with pagination and search)
func (s *CompanyService) ListCompanies(ctx context.Context, search string, page, pageSize int) ([]models.Company, int64, error) {
	var companies []models.Company
	var total int64

	query := s.db.WithContext(ctx).Model(&models.Company{}).Where("is_active = TRUE")

	if search != "" {
		search = "%" + strings.TrimSpace(search) + "%"
		query = query.Where("name ILIKE ?", search)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count companies: %w", err)
	}

	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Limit(pageSize).Offset(offset).Find(&companies).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list companies: %w", err)
	}

	return companies, total, nil
}

// ! 6) List Employees of a Company
func (s *CompanyService) ListCompanyEmployees(ctx context.Context, companyID uuid.UUID) ([]models.Employee, error) {
	var employees []models.Employee
	if err := s.db.WithContext(ctx).Where("company_id = ? AND is_active = TRUE", companyID).Find(&employees).Error; err != nil {
		return nil, fmt.Errorf("failed to list company employees: %w", err)
	}
	return employees, nil
}
