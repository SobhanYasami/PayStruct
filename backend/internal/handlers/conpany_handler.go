package handlers

import (
	"math"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"
	"gorm.io/gorm"
)

type CompanyHandler struct {
	companySvc *services.CompanyService
	validate   *validator.Validate
}

func NewCompanyHandler(db *gorm.DB) *CompanyHandler {
	return &CompanyHandler{
		companySvc: services.NewCompanyService(db),
		validate:   validator.New(),
	}
}

// companyResponse is the shared JSON shape returned by all company endpoints.
type companyResponse struct {
	ID       uuid.UUID  `json:"id"`
	Name     string     `json:"name"`
	RegNum   string     `json:"reg_num"`
	ParentID *uuid.UUID `json:"parent_id,omitempty"`
}

// actorID extracts the authenticated user's UUID from JWT claims.
// Returns uuid.Nil + false when the claims are missing or malformed.
func actorID(c *fiber.Ctx) (uuid.UUID, bool) {
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(claims.UserID)
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

// POST /company/management
func (h *CompanyHandler) CreateCompany(c *fiber.Ctx) error {
	if _, ok := actorID(c); !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Access denied"))
	}

	type req struct {
		Name     string  `json:"name"      validate:"required,max=255"`
		RegNum   string  `json:"reg_num"   validate:"required,max=64"`
		ParentID *string `json:"parent_id"`
	}
	var body req
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	if err := h.validate.Struct(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, err.Error()))
	}

	company, err := h.companySvc.CreateCompany(c.Context(), services.CreateCompanyReq{
		Name:     body.Name,
		RegNum:   body.RegNum,
		ParentID: body.ParentID,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(BadRequest, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to create company"))
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(companyResponse{
		ID:       company.ID,
		Name:     company.Name,
		RegNum:   company.RegNum,
		ParentID: company.ParentID,
	}, "Company created successfully"))
}

// isSuperAdmin returns true if claims include sudoer or admin role.
func isSuperAdmin(claims *schemas.JWTClaims) bool {
	for _, r := range claims.Roles {
		if r == "sudoer" || r == "admin" {
			return true
		}
	}
	return false
}

// GET /company/management
func (h *CompanyHandler) GetAllCompanies(c *fiber.Ctx) error {
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	search := c.Query("search")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	// Non-admin heads only see their own company
	if !isSuperAdmin(claims) {
		companyUUID, err := uuid.Parse(claims.CompanyID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Invalid company in token"))
		}
		company, err := h.companySvc.GetCompanyDetails(c.Context(), companyUUID)
		if err != nil {
			if svcErr, ok := err.(*services.ServiceError); ok {
				return c.Status(svcErr.Code).JSON(ErrorResponse(NotFound, svcErr.Message))
			}
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to get company"))
		}
		item := companyResponse{ID: company.ID, Name: company.Name, RegNum: company.RegNum, ParentID: company.ParentID}
		return c.JSON(SuccessResponse(fiber.Map{
			"data": []companyResponse{item}, "total": 1, "page": 1, "limit": 1, "total_pages": 1,
		}, "Companies retrieved successfully"))
	}

	companies, total, err := h.companySvc.ListCompanies(c.Context(), search, page, limit)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to list companies"))
	}

	items := make([]companyResponse, 0, len(companies))
	for _, co := range companies {
		items = append(items, companyResponse{
			ID:       co.ID,
			Name:     co.Name,
			RegNum:   co.RegNum,
			ParentID: co.ParentID,
		})
	}

	return c.JSON(SuccessResponse(fiber.Map{
		"data":        items,
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": int(math.Ceil(float64(total) / float64(limit))),
	}, "Companies retrieved successfully"))
}

// GET /company/management/:id
func (h *CompanyHandler) GetCompanyByID(c *fiber.Ctx) error {
	claims, ok := c.Locals("claims").(*schemas.JWTClaims)
	if !ok || claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	companyUUID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid company ID"))
	}

	// Non-admin heads can only read their own company
	if !isSuperAdmin(claims) && claims.CompanyID != companyUUID.String() {
		return c.Status(fiber.StatusForbidden).JSON(ErrorResponse(Forbidden, "access denied"))
	}

	company, err := h.companySvc.GetCompanyDetails(c.Context(), companyUUID)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(NotFound, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to get company"))
	}

	return c.JSON(SuccessResponse(companyResponse{
		ID:       company.ID,
		Name:     company.Name,
		RegNum:   company.RegNum,
		ParentID: company.ParentID,
	}, "Company retrieved successfully"))
}

// PUT /company/management/:id
func (h *CompanyHandler) UpdateCompany(c *fiber.Ctx) error {
	if _, ok := actorID(c); !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Access denied"))
	}

	companyUUID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid company ID"))
	}

	var req services.UpdateCompanyReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	company, err := h.companySvc.UpdateCompany(c.Context(), companyUUID, req)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to update company"))
	}

	return c.JSON(SuccessResponse(companyResponse{
		ID:       company.ID,
		Name:     company.Name,
		RegNum:   company.RegNum,
		ParentID: company.ParentID,
	}, "Company updated successfully"))
}

// DELETE /company/management/:id
func (h *CompanyHandler) DeleteCompany(c *fiber.Ctx) error {
	if _, ok := actorID(c); !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Access denied"))
	}

	companyUUID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid company ID"))
	}

	if err := h.companySvc.DeleteCompany(c.Context(), companyUUID); err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			return c.Status(svcErr.Code).JSON(ErrorResponse(InternalError, svcErr.Message))
		}
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to delete company"))
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse(nil, "Company deleted successfully"))
}
