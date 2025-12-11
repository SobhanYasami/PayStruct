package services

import (
	"strings"

	"github.com/sobhan-yasami/docs-db-panel/internal/models"
	// "github.com/sobhan-yasami/docs-db-panel/internal/handlers"

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
type CreateEmployeeRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	UserName  string `json:"user_name"`
	Password  string `json:"password"`
	Phone     string `json:"phone,omitempty"`
	Role      string `json:"role"`
}

type CreateEmployeeResponse struct {
	ID       string `json:"id"`
	UserName string `json:"user_name"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

func (s *UserService) CreateEmployee(req CreateEmployeeRequest) (*CreateEmployeeResponse, error) {
	//1. Validate required fields
	if req.FirstName == "" {
		return nil, &ServiceError{Message: "First name is required", Code: 400}
	}
	if req.LastName == "" {
		return nil, &ServiceError{Message: "Last name is required", Code: 400}
	}
	if req.UserName == "" {
		return nil, &ServiceError{Message: "username is required", Code: 400}
	}
	if req.Password == "" {
		return nil, &ServiceError{Message: "password is required", Code: 400}
	}
	if req.Role == "" {
		return nil, &ServiceError{Message: "role is required", Code: 400}
	}

	//2. Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, &ServiceError{Message: "Failed to hash password", Code: 500, Details: err.Error()}
	}

	//3. Create employee model
	employee := models.Employee{
		User: models.User{
			FirstName: req.FirstName,
			LastName:  req.LastName,
		},
		UserName: req.UserName,
		Password: string(hashedPassword),
		Phone:    req.Phone,
		Role:     req.Role,
		IsActive: true,
	}

	//4. Save to DB
	if err := s.db.Create(&employee).Error; err != nil {
		// Handle duplicate key errors
		if strings.Contains(err.Error(), "Duplicate entry") {
			if strings.Contains(err.Error(), "user_name") {
				return nil, &ServiceError{Message: "Username already exists", Code: 409}
			}
			if strings.Contains(err.Error(), "phone") && req.Phone != "" {
				return nil, &ServiceError{Message: "Phone number already exists", Code: 409}
			}
		}
		return nil, &ServiceError{Message: "Failed to create employee", Code: 500, Details: err.Error()}
	}

	//5. Return response
	return &CreateEmployeeResponse{
		ID:       employee.ID.String(),
		UserName: employee.UserName,
		FullName: employee.FirstName + " " + employee.LastName,
		Role:     employee.Role,
	}, nil
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
