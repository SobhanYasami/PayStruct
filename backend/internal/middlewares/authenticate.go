package middlewares

import (
	"errors"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/handlers"
	jwtUtil "github.com/sobhan-yasami/docs-db-panel/internal/middlewares/jwt"
)

// ------
// Authenticate is a middleware that authenticates requests using JWT tokens.
// It verifies the token and extracts the user ID, storing it in the request context.
// ------
func Authenticate() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get JWT secret from environment variable
		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			return errors.New("JWT_SECRET env variable is not set")
		}
		// Get the Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return errors.New("missing Authorization header")
		}

		// Check if the Authorization header is in the correct format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return errors.New("invalid Authorization header format")
		}

		// get the token string from the header
		tokenString := parts[1]

		// Parse and validate the token
		userID, err := jwtUtil.ValidateToken(tokenString, jwtSecret)
		if err != nil || userID == uuid.Nil {
			return c.Status(fiber.StatusUnauthorized).JSON(handlers.ErrorResponse(handlers.Unauthorized, "Unauthorized access! Invalid or missing token"))
		}

		//* Store the userID in the context for downstream handlers
		c.Locals("userID", userID)
		return c.Next()
	}
}
