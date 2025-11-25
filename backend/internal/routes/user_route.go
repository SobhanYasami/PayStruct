package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
)

func SetupUserRoutes(router fiber.Router, userHandler *handlers.UserHandler) {
	router.Post("/users", userHandler.CreateEmployee)

	// todo
	router.Put("/users/:id", userHandler.UpdateUser)

	router.Get("/users/:id", userHandler.GetUser)
	router.Get("/users", userHandler.GetAllUsers)

	router.Delete("/users/:id", userHandler.DeleteUser)

	router.Post("/users/login", userHandler.LoginUser)
}
