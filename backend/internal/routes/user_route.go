package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupUserRoutes(router fiber.Router, h *handlers.UserHandler, authorizer *middlewares.Authorizer) {

	// global Routes
	users := router.Group("/users")

	// ---- Signin Route (Public) ----
	auth := users.Group("/users")
	auth.Post("/signin", h.SigninEmployee)

	// ---- Protected Routes (Developer/Admin) ----
	// sudoer := users.Group("/sudoer")

	// ---- Protected User Routes ----
	employees := users.Group("/employees", middlewares.Authenticate())
	employees.Post("/create",
		authorizer.RequireRole("sudoer"),
		h.CreateEmployee)
}
