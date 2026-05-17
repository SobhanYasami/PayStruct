package handlers

import (
	"slices"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"
	"gorm.io/gorm"
)

// jwtClaims extracts the JWT claims set by the Authenticate middleware.
func jwtClaims(c *fiber.Ctx) *schemas.JWTClaims {
	claims, _ := c.Locals("claims").(*schemas.JWTClaims)
	return claims
}

// serviceErr maps a ServiceError to the correct HTTP status/body.
func serviceErr(c *fiber.Ctx, err error) error {
	if svcErr, ok := err.(*services.ServiceError); ok {
		return c.Status(svcErr.Code).JSON(ErrorResponse(BadRequest, svcErr.Message))
	}
	return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse(InternalError, "Internal server error"))
}

// paginationQuery parses page/limit query params with safe defaults.
func paginationQuery(c *fiber.Ctx) (page, limit int) {
	page, _ = strconv.Atoi(c.Query("page", "1"))
	limit, _ = strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return
}

// ============================================================
// PROJECT HANDLER
// ============================================================

type ProjectHandler struct {
	svc *services.ProjectService
}

func NewProjectHandler(db *gorm.DB) *ProjectHandler {
	return &ProjectHandler{svc: services.NewProjectService(db)}
}

// POST /projects
func (h *ProjectHandler) CreateProject(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	var body struct {
		services.CreateProjectReq
		CompanyID string `json:"company_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}

	companyID := claims.CompanyID
	isAdmin := slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Roles, "sudoer")
	if body.CompanyID != "" && isAdmin {
		companyID = body.CompanyID
	}

	project, err := h.svc.Create(c.Context(), companyID, body.CreateProjectReq)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(project, "Project created"))
}

// GET /projects/:id
func (h *ProjectHandler) GetProject(c *fiber.Ctx) error {
	project, err := h.svc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(project))
}

// GET /projects
func (h *ProjectHandler) ListProjects(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	page, limit := paginationQuery(c)
	status := c.Query("status")

	companyID := claims.CompanyID
	if slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Roles, "sudoer") {
		companyID = c.Query("company_id") // admins may filter by company or see all (empty = all)
	}

	projects, total, err := h.svc.List(c.Context(), companyID, status, page, limit)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(fiber.Map{
		"data":  projects,
		"total": total,
		"page":  page,
		"limit": limit,
	}))
}

// PUT /projects/:id
func (h *ProjectHandler) UpdateProject(c *fiber.Ctx) error {
	var req services.UpdateProjectReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	project, err := h.svc.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(project, "Project updated"))
}

// DELETE /projects/:id
func (h *ProjectHandler) DeleteProject(c *fiber.Ctx) error {
	if err := h.svc.Delete(c.Context(), c.Params("id")); err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusNoContent).Send(nil)
}

// ============================================================
// CONTRACTOR HANDLER
// ============================================================

type ContractorHandler struct {
	svc *services.ContractorService
}

func NewContractorHandler(db *gorm.DB) *ContractorHandler {
	return &ContractorHandler{svc: services.NewContractorService(db)}
}

// POST /contractors
func (h *ContractorHandler) CreateContractor(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	var req services.CreateContractorReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	contractor, err := h.svc.Create(c.Context(), claims.CompanyID, claims.UserID, req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(contractor, "Contractor created"))
}

// GET /contractors/:id
func (h *ContractorHandler) GetContractor(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	contractor, err := h.svc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(contractor))
}

// GET /contractors
func (h *ContractorHandler) ListContractors(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	page, limit := paginationQuery(c)
	search := c.Query("search")

	callerCompanyID := claims.CompanyID
	if slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Roles, "sudoer") {
		callerCompanyID = ""
	}

	contractors, total, err := h.svc.List(c.Context(), callerCompanyID, search, page, limit)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(fiber.Map{
		"data":  contractors,
		"total": total,
		"page":  page,
		"limit": limit,
	}))
}

// PUT /contractors/:id
func (h *ContractorHandler) UpdateContractor(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	var req services.UpdateContractorReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	isAdmin := slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Roles, "sudoer")
	contractor, err := h.svc.Update(c.Context(), c.Params("id"), claims.CompanyID, isAdmin, req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(contractor, "Contractor updated"))
}

// DELETE /contractors/:id
func (h *ContractorHandler) DeleteContractor(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	isAdmin := slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Roles, "sudoer")
	if err := h.svc.Delete(c.Context(), c.Params("id"), claims.CompanyID, isAdmin); err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusNoContent).Send(nil)
}

// ============================================================
// CONTRACT HANDLER
// ============================================================

type ContractHandler struct {
	svc *services.ContractSvc
}

func NewContractHandler(db *gorm.DB) *ContractHandler {
	return &ContractHandler{svc: services.NewContractSvc(db)}
}

// POST /contracts
func (h *ContractHandler) CreateContract(c *fiber.Ctx) error {
	var req services.CreateContractReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	contract, err := h.svc.Create(c.Context(), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(contract, "Contract created"))
}

// GET /contracts/:id
func (h *ContractHandler) GetContract(c *fiber.Ctx) error {
	contract, err := h.svc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(contract))
}

// GET /contracts?project_id=...
func (h *ContractHandler) ListContracts(c *fiber.Ctx) error {
	page, limit := paginationQuery(c)
	projectID := c.Query("project_id")
	contracts, total, err := h.svc.ListByProject(c.Context(), projectID, page, limit)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(fiber.Map{
		"data":  contracts,
		"total": total,
		"page":  page,
		"limit": limit,
	}))
}

// PUT /contracts/:id
func (h *ContractHandler) UpdateContract(c *fiber.Ctx) error {
	var req services.UpdateContractReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	contract, err := h.svc.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(contract, "Contract updated"))
}

// DELETE /contracts/:id
func (h *ContractHandler) DeleteContract(c *fiber.Ctx) error {
	if err := h.svc.Delete(c.Context(), c.Params("id")); err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusNoContent).Send(nil)
}

// GET /contracts/:id/line-items
func (h *ContractHandler) ListLineItems(c *fiber.Ctx) error {
	items, err := h.svc.ListLineItems(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(items))
}

// POST /contracts/:id/line-items
func (h *ContractHandler) CreateLineItem(c *fiber.Ctx) error {
	var req services.CreateLineItemReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	item, err := h.svc.CreateLineItem(c.Context(), c.Params("id"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(item, "Line item created"))
}
