package middlewares

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

const roleSudoer = "sudoer"

// SuperAdminOnly allows only employees whose JWT roles include "sudoer".
// It also injects the authenticated user's UUID into c.Locals("userID")
// so downstream handlers can use it without re-parsing the token.
func SuperAdminOnly() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*schemas.JWTClaims)
		if !ok || claims == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}

		for _, r := range claims.Roles {
			if r == roleSudoer {
				uid, err := uuid.Parse(claims.UserID)
				if err == nil {
					c.Locals("userID", uid)
				}
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Super admin access required"})
	}
}

// RequireRole gates a route to employees who hold the named role.
func RequireRole(roleName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*schemas.JWTClaims)
		if !ok || claims == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}
		for _, r := range claims.Roles {
			if r == roleName {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "access denied"})
	}
}

// RequireAnyRole passes if the caller holds sudoer, admin, or any of the listed roles.
func RequireAnyRole(roles ...string) fiber.Handler {
	set := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		set[r] = struct{}{}
	}
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals("claims").(*schemas.JWTClaims)
		if !ok || claims == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
		}
		for _, r := range claims.Roles {
			if r == roleSudoer || r == "admin" {
				return c.Next()
			}
			if _, ok := set[r]; ok {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "access denied"})
	}
}
