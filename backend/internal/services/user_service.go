package services

import (
	"context"
	"errors"
	"math"

	"github.com/google/uuid"
	"github.com/lib/pq"
	model "github.com/sobhan-yasami/docs-db-panel/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// ServiceError carries a human-readable message and an HTTP status code.
type ServiceError struct {
	Message string
	Code    int
	Details string
}

func (e *ServiceError) Error() string { return e.Message }

// -----------------------------------------------------------------------
// Create Employee
// -----------------------------------------------------------------------

type CreateEmployeeReq struct {
	FirstName      string   `json:"first_name"`
	LastName       string   `json:"last_name"`
	Email          string   `json:"email"`
	NationalID     string   `json:"national_id"`
	Password       string   `json:"password"`
	Phone          string   `json:"phone,omitempty"`
	Roles          []string `json:"roles"`
	CompanyID      string   `json:"company_id"`
	EmploymentType string   `json:"employment_type"`
}

type CreateEmployeeRes struct {
	ID             string   `json:"id"`
	Email          string   `json:"email"`
	FullName       string   `json:"full_name"`
	Roles          []string `json:"roles"`
	IsHead         bool     `json:"is_head"`
	EmploymentType string   `json:"employment_type"`
}

func (s *UserService) CreateEmployee(req CreateEmployeeReq) (*CreateEmployeeRes, error) {
	if req.FirstName == "" || req.LastName == "" || req.Email == "" ||
		req.NationalID == "" || req.Password == "" || req.CompanyID == "" {
		return nil, &ServiceError{Message: "Missing required fields", Code: 400}
	}

	companyUUID, err := uuid.Parse(req.CompanyID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid company ID", Code: 400}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, &ServiceError{Message: "Failed to hash password", Code: 500}
	}

	empType := model.EmploymentType(req.EmploymentType)
	if !empType.Valid() {
		empType = model.EmploymentOfficial
	}

	isHead := false
	for _, r := range req.Roles {
		role := model.Role(r)
		if !role.Valid() {
			return nil, &ServiceError{Message: "Invalid role: " + r, Code: 400}
		}
		if model.IsHeadRole(role) {
			isHead = true
		}
	}

	employee := model.Employee{
		CompanyID:      companyUUID,
		NationalID:     req.NationalID,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		Email:          req.Email,
		Phone:          req.Phone,
		EmploymentType: empType,
		Roles:          pq.StringArray(req.Roles),
		IsHead:         isHead,
		PasswordHash:   hash,
		Active:         true,
	}

	if err := s.db.Create(&employee).Error; err != nil {
		return nil, dbErr(err)
	}

	return &CreateEmployeeRes{
		ID:             employee.ID.String(),
		Email:          employee.Email,
		FullName:       employee.FullName(),
		Roles:          req.Roles,
		IsHead:         isHead,
		EmploymentType: string(empType),
	}, nil
}

// -----------------------------------------------------------------------
// Update Employee
// -----------------------------------------------------------------------

type UpdateEmployeeReq struct {
	ID             string   `json:"id"`
	FirstName      *string  `json:"first_name"`
	LastName       *string  `json:"last_name"`
	Email          *string  `json:"email"`
	Password       *string  `json:"password"`
	Phone          *string  `json:"phone,omitempty"`
	CompanyID      *string  `json:"company_id"`
	Active         *bool    `json:"active"`
	Roles          []string `json:"roles"`
	EmploymentType *string  `json:"employment_type"`
}

type UpdateEmployeeRes struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	CompanyID string `json:"company_id"`
}

func (s *UserService) UpdateEmployee(req UpdateEmployeeReq) (*UpdateEmployeeRes, error) {
	empUUID, err := uuid.Parse(req.ID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid employee ID", Code: 400}
	}

	var employee model.Employee
	if err := s.db.First(&employee, "id = ?", empUUID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Employee not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	updates := make(map[string]any)
	if req.FirstName != nil {
		updates["first_name"] = *req.FirstName
	}
	if req.LastName != nil {
		updates["last_name"] = *req.LastName
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, &ServiceError{Message: "Failed to hash password", Code: 500}
		}
		updates["password_hash"] = hash
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.CompanyID != nil {
		cid, err := uuid.Parse(*req.CompanyID)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid company ID", Code: 400}
		}
		updates["company_id"] = cid
	}
	if req.Active != nil {
		updates["active"] = *req.Active
	}
	if req.EmploymentType != nil {
		updates["employment_type"] = *req.EmploymentType
	}
	if req.Roles != nil {
		isHead := false
		for _, r := range req.Roles {
			if model.IsHeadRole(model.Role(r)) {
				isHead = true
				break
			}
		}
		updates["roles"] = pq.StringArray(req.Roles)
		updates["is_head"] = isHead
	}

	if len(updates) > 0 {
		if err := s.db.Model(&employee).Updates(updates).Error; err != nil {
			return nil, &ServiceError{Message: "Failed to update employee", Code: 500}
		}
	}

	return &UpdateEmployeeRes{
		ID:        employee.ID.String(),
		FirstName: employee.FirstName,
		LastName:  employee.LastName,
		Email:     employee.Email,
		CompanyID: employee.CompanyID.String(),
	}, nil
}

// -----------------------------------------------------------------------
// Get Employee by ID
// -----------------------------------------------------------------------

type EmployeeResponse struct {
	ID             string   `json:"id"`
	FirstName      string   `json:"first_name"`
	LastName       string   `json:"last_name"`
	Email          string   `json:"email"`
	Phone          string   `json:"phone,omitempty"`
	Active         bool     `json:"active"`
	Roles          []string `json:"roles"`
	IsHead         bool     `json:"is_head"`
	EmploymentType string   `json:"employment_type"`
	CompanyID      string   `json:"company_id"`
}

func (s *UserService) GetEmployee(id, companyID string) (*EmployeeResponse, error) {
	empUUID, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid employee ID", Code: 400}
	}

	var emp model.Employee
	q := s.db.Where("id = ?", empUUID)
	if companyID != "" {
		q = q.Where("company_id = ?", companyID)
	}
	if err := q.First(&emp).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Employee not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500, Details: err.Error()}
	}

	return employeeToResponse(&emp), nil
}

// -----------------------------------------------------------------------
// List Employees (paginated)
// -----------------------------------------------------------------------

type PaginatedEmployeeResponse struct {
	Data       []EmployeeResponse `json:"data"`
	Page       int                `json:"page"`
	Limit      int                `json:"limit"`
	Total      int64              `json:"total"`
	TotalPages int                `json:"total_pages"`
}

func (s *UserService) GetEmployees(ctx context.Context, companyID string, page, limit int) (*PaginatedEmployeeResponse, error) {
	offset := (page - 1) * limit

	var employees []model.Employee
	var total int64

	tx := s.db.WithContext(ctx)
	if companyID != "" {
		tx = tx.Where("company_id = ?", companyID)
	}
	if err := tx.Model(&model.Employee{}).Count(&total).Error; err != nil {
		return nil, &ServiceError{Message: "Failed to count employees", Code: 500}
	}
	if err := tx.Order("created_at DESC").Offset(offset).Limit(limit).Find(&employees).Error; err != nil {
		return nil, &ServiceError{Message: "Failed to fetch employees", Code: 500}
	}

	items := make([]EmployeeResponse, 0, len(employees))
	for i := range employees {
		items = append(items, *employeeToResponse(&employees[i]))
	}

	return &PaginatedEmployeeResponse{
		Data:       items,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(limit))),
	}, nil
}

// -----------------------------------------------------------------------
// Delete Employee (soft via GORM DeletedAt)
// -----------------------------------------------------------------------

func (s *UserService) DeleteEmployee(id string) error {
	empUUID, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{Message: "Invalid employee ID", Code: 400}
	}

	result := s.db.Where("id = ?", empUUID).Delete(&model.Employee{})
	if result.Error != nil {
		return &ServiceError{Message: "Failed to delete employee", Code: 500, Details: result.Error.Error()}
	}
	if result.RowsAffected == 0 {
		return &ServiceError{Message: "Employee not found", Code: 404}
	}
	return nil
}

// -----------------------------------------------------------------------
// Authenticate (sign in)
// -----------------------------------------------------------------------

type AuthenticatedEmployee struct {
	Employee *model.Employee
	Roles    []string
}

func (s *UserService) SigninEmployee(email, password string) (*AuthenticatedEmployee, error) {
	var emp model.Employee
	if err := s.db.Where("email = ?", email).First(&emp).Error; err != nil {
		return nil, &ServiceError{Message: "Invalid credentials", Code: 401}
	}

	if err := bcrypt.CompareHashAndPassword(emp.PasswordHash, []byte(password)); err != nil {
		return nil, &ServiceError{Message: "Invalid credentials", Code: 401}
	}

	if !emp.Active {
		return nil, &ServiceError{Message: "Account is inactive", Code: 403}
	}

	return &AuthenticatedEmployee{
		Employee: &emp,
		Roles:    []string(emp.Roles),
	}, nil
}

// -----------------------------------------------------------------------
// Get own profile (by ID from JWT claims)
// -----------------------------------------------------------------------

type ProfileResponse struct {
	ID             string   `json:"id"`
	FirstName      string   `json:"first_name"`
	LastName       string   `json:"last_name"`
	Email          string   `json:"email"`
	Phone          string   `json:"phone,omitempty"`
	Active         bool     `json:"active"`
	Roles          []string `json:"roles"`
	CompanyID      string   `json:"company_id"`
	EmploymentType string   `json:"employment_type"`
}

func (s *UserService) GetProfile(userID string) (*ProfileResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid user ID", Code: 400}
	}

	var emp model.Employee
	if err := s.db.First(&emp, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "User not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	return &ProfileResponse{
		ID:             emp.ID.String(),
		FirstName:      emp.FirstName,
		LastName:       emp.LastName,
		Email:          emp.Email,
		Phone:          emp.Phone,
		Active:         emp.Active,
		Roles:          []string(emp.Roles),
		CompanyID:      emp.CompanyID.String(),
		EmploymentType: string(emp.EmploymentType),
	}, nil
}

// -----------------------------------------------------------------------
// Update own profile (restricted — only name / phone / password)
// -----------------------------------------------------------------------

type UpdateProfileReq struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Phone     *string `json:"phone"`
	Password  *string `json:"password"`
}

func (s *UserService) UpdateProfile(userID string, req UpdateProfileReq) (*ProfileResponse, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid user ID", Code: 400}
	}

	var emp model.Employee
	if err := s.db.First(&emp, "id = ?", uid).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "User not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	updates := make(map[string]any)
	if req.FirstName != nil {
		updates["first_name"] = *req.FirstName
	}
	if req.LastName != nil {
		updates["last_name"] = *req.LastName
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, &ServiceError{Message: "Failed to hash password", Code: 500}
		}
		updates["password_hash"] = hash
	}

	if len(updates) > 0 {
		if err := s.db.Model(&emp).Updates(updates).Error; err != nil {
			return nil, &ServiceError{Message: "Failed to update profile", Code: 500}
		}
	}

	return &ProfileResponse{
		ID:             emp.ID.String(),
		FirstName:      emp.FirstName,
		LastName:       emp.LastName,
		Email:          emp.Email,
		Phone:          emp.Phone,
		Active:         emp.Active,
		Roles:          []string(emp.Roles),
		CompanyID:      emp.CompanyID.String(),
		EmploymentType: string(emp.EmploymentType),
	}, nil
}

// -----------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------

func employeeToResponse(e *model.Employee) *EmployeeResponse {
	return &EmployeeResponse{
		ID:             e.ID.String(),
		FirstName:      e.FirstName,
		LastName:       e.LastName,
		Email:          e.Email,
		Phone:          e.Phone,
		Active:         e.Active,
		Roles:          []string(e.Roles),
		IsHead:         e.IsHead,
		EmploymentType: string(e.EmploymentType),
		CompanyID:      e.CompanyID.String(),
	}
}

func dbErr(err error) *ServiceError {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return &ServiceError{Message: "Record already exists", Code: 409}
	}
	return &ServiceError{Message: "Database error", Code: 500, Details: err.Error()}
}
