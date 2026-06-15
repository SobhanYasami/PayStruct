package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/services"
	"gorm.io/gorm"
)

type ReportHandler struct {
	svc *services.ReportService
}

func NewReportHandler(db *gorm.DB) *ReportHandler {
	return &ReportHandler{svc: services.NewReportService(db)}
}

// GET /statements/:id/report
// Streams an Excel (.xlsx) statement report as a file download.
func (h *ReportHandler) StatementReport(c *fiber.Ctx) error {
	f, name, err := h.svc.Build(c.Context(), c.Params("id"))
	if err != nil {
		return serviceErr(c, err)
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).
			JSON(ErrorResponse(InternalError, "Failed to write report buffer"))
	}

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, name))
	c.Set("Cache-Control", "no-cache")
	return c.Send(buf.Bytes())
}
