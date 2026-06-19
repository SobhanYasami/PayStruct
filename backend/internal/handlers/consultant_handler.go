package handlers

import (
	"slices"

	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"
	"gorm.io/gorm"
)

type ConsultantHandler struct {
	svc *services.ConsultantService
}

func NewConsultantHandler(db *gorm.DB) *ConsultantHandler {
	return &ConsultantHandler{svc: services.NewConsultantService(db)}
}

// POST /consultants
func (h *ConsultantHandler) CreateConsultant(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	var req services.CreateConsultantReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	consultant, err := h.svc.Create(c.Context(), claims.CompanyID, claims.UserID, req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(consultant, "Consultant created"))
}

// GET /consultants/:id
func (h *ConsultantHandler) GetConsultant(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	consultant, err := h.svc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(consultant))
}

// GET /consultants
func (h *ConsultantHandler) ListConsultants(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	page, limit := paginationQuery(c)
	search := c.Query("search")

	callerCompanyID := claims.CompanyID
	if slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Roles, "sudoer") {
		if cid := c.Query("company_id"); cid != "" {
			callerCompanyID = cid
		} else {
			callerCompanyID = ""
		}
	}

	consultants, total, err := h.svc.List(c.Context(), callerCompanyID, search, page, limit)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(fiber.Map{
		"data":  consultants,
		"total": total,
		"page":  page,
		"limit": limit,
	}))
}

// PUT /consultants/:id
func (h *ConsultantHandler) UpdateConsultant(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	var req services.UpdateConsultantReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	isAdmin := slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Roles, "sudoer")
	consultant, err := h.svc.Update(c.Context(), c.Params("id"), claims.CompanyID, isAdmin, req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(consultant, "Consultant updated"))
}

// DELETE /consultants/:id
func (h *ConsultantHandler) DeleteConsultant(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	isAdmin := slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Roles, "sudoer")
	if err := h.svc.Delete(c.Context(), c.Params("id"), claims.CompanyID, isAdmin); err != nil {
		return serviceErr(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}
