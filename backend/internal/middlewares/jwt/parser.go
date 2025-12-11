package jwt

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

var ErrInvalidSigningMethod = fmt.Errorf("unexpected signing method")

func ParseToken(tokenString string, jwtSecret string) (*jwt.Token, *schemas.JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &schemas.JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Enforce HMAC-SHA256
		if method, ok := token.Method.(*jwt.SigningMethodHMAC); !ok || method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, ErrInvalidSigningMethod
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, nil, fmt.Errorf("unable to parse token: %w", err)
	}

	claims, ok := token.Claims.(*schemas.JWTClaims)
	if !ok {
		return nil, nil, fmt.Errorf("invalid claims structure")
	}

	return token, claims, nil

}
