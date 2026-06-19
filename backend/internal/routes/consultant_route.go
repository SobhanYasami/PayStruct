package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

// SetupConsultantRoutes mounts consultant CRUD under /consultants.
// Reads: any authenticated user. Writes: manager + engineering_head (+ admin/sudoer).
func SetupConsultantRoutes(router fiber.Router, h *handlers.ConsultantHandler, jwtSecret string) {
	auth := middlewares.Authenticate(jwtSecret)
	canWrite := middlewares.RequireAnyRole("manager", "engineering_head")

	consultants := router.Group("/consultants", auth)
	consultants.Get("/", h.ListConsultants)
	consultants.Get("/:id", h.GetConsultant)
	consultants.Post("/", canWrite, h.CreateConsultant)
	consultants.Put("/:id", canWrite, h.UpdateConsultant)
	consultants.Delete("/:id", canWrite, h.DeleteConsultant)
}
