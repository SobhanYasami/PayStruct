package handlers

import (
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"
	"gorm.io/gorm"
)

type AttachmentHandler struct {
	svc *services.AttachmentService
}

func NewAttachmentHandler(db *gorm.DB, storageRoot, baseURL string) *AttachmentHandler {
	return &AttachmentHandler{svc: services.NewAttachmentService(db, storageRoot, baseURL)}
}

// POST /contracts/:id/attachments  (multipart, field "file")
func (h *AttachmentHandler) Upload(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}

	fh, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse(BadRequest, "file field required"))
	}

	documentType := c.FormValue("document_type")

	att, err := h.svc.Upload(
		c.Context(),
		c.Params("id"),
		claims.CompanyID,
		claims.UserID,
		documentType,
		fh,
	)
	if err != nil {
		return serviceErr(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse(att, "Document uploaded"))
}

// GET /contracts/:id/attachments
func (h *AttachmentHandler) ListForContract(c *fiber.Ctx) error {
	atts, err := h.svc.ListByContract(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}
	return c.JSON(SuccessResponse(atts, "ok"))
}

// DELETE /attachments/:id
func (h *AttachmentHandler) Delete(c *fiber.Ctx) error {
	claims := jwtClaims(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse(Unauthorized, "Unauthorized"))
	}
	if err := h.svc.Delete(c.Context(), c.Params("id"), claims.CompanyID); err != nil {
		return serviceErr(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// storageRootFromEnv returns the storage root, defaulting to the path relative to the binary.
func storageRootFromEnv() string {
	if v := os.Getenv("STORAGE_ROOT"); v != "" {
		return v
	}
	// Default: ../storage relative to cwd (works when running from backend/).
	abs, err := filepath.Abs("../storage")
	if err != nil {
		return "../storage"
	}
	return abs
}
