package middlewares

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/utils"
)

type CtrlResponse struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ! AuthMiddleware verifies the JWT token and sets the user ID in the context
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, err := utils.ParseToken(c)
		if err != nil || userID == uuid.Nil {
			return c.Status(fiber.StatusUnauthorized).JSON(CtrlResponse{
				Status:  "failure",
				Message: "شما هنوز وارد حساب کاربری خود نشدید",
			})
		}

		//* Store the userID in the context for downstream handlers
		c.Locals("userID", userID)
		return c.Next()
	}
}
