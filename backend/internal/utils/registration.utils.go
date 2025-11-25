package utils

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

func ParseToken(c *fiber.Ctx) (uuid.UUID, error) {
	//! 0. Get JWT secret from environment variable
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return uuid.Nil, errors.New("JWT_SECRET environment variable is not set")
	}
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return uuid.Nil, errors.New("missing Authorization header")
	}

	//! 1. Check if the Authorization header is in the correct format
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return uuid.Nil, errors.New("invalid Authorization header format")
	}

	//! 2. get the token string from the header
	tokenString := parts[1]

	//! 3. Parse the JWT token
	token, err := jwt.ParseWithClaims(tokenString, &schemas.JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		//? Check that the signing method is HMAC (HS256)
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok || token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil {
		return uuid.Nil, fmt.Errorf("token parse error: %w", err)
	}

	claims, ok := token.Claims.(*schemas.JWTClaims)
	if !ok || !token.Valid {
		return uuid.Nil, errors.New("invalid token claims")
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return uuid.Nil, errors.New("user_id is not a valid UUID")
	}

	return userID, nil
}
