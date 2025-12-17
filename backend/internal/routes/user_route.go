package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	"github.com/sobhan-yasami/docs-db-panel/internal/middlewares"
)

func SetupUserRoutes(router fiber.Router, h *handlers.UserHandler) {

	// ---- Public User Routes ----
	auth := router.Group("/users")
	auth.Post("/signup", h.CreateEmployee)
	auth.Post("/signin", h.SigninEmployee)

	// ---- Protected User Routes ----
	users := router.Group(
		"/users",
		middlewares.Authenticate(),
	)

	users.Get("/", h.GetAllEmployee)
	users.Get("/:id", h.GetEmployee)
	users.Put("/:id", h.UpdateEmployee)
	users.Delete("/:id", h.DeleteEmployee)
}
