package services

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
	"gorm.io/gorm"
)

type CompanyService struct {
	db *gorm.DB
}

func NewCompanyService(db *gorm.DB) *CompanyService {
	return &CompanyService{db: db}
}

// -----------------------------------------------------------------------
// Create Company
// -----------------------------------------------------------------------

type CreateCompanyReq struct {
	Name     string  `json:"name"`
	RegNum   string  `json:"reg_num"`
	ParentID *string `json:"parent_id,omitempty"`
}

func (s *CompanyService) CreateCompany(ctx context.Context, req CreateCompanyReq) (*model.Company, error) {
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return nil, &ServiceError{Message: "Company name is required", Code: 400}
	}
	req.RegNum = strings.TrimSpace(req.RegNum)
	if req.RegNum == "" {
		return nil, &ServiceError{Message: "Registration number is required", Code: 400}
	}

	var parentUUID *uuid.UUID
	if req.ParentID != nil && *req.ParentID != "" {
		id, err := uuid.Parse(*req.ParentID)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid parent_id", Code: 400}
		}
		var parent model.Company
		if err := s.db.WithContext(ctx).First(&parent, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, &ServiceError{Message: "Parent company not found", Code: 404}
			}
			return nil, &ServiceError{Message: "Database error", Code: 500}
		}
		parentUUID = &id
	}

	company := model.Company{
		Name:     req.Name,
		RegNum:   req.RegNum,
		ParentID: parentUUID,
	}

	if err := s.db.WithContext(ctx).Create(&company).Error; err != nil {
		return nil, dbErr(err)
	}
	return &company, nil
}

// -----------------------------------------------------------------------
// Get Company
// -----------------------------------------------------------------------

func (s *CompanyService) GetCompanyDetails(ctx context.Context, companyID uuid.UUID) (*model.Company, error) {
	var company model.Company
	if err := s.db.WithContext(ctx).First(&company, "id = ?", companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Company not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	return &company, nil
}

// -----------------------------------------------------------------------
// Update Company
// -----------------------------------------------------------------------

type UpdateCompanyReq struct {
	Name     string  `json:"name"`
	RegNum   string  `json:"reg_num"`
	ParentID *string `json:"parent_id,omitempty"`
}

func (s *CompanyService) UpdateCompany(ctx context.Context, companyID uuid.UUID, req UpdateCompanyReq) (*model.Company, error) {
	var company model.Company
	if err := s.db.WithContext(ctx).First(&company, "id = ?", companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Company not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	if n := strings.TrimSpace(req.Name); n != "" {
		company.Name = n
	}
	if r := strings.TrimSpace(req.RegNum); r != "" {
		company.RegNum = r
	}
	if req.ParentID != nil {
		if *req.ParentID == "" {
			company.ParentID = nil
		} else {
			id, err := uuid.Parse(*req.ParentID)
			if err != nil {
				return nil, &ServiceError{Message: "Invalid parent_id", Code: 400}
			}
			company.ParentID = &id
		}
	}

	if err := s.db.WithContext(ctx).Save(&company).Error; err != nil {
		return nil, dbErr(err)
	}
	return &company, nil
}

// -----------------------------------------------------------------------
// Delete Company (cascades soft-delete to employees)
// -----------------------------------------------------------------------

func (s *CompanyService) DeleteCompany(ctx context.Context, companyID uuid.UUID) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Soft-delete all employees belonging to this company first.
		if err := tx.Where("company_id = ?", companyID).Delete(&model.Employee{}).Error; err != nil {
			return &ServiceError{Message: "Failed to delete company employees", Code: 500}
		}
		result := tx.Where("id = ?", companyID).Delete(&model.Company{})
		if result.Error != nil {
			return &ServiceError{Message: "Failed to delete company", Code: 500}
		}
		if result.RowsAffected == 0 {
			return &ServiceError{Message: "Company not found", Code: 404}
		}
		return nil
	})
}

// -----------------------------------------------------------------------
// List Companies (paginated, optional search)
// -----------------------------------------------------------------------

func (s *CompanyService) ListCompanies(ctx context.Context, search string, page, pageSize int) ([]model.Company, int64, error) {
	var companies []model.Company
	var total int64

	q := s.db.WithContext(ctx).Model(&model.Company{})
	if search != "" {
		q = q.Where("name ILIKE ?", "%"+strings.TrimSpace(search)+"%")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Failed to count companies", Code: 500}
	}

	offset := (page - 1) * pageSize
	if err := q.Order("created_at DESC").Limit(pageSize).Offset(offset).Find(&companies).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Failed to list companies", Code: 500}
	}

	return companies, total, nil
}

// -----------------------------------------------------------------------
// List Employees of a Company
// -----------------------------------------------------------------------

func (s *CompanyService) ListCompanyEmployees(ctx context.Context, companyID uuid.UUID) ([]model.Employee, error) {
	var employees []model.Employee
	if err := s.db.WithContext(ctx).Where("company_id = ?", companyID).Find(&employees).Error; err != nil {
		return nil, &ServiceError{Message: "Failed to list company employees", Code: 500}
	}
	return employees, nil
}
