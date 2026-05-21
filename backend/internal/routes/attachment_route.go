package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

// SetupAttachmentRoutes mounts the DELETE /attachments/:id route.
// List and Upload are mounted under /contracts/:id/attachments in SetupContractRoutes.
func SetupAttachmentRoutes(router fiber.Router, h *handlers.AttachmentHandler, jwtSecret string) {
	auth := middlewares.Authenticate(jwtSecret)
	headOnly := middlewares.RequireAnyRole("manager", "engineering_head", "finance_head", "juridical_head")

	router.Group("/attachments", auth, headOnly).Delete("/:id", h.Delete)
}
