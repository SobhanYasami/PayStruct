package middlewares

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	jwtUtil "github.com/sobhan-yasami/docs-db-panel/internal/middlewares/jwt"
	"gorm.io/gorm"
)

// authDB is the optional database handle used to verify that the principal
// encoded in a JWT still exists. It is injected once at startup via SetAuthDB.
// When nil, principal validation is skipped (fail-open to pure-stateless JWT).
var authDB *gorm.DB

// SetAuthDB wires the database into the authentication middleware so that
// tokens referencing a deleted/stale principal (e.g. after a DB reseed) are
// rejected with 401 instead of surfacing later as opaque FK violations on write.
func SetAuthDB(db *gorm.DB) { authDB = db }

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

		// Reject tokens whose principal no longer exists. This catches stale
		// sessions (e.g. a JWT minted against a previous seed/volume) up front,
		// turning a confusing write-time FK error into a clean 401 the client
		// can recover from by forcing re-login.
		if authDB != nil {
			uid, perr := uuid.Parse(claims.UserID)
			if perr != nil {
				return c.Status(fiber.StatusUnauthorized).
					JSON(fiber.Map{"error": "Invalid token subject"})
			}
			var exists bool
			if err := authDB.WithContext(c.Context()).
				Raw("SELECT EXISTS(SELECT 1 FROM employees WHERE id = ?)", uid).
				Scan(&exists).Error; err == nil && !exists {
				return c.Status(fiber.StatusUnauthorized).
					JSON(fiber.Map{"error": "Session is no longer valid, please sign in again"})
			}
		}

		c.Locals("claims", claims)

		return c.Next()
	}
}
