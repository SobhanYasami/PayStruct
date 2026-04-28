package services

import (
	"context"
	"errors"
	"fmt"
	"log"
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

// ! ---------------------
// ! Create Employee
// ! ----------------------
type CreateEmployeeRes struct {
	ID       string `json:"id"`
	UserName string `json:"user_name"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

type CreateEmployeeReq struct {
	FirstName   string   `json:"first_name"`
	LastName    string   `json:"last_name"`
	UserName    string   `json:"user_name"`
	Password    string   `json:"password"`
	Phone       string   `json:"phone,omitempty"`
	Role        string   `json:"role"`
	CompanyID   string   `json:"company_id"`
	Permissions []string `json:"permissions"`
}

func (s *UserService) CreateEmployee(req CreateEmployeeReq) (*CreateEmployeeRes, error) {
	//? 1. Validate required fields
	if req.FirstName == "" || req.LastName == "" || req.UserName == "" || req.Password == "" || req.Role == "" {
		return nil, &ServiceError{Message: "Missing required fields", Code: 400}
	}

	//? 2. Start transaction
	tx := s.db.Begin()
	if tx.Error != nil {
		return nil, &ServiceError{Message: "Failed to start transaction", Code: 500}
	}

	//? 3. Ensure transaction is rolled back in case of panic
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic during transaction: %v", r)
			tx.Rollback()
		}
	}()

	//? 4. Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, &ServiceError{Message: "Failed to hash password", Code: 500}
	}

	//? 5. Parse companyID
	companyUUID, err := uuid.Parse(req.CompanyID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid company ID", Code: 400}
	}

	//? 6. Create employee
	employee := models.Employee{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		UserName:  req.UserName,
		Password:  string(hashedPassword),
		Phone:     req.Phone,
		IsActive:  true,
		CompanyID: companyUUID,
	}

	if err := tx.Create(&employee).Error; err != nil {
		return nil, handleDBError(err, "Username or phone already exists", 409)
	}

	//? 7. Check if the role already exists in the company if not create new one
	var role models.Role
	if err := tx.Where("company_id = ? AND code = ?", companyUUID, req.Role).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			role = models.Role{
				Code:      models.RoleCode(req.Role),
				CompanyID: &companyUUID,
			}
			if err := tx.Create(&role).Error; err != nil {
				return nil, &ServiceError{Message: "Failed to create role for employee", Code: 500}
			}
		} else {
			// Other database error
			return nil, &ServiceError{Message: "Failed to check role existence", Code: 500}
		}
	}

	//? 8. Attach role to employee
	employeeRole := models.RoleEmployee{
		EmployeeID: employee.ID,
		RoleID:     role.ID,
	}

	if err := tx.Create(&employeeRole).Error; err != nil {
		return nil, &ServiceError{Message: "Failed to assign role", Code: 500}
	}

	//? 9. Attach Extra Permissions
	if len(req.Permissions) > 0 {
		for _, key := range req.Permissions {
			parts := strings.Split(key, ":")
			if len(parts) != 2 {
				return nil, &ServiceError{Message: "Invalid permission format (expected 'resource:action')", Code: 400}
			}

			resource, action := parts[0], parts[1]

			//* Validate resource/action
			if resource == "" || action == "" {
				return nil, &ServiceError{Message: "Resource or action is empty", Code: 400}
			}

			//* Check if permission already exists
			var perm models.Permission
			if err := tx.Where("resource = ? AND action = ?", resource, action).First(&perm).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					// Permission doesn't exist, create a new one
					perm = models.Permission{
						Resource: resource,
						Action:   action,
					}

					if err := tx.Create(&perm).Error; err != nil {
						return nil, &ServiceError{
							Message: fmt.Sprintf("Failed to create permission: resource=%s, action=%s, error=%v", resource, action, err),
							Code:    400,
						}
					}
				} else {
					//* Some other error occurred while querying for the permission
					return nil, &ServiceError{
						Message: fmt.Sprintf("Failed to check permission: resource=%s, action=%s, error=%v", resource, action, err),
						Code:    500,
					}
				}
			}

			//* Check if role-permission pair already exists
			var existingRolePerm models.RolePermission
			if err := tx.Where("role_id = ? AND permission_id = ?", role.ID, perm.ID).First(&existingRolePerm).Error; err == nil {
				//* RolePermission already exists, skip creating it
				continue
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				//* Handle unexpected error
				return nil, &ServiceError{
					Message: fmt.Sprintf("Failed to check role-permission existence: roleID=%v, permissionID=%v, error=%v", role.ID, perm.ID, err),
					Code:    500,
				}
			}

			//* Create the RolePermission record
			rolePerm := models.RolePermission{
				RoleID:       role.ID,
				PermissionID: perm.ID,
			}

			if err := tx.Create(&rolePerm).Error; err != nil {
				//* Log detailed error information
				log.Printf("Error creating RolePermission: %v", err)
				return nil, &ServiceError{
					Message: fmt.Sprintf("Failed to assign permission: roleID=%v, permissionID=%v, error=%v", role.ID, perm.ID, err),
					Code:    500,
				}
			}
		}
	}

	//? 10. Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, &ServiceError{Message: "Transaction failed", Code: 500}
	}

	//? 11. return response
	return &CreateEmployeeRes{
		ID:       employee.ID.String(),
		UserName: employee.UserName,
		FullName: employee.FirstName + " " + employee.LastName,
		Role:     string(role.Code),
	}, nil
}

// Helper Function
func handleDBError(err error, message string, code int) *ServiceError {
	if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(strings.ToLower(err.Error()), "duplicate") {
		return &ServiceError{Message: message, Code: code}
	}
	return &ServiceError{Message: "Failed to create employee", Code: 500}
}

// ! ------------------
// ! Update Employee
// ! --------------------
type UpdateEmployeeReq struct {
	ID        string  `json:"id"`
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	UserName  *string `json:"user_name"`
	Password  *string `json:"password"`
	Phone     *string `json:"phone,omitempty"`
	CompanyID *string `json:"company_id"`

	IsActive    *bool     `json:"is_active"`
	Role        *string   `json:"role"`
	Permissions *[]string `json:"permissions"`
}

type UpdateEmployeeRes struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	UserName  string `json:"user_name"`
	CompanyID string `json:"company_id"`
}

func (s *UserService) UpdateEmployee(
	req UpdateEmployeeReq,
) (*UpdateEmployeeRes, error) {

	//? 1. Parse employee id
	employeeUUID, err := uuid.Parse(req.ID)
	if err != nil {
		return nil, &ServiceError{Message: "Invalid ID", Code: 400}
	}

	//? 2.0. Start transaction
	tx := s.db.Begin()
	if tx.Error != nil {
		return nil, &ServiceError{Message: "Failed to start transaction", Code: 500}
	}

	//? 2.1. Ensure transaction is rolled back in case of panic
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Panic during transaction: %v", r)
			tx.Rollback()
		}
	}()

	//? 3.0. Retrieve Employee informations
	var employee models.Employee
	if err := tx.Where("id = ?", employeeUUID).First(&employee).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &ServiceError{Message: "Employee not found", Code: 404}
		} else {
			return nil, &ServiceError{Message: "Database error", Code: 500}
		}
	}

	//? 3.1. Partial update logic for employee fields
	updates := make(map[string]interface{})
	if req.FirstName != nil {
		updates["first_name"] = *req.FirstName
	}
	if req.LastName != nil {
		updates["last_name"] = *req.LastName
	}
	if req.UserName != nil {
		updates["user_name"] = *req.UserName
	}
	if req.Password != nil {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, &ServiceError{Message: "Failed to hash password", Code: 500}
		}
		updates["password"] = string(hashedPassword)
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.CompanyID != nil {
		companyUUID, err := uuid.Parse(*req.CompanyID)
		if err != nil {
			return nil, &ServiceError{Message: "Invalid company ID", Code: 400}
		}
		updates["company_id"] = companyUUID
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	//? 3.2. Update user if any fields are changed
	if len(updates) > 0 {
		if err := tx.Model(&employee).Updates(updates).Error; err != nil {
			return nil, &ServiceError{Message: "Failed to update employee", Code: 500}
		}
	}

	//? 4. Handle updating the role and empployee role
	var role models.Role
	var employeeRole models.RoleEmployee
	if req.Role != nil {
		//* check if role exists in this company
		if err := tx.Where("company_id = ? AND code = ?", employee.CompanyID, *req.Role).First(&role).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				//* create role if not found
				role = models.Role{
					Code:      models.RoleCode(*req.Role),
					CompanyID: &employee.CompanyID,
				}

				if err := tx.Create(&role).Error; err != nil {
					return nil, &ServiceError{Message: "Role not found and failed to create new one", Code: 500}
				}
			} else {
				return nil, &ServiceError{Message: "Failed to retrieve role", Code: 500}
			}
		}
		//* if role does exists update it
		role_updates := make(map[string]interface{})
		role_updates["code"] = models.RoleCode(*req.Role)
		role_updates["company_id"] = employee.CompanyID

		if len(role_updates) > 0 {
			if err := tx.Model(&role).Updates(role_updates).Error; err != nil {
				return nil, &ServiceError{Message: "Failed to update submitted role for employee", Code: 500}
			}
		}

		// * check if employeeRole exists in this company
		if err := tx.Where("employee_id = ?", employee.ID).First(&employeeRole).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				employeeRole = models.RoleEmployee{
					EmployeeID: employee.ID,
					RoleID:     role.ID,
				}
				if err := tx.Create(&employeeRole).Error; err != nil {
					return nil, &ServiceError{Message: "Failed to assign role", Code: 500}
				}
			} else {
				return nil, &ServiceError{Message: "Failed to retrieve employee role", Code: 500}
			}
		} else {
			if err := tx.Model(&employeeRole).Update("role_id", role.ID).Error; err != nil {
				return nil, &ServiceError{Message: "Failed to update employee role", Code: 500}
			}
		}
	}

	//? 5. Handle updating the permissions
	if req.Permissions != nil {
		for _, key := range *req.Permissions {
			parts := strings.Split(key, ":")
			if len(parts) != 2 {
				return nil, &ServiceError{Message: "Invalid permission format (expected 'resource:action')", Code: 400}
			}

			resource, action := parts[0], parts[1]

			//* Check if the permission already exists if it doesn't create new one
			var perm models.Permission
			if err := tx.Where("resource = ? AND action = ?", resource, action).First(&perm).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					perm = models.Permission{
						Resource: resource,
						Action:   action,
					}
					if err := tx.Create(&perm).Error; err != nil {
						return nil, &ServiceError{
							Message: fmt.Sprintf("Failed to create permission: resource=%s, action=%s, error=%v", resource, action, err),
							Code:    400,
						}
					}
				} else {
					return nil, &ServiceError{
						Message: fmt.Sprintf("Failed to retrieve permission: resource=%s, action=%s, error=%v", resource, action, err),
						Code:    500,
					}
				}
			} else {
				//* if does exists move on
				continue
			}

			//* Check if role-permission pair already exists
			var RolePerm models.RolePermission
			if err := tx.Where("role_id = ? AND permission_id = ?", employeeRole.RoleID, perm.ID).First(&RolePerm).Error; err == nil {
				continue
			} else if errors.Is(err, gorm.ErrRecordNotFound) {
				//* Create new role-permission relationship
				rolePerm := models.RolePermission{
					RoleID:       employeeRole.RoleID,
					PermissionID: perm.ID,
				}
				if err := s.db.Create(&rolePerm).Error; err != nil {
					return nil, &ServiceError{Message: "Failed to assign permission", Code: 500}
				}
			} else {
				//* Unexpected error while checking for existing role-permission pair
				return nil, &ServiceError{
					Message: fmt.Sprintf("Failed to check role-permission existence: roleID=%v, permissionID=%v, error=%v", employeeRole.RoleID, perm.ID, err),
					Code:    500,
				}
			}
		}
	}

	//? 6. Return updated employee info
	return &UpdateEmployeeRes{
		ID:        employee.ID.String(),
		FirstName: employee.FirstName,
		LastName:  employee.LastName,
		UserName:  employee.UserName,
		CompanyID: employee.CompanyID.String(),
	}, nil
}

// ! ---------------------------------
// ! get Employee by ID
// ! -------------------------------------
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
type AuthenticatedEmployee struct {
	Employee    *models.Employee
	Role        models.Role
	Permissions []models.Permission
}

// helper functions:
func extractRoleIDs(roles []models.Role) []uuid.UUID {
	ids := make([]uuid.UUID, len(roles))
	for i, r := range roles {
		ids[i] = r.ID
	}
	return ids
}

func deduplicatePermissions(perms []models.Permission) []models.Permission {
	seen := make(map[string]models.Permission)
	for _, p := range perms {
		key := p.Resource + ":" + p.Action
		seen[key] = p
	}

	result := make([]models.Permission, 0, len(seen))
	for _, v := range seen {
		result = append(result, v)
	}

	return result
}

func (s *UserService) SigninEmployee(userName, password string) (*AuthenticatedEmployee, error) {
	var employee models.Employee

	//? 1. Find employee
	if err := s.db.
		Where("user_name = ?", userName).
		First(&employee).Error; err != nil {
		return nil, &ServiceError{
			Message: "Invalid username or password",
			Code:    401,
		}
	}

	//? 2. Check password
	if err := bcrypt.CompareHashAndPassword(
		[]byte(employee.Password),
		[]byte(password),
	); err != nil {
		return nil, &ServiceError{
			Message: "Invalid username or password",
			Code:    401,
		}
	}

	//? 3. find employee role
	var employee_role models.RoleEmployee
	if err := s.db.Where("employee_id = ?", employee.ID).First(&employee_role).Error; err != nil {
		return nil, err
	}
	var role models.Role
	if err := s.db.Where("id = ?", employee_role.RoleID).First(&role).Error; err != nil {
		return nil, err
	}

	//? 4. fing role permissions
	var role_permissions []models.RolePermission
	if err := s.db.Where("role_id = ?", role.ID).Find(&role_permissions).Error; err != nil {
		return nil, err
	}
	var permissions []models.Permission
	for _, rp := range role_permissions {
		var perm models.Permission
		if err := s.db.Where("id = ?", rp.PermissionID).First(&perm).Error; err != nil {
			return nil, err
		}
		permissions = append(permissions, perm)
	}

	//? 5. Remove duplicate permissions
	permissions = deduplicatePermissions(permissions)

	//? 6. Send result
	return &AuthenticatedEmployee{
		Employee:    &employee,
		Role:        role,
		Permissions: permissions,
	}, nil
}

type SigninRequest struct {
	UserName string `json:"user_name"`
	Password string `json:"password"`
}

type SigninResponse struct {
}

// ! ====================================================
// ! ServiceError for business logic errors
// ! --------------------------------------
type ServiceError struct {
	Message string
	Code    int
	Details string
}

func (e *ServiceError) Error() string {
	return e.Message
}
