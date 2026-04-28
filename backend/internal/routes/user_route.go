package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupUserRoutes(router fiber.Router, h *handlers.UserHandler, authorizer *middlewares.Authorizer, jwtSecret string) {

	// global Routes
	users := router.Group("/users")

	// ---- Signin Route (Public) ----
	auth := users.Group("/auth")
	auth.Post("/signin", h.SigninEmployee)

	// ---- Protected User Routes ----
	employees := users.Group("/employees", middlewares.Authenticate(jwtSecret))
	employees.Post("/create",
		authorizer.RequireRole("sudoer"),
		h.CreateEmployee)
	employees.Get("/list",
		authorizer.RequireRole("sudoer"),
		h.GetAllEmployee)
	employees.Get("/:id",
		authorizer.RequireRole("sudoer"),
		h.GetEmployee)
	employees.Put("/:id",
		authorizer.RequireRole("sudoer"),
		h.UpdateEmployee)
	employees.Delete("/:id",
		authorizer.RequireRole("sudoer"),
		h.DeleteEmployee)
}
