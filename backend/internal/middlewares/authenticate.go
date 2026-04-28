package middlewares

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	jwtUtil "github.com/sobhan-yasami/docs-db-panel/internal/middlewares/jwt"
)

func Authenticate(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {

		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).
				JSON(fiber.Map{"error": "Missing Authorization header"})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return c.Status(fiber.StatusUnauthorized).
				JSON(fiber.Map{"error": "Invalid Authorization header"})
		}

		tokenString := parts[1]

		claims, err := jwtUtil.ValidateToken(tokenString, secret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).
				JSON(fiber.Map{"error": "Invalid or expired token"})
		}

		// debug:
		fmt.Println("parsed claims:", claims)
		fmt.Println("===================================")
		c.Locals("claims", claims)

		return c.Next()
	}
}
