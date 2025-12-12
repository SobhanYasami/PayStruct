package middlewares

import (
	"github.com/gofiber/fiber/v2"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
)

// Authorization policies can be defined globally or loaded dynamically.
// Adjust this to your domain needs.
type UserRoles struct {
	Roles       []string
	Permissions []string
}

// ExtractRoles is a placeholder.
// Replace with lookup from DB, Redis, or your Users service.
func ExtractRoles(userID any) (*UserRoles, error) {
	// Example: Replace with database query
	// user, _ := db.FindUserByID(userID)
	// return &UserRoles{Roles: user.Roles, Permissions: user.Permissions}, nil

	// For now return a mock response
	return &UserRoles{
		Roles:       []string{"user"},
		Permissions: []string{"read:documents"},
	}, nil
}

// HasRole checks if the user has one of the allowed roles.
func HasRole(user *UserRoles, allowedRoles []string) bool {
	roleSet := map[string]struct{}{}
	for _, r := range user.Roles {
		roleSet[r] = struct{}{}
	}
	for _, allowed := range allowedRoles {
		if _, ok := roleSet[allowed]; ok {
			return true
		}
	}
	return false
}

// HasPermission checks user permission against allowed list.
func HasPermission(user *UserRoles, allowedPerms []string) bool {
	permSet := map[string]struct{}{}
	for _, p := range user.Permissions {
		permSet[p] = struct{}{}
	}
	for _, allowed := range allowedPerms {
		if _, ok := permSet[allowed]; ok {
			return true
		}
	}
	return false
}

// ------
// AuthorizeRole enforces role-based access control (RBAC).
// Example usage: app.Get("/admin", AuthorizeRole("admin"), handler)
// ------
func AuthorizeRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(
				handlers.ErrorResponse(handlers.Unauthorized, "Unauthorized: user context missing"),
			)
		}

		userRoles, err := ExtractRoles(userID)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(
				handlers.ErrorResponse(handlers.Forbidden, "Access denied: role lookup failed"),
			)
		}

		if !HasRole(userRoles, roles) {
			return c.Status(fiber.StatusForbidden).JSON(
				handlers.ErrorResponse(handlers.Forbidden, "Forbidden: insufficient role privileges"),
			)
		}

		return c.Next()
	}
}

// ------
// AuthorizePermission enforces permission-based checks.
// Example usage: app.Post("/docs", AuthorizePermission("write:documents"), handler)
// ------
func AuthorizePermission(perms ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(
				handlers.ErrorResponse(handlers.Unauthorized, "Unauthorized: user context missing"),
			)
		}

		userRoles, err := ExtractRoles(userID)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(
				handlers.ErrorResponse(handlers.Forbidden, "Access denied: permission lookup failed"),
			)
		}

		if !HasPermission(userRoles, perms) {
			return c.Status(fiber.StatusForbidden).JSON(
				handlers.ErrorResponse(handlers.Forbidden, "Forbidden: missing required permissions"),
			)
		}

		return c.Next()
	}
}

// ------
// Authorize allows defining complex logical policies:
// Example:
//
//	Authorize(func(user UserRoles) bool {
//	    return HasRole(user, []string{"admin"}) ||
//	           HasPermission(user, []string{"delete:documents"})
//	})
//
// ------
func Authorize(policy func(*UserRoles) bool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(
				handlers.ErrorResponse(handlers.Unauthorized, "Unauthorized: user context missing"),
			)
		}

		userRoles, err := ExtractRoles(userID)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(
				handlers.ErrorResponse(handlers.Forbidden, "Access denied: policy evaluation failed"),
			)
		}

		if !policy(userRoles) {
			return c.Status(fiber.StatusForbidden).JSON(
				handlers.ErrorResponse(handlers.Forbidden, "Forbidden: access policy rejected"),
			)
		}

		return c.Next()
	}
}
