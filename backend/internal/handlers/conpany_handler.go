package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"
)

// CompanyHandler handles company endpoints
type CompanyHandler struct {
	companyService *services.CompanyService
}

// NewCompanyHandler creates a new CompanyHandler
func NewCompanyHandler(service *services.CompanyService) *CompanyHandler {
	return &CompanyHandler{companyService: service}
}

// CreateCompanyRequest defines the expected request body
type CreateCompanyRequest struct {
	Name     string `json:"name" validate:"required,max=100"`
	ParentID string `json:"parent_id,omitempty"`
}

// ParseParentID validates and converts ParentID string to *uuid.UUID
func (r *CreateCompanyRequest) ParseParentID() (*uuid.UUID, error) {
	if r.ParentID == "" {
		return nil, nil
	}
	id, err := uuid.Parse(r.ParentID)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

// ! @Route POST /company/management
// ! @Summary Create a new company
// ! @Description Create a new company with optional parent company
// ! @Tags Company Management
// ! @Accept json
// ! @Produce json
// ! @Param company body CreateCompanyRequest true "Company details"
// ! @Success 201 {object} SuccessResponse{data=CompanyResponse} "Company created successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 409 {object} ErrorResponse "Conflict (e.g., duplicate name)"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (h *CompanyHandler) CreateCompany(c *fiber.Ctx) error {
	//? 1. Get userID from context (middleware)
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Access denied"))
	}

	//? 2. Parse request
	var req CreateCompanyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	//? 3. Validate request (using validator)
	if err := validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Validation failed"))
	}

	//? 4. Convert ParentID
	parentUUID, err := req.ParseParentID()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid parent_id format"))
	}

	//? 5. Call service
	company, err := h.companyService.CreateCompany(c.Context(), req.Name, parentUUID, userID)
	if err != nil {
		switch err.Error() {
		case "parent company not found", "company with the same name already exists under this parent":
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse(BadRequest, err.Error()))
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to create company"))
		}
	}

	//? 6. Build response
	type CompanyResponse struct {
		ID       uuid.UUID  `json:"id"`
		Name     string     `json:"name"`
		ParentID *uuid.UUID `json:"parent_id,omitempty"`
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(CompanyResponse{
		ID:       company.ID,
		Name:     company.Name,
		ParentID: company.ParentID,
	}, "Company created successfully"))
}

// ! @Route GET /company/management/:id
// ! @Summary Get company details
// ! @Description Get details of a specific company by ID
// ! @Tags Company Management
// ! @Accept json
// ! @Produce json
// ! @Param id path string true "Company ID"
// ! @Success 200 {object} SuccessResponse{data=CompanyResponse} "Company details retrieved successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 404 {object} ErrorResponse "Company not found"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (h *CompanyHandler) GetCompanyByID(c *fiber.Ctx) error {
	//? 2. Parse company ID from path
	companyID := c.Params("id")
	companyUUID, err := uuid.Parse(companyID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid company ID format"))
	}

	//? 3. Call service
	company, err := h.companyService.GetCompanyDetails(c.Context(), companyUUID)
	if err != nil {
		switch err.Error() {
		case "company not found":
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse(NotFound, "Company not found"))
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to get company details"))
		}
	}

	//? 4. Build response
	type CompanyResponse struct {
		ID       uuid.UUID  `json:"id"`
		Name     string     `json:"name"`
		ParentID *uuid.UUID `json:"parent_id,omitempty"`
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse(CompanyResponse{
		ID:       company.ID,
		Name:     company.Name,
		ParentID: company.ParentID,
	}, "Company details retrieved successfully"))
}

// ! @Route PUT /company/management/:id
// ! @Summary Update company details
// ! @Description Update the name or parent company of a specific company by ID
// ! @Tags Company Management
// ! @Accept json
// ! @Produce json
// ! @Param id path string true "Company ID"
// ! @Param company body UpdateCompanyRequest true "Updated company details"
// ! @Success 200 {object} SuccessResponse{data=CompanyResponse} "Company updated successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 404 {object} ErrorResponse "Company not found"
// ! @Failure 409 {object} ErrorResponse "Conflict (e.g., duplicate name)"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (h *CompanyHandler) UpdateCompany(c *fiber.Ctx) error {
	//? 2. Parse company ID from path
	companyID := c.Params("id")
	companyUUID, err := uuid.Parse(companyID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid company ID format"))
	}

	//? 1. Get userID from context (middleware)
	userUUID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Access denied"))
	}

	//? 2. Parse request
	var req CreateCompanyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	//? 3. Validate request (using validator)
	if err := validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Validation failed"))
	}

	//? 4. Convert ParentID
	parentUUID, err := req.ParseParentID()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid parent_id format"))
	}

	//? 5. Call service
	company, err := h.companyService.UpdateCompany(c.Context(), companyUUID, req.Name, parentUUID, userUUID)
	if err != nil {
		switch err.Error() {
		case "parent company not found", "company with the same name already exists under this parent":
			return c.Status(fiber.StatusConflict).JSON(ErrorResponse(BadRequest, err.Error()))
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to update company"))
		}
	}

	//? 6. Build response
	type CompanyResponse struct {
		ID       uuid.UUID  `json:"id"`
		Name     string     `json:"name"`
		ParentID *uuid.UUID `json:"parent_id,omitempty"`
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(CompanyResponse{
		ID:       company.ID,
		Name:     company.Name,
		ParentID: company.ParentID,
	}, "Company updated successfully"))

}

// ! @Route DELETE /company/management/:id
// ! @Summary Deactivate a company
// ! @Description Soft delete (deactivate) a specific company by ID
// ! @Tags Company Management
// ! @Accept json
// ! @Produce json
// ! @Param id path string true "Company ID"
// ! @Success 200 {object} SuccessResponse "Company deactivated successfully"
// ! @Failure 400 {object} ErrorResponse "Invalid request"
// ! @Failure 401 {object} ErrorResponse "Unauthorized"
// ! @Failure 404 {object} ErrorResponse "Company not found"
// ! @Failure 500 {object} ErrorResponse "Internal server error"
// ! @Security ApiKeyAuth
func (h *CompanyHandler) DeleteCompany(c *fiber.Ctx) error {
	//? 2. Parse company ID from path
	companyID := c.Params("id")
	companyUUID, err := uuid.Parse(companyID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid company ID format"))
	}

	//? 1. Get userID from context (middleware)
	userUUID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Access denied"))
	}

	//? 2. Call service (soft delete)
	if err := h.companyService.DeleteCompany(c.Context(), companyUUID, userUUID); err != nil {
		switch err.Error() {
		case "company not found":
			return c.Status(fiber.StatusNotFound).JSON(ErrorResponse(NotFound, "Company not found"))
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Failed to delete company"))
		}
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse(nil, "Company deactivated successfully"))
}
