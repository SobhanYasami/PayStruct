package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/config"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"

	"gorm.io/gorm"
)

type UserHandler struct {
	userService *services.UserService
	tokenSvc    *services.TokenService
	companySvc  *services.CompanyService
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{
		userService: services.NewUserService(db),
		tokenSvc:    services.NewTokenService(config.Load()),
		companySvc:  services.NewCompanyService(db),
	}
}

// scopeIDs resolves the list of company IDs the caller may access.
// nil = no restriction (admin/sudoer). Non-nil = IN filter.
func (h *UserHandler) scopeIDs(ctx *fiber.Ctx, claims *schemas.JWTClaims) ([]string, error) {
	for _, r := range claims.Roles {
		if r == "sudoer" || r == "admin" {
			return nil, nil
		}
	}
	companyUUID, err := uuid.Parse(claims.CompanyID)
	if err != nil {
		return nil, err
	}
	for _, r := range claims.Roles {
		if r == "manager" {
			return h.companySvc.ManagerScopeIDs(ctx.Context(), companyUUID)
		}
	}
	return []string{claims.CompanyID}, nil
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

	emp := auth.Employee
	return c.JSON(SuccessResponse(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":              emp.ID.String(),
			"first_name":      emp.FirstName,
			"last_name":       emp.LastName,
			"email":           emp.Email,
			"company_id":      emp.CompanyID.String(),
			"root_company_id": emp.CompanyID.String(),
			"roles":           auth.Roles,
		},
	}, "Login successful"))
}

// POST /users/employees/create
func (h *UserHandler) CreateEmployee(c *fiber.Ctx) error {
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	var req services.CreateEmployeeReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	ids, err := h.scopeIDs(c, claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to resolve scope"))
	}
	if len(ids) > 0 {
		found := false
		for _, id := range ids {
			if id == req.CompanyID {
				found = true
				break
			}
		}
		if !found {
			return c.Status(fiber.StatusForbidden).JSON(ErrorResponse(Forbidden, "Cannot create employee in that company"))
		}
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
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	id := c.Params("id")

	ids, err := h.scopeIDs(c, claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to resolve scope"))
	}
	if err := h.userService.EmployeeInScope(id, ids); err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(Forbidden, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

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
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	ids, err := h.scopeIDs(c, claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to resolve scope"))
	}

	resp, err := h.userService.GetEmployee(c.Params("id"), ids)
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
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	ids, err := h.scopeIDs(c, claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to resolve scope"))
	}

	resp, err := h.userService.GetEmployees(c.Context(), ids, page, limit)
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
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	id := c.Params("id")

	ids, err := h.scopeIDs(c, claims)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to resolve scope"))
	}
	if err := h.userService.EmployeeInScope(id, ids); err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(Forbidden, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	err = h.userService.DeleteEmployee(id)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Unexpected error"))
	}

	return c.SendStatus(fiber.StatusNoContent)
}
