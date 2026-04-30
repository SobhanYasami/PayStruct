package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/shopspring/decimal"
	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
	"gorm.io/gorm"
)

// ============================================================
// PROJECT SERVICE
// ============================================================

type ProjectService struct{ db *gorm.DB }

func NewProjectService(db *gorm.DB) *ProjectService { return &ProjectService{db: db} }

type CreateProjectReq struct {
	Code           string   `json:"code"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	Category       string   `json:"category"`
	Status         string   `json:"status"`
	Priority       string   `json:"priority"`
	StartDate      *string  `json:"start_date"`
	EndDate        *string  `json:"end_date"`
	BudgetEstimate string   `json:"budget_estimate"`
	Currency       string   `json:"currency"`
	Tags           []string `json:"tags"`
}

type UpdateProjectReq struct {
	Name           *string  `json:"name"`
	Description    *string  `json:"description"`
	Category       *string  `json:"category"`
	Status         *string  `json:"status"`
	Priority       *string  `json:"priority"`
	StartDate      *string  `json:"start_date"`
	EndDate        *string  `json:"end_date"`
	BudgetEstimate *string  `json:"budget_estimate"`
	BudgetActual   *string  `json:"budget_actual"`
	Currency       *string  `json:"currency"`
	Tags           []string `json:"tags"`
}

func (s *ProjectService) Create(ctx context.Context, companyID string, req CreateProjectReq) (*model.Project, error) {
	cid, err := uuid.Parse(companyID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid company ID", Code: 400}
	}
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Code) == "" {
		return nil, &ServiceError{Message: "Name and code are required", Code: 400}
	}

	budget := decimal.Zero
	if req.BudgetEstimate != "" {
		budget, err = decimal.NewFromString(req.BudgetEstimate)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid budget_estimate", Code: 400}
		}
	}

	currency := req.Currency
	if len(currency) != 3 {
		currency = "IRR"
	}

	status := model.ProjectStatus(req.Status)
	if !status.Valid() {
		status = model.ProjectPlanning
	}
	priority := model.Priority(req.Priority)
	if !priority.Valid() {
		priority = model.PriorityMedium
	}

	p := model.Project{
		CompanyID:      cid,
		Code:           req.Code,
		Name:           req.Name,
		Description:    req.Description,
		Category:       req.Category,
		Status:         status,
		Priority:       priority,
		BudgetEstimate: budget,
		Currency:       currency,
		Tags:           pq.StringArray(req.Tags),
	}
	if req.StartDate != nil && *req.StartDate != "" {
		t, err := time.Parse("2006-01-02", *req.StartDate)
		if err == nil {
			p.StartDate = &t
		}
	}
	if req.EndDate != nil && *req.EndDate != "" {
		t, err := time.Parse("2006-01-02", *req.EndDate)
		if err == nil {
			p.EndDate = &t
		}
	}

	if err := s.db.WithContext(ctx).Create(&p).Error; err != nil {
		return nil, dbErr(err)
	}
	return &p, nil
}

func (s *ProjectService) GetByID(ctx context.Context, id string) (*model.Project, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid project ID", Code: 400}
	}
	var p model.Project
	if err := s.db.WithContext(ctx).First(&p, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Project not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	return &p, nil
}

func (s *ProjectService) List(ctx context.Context, companyID, status string, page, limit int) ([]model.Project, int64, error) {
	q := s.db.WithContext(ctx).Model(&model.Project{})
	if companyID != "" {
		if cid, err := uuid.Parse(companyID); err == nil {
			q = q.Where("company_id = ?", cid)
		}
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Count failed", Code: 500}
	}
	var projects []model.Project
	if err := q.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&projects).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Query failed", Code: 500}
	}
	return projects, total, nil
}

func (s *ProjectService) Update(ctx context.Context, id string, req UpdateProjectReq) (*model.Project, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid project ID", Code: 400}
	}
	var p model.Project
	if err := s.db.WithContext(ctx).First(&p, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Project not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	updates := make(map[string]any)
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Category != nil {
		updates["category"] = *req.Category
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Priority != nil {
		updates["priority"] = *req.Priority
	}
	if req.Currency != nil {
		updates["currency"] = *req.Currency
	}
	if req.Tags != nil {
		updates["tags"] = pq.StringArray(req.Tags)
	}
	if req.BudgetEstimate != nil {
		if v, err := decimal.NewFromString(*req.BudgetEstimate); err == nil {
			updates["budget_estimate"] = v
		}
	}
	if req.BudgetActual != nil {
		if v, err := decimal.NewFromString(*req.BudgetActual); err == nil {
			updates["budget_actual"] = v
		}
	}
	if req.StartDate != nil {
		if *req.StartDate == "" {
			updates["start_date"] = nil
		} else if t, err := time.Parse("2006-01-02", *req.StartDate); err == nil {
			updates["start_date"] = t
		}
	}
	if req.EndDate != nil {
		if *req.EndDate == "" {
			updates["end_date"] = nil
		} else if t, err := time.Parse("2006-01-02", *req.EndDate); err == nil {
			updates["end_date"] = t
		}
	}

	if len(updates) > 0 {
		if err := s.db.WithContext(ctx).Model(&p).Updates(updates).Error; err != nil {
			return nil, &ServiceError{Message: "Update failed", Code: 500}
		}
	}
	return &p, nil
}

func (s *ProjectService) Delete(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{Message: "Invalid project ID", Code: 400}
	}
	result := s.db.WithContext(ctx).Where("id = ?", uid).Delete(&model.Project{})
	if result.Error != nil {
		return &ServiceError{Message: "Delete failed", Code: 500}
	}
	if result.RowsAffected == 0 {
		return &ServiceError{Message: "Project not found", Code: 404}
	}
	return nil
}

// ============================================================
// CONTRACTOR SERVICE
// ============================================================

type ContractorService struct{ db *gorm.DB }

func NewContractorService(db *gorm.DB) *ContractorService { return &ContractorService{db: db} }

type CreateContractorReq struct {
	Type       string   `json:"type"`
	FName      string   `json:"first_name"`
	LName      string   `json:"last_name"`
	DetailedID string   `json:"detailed_id"`
	NationalID string   `json:"national_id"`
	Phone      string   `json:"phone"`
	Address    string   `json:"address"`
	Specialty  string   `json:"specialty"`
	Rating     *float32 `json:"rating"`
}

type UpdateContractorReq struct {
	Type      *string  `json:"type"`
	FName     *string  `json:"first_name"`
	LName     *string  `json:"last_name"`
	Phone     *string  `json:"phone"`
	Address   *string  `json:"address"`
	Specialty *string  `json:"specialty"`
	Rating    *float32 `json:"rating"`
}

func (s *ContractorService) Create(ctx context.Context, req CreateContractorReq) (*model.Contractor, error) {
	if req.FName == "" || req.LName == "" || req.NationalID == "" || req.DetailedID == "" {
		return nil, &ServiceError{Message: "first_name, last_name, national_id and detailed_id are required", Code: 400}
	}
	typ := req.Type
	if typ != "individual" && typ != "company" {
		typ = "individual"
	}
	c := model.Contractor{
		Type:       typ,
		FName:      req.FName,
		LName:      req.LName,
		DetailedID: req.DetailedID,
		NationalID: req.NationalID,
		Phone:      req.Phone,
		Address:    req.Address,
		Specialty:  req.Specialty,
		Rating:     req.Rating,
	}
	if err := s.db.WithContext(ctx).Create(&c).Error; err != nil {
		return nil, dbErr(err)
	}
	return &c, nil
}

func (s *ContractorService) GetByID(ctx context.Context, id string) (*model.Contractor, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contractor ID", Code: 400}
	}
	var c model.Contractor
	if err := s.db.WithContext(ctx).First(&c, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Contractor not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	return &c, nil
}

func (s *ContractorService) List(ctx context.Context, search string, page, limit int) ([]model.Contractor, int64, error) {
	q := s.db.WithContext(ctx).Model(&model.Contractor{})
	if search != "" {
		like := "%" + strings.TrimSpace(search) + "%"
		q = q.Where("f_name ILIKE ? OR l_name ILIKE ? OR national_id ILIKE ? OR specialty ILIKE ?", like, like, like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Count failed", Code: 500}
	}
	var items []model.Contractor
	if err := q.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, total, nil
}

func (s *ContractorService) Update(ctx context.Context, id string, req UpdateContractorReq) (*model.Contractor, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contractor ID", Code: 400}
	}
	var c model.Contractor
	if err := s.db.WithContext(ctx).First(&c, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Contractor not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	updates := make(map[string]any)
	if req.Type != nil {
		updates["type"] = *req.Type
	}
	if req.FName != nil {
		updates["f_name"] = *req.FName
	}
	if req.LName != nil {
		updates["l_name"] = *req.LName
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.Specialty != nil {
		updates["specialty"] = *req.Specialty
	}
	if req.Rating != nil {
		updates["rating"] = *req.Rating
	}
	if len(updates) > 0 {
		if err := s.db.WithContext(ctx).Model(&c).Updates(updates).Error; err != nil {
			return nil, &ServiceError{Message: "Update failed", Code: 500}
		}
	}
	return &c, nil
}

func (s *ContractorService) Delete(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{Message: "Invalid contractor ID", Code: 400}
	}
	result := s.db.WithContext(ctx).Where("id = ?", uid).Delete(&model.Contractor{})
	if result.Error != nil {
		return &ServiceError{Message: "Delete failed", Code: 500}
	}
	if result.RowsAffected == 0 {
		return &ServiceError{Message: "Contractor not found", Code: 404}
	}
	return nil
}

// ============================================================
// CONTRACT SERVICE
// ============================================================

type ContractSvc struct{ db *gorm.DB }

func NewContractSvc(db *gorm.DB) *ContractSvc { return &ContractSvc{db: db} }

type CreateContractReq struct {
	ProjectID         string  `json:"project_id"`
	ContractorID      string  `json:"contractor_id"`
	Code              string  `json:"code"`
	Title             string  `json:"title"`
	Description       string  `json:"description"`
	Status            string  `json:"status"`
	TotalPrice        string  `json:"total_amount"`
	Currency          string  `json:"currency"`
	SignedAt          *string `json:"signed_at"`
	StartsOn          *string `json:"starts_on"`
	EndsOn            *string `json:"ends_on"`
	RetentionBps      int16   `json:"retention_bps"`
	InsuranceRateBps  int16   `json:"insurance_rate_bps"`
	AddedValueRateBps int16   `json:"added_value_rate_bps"`
	ScanedFileUrl     string  `json:"scanfile_url"`
}

type UpdateContractReq struct {
	Title             *string `json:"title"`
	Description       *string `json:"description"`
	Status            *string `json:"status"`
	TotalPrice        *string `json:"total_amount"`
	Currency          *string `json:"currency"`
	SignedAt          *string `json:"signed_at"`
	StartsOn          *string `json:"starts_on"`
	EndsOn            *string `json:"ends_on"`
	RetentionBps      *int16  `json:"retention_bps"`
	InsuranceRateBps  *int16  `json:"insurance_rate_bps"`
	AddedValueRateBps *int16  `json:"added_value_rate_bps"`
	ScanedFileUrl     *string `json:"scanfile_url"`
}

func parseDate(s string) *time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

func (s *ContractSvc) Create(ctx context.Context, req CreateContractReq) (*model.Contract, error) {
	pid, err := uuid.Parse(req.ProjectID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid project_id", Code: 400}
	}
	ctrID, err := uuid.Parse(req.ContractorID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contractor_id", Code: 400}
	}
	if req.Code == "" || req.Title == "" {
		return nil, &ServiceError{Message: "code and title are required", Code: 400}
	}

	price := decimal.Zero
	if req.TotalPrice != "" {
		price, err = decimal.NewFromString(req.TotalPrice)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid total_amount", Code: 400}
		}
	}

	currency := req.Currency
	if len(currency) != 3 {
		currency = "IRR"
	}

	status := model.ContractStatus(req.Status)
	if !status.Valid() {
		status = model.ContractDraft
	}

	ct := model.Contract{
		ProjectID:         pid,
		ContractorID:      ctrID,
		Code:              req.Code,
		Title:             req.Title,
		Description:       req.Description,
		Status:            status,
		TotalPrice:        price,
		Currency:          currency,
		RetentionBps:      req.RetentionBps,
		InsuranceRateBps:  req.InsuranceRateBps,
		AddedValueRateBps: req.AddedValueRateBps,
		ScanedFileUrl:     req.ScanedFileUrl,
	}
	if req.SignedAt != nil && *req.SignedAt != "" {
		ct.SignedAt = parseDate(*req.SignedAt)
	}
	if req.StartsOn != nil && *req.StartsOn != "" {
		ct.StartsOn = parseDate(*req.StartsOn)
	}
	if req.EndsOn != nil && *req.EndsOn != "" {
		ct.EndsOn = parseDate(*req.EndsOn)
	}

	if err := s.db.WithContext(ctx).Create(&ct).Error; err != nil {
		return nil, dbErr(err)
	}
	return &ct, nil
}

func (s *ContractSvc) GetByID(ctx context.Context, id string) (*model.Contract, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	var ct model.Contract
	if err := s.db.WithContext(ctx).First(&ct, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Contract not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}
	return &ct, nil
}

func (s *ContractSvc) ListByProject(ctx context.Context, projectID string, page, limit int) ([]model.Contract, int64, error) {
	q := s.db.WithContext(ctx).Model(&model.Contract{})
	if projectID != "" {
		if pid, err := uuid.Parse(projectID); err == nil {
			q = q.Where("project_id = ?", pid)
		}
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Count failed", Code: 500}
	}
	var items []model.Contract
	if err := q.Order("created_at DESC").Offset((page - 1) * limit).Limit(limit).Find(&items).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, total, nil
}

func (s *ContractSvc) Update(ctx context.Context, id string, req UpdateContractReq) (*model.Contract, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	var ct model.Contract
	if err := s.db.WithContext(ctx).First(&ct, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Contract not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	updates := make(map[string]any)
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Currency != nil {
		updates["currency"] = *req.Currency
	}
	if req.ScanedFileUrl != nil {
		updates["scaned_file_url"] = *req.ScanedFileUrl
	}
	if req.RetentionBps != nil {
		updates["retention_bps"] = *req.RetentionBps
	}
	if req.InsuranceRateBps != nil {
		updates["insurance_rate_bps"] = *req.InsuranceRateBps
	}
	if req.AddedValueRateBps != nil {
		updates["added_value_rate_bps"] = *req.AddedValueRateBps
	}
	if req.TotalPrice != nil {
		if v, err := decimal.NewFromString(*req.TotalPrice); err == nil {
			updates["total_price"] = v
		}
	}
	if req.SignedAt != nil {
		updates["signed_at"] = parseDate(*req.SignedAt)
	}
	if req.StartsOn != nil {
		updates["starts_on"] = parseDate(*req.StartsOn)
	}
	if req.EndsOn != nil {
		updates["ends_on"] = parseDate(*req.EndsOn)
	}

	if len(updates) > 0 {
		if err := s.db.WithContext(ctx).Model(&ct).Updates(updates).Error; err != nil {
			return nil, &ServiceError{Message: "Update failed", Code: 500}
		}
	}
	return &ct, nil
}

func (s *ContractSvc) Delete(ctx context.Context, id string) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	result := s.db.WithContext(ctx).Where("id = ?", uid).Delete(&model.Contract{})
	if result.Error != nil {
		return &ServiceError{Message: "Delete failed", Code: 500}
	}
	if result.RowsAffected == 0 {
		return &ServiceError{Message: "Contract not found", Code: 404}
	}
	return nil
}

// ============================================================
// WBS SERVICE (nested under Contract)
// ============================================================

type CreateWBSReq struct {
	ItemCode    string `json:"item_code"`
	Description string `json:"description"`
	Unit        string `json:"unit"`
	Quantity    string `json:"quantity"`
	UnitPrice   string `json:"unit_price"`
}

func (s *ContractSvc) ListWBS(ctx context.Context, contractID string) ([]model.WBS, error) {
	cid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	var items []model.WBS
	if err := s.db.WithContext(ctx).Where("contract_id = ?", cid).Order("item_code ASC").Find(&items).Error; err != nil {
		return nil, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, nil
}

func (s *ContractSvc) CreateWBS(ctx context.Context, contractID string, req CreateWBSReq) (*model.WBS, error) {
	cid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	if req.ItemCode == "" || req.Unit == "" {
		return nil, &ServiceError{Message: "item_code and unit are required", Code: 400}
	}
	qty := decimal.Zero
	if req.Quantity != "" {
		qty, err = decimal.NewFromString(req.Quantity)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid quantity", Code: 400}
		}
	}
	price := decimal.Zero
	if req.UnitPrice != "" {
		price, err = decimal.NewFromString(req.UnitPrice)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid unit_price", Code: 400}
		}
	}
	item := model.WBS{
		ContractID:  cid,
		ItemCode:    req.ItemCode,
		Description: req.Description,
		Unit:        req.Unit,
		Quantity:    qty,
		UnitPrice:   price,
		TotalPrice:  qty.Mul(price),
	}
	if err := s.db.WithContext(ctx).Create(&item).Error; err != nil {
		return nil, dbErr(err)
	}
	return &item, nil
}
