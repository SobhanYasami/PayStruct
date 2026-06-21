package services

import (
	"context"
	"errors"
	"fmt"
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
	Phase          string   `json:"phase"`
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
	Phase          *string  `json:"phase"`
	Status         *string  `json:"status"`
	Priority       *string  `json:"priority"`
	StartDate      *string  `json:"start_date"`
	EndDate        *string  `json:"end_date"`
	BudgetEstimate *string  `json:"budget_estimate"`
	BudgetActual   *string  `json:"budget_actual"`
	Currency       *string  `json:"currency"`
	Tags           []string `json:"tags"`
}

// ProjectListItem embeds Project and adds the live contracts count.
type ProjectListItem struct {
	model.Project
	ContractsCount int64 `gorm:"column:contracts_count" json:"contracts_count"`
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
		Phase:          req.Phase,
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

const projectsCountSelect = `projects.*,
	COALESCE((SELECT COUNT(*) FROM contracts
		WHERE contracts.project_id = projects.id
		  AND contracts.deleted_at IS NULL), 0) AS contracts_count`

func (s *ProjectService) List(ctx context.Context, companyID, status string, page, limit int) ([]ProjectListItem, int64, error) {
	q := s.db.WithContext(ctx).Table("projects").Where("projects.deleted_at IS NULL")
	if companyID != "" {
		if cid, err := uuid.Parse(companyID); err == nil {
			q = q.Where("projects.company_id = ?", cid)
		}
	}
	if status != "" {
		q = q.Where("projects.status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Count failed", Code: 500}
	}
	var items []ProjectListItem
	if err := q.Select(projectsCountSelect).
		Order("projects.created_at DESC").
		Offset((page - 1) * limit).Limit(limit).
		Find(&items).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, total, nil
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
	if req.Phase != nil {
		updates["phase"] = *req.Phase
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
	Type            string   `json:"type"`
	FirstName       string   `json:"first_name"`
	LastName        string   `json:"last_name"`
	CompanyName     string   `json:"company_name"`
	LegalName       string   `json:"legal_name"`
	TaxID           string   `json:"tax_id"`
	RegistrationNo  string   `json:"registration_no"`
	NationalID      string   `json:"national_id"`
	PreferentialID  string   `json:"preferential_id"`
	DefaultCurrency string   `json:"default_currency"`
	BankAccountJSON string   `json:"bank_account"`
	ContactJSON     string   `json:"contact"`
	Rating          *float32 `json:"rating"`
}

type UpdateContractorReq struct {
	Type            *string  `json:"type"`
	FirstName       *string  `json:"first_name"`
	LastName        *string  `json:"last_name"`
	CompanyName     *string  `json:"company_name"`
	LegalName       *string  `json:"legal_name"`
	TaxID           *string  `json:"tax_id"`
	DefaultCurrency *string  `json:"default_currency"`
	PreferentialID  *string  `json:"preferential_id"`
	NationalID      *string  `json:"national_id"`
	BankAccountJSON *string  `json:"bank_account"`
	ContactJSON     *string  `json:"contact"`
	Rating          *float32 `json:"rating"`
}

func deriveDisplayName(typ, firstName, lastName, companyName string) string {
	if typ == "individual" {
		dn := strings.TrimSpace(firstName + " " + lastName)
		if dn != "" {
			return dn
		}
	}
	if companyName != "" {
		return companyName
	}
	return strings.TrimSpace(firstName + " " + lastName)
}

func (s *ContractorService) Create(ctx context.Context, callerCompanyID, callerUserID string, req CreateContractorReq) (*model.Contractor, error) {
	typ := req.Type
	if typ != "individual" && typ != "company" {
		typ = "individual"
	}
	if typ == "individual" && strings.TrimSpace(req.FirstName+req.LastName) == "" {
		return nil, &ServiceError{Message: "first_name or last_name is required for individual", Code: 400}
	}
	if typ == "company" && strings.TrimSpace(req.CompanyName) == "" {
		return nil, &ServiceError{Message: "company_name is required for company type", Code: 400}
	}

	currency := req.DefaultCurrency
	if len(currency) != 3 {
		currency = "IRR"
	}
	var taxID *string
	if req.TaxID != "" {
		taxID = &req.TaxID
	}
	var regNo *string
	if req.RegistrationNo != "" {
		regNo = &req.RegistrationNo
	}
	bankJSON := req.BankAccountJSON
	if bankJSON == "" {
		bankJSON = "{}"
	}
	contactJSON := req.ContactJSON
	if contactJSON == "" {
		contactJSON = "{}"
	}

	c := model.Contractor{
		Type:            typ,
		FirstName:       req.FirstName,
		LastName:        req.LastName,
		CompanyName:     req.CompanyName,
		DisplayName:     deriveDisplayName(typ, req.FirstName, req.LastName, req.CompanyName),
		LegalName:       req.LegalName,
		TaxID:           taxID,
		RegistrationNo:  regNo,
		NationalID:      req.NationalID,
		PreferentialID:  req.PreferentialID,
		DefaultCurrency: currency,
		BankAccountJSON: bankJSON,
		ContactJSON:     contactJSON,
		Rating:          req.Rating,
	}
	if callerCompanyID != "" {
		if cid, err := uuid.Parse(callerCompanyID); err == nil {
			c.CompanyID = &cid
		}
	}
	if callerUserID != "" {
		if uid, err := uuid.Parse(callerUserID); err == nil {
			c.CreatedByID = &uid
		}
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

func (s *ContractorService) List(ctx context.Context, callerCompanyID string, search string, page, limit int) ([]model.Contractor, int64, error) {
	q := s.db.WithContext(ctx).Model(&model.Contractor{})

	if callerCompanyID != "" {
		// Look up parent company to allow cross-company reads.
		var co struct{ ParentID *uuid.UUID }
		s.db.WithContext(ctx).Table("companies").Select("parent_id").Where("id = ?", callerCompanyID).Scan(&co)
		if co.ParentID != nil {
			q = q.Where("company_id IS NULL OR company_id = ? OR company_id = ?", callerCompanyID, *co.ParentID)
		} else {
			q = q.Where("company_id IS NULL OR company_id = ?", callerCompanyID)
		}
	}

	if search != "" {
		like := "%" + strings.TrimSpace(search) + "%"
		q = q.Where("display_name ILIKE ? OR legal_name ILIKE ? OR national_id ILIKE ? OR tax_id::text ILIKE ? OR preferential_id ILIKE ?", like, like, like, like, like)
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

func (s *ContractorService) Update(ctx context.Context, id, callerCompanyID string, isAdmin bool, req UpdateContractorReq) (*model.Contractor, error) {
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
	if !isAdmin && c.CompanyID != nil && c.CompanyID.String() != callerCompanyID {
		return nil, &ServiceError{Message: "Access denied: contractor belongs to another company", Code: 403}
	}

	updates := make(map[string]any)
	typ := c.Type
	if req.Type != nil {
		updates["type"] = *req.Type
		typ = *req.Type
	}
	fn := c.FirstName
	ln := c.LastName
	cn := c.CompanyName
	if req.FirstName != nil {
		updates["first_name"] = *req.FirstName
		fn = *req.FirstName
	}
	if req.LastName != nil {
		updates["last_name"] = *req.LastName
		ln = *req.LastName
	}
	if req.CompanyName != nil {
		updates["company_name"] = *req.CompanyName
		cn = *req.CompanyName
	}
	if req.Type != nil || req.FirstName != nil || req.LastName != nil || req.CompanyName != nil {
		updates["display_name"] = deriveDisplayName(typ, fn, ln, cn)
	}
	if req.LegalName != nil {
		updates["legal_name"] = *req.LegalName
	}
	if req.TaxID != nil {
		updates["tax_id"] = *req.TaxID
	}
	if req.NationalID != nil {
		updates["national_id"] = *req.NationalID
	}
	if req.PreferentialID != nil {
		updates["preferential_id"] = *req.PreferentialID
	}
	if req.DefaultCurrency != nil {
		updates["default_currency"] = *req.DefaultCurrency
	}
	if req.BankAccountJSON != nil {
		updates["bank_account_json"] = *req.BankAccountJSON
	}
	if req.ContactJSON != nil {
		updates["contact_json"] = *req.ContactJSON
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

func (s *ContractorService) Delete(ctx context.Context, id, callerCompanyID string, isAdmin bool) error {
	uid, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{Message: "Invalid contractor ID", Code: 400}
	}
	var c model.Contractor
	if err := s.db.WithContext(ctx).First(&c, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &ServiceError{Message: "Contractor not found", Code: 404}
		}
		return &ServiceError{Message: "Database error", Code: 500}
	}
	if !isAdmin && c.CompanyID != nil && c.CompanyID.String() != callerCompanyID {
		return &ServiceError{Message: "Access denied: contractor belongs to another company", Code: 403}
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
	ProjectID             string  `json:"project_id"`
	ContractorID          string  `json:"contractor_id"`
	EmployerID            string  `json:"employer_id"`
	ConsultantID          string  `json:"consultant_id"`
	ContractNo            string  `json:"contract_no"`
	Title                 string  `json:"title"`
	Description           string  `json:"description"`
	Type                  string  `json:"type"`
	Status                string  `json:"status"`
	GrossBudget           string  `json:"gross_budget"`
	Currency              string  `json:"currency"`
	StartsOn              *string `json:"starts_on"`
	EndsOn                *string `json:"ends_on"`
	PerformanceBondPctBps int     `json:"performance_bond_pct_bps"`
	InsuranceRatePctBps   int     `json:"insurance_rate_pct_bps"`
	VatPctBps             int     `json:"vat_pct_bps"`
	RetentionPctBps       int     `json:"retention_pct_bps"`
	AdvancePctBps         int     `json:"advance_pct_bps"`
	SocialSecurityPctBps  int     `json:"social_security_pct_bps"`
	ScannedFileURL        string  `json:"scanned_file_url"`
	// Unit-rate fields.
	BOQVersion          string `json:"boq_version"`
	ContractCoefficient string `json:"contract_coefficient"`
	// Cost-plus fields.
	ManagementFeePctBps  int    `json:"management_fee_pct_bps"`
	FeeCalculationMethod string `json:"fee_calculation_method"`
}

type UpdateContractReq struct {
	Title                 *string `json:"title"`
	Description           *string `json:"description"`
	Status                *string `json:"status"`
	GrossBudget           *string `json:"gross_budget"`
	Currency              *string `json:"currency"`
	StartsOn              *string `json:"starts_on"`
	EndsOn                *string `json:"ends_on"`
	EmployerID            *string `json:"employer_id"`
	ConsultantID          *string `json:"consultant_id"`
	PerformanceBondPctBps *int    `json:"performance_bond_pct_bps"`
	InsuranceRatePctBps   *int    `json:"insurance_rate_pct_bps"`
	VatPctBps             *int    `json:"vat_pct_bps"`
	RetentionPctBps       *int    `json:"retention_pct_bps"`
	AdvancePctBps         *int    `json:"advance_pct_bps"`
	SocialSecurityPctBps  *int    `json:"social_security_pct_bps"`
	ScannedFileURL        *string `json:"scanned_file_url"`
	BOQVersion            *string `json:"boq_version"`
	ContractCoefficient   *string `json:"contract_coefficient"`
	ManagementFeePctBps   *int    `json:"management_fee_pct_bps"`
	FeeCalculationMethod  *string `json:"fee_calculation_method"`
}

// ContractListItem embeds Contract and adds denormalized display fields.
type ContractListItem struct {
	model.Contract
	ContractorName string `gorm:"column:contractor_name" json:"contractor_name"`
	ProjectName    string `gorm:"column:project_name"    json:"project_name"`
}

func parseDate(s string) *time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

// jalaliYear returns the approximate Jalali (Solar Hijri) year for t.
func jalaliYear(t time.Time) int {
	y := t.Year() - 621
	if t.Month() < time.March || (t.Month() == time.March && t.Day() < 21) {
		y--
	}
	return y
}

func (s *ContractSvc) nextContractNo(ctx context.Context, companyID uuid.UUID) (string, error) {
	year := jalaliYear(time.Now())
	prefix := fmt.Sprintf("%d/%%", year)
	var maxSeq int
	err := s.db.WithContext(ctx).Raw(
		`SELECT COALESCE(MAX(
			CASE WHEN contract_no ~ '^\d+/\d+$'
			     THEN CAST(SPLIT_PART(contract_no, '/', 2) AS INTEGER)
			     ELSE 0
			END
		), 0)
		FROM contracts
		WHERE company_id = ? AND contract_no LIKE ? AND deleted_at IS NULL`,
		companyID, prefix,
	).Scan(&maxSeq).Error
	if err != nil {
		return "", &ServiceError{Message: "Failed to generate contract number", Code: 500}
	}
	return fmt.Sprintf("%d/%d", year, maxSeq+1), nil
}

func (s *ContractSvc) Create(ctx context.Context, callerCompanyID string, req CreateContractReq) (*model.Contract, error) {
	companyID, err := uuid.Parse(callerCompanyID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid company_id", Code: 400}
	}
	pid, err := uuid.Parse(req.ProjectID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid project_id", Code: 400}
	}
	ctrID, err := uuid.Parse(req.ContractorID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contractor_id", Code: 400}
	}
	if strings.TrimSpace(req.Title) == "" {
		return nil, &ServiceError{Message: "title is required", Code: 400}
	}

	contractNo := strings.TrimSpace(req.ContractNo)
	if contractNo == "" {
		contractNo, err = s.nextContractNo(ctx, companyID)
		if err != nil {
			return nil, err
		}
	}

	budget := decimal.Zero
	if req.GrossBudget != "" {
		budget, err = decimal.NewFromString(req.GrossBudget)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid gross_budget", Code: 400}
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
	ctype := model.ContractType(req.Type)
	if !ctype.Valid() {
		ctype = model.ContractLumpSum
	}

	ct := model.Contract{
		CompanyID:             companyID,
		ProjectID:             pid,
		ContractorID:          ctrID,
		ContractNo:            contractNo,
		Title:                 req.Title,
		Description:           req.Description,
		Type:                  ctype,
		Status:                status,
		GrossBudget:           budget,
		Currency:              currency,
		PerformanceBondPctBps: req.PerformanceBondPctBps,
		InsuranceRatePctBps:   req.InsuranceRatePctBps,
		VatPctBps:             req.VatPctBps,
		RetentionPctBps:       req.RetentionPctBps,
		AdvancePctBps:         req.AdvancePctBps,
		SocialSecurityPctBps:  req.SocialSecurityPctBps,
		ScannedFileURL:        req.ScannedFileURL,
	}
	if req.EmployerID != "" {
		if eid, err := uuid.Parse(req.EmployerID); err == nil {
			ct.EmployerID = &eid
		}
	}
	if req.ConsultantID != "" {
		if csid, err := uuid.Parse(req.ConsultantID); err == nil {
			ct.ConsultantID = &csid
		}
	}
	ct.BOQVersion = req.BOQVersion
	ct.FeeCalculationMethod = req.FeeCalculationMethod
	ct.ManagementFeePctBps = req.ManagementFeePctBps
	if req.ContractCoefficient != "" {
		if v, err := decimal.NewFromString(req.ContractCoefficient); err == nil {
			ct.ContractCoefficient = v
		}
	} else {
		ct.ContractCoefficient = decimal.NewFromInt(1)
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

func (s *ContractSvc) List(ctx context.Context, companyID, projectID, search string, page, limit int) ([]ContractListItem, int64, error) {
	q := s.db.WithContext(ctx).
		Table("contracts").
		Select(`contracts.*,
			COALESCE(contractors.display_name, '') AS contractor_name,
			COALESCE(projects.name, '')             AS project_name`).
		Joins("LEFT JOIN contractors ON contractors.id = contracts.contractor_id AND contractors.deleted_at IS NULL").
		Joins("LEFT JOIN projects ON projects.id = contracts.project_id AND projects.deleted_at IS NULL").
		Where("contracts.deleted_at IS NULL")

	if companyID != "" {
		if cid, err := uuid.Parse(companyID); err == nil {
			q = q.Where("contracts.company_id = ?", cid)
		}
	}
	if projectID != "" {
		if pid, err := uuid.Parse(projectID); err == nil {
			q = q.Where("contracts.project_id = ?", pid)
		}
	}
	if search != "" {
		like := "%" + strings.TrimSpace(search) + "%"
		q = q.Where("contracts.title ILIKE ? OR contracts.contract_no ILIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, &ServiceError{Message: "Count failed", Code: 500}
	}
	var items []ContractListItem
	if err := q.Order("contracts.created_at DESC").
		Offset((page - 1) * limit).Limit(limit).
		Find(&items).Error; err != nil {
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
	if req.ScannedFileURL != nil {
		updates["scanned_file_url"] = *req.ScannedFileURL
	}
	if req.EmployerID != nil {
		if *req.EmployerID == "" {
			updates["employer_id"] = nil
		} else if eid, err := uuid.Parse(*req.EmployerID); err == nil {
			updates["employer_id"] = eid
		}
	}
	if req.ConsultantID != nil {
		if *req.ConsultantID == "" {
			updates["consultant_id"] = nil
		} else if csid, err := uuid.Parse(*req.ConsultantID); err == nil {
			updates["consultant_id"] = csid
		}
	}
	if req.PerformanceBondPctBps != nil {
		updates["performance_bond_pct_bps"] = *req.PerformanceBondPctBps
	}
	if req.InsuranceRatePctBps != nil {
		updates["insurance_rate_pct_bps"] = *req.InsuranceRatePctBps
	}
	if req.VatPctBps != nil {
		updates["vat_pct_bps"] = *req.VatPctBps
	}
	if req.RetentionPctBps != nil {
		updates["retention_pct_bps"] = *req.RetentionPctBps
	}
	if req.AdvancePctBps != nil {
		updates["advance_pct_bps"] = *req.AdvancePctBps
	}
	if req.SocialSecurityPctBps != nil {
		updates["social_security_pct_bps"] = *req.SocialSecurityPctBps
	}
	if req.GrossBudget != nil {
		if v, err := decimal.NewFromString(*req.GrossBudget); err == nil {
			updates["gross_budget"] = v
		}
	}
	if req.StartsOn != nil {
		updates["starts_on"] = parseDate(*req.StartsOn)
	}
	if req.EndsOn != nil {
		updates["ends_on"] = parseDate(*req.EndsOn)
	}
	if req.BOQVersion != nil {
		updates["boq_version"] = *req.BOQVersion
	}
	if req.ContractCoefficient != nil {
		if v, err := decimal.NewFromString(*req.ContractCoefficient); err == nil {
			updates["contract_coefficient"] = v
		}
	}
	if req.ManagementFeePctBps != nil {
		updates["management_fee_pct_bps"] = *req.ManagementFeePctBps
	}
	if req.FeeCalculationMethod != nil {
		updates["fee_calculation_method"] = *req.FeeCalculationMethod
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
// CONTRACT APPROVAL WORKFLOW
// ============================================================

type contractTransitionRule struct {
	next     model.ContractStatus
	required model.Role // empty = any head role passes
}

var contractStateMachine = map[model.ContractStatus]map[string]contractTransitionRule{
	model.ContractDraft: {
		"submit": {next: model.ContractPendingEngineering, required: ""},
	},
	model.ContractPendingEngineering: {
		"approve": {next: model.ContractPendingFinance, required: model.RoleEngineeringHead},
		"reject":  {next: model.ContractDraft, required: model.RoleEngineeringHead},
	},
	model.ContractPendingFinance: {
		"approve": {next: model.ContractPendingLegal, required: model.RoleFinanceHead},
		"reject":  {next: model.ContractDraft, required: model.RoleFinanceHead},
	},
	model.ContractPendingLegal: {
		"approve": {next: model.ContractPendingCEO, required: model.RoleJuridicalHead},
		"reject":  {next: model.ContractDraft, required: model.RoleJuridicalHead},
	},
	model.ContractPendingCEO: {
		"approve": {next: model.ContractReadyToPrint, required: model.RoleManager},
		"reject":  {next: model.ContractDraft, required: model.RoleManager},
	},
	model.ContractReadyToPrint: {
		"sign": {next: model.ContractSigned, required: model.RoleManager},
	},
}

func hasRole(roles []string, role model.Role) bool {
	for _, r := range roles {
		if r == string(role) {
			return true
		}
	}
	return false
}

func hasAnyHeadRole(roles []string) bool {
	for _, r := range roles {
		if model.IsHeadRole(model.Role(r)) {
			return true
		}
	}
	return false
}

func (s *ContractSvc) Transition(ctx context.Context, contractID, actorID string, actorRoles []string, action, comment string) (*model.Contract, error) {
	cid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	aid, err := uuid.Parse(actorID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid actor ID", Code: 400}
	}

	var ct model.Contract
	if err := s.db.WithContext(ctx).First(&ct, "id = ?", cid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Contract not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	// Special: cancel is available from any non-terminal status, manager only.
	if action == "cancel" {
		if ct.Status == model.ContractCancelled || ct.Status == model.ContractClosed {
			return nil, &ServiceError{Message: "Cannot cancel a closed/cancelled contract", Code: 409}
		}
		if !hasRole(actorRoles, model.RoleManager) {
			return nil, &ServiceError{Message: "Only manager can cancel a contract", Code: 403}
		}
		return s.applyTransition(ctx, &ct, aid, model.ContractCancelled, comment)
	}

	actions, ok := contractStateMachine[ct.Status]
	if !ok {
		return nil, &ServiceError{Message: fmt.Sprintf("No transitions available from status %q", ct.Status), Code: 409}
	}
	rule, ok := actions[action]
	if !ok {
		return nil, &ServiceError{Message: fmt.Sprintf("Action %q is not valid for status %q", action, ct.Status), Code: 409}
	}

	if rule.required == "" {
		if !hasAnyHeadRole(actorRoles) {
			return nil, &ServiceError{Message: "Requires a head role to perform this action", Code: 403}
		}
	} else {
		if !hasRole(actorRoles, rule.required) {
			return nil, &ServiceError{Message: fmt.Sprintf("Action %q requires role %q", action, rule.required), Code: 403}
		}
	}

	return s.applyTransition(ctx, &ct, aid, rule.next, comment)
}

func (s *ContractSvc) applyTransition(ctx context.Context, ct *model.Contract, actorID uuid.UUID, next model.ContractStatus, comment string) (*model.Contract, error) {
	prev := ct.Status
	event := model.ApprovalEvent{
		EntityType: "contract",
		EntityID:   ct.ID,
		ActorID:    actorID,
		FromStatus: string(prev),
		ToStatus:   string(next),
		Comment:    comment,
	}
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(ct).Update("status", next).Error; err != nil {
			return err
		}
		return tx.Create(&event).Error
	}); err != nil {
		return nil, &ServiceError{Message: "Transition failed", Code: 500}
	}
	ct.Status = next
	return ct, nil
}

func (s *ContractSvc) ListApprovals(ctx context.Context, contractID string) ([]model.ApprovalEvent, error) {
	uid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	var events []model.ApprovalEvent
	if err := s.db.WithContext(ctx).
		Where("entity_type = 'contract' AND entity_id = ?", uid).
		Order("created_at ASC").
		Find(&events).Error; err != nil {
		return nil, &ServiceError{Message: "Query failed", Code: 500}
	}
	return events, nil
}

// ============================================================
// CONTRACT LINE ITEMS (formerly WBS)
// ============================================================

type CreateLineItemReq struct {
	SortOrder    int    `json:"sort_order"`
	Description  string `json:"description"`
	Unit         string `json:"unit"`
	Quantity     string `json:"quantity"`
	UnitRate     string `json:"unit_rate"`
	CurrencyCode string `json:"currency_code"`
}

type UpdateLineItemReq struct {
	SortOrder    *int    `json:"sort_order"`
	Description  *string `json:"description"`
	Unit         *string `json:"unit"`
	Quantity     *string `json:"quantity"`
	UnitRate     *string `json:"unit_rate"`
	CurrencyCode *string `json:"currency_code"`
}

func (s *ContractSvc) ListLineItems(ctx context.Context, contractID string) ([]model.ContractLineItem, error) {
	cid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	var items []model.ContractLineItem
	if err := s.db.WithContext(ctx).Where("contract_id = ?", cid).Order("sort_order ASC").Find(&items).Error; err != nil {
		return nil, &ServiceError{Message: "Query failed", Code: 500}
	}
	return items, nil
}

func (s *ContractSvc) CreateLineItem(ctx context.Context, contractID string, req CreateLineItemReq) (*model.ContractLineItem, error) {
	cid, err := uuid.Parse(contractID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid contract ID", Code: 400}
	}
	if req.Unit == "" {
		return nil, &ServiceError{Message: "unit is required", Code: 400}
	}
	qty := decimal.Zero
	if req.Quantity != "" {
		qty, err = decimal.NewFromString(req.Quantity)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid quantity", Code: 400}
		}
	}
	rate := decimal.Zero
	if req.UnitRate != "" {
		rate, err = decimal.NewFromString(req.UnitRate)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid unit_rate", Code: 400}
		}
	}
	currency := req.CurrencyCode
	if len(currency) != 3 {
		currency = "IRR"
	}

	// Denormalize contractor_id and project_id from parent contract.
	var ct model.Contract
	if err := s.db.WithContext(ctx).Select("contractor_id, project_id").First(&ct, "id = ?", cid).Error; err != nil {
		return nil, &ServiceError{Message: "Contract not found", Code: 404}
	}

	item := model.ContractLineItem{
		ContractID:   cid,
		ContractorID: &ct.ContractorID,
		ProjectID:    &ct.ProjectID,
		SortOrder:    req.SortOrder,
		Description:  req.Description,
		Unit:         req.Unit,
		Quantity:     qty,
		UnitRate:     rate,
		CurrencyCode: currency,
	}
	if err := s.db.WithContext(ctx).Create(&item).Error; err != nil {
		return nil, dbErr(err)
	}
	return &item, nil
}

func (s *ContractSvc) UpdateLineItem(ctx context.Context, itemID string, req UpdateLineItemReq) (*model.ContractLineItem, error) {
	uid, err := uuid.Parse(itemID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid line item ID", Code: 400}
	}
	var item model.ContractLineItem
	if err := s.db.WithContext(ctx).First(&item, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Line item not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	updates := make(map[string]any)
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Unit != nil {
		updates["unit"] = *req.Unit
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.CurrencyCode != nil {
		c := *req.CurrencyCode
		if len(c) == 3 {
			updates["currency_code"] = c
		}
	}
	if req.Quantity != nil {
		if v, err := decimal.NewFromString(*req.Quantity); err == nil {
			updates["quantity"] = v
		} else {
			return nil, &ServiceError{Message: "Invalid quantity", Code: 400}
		}
	}
	if req.UnitRate != nil {
		if v, err := decimal.NewFromString(*req.UnitRate); err == nil {
			updates["unit_rate"] = v
		} else {
			return nil, &ServiceError{Message: "Invalid unit_rate", Code: 400}
		}
	}
	if len(updates) > 0 {
		if err := s.db.WithContext(ctx).Model(&item).Updates(updates).Error; err != nil {
			return nil, &ServiceError{Message: "Update failed", Code: 500}
		}
	}
	return &item, nil
}

func (s *ContractSvc) DeleteLineItem(ctx context.Context, itemID string) error {
	uid, err := uuid.Parse(itemID)
	if err != nil {
		return &ServiceError{Message: "Invalid line item ID", Code: 400}
	}
	result := s.db.WithContext(ctx).Where("id = ?", uid).Delete(&model.ContractLineItem{})
	if result.Error != nil {
		return &ServiceError{Message: "Delete failed", Code: 500}
	}
	if result.RowsAffected == 0 {
		return &ServiceError{Message: "Line item not found", Code: 404}
	}
	return nil
}
