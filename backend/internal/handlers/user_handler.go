package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/config"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"

	"gorm.io/gorm"
)

// -----------------------------------------------------------------------
type UserHandler struct {
	db          *gorm.DB
	userService *services.UserService
	tokenSvc    *services.TokenService
}

func NewUserHandler(
	db *gorm.DB,
) *UserHandler {
	return &UserHandler{
		userService: services.NewUserService(db),
		tokenSvc:    services.NewTokenService(config.Load()),
	}
}

// ------------------------------------------------------------------------
//
//	public handler methods
//
// ----------------
// ! @Route POST /users/signin
// ! @Summary Sign in an employee
// ! @Description Authenticate an employee and return a JWT token
// ! @Tags Authentication
// ! @Accept json
// ! @Produce json
// ! @Param credentials body SigninRequest true "Employee credentials"
// ! @Success 200 {object} SigninResponse "Authentication successful"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @post /users/signin ----
func (h *UserHandler) SigninEmployee(c *fiber.Ctx) error {

	type LoginRequest struct {
		UserName string `json:"user_name"`
		Password string `json:"password"`
	}

	var req LoginRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).
			JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	user, err := h.userService.SigninEmployee(req.UserName, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).
			JSON(ErrorResponse(Unauthorized, "Invalid credentials"))
	}

	token, err := h.tokenSvc.Generate(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).
			JSON(ErrorResponse(InternalError, "Token generation failed"))
	}

	return c.JSON(SuccessResponse(fiber.Map{
		"token": token,
	}, "Login successful"))
}

// --------------
// Protected handler methods (require authentication/authorization)
// --------------

// ! @Route POST /users/employee/create
// ! @Summary Create a new employee
// ! @Description Create a new employee with specified role and permissions
// ! @Tags User Management
// ! @Accept json
// ! @Produce json
// ! @Success 201 {object} SuccessResponse{data} "user created successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 409 {object} ErrorResponse "Conflict (e.g., duplicate name)"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (handler *UserHandler) CreateEmployee(c *fiber.Ctx) error {
	type ReqBody struct {
		FirstName   string   `json:"first_name"`
		LastName    string   `json:"last_name"`
		UserName    string   `json:"user_name"`
		Password    string   `json:"password"`
		Phone       string   `json:"phone,omitempty"`
		Role        string   `json:"role"`
		CompanyID   string   `json:"company_id"`
		Permissions []string `json:"permissions"`
	}

	var req ReqBody

	//* 1) Parse and validate input
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid Request!"))
	}

	//* 2) Call service layer
	_, err := handler.userService.CreateEmployee(
		req.FirstName,
		req.LastName,
		req.UserName,
		req.Password,
		req.Phone,
		req.Role,
		req.CompanyID,
		req.Permissions,
	)
	if err != nil {
		serviceErr, ok := err.(*services.ServiceError)
		if ok {
			return c.Status(serviceErr.Code).JSON(ErrorResponse(InternalError, serviceErr.Message, serviceErr.Details))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to create employee"))
	}

	//* 3) Return success response
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(Created, "Employee created successfully"))
}

// ! @Route PUT /users/employee/:id
// ! @Summary Update an existing employee
// ! @Description Update employee details by ID
// ! @Tags User Management
// ! @Accept json
// ! @Produce json
// ! @Param id path string true "Employee ID"
// ! @Param employee body Employee true "Employee details to update"
// ! @Success 200 {object} SuccessResponse{data} "Employee updated successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 404 {object} ErrorResponse "Employee not found"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (handler *UserHandler) UpdateEmployee(c *fiber.Ctx) error {
	id := c.Params("id")

	var req services.UpdateEmployeeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).
			JSON(ErrorResponse(BadRequest, "Invalid Request"))
	}

	resp, err := handler.userService.UpdateEmployee(id, req)
	if err != nil {
		if serviceErr, ok := err.(*services.ServiceError); ok {
			return c.Status(serviceErr.Code).
				JSON(ErrorResponse(InternalError, serviceErr.Message, serviceErr.Details))
		}
		return c.Status(fiber.StatusInternalServerError).
			JSON(ErrorResponse(InternalError, "Failed to update employee"))
	}

	return c.Status(fiber.StatusOK).
		JSON(SuccessResponse(resp, "Employee successfully updated"))
}

// ! @Route GET /users/employee/:id
// ! @Summary Get employee details
// ! @Description Retrieve employee information by ID
// ! @Tags User Management
// ! @Accept json
// ! @Produce json
// ! @Param id path string true "Employee ID"
// ! @Success 200 {object} SuccessResponse{data} "Employee retrieved successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 404 {object} ErrorResponse "Employee not found"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (handler *UserHandler) GetEmployee(c *fiber.Ctx) error {
	id := c.Params("id")

	resp, err := handler.userService.GetEmployee(id)
	if err != nil {
		if serviceErr, ok := err.(*services.ServiceError); ok {
			return c.Status(serviceErr.Code).
				JSON(ErrorResponse(InternalError, serviceErr.Message, serviceErr.Details))
		}
		return c.Status(fiber.StatusInternalServerError).
			JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.JSON(SuccessResponse(resp, "Employee successfully retrieved"))
}

// ! @Route GET /users/employee
// ! @Summary Get all employees
// ! @Description Retrieve a paginated list of all employees
// ! @Tags User Management
// ! @Accept json
// ! @Produce json
// ! @Param page query int false "Page number (default: 1)"
// ! @Param limit query int false "Number of items per page (default: 10)"
// ! @Success 200 {object} SuccessResponse{data} "Employees retrieved successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (handler *UserHandler) GetAllEmployee(c *fiber.Ctx) error {

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)

	if page < 1 {
		page = 1
	}

	if limit < 1 || limit > 100 {
		limit = 10
	}

	resp, err := handler.userService.GetEmployees(c.Context(), page, limit)
	if err != nil {
		if serviceErr, ok := err.(*services.ServiceError); ok {
			return c.Status(serviceErr.Code).
				JSON(ErrorResponse(InternalError, serviceErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).
			JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.JSON(SuccessResponse(resp, "Employees retrieved successfully"))
}

// ! @Route DELETE /users/employee/:id
// ! @Summary Delete an employee
// ! @Description Remove an employee from the system by ID
// ! @Tags User Management
// ! @Accept json
// ! @Produce json
// ! @Param id path string true "Employee ID"
// ! @Success 204 "No Content - Employee deleted successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 404 {object} ErrorResponse "Employee not found"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (handler *UserHandler) DeleteEmployee(c *fiber.Ctx) error {
	id := c.Params("id")

	err := handler.userService.DeleteEmployee(id)
	if err != nil {
		if serviceErr, ok := err.(*services.ServiceError); ok {
			return c.Status(serviceErr.Code).
				JSON(ErrorResponse(InternalError, serviceErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).
			JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.SendStatus(fiber.StatusNoContent)
}
