package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
)

func SetupUserRoutes(router fiber.Router, userHandler *handlers.UserHandler) {
	router.Post("/users/signup", userHandler.CreateEmployee)
	router.Post("/users/signin", userHandler.SigninEmployee)

	//todo: Authenticated middleware can be applied here for the following routes
	router.Get("/users", userHandler.GetAllEmployee)
	router.Get("/users/:id", userHandler.GetEmployee)
	router.Put("/users/:id", userHandler.UpdateEmployee)
	router.Delete("/users/:id", userHandler.DeleteEmployee)
}
