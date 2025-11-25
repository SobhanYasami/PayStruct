package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
)

func SetupUserRoutes(router fiber.Router, userHandler *handlers.UserHandler) {
	router.Post("/users", userHandler.CreateEmployee)

	// todo
	router.Put("/users/:id", userHandler.UpdateEmployee)

	router.Get("/users/:id", userHandler.GetEmployee)
	router.Get("/users", userHandler.GetAllEmployee)

	router.Delete("/users/:id", userHandler.DeleteEmployee)

	router.Post("/users/login", userHandler.LoginEmployee)
}
