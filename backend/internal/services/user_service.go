package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

//	--------------------------
//
// CreateEmployee creates a new employee in the database
//
//	--------------------------
type CreateEmployeeResponse struct {
	ID       string `json:"id"`
	UserName string `json:"user_name"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

// ---
// Create Employee
// ----
func (s *UserService) CreateEmployee(
	fName, lName, userName, password, phone, roleCode, companyID string,
	permissionKeys []string,
) (*CreateEmployeeResponse, error) {

	//? 1) Validate required fields
	if fName == "" || lName == "" || userName == "" || password == "" || roleCode == "" {
		return nil, &ServiceError{Message: "Missing required fields", Code: 400}
	}

	//? 2) Start transaction
	tx := s.db.Begin()
	if tx.Error != nil {
		return nil, &ServiceError{Message: "Failed to start transaction", Code: 500}
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	//? 3.1) Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		tx.Rollback()
		return nil, &ServiceError{Message: "Failed to hash password", Code: 500}
	}
	//? 3.2) parse companyID
	companyUUID, err := uuid.Parse(companyID)
	if err != nil {
		tx.Rollback()
		return nil, &ServiceError{Message: "Invalid company ID", Code: 400}
	}

	//? 3.3) Create employee
	employee := models.Employee{
		FirstName: fName,
		LastName:  lName,
		UserName:  userName,
		Password:  string(hashedPassword),
		Phone:     phone,
		IsActive:  true,
		CompanyID: companyUUID,
	}

	if err := tx.Create(&employee).Error; err != nil {
		tx.Rollback()

		if strings.Contains(err.Error(), "duplicate") {
			return nil, &ServiceError{Message: "Username or phone already exists", Code: 409}
		}

		return nil, &ServiceError{Message: "Failed to create employee", Code: 500}
	}

	//? 4) Fetch Role
	var role models.Role
	if err := tx.
		Where("code = ? AND company_id = ?", roleCode, companyUUID).
		First(&role).Error; err != nil {

		tx.Rollback()
		return nil, &ServiceError{Message: "Invalid role", Code: 400}
	}

	//? 5) Attach Role
	employeeRole := models.EmployeeRole{
		EmployeeID: employee.ID,
		RoleID:     role.ID,
	}

	if err := tx.Create(&employeeRole).Error; err != nil {
		tx.Rollback()
		return nil, &ServiceError{Message: "Failed to assign role", Code: 500}
	}

	//? 6) Attach Extra Permissions (optional)
	if len(permissionKeys) > 0 {

		for _, key := range permissionKeys {

			parts := strings.Split(key, ":")
			if len(parts) != 2 {
				tx.Rollback()
				return nil, &ServiceError{Message: "Invalid permission format", Code: 400}
			}

			resource := parts[0]
			action := parts[1]

			var perm models.Permission
			if err := tx.
				Where("resource = ? AND action = ?", resource, action).
				First(&perm).Error; err != nil {

				tx.Rollback()
				return nil, &ServiceError{
					Message: fmt.Sprintf("Permission %s not found", key),
					Code:    400,
				}
			}

			rolePerm := models.RolePermission{
				RoleID:       role.ID,
				PermissionID: perm.ID,
			}

			if err := tx.Create(&rolePerm).Error; err != nil {
				tx.Rollback()
				return nil, &ServiceError{Message: "Failed to assign permission", Code: 500}
			}
		}
	}

	//? 7) Commit
	if err := tx.Commit().Error; err != nil {
		return nil, &ServiceError{Message: "Transaction failed", Code: 500}
	}

	return &CreateEmployeeResponse{
		ID:       employee.ID.String(),
		UserName: employee.UserName,
		FullName: employee.FirstName + " " + employee.LastName,
		Role:     string(role.Code),
	}, nil
}

// ---
// Update Employee
// ----
type UpdateEmployeeRequest struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Phone     *string `json:"phone"`
	IsActive  *bool   `json:"is_active"`
}

func (s *UserService) UpdateEmployee(
	id string,
	req UpdateEmployeeRequest,
) (*models.Employee, error) {

	employeeID, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid ID", Code: 400}
	}

	var employee models.Employee
	if err := s.db.First(&employee, "id = ?", employeeID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, &ServiceError{Message: "Employee not found", Code: 404}
		}
		return nil, &ServiceError{Message: "Database error", Code: 500}
	}

	// Partial update logic
	updates := make(map[string]interface{})
	if req.FirstName != nil {
		updates["first_name"] = *req.FirstName
	}
	if req.LastName != nil {
		updates["last_name"] = *req.LastName
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) == 0 {
		return &employee, nil // No updates, return existing employee
	}

	if err := s.db.Model(&employee).Updates(updates).Error; err != nil {
		return nil, &ServiceError{Message: "Failed to update employee", Code: 500}
	}

	return &employee, nil
}

// -------
// get Employee by ID
// -------------
type EmployeeResponse struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	UserName  string `json:"user_name"`
	Phone     string `json:"phone,omitempty"`
	IsActive  bool   `json:"is_active"`
}

func (s *UserService) GetEmployee(id string) (*EmployeeResponse, error) {

	employeeID, err := uuid.Parse(id)
	if err != nil {
		return nil, &ServiceError{
			Message: "Invalid employee ID",
			Code:    400,
		}
	}

	var employee models.Employee
	if err := s.db.First(&employee, "id = ?", employeeID).Error; err != nil {

		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{
				Message: "Employee not found",
				Code:    404,
			}
		}

		return nil, &ServiceError{
			Message: "Database error",
			Code:    500,
			Details: err.Error(),
		}
	}

	return &EmployeeResponse{
		ID:        employee.ID.String(),
		FirstName: employee.FirstName,
		LastName:  employee.LastName,
		UserName:  employee.UserName,
		Phone:     employee.Phone,
		IsActive:  employee.IsActive,
	}, nil
}

// -------
// get All Employees for all companies (for sudoer)
// --------------
type PaginationQuery struct {
	Page  int
	Limit int
}

type PaginatedEmployeeResponse struct {
	Data       []EmployeeResponse `json:"data"`
	Page       int                `json:"page"`
	Limit      int                `json:"limit"`
	Total      int64              `json:"total"`
	TotalPages int                `json:"total_pages"`
}

func (s *UserService) GetEmployees(
	ctx context.Context,
	page, limit int,
) (*PaginatedEmployeeResponse, error) {

	offset := (page - 1) * limit

	var employees []models.Employee
	var total int64

	tx := s.db.WithContext(ctx)

	if err := tx.Model(&models.Employee{}).Count(&total).Error; err != nil {
		return nil, &ServiceError{Message: "Failed to count employees", Code: 500}
	}

	if err := tx.
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&employees).Error; err != nil {

		return nil, &ServiceError{Message: "Failed to fetch employees", Code: 500}
	}

	// map to response DTO
	items := make([]EmployeeResponse, 0, len(employees))
	for _, e := range employees {
		items = append(items, EmployeeResponse{
			ID:        e.ID.String(),
			FirstName: e.FirstName,
			LastName:  e.LastName,
			UserName:  e.UserName,
			Phone:     e.Phone,
			IsActive:  e.IsActive,
		})
	}

	return &PaginatedEmployeeResponse{
		Data:       items,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(limit))),
	}, nil
}

// -----------
// Delete Employee
// ------------
func (s *UserService) DeleteEmployee(id string) error {

	employeeID, err := uuid.Parse(id)
	if err != nil {
		return &ServiceError{
			Message: "Invalid employee ID",
			Code:    400,
		}
	}

	result := s.db.
		Where("id = ? ", employeeID).
		Delete(&models.Employee{})

	if result.Error != nil {
		return &ServiceError{
			Message: "Failed to delete employee",
			Code:    500,
			Details: result.Error.Error(),
		}
	}

	if result.RowsAffected == 0 {
		return &ServiceError{
			Message: "Employee not found",
			Code:    404,
		}
	}

	return nil
}

// --------------------------
// User Signin
// --------------------------
func (s *UserService) SigninEmployee(userName, password string) (*models.Employee, error) {
	var employee models.Employee
	if err := s.db.Where("user_name = ?", userName).First(&employee).Error; err != nil {
		return nil, &ServiceError{Message: "Invalid username or password", Code: 401}
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(employee.Password), []byte(password)); err != nil {
		return nil, &ServiceError{Message: "Invalid username or password", Code: 401}
	}

	return &employee, nil
}

type SigninRequest struct {
	UserName string `json:"user_name"`
	Password string `json:"password"`
}

type SigninResponse struct {
}

// --------------------------
// ServiceError for business logic errors
// --------------------------
type ServiceError struct {
	Message string
	Code    int
	Details string
}

func (e *ServiceError) Error() string {
	return e.Message
}
