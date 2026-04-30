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

	// Super-admin protected
	employees := users.Group("/employees",
		middlewares.Authenticate(jwtSecret),
		middlewares.SuperAdminOnly(),
	)
	employees.Post("/create", h.CreateEmployee)
	employees.Get("/list", h.GetAllEmployee)
	employees.Get("/:id", h.GetEmployee)
	employees.Put("/:id", h.UpdateEmployee)
	employees.Delete("/:id", h.DeleteEmployee)
}
