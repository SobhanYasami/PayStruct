package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

// SetupProjectRoutes mounts project CRUD under /projects.
// Reads: any authenticated user. Writes: manager + engineering_head (+ admin/sudoer).
func SetupProjectRoutes(router fiber.Router, h *handlers.ProjectHandler, jwtSecret string) {
	auth := middlewares.Authenticate(jwtSecret)
	canWrite := middlewares.RequireAnyRole("manager", "engineering_head")

	projects := router.Group("/projects", auth)
	projects.Get("/", h.ListProjects)
	projects.Get("/:id", h.GetProject)
	projects.Post("/", canWrite, h.CreateProject)
	projects.Put("/:id", canWrite, h.UpdateProject)
	projects.Delete("/:id", canWrite, h.DeleteProject)
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
// All operations (read + write) require at least one of the head roles or admin/sudoer.
func SetupContractRoutes(router fiber.Router, h *handlers.ContractHandler, jwtSecret string) {
	auth := middlewares.Authenticate(jwtSecret)
	headOnly := middlewares.RequireAnyRole("manager", "engineering_head", "finance_head", "juridical_head")

	contracts := router.Group("/contracts", auth, headOnly)
	contracts.Post("/", h.CreateContract)
	contracts.Get("/", h.ListContracts)
	contracts.Get("/:id", h.GetContract)
	contracts.Put("/:id", h.UpdateContract)
	contracts.Delete("/:id", h.DeleteContract)

	contracts.Get("/:id/line-items", h.ListLineItems)
	contracts.Post("/:id/line-items", h.CreateLineItem)
}
