package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

// SetupProjectRoutes mounts project CRUD under /projects.
// All routes require authentication; only authenticated employees
// (any role) can manage projects scoped to their company.
func SetupProjectRoutes(router fiber.Router, h *handlers.ProjectHandler, jwtSecret string) {
	projects := router.Group("/projects", middlewares.Authenticate(jwtSecret))
	projects.Post("/", h.CreateProject)
	projects.Get("/", h.ListProjects)
	projects.Get("/:id", h.GetProject)
	projects.Put("/:id", h.UpdateProject)
	projects.Delete("/:id", h.DeleteProject)
}

// SetupContractorRoutes mounts contractor CRUD under /contractors.
func SetupContractorRoutes(router fiber.Router, h *handlers.ContractorHandler, jwtSecret string) {
	contractors := router.Group("/contractors", middlewares.Authenticate(jwtSecret))
	contractors.Post("/", h.CreateContractor)
	contractors.Get("/", h.ListContractors)
	contractors.Get("/:id", h.GetContractor)
	contractors.Put("/:id", h.UpdateContractor)
	contractors.Delete("/:id", h.DeleteContractor)
}

// SetupContractRoutes mounts contract CRUD and WBS sub-resource under /contracts.
func SetupContractRoutes(router fiber.Router, h *handlers.ContractHandler, jwtSecret string) {
	contracts := router.Group("/contracts", middlewares.Authenticate(jwtSecret))
	contracts.Post("/", h.CreateContract)
	contracts.Get("/", h.ListContracts)
	contracts.Get("/:id", h.GetContract)
	contracts.Put("/:id", h.UpdateContract)
	contracts.Delete("/:id", h.DeleteContract)

	// WBS nested under a contract
	contracts.Get("/:id/wbs", h.ListWBS)
	contracts.Post("/:id/wbs", h.CreateWBS)
}
