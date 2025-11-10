package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/controllers"
)

func SetupUserRoutes(router fiber.Router, userController *controllers.UserController) {
	router.Post("/users", userController.CreateUser)
	router.Put("/users/:id", userController.UpdateUser)

	router.Get("/users/:id", userController.GetUser)
	router.Get("/users", userController.GetAllUsers)

	router.Delete("/users/:id", userController.DeleteUser)

	router.Post("/users/login", userController.LoginUser)
}
