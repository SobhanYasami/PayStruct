package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
	"gorm.io/gorm"
)

type ConsultantService struct{ db *gorm.DB }

func NewConsultantService(db *gorm.DB) *ConsultantService { return &ConsultantService{db: db} }

type CreateConsultantReq struct {
	Name            string   `json:"name"`
	LegalName       string   `json:"legal_name"`
	RegistrationNo  string   `json:"registration_no"`
	TaxID           string   `json:"tax_id"`
	Specialization  string   `json:"specialization"`
	LicenseNo       string   `json:"license_no"`
	LicenseExpiry   string   `json:"license_expiry"` // "2006-01-02" or ""
	DefaultCurrency string   `json:"default_currency"`
	ContactJSON     string   `json:"contact"`
	Rating          *float32 `json:"rating"`
	IsActive        *bool    `json:"is_active"`
}

type UpdateConsultantReq struct {
	Name            *string  `json:"name"`
	LegalName       *string  `json:"legal_name"`
	RegistrationNo  *string  `json:"registration_no"`
	TaxID           *string  `json:"tax_id"`
	Specialization  *string  `json:"specialization"`
	LicenseNo       *string  `json:"license_no"`
	LicenseExpiry   *string  `json:"license_expiry"`
	DefaultCurrency *string  `json:"default_currency"`
	ContactJSON     *string  `json:"contact"`
	Rating          *float32 `json:"rating"`
	IsActive        *bool    `json:"is_active"`
}

func (s *ConsultantService) Create(ctx context.Context, callerCompanyID, callerUserID string, req CreateConsultantReq) (*model.Consultant, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, &ServiceError{Message: "name is required", Code: 400}
	}

	currency := req.DefaultCurrency
	if len(currency) != 3 {
		currency = "IRR"
	}

	c := model.Consultant{
		Name:            strings.TrimSpace(req.Name),
		LegalName:       req.LegalName,
		Specialization:  req.Specialization,
		LicenseNo:       req.LicenseNo,
		DefaultCurrency: currency,
		ContactJSON:     req.ContactJSON,
		Rating:          req.Rating,
		IsActive:        true,
	}
	if req.IsActive != nil {
		c.IsActive = *req.IsActive
	}

	if cid, err := uuid.Parse(callerCompanyID); err == nil {
		c.CompanyID = &cid
	}
	if uid, err := uuid.Parse(callerUserID); err == nil {
		c.CreatedByID = &uid
	}
	if req.RegistrationNo != "" {
		rn := req.RegistrationNo
		c.RegistrationNo = &rn
	}
	if req.TaxID != "" {
		t := req.TaxID
		c.TaxID = &t
	}
	if req.LicenseExpiry != "" {
		if t, err := time.Parse("2006-01-02", req.LicenseExpiry); err == nil {
			c.LicenseExpiry = &t
		}
	}

	if err := s.db.WithContext(ctx).Create(&c).Error; err != nil {
		return nil, dbErr(err)
	}
	return &c, nil
}

func (s *ConsultantService) GetByID(ctx context.Context, id string) (*model.Consultant, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid consultant ID", Code: 400}
	}
	var c model.Consultant
	if err := s.db.WithContext(ctx).First(&c, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Consultant not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	return &c, nil
}

func (s *ConsultantService) List(ctx context.Context, callerCompanyID, search string, page, limit int) ([]model.Consultant, int64, error) {
	q := s.db.WithContext(ctx).Model(&model.Consultant{}).Where("deleted_at IS NULL")

	if callerCompanyID != "" {
		if cid, err := uuid.Parse(callerCompanyID); err == nil {
			q = q.Where("company_id = ? OR company_id IS NULL", cid)
		}
	}
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("name ILIKE ? OR legal_name ILIKE ? OR specialization ILIKE ?", like, like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Count failed", Code: 500}
	}
	var items []model.Consultant
	if err := q.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, total, nil
}

func (s *ConsultantService) Update(ctx context.Context, id, callerCompanyID string, isAdmin bool, req UpdateConsultantReq) (*model.Consultant, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid consultant ID", Code: 400}
	}
	var c model.Consultant
	if err := s.db.WithContext(ctx).First(&c, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Consultant not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	if !isAdmin && c.CompanyID != nil {
		cid, _ := uuid.Parse(callerCompanyID)
		if *c.CompanyID != cid {
			return nil, &ServiceError{Message: "Access denied", Code: 403}
		}
	}

	updates := make(map[string]any)
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.LegalName != nil {
		updates["legal_name"] = *req.LegalName
	}
	if req.Specialization != nil {
		updates["specialization"] = *req.Specialization
	}
	if req.LicenseNo != nil {
		updates["license_no"] = *req.LicenseNo
	}
	if req.DefaultCurrency != nil && len(*req.DefaultCurrency) == 3 {
		updates["default_currency"] = *req.DefaultCurrency
	}
	if req.ContactJSON != nil {
		updates["contact_json"] = *req.ContactJSON
	}
	if req.Rating != nil {
		updates["rating"] = *req.Rating
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.RegistrationNo != nil {
		if *req.RegistrationNo == "" {
			updates["registration_no"] = nil
		} else {
			updates["registration_no"] = *req.RegistrationNo
		}
	}
	if req.TaxID != nil {
		if *req.TaxID == "" {
			updates["tax_id"] = nil
		} else {
			updates["tax_id"] = *req.TaxID
		}
	}
	if req.LicenseExpiry != nil {
		if *req.LicenseExpiry == "" {
			updates["license_expiry"] = nil
		} else if t, err := time.Parse("2006-01-02", *req.LicenseExpiry); err == nil {
			updates["license_expiry"] = t
		}
	}

	if len(updates) > 0 {
		if err := s.db.WithContext(ctx).Model(&c).Updates(updates).Error; err != nil {
			return nil, dbErr(err)
		}
	}
	return &c, nil
}

func (s *ConsultantService) Delete(ctx context.Context, id, callerCompanyID string, isAdmin bool) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{Message: "Invalid consultant ID", Code: 400}
	}
	if !isAdmin {
		var c model.Consultant
		if err := s.db.WithContext(ctx).First(&c, "id = ?", uid).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ServiceError{Message: "Consultant not found", Code: 404}
			}
			return &ServiceError{Message: "Database error", Code: 500}
		}
		if c.CompanyID != nil {
			cid, _ := uuid.Parse(callerCompanyID)
			if *c.CompanyID != cid {
				return &ServiceError{Message: "Access denied", Code: 403}
			}
		}
	}
	result := s.db.WithContext(ctx).Where("id = ?", uid).Delete(&model.Consultant{})
	if result.Error != nil {
		return &ServiceError{Message: "Delete failed", Code: 500}
	}
	if result.RowsAffected == 0 {
		return &ServiceError{Message: "Consultant not found", Code: 404}
	}
	return nil
}
