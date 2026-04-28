package middlewares

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

type Authorizer struct {
	db *gorm.DB
}

func NewAuthorizer(db *gorm.DB) *Authorizer {
	return &Authorizer{db: db}
}

// ! ------------------
// ! Authorize for role
// ! ------------------
func (a *Authorizer) RequireRole(roleName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		//? 1. parse claims
		claims, ok := c.Locals("claims").(*schemas.JWTClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).
				JSON(fiber.Map{"error": "Unauthorized"})
		}

		// debug:
		fmt.Println("===================================")
		fmt.Println("jwt claims userID:", claims.UserID)
		fmt.Println("jwt claims userName:", claims.UserName)
		fmt.Println("jwt claims CompanyID:", claims.CompanyID)
		fmt.Println("jwt claims Role:", claims.Role)
		fmt.Println("jwt claims Permissions:", claims.Permissions)

		//? 2. check for required role
		if claims.Role != roleName {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "access denied!",
			})
		}

		return c.Next()
	}
}

func RequirePermission(resource, action string) fiber.Handler {
	return func(c *fiber.Ctx) error {

		claims, ok := c.Locals("claims").(*schemas.JWTClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).
				JSON(fiber.Map{"error": "Unauthorized"})
		}

		if claims.Role == "sudoer" {
			return c.Next()
		}

		required := resource + ":" + action

		for _, pr := range claims.Permissions {
			candiate_perms := pr.Resource + ":" + pr.Action
			if candiate_perms == required {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).
			JSON(fiber.Map{"error": "Insufficient permissions"})
	}
}
