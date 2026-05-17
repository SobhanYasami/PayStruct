package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupCompanyRoutes(router fiber.Router, h *handlers.CompanyHandler, jwtSecret string) {
	auth := middlewares.Authenticate(jwtSecret)
	headRead := middlewares.RequireAnyRole("manager", "finance_head", "juridical_head", "engineering_head", "security_head")

	// Reads: head roles + admin/sudoer (company-scoped for non-admin)
	mgmtRead := router.Group("/company/management", auth, headRead)
	mgmtRead.Get("/", h.GetAllCompanies)
	mgmtRead.Get("/:id", h.GetCompanyByID)

	// Writes: sudoer only
	mgmtWrite := router.Group("/company/management", auth, middlewares.SuperAdminOnly())
	mgmtWrite.Post("/", h.CreateCompany)
	mgmtWrite.Put("/:id", h.UpdateCompany)
	mgmtWrite.Delete("/:id", h.DeleteCompany)
}
