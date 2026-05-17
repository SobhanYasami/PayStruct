package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupUserRoutes(router fiber.Router, h *handlers.UserHandler, jwtSecret string) {
	users := router.Group("/users")

	// Public
	auth := users.Group("/auth")
	auth.Post("/signin", h.SigninEmployee)

	// Any authenticated user — own profile
	me := users.Group("/me", middlewares.Authenticate(jwtSecret))
	me.Get("/", h.GetProfile)
	me.Put("/", h.UpdateProfile)

	// Head roles + admin/sudoer can read employees (company-scoped for non-admin)
	employeesRead := users.Group("/employees",
		middlewares.Authenticate(jwtSecret),
		middlewares.RequireAnyRole("manager", "finance_head", "juridical_head", "engineering_head", "security_head"),
	)
	employeesRead.Get("/list", h.GetAllEmployee)
	employeesRead.Get("/:id", h.GetEmployee)

	// Mutations: sudoer only
	employeesWrite := users.Group("/employees",
		middlewares.Authenticate(jwtSecret),
		middlewares.SuperAdminOnly(),
	)
	employeesWrite.Post("/create", h.CreateEmployee)
	employeesWrite.Put("/:id", h.UpdateEmployee)
	employeesWrite.Delete("/:id", h.DeleteEmployee)
}
