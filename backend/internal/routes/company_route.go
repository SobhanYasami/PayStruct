package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupCompanyRoutes(router fiber.Router, h *handlers.CompanyHandler, jwtSecret string) {
	//! Base management group with authentication
	company := router.Group(
		"/company",
		middlewares.Authenticate(jwtSecret),
	)

	//! ---- Project Routes ----
	management := company.Group("/management")
	management.Post("/", h.CreateCompany)
	// management.Get("/", h.GetAllProject)
	// management.Get("/:id", h.GetProjectByID)
	// management.Put("/:id", h.UpdateProject)
	// management.Delete("/:id", h.DeleteProject)

}
