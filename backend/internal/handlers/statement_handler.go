package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"
	"gorm.io/gorm"
)

type StatementHandler struct {
	svc *services.StatementService
}

func NewStatementHandler(db *gorm.DB) *StatementHandler {
	return &StatementHandler{svc: services.NewStatementService(db)}
}

// POST /contracts/:contractId/statements
func (h *StatementHandler) CreateStatement(c *fiber.Ctx) error {
	var req services.CreateStatementReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	stmt, err := h.svc.Create(c.Context(), c.Params("contractId"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(stmt, "Statement created"))
}

// GET /contracts/:contractId/statements
func (h *StatementHandler) ListStatements(c *fiber.Ctx) error {
	page, limit := paginationQuery(c)
	status := c.Query("status")
	stmts, total, err := h.svc.ListByContract(c.Context(), c.Params("contractId"), status, page, limit)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(fiber.Map{
		"data":  stmts,
		"total": total,
		"page":  page,
		"limit": limit,
	}))
}

// GET /statements/:id
func (h *StatementHandler) GetStatement(c *fiber.Ctx) error {
	stmt, err := h.svc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(stmt))
}

// PATCH /statements/:id
func (h *StatementHandler) UpdateStatement(c *fiber.Ctx) error {
	var req services.UpdateStatementReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	stmt, err := h.svc.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(stmt, "Statement updated"))
}

// PUT /statements/:id/works-done
func (h *StatementHandler) SetWorksDone(c *fiber.Ctx) error {
	var req services.SetWorksDoneReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	stmt, err := h.svc.SetWorksDone(c.Context(), c.Params("id"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(stmt, "Works done updated"))
}

// POST /statements/:id/extra-works
func (h *StatementHandler) AddExtraWork(c *fiber.Ctx) error {
	var req services.CreateExtraWorkReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	ew, err := h.svc.AddExtraWork(c.Context(), c.Params("id"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(ew, "Extra work added"))
}

// DELETE /statements/:id/extra-works/:ewId
func (h *StatementHandler) DeleteExtraWork(c *fiber.Ctx) error {
	if err := h.svc.DeleteExtraWork(c.Context(), c.Params("id"), c.Params("ewId")); err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusNoContent).Send(nil)
}

// GET /statements/:id/deductions
func (h *StatementHandler) ListDeductions(c *fiber.Ctx) error {
	items, err := h.svc.ListDeductions(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(items))
}

// POST /statements/:id/deductions
func (h *StatementHandler) AddDeduction(c *fiber.Ctx) error {
	var req services.CreateDeductionReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	d, err := h.svc.AddDeduction(c.Context(), c.Params("id"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(d, "Deduction added"))
}

// PUT /statements/:id/deductions/:did
func (h *StatementHandler) UpdateDeduction(c *fiber.Ctx) error {
	var req services.UpdateDeductionReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	d, err := h.svc.UpdateDeduction(c.Context(), c.Params("id"), c.Params("did"), req)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(d, "Deduction updated"))
}

// DELETE /statements/:id/deductions/:did
func (h *StatementHandler) DeleteDeduction(c *fiber.Ctx) error {
	if err := h.svc.DeleteDeduction(c.Context(), c.Params("id"), c.Params("did")); err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusNoContent).Send(nil)
}

// PATCH /statements/:id/transition
func (h *StatementHandler) Transition(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	var req services.TransitionReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "Invalid request body"))
	}
	callerID, _ := uuid.Parse(claims.UserID)
	stmt, err := h.svc.Transition(c.Context(), c.Params("id"), req, callerID, claims.Roles)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(stmt, "Status updated"))
}

// DELETE /statements/:id
func (h *StatementHandler) DeleteStatement(c *fiber.Ctx) error {
	if err := h.svc.Delete(c.Context(), c.Params("id")); err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusNoContent).Send(nil)
}
