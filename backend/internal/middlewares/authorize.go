package middlewares

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

func RequireRole(roleName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*schemas.JWTClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).
				JSON(fiber.Map{"error": "Unauthorized"})
		}
		for _, r := range claims.Roles {
			if r == roleName {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "access denied"})
	}
}
