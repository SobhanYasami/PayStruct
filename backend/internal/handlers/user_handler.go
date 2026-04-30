package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/config"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"

	"gorm.io/gorm"
)

type UserHandler struct {
	userService *services.UserService
	tokenSvc    *services.TokenService
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{
		userService: services.NewUserService(db),
		tokenSvc:    services.NewTokenService(config.Load()),
	}
}

// POST /users/auth/signin
func (h *UserHandler) SigninEmployee(c *fiber.Ctx) error {
	type LoginRequest struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Email and password are required"))
	}

	auth, err := h.userService.SigninEmployee(req.Email, req.Password)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(Unauthorized, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Authentication failed"))
	}

	token, err := h.tokenSvc.Generate(auth.Employee, auth.Employee.CompanyID.String(), auth.Roles)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Token generation failed"))
	}

	return c.JSON(SuccessResponse(fiber.Map{
		"token": token,
		"roles": auth.Roles,
	}, "Login successful"))
}

// POST /users/employees/create
func (h *UserHandler) CreateEmployee(c *fiber.Ctx) error {
	var req services.CreateEmployeeReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	res, err := h.userService.CreateEmployee(req)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(ResponseStatus(BadRequest), svcErr.Message, svcErr.Details))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to create employee"))
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(res, "Employee created successfully"))
}

// PUT /users/employees/:id
func (h *UserHandler) UpdateEmployee(c *fiber.Ctx) error {
	id := c.Params("id")

	var req services.UpdateEmployeeReq
	req.ID = id
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	resp, err := h.userService.UpdateEmployee(req)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message, svcErr.Details))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to update employee"))
	}

	return c.JSON(SuccessResponse(resp, "Employee updated successfully"))
}

// GET /users/employees/:id
func (h *UserHandler) GetEmployee(c *fiber.Ctx) error {
	id := c.Params("id")

	resp, err := h.userService.GetEmployee(id)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message, svcErr.Details))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.JSON(SuccessResponse(resp, "Employee retrieved successfully"))
}

// GET /users/employees/list
func (h *UserHandler) GetAllEmployee(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	resp, err := h.userService.GetEmployees(c.Context(), page, limit)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.JSON(SuccessResponse(resp, "Employees retrieved successfully"))
}

// GET /users/me — any authenticated user
func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	profile, err := h.userService.GetProfile(claims.UserID)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.JSON(SuccessResponse(profile, "Profile retrieved"))
}

// PUT /users/me — any authenticated user
func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	var req services.UpdateProfileReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	profile, err := h.userService.UpdateProfile(claims.UserID, req)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.JSON(SuccessResponse(profile, "Profile updated"))
}

// DELETE /users/employees/:id
func (h *UserHandler) DeleteEmployee(c *fiber.Ctx) error {
	id := c.Params("id")

	err := h.userService.DeleteEmployee(id)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.SendStatus(fiber.StatusNoContent)
}
