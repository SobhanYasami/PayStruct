package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupCompanyRoutes(router fiber.Router, h *handlers.CompanyHandler, jwtSecret string) {
	company := router.Group("/company",
		middlewares.Authenticate(jwtSecret),
		middlewares.SuperAdminOnly(),
	)

	management := company.Group("/management")
	management.Post("/", h.CreateCompany)
	management.Get("/", h.GetAllCompanies)
	management.Get("/:id", h.GetCompanyByID)
	management.Put("/:id", h.UpdateCompany)
	management.Delete("/:id", h.DeleteCompany)
}
