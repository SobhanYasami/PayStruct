package middlewares

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/sobhan-yasami/docs-db-panel/internal/models"
)

type Authorizer struct {
	db *gorm.DB
}

func NewAuthorizer(db *gorm.DB) *Authorizer {
	return &Authorizer{db: db}
}

func (a *Authorizer) RequireRole(roleName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uuid.UUID)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		var count int64

		err := a.db.
			Model(&models.EmployeeRole{}).
			Joins("JOIN roles ON roles.id = employee_roles.role_id").
			Where("employee_roles.employee_id = ? AND roles.name = ?", userID, roleName).
			Count(&count).Error

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Authorization check failed",
			})
		}

		if count == 0 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied",
			})
		}

		return c.Next()
	}
}

func (a *Authorizer) RequirePermission(resource, action string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uuid.UUID)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		var count int64

		err := a.db.
			Model(&models.EmployeeRole{}).
			Joins("JOIN role_permissions rp ON rp.role_id = employee_roles.role_id").
			Joins("JOIN permissions p ON p.id = rp.permission_id").
			Where("employee_roles.employee_id = ?", userID).
			Where("p.resource = ? AND p.action = ?", resource, action).
			Count(&count).Error

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Authorization check failed",
			})
		}

		if count == 0 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Insufficient permissions",
			})
		}

		return c.Next()
	}
}
