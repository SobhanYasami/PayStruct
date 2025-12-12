package jwt

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

// BuildJWTClaims constructs secure, structured, extendable JWT claims.
func BuildJWTClaims(user *models.Employee, jwtIssuer, jwtAudience string, ttl time.Duration) schemas.JWTClaims {
	now := time.Now().UTC()

	return schemas.JWTClaims{
		UserID:   user.ID.String(),
		UserName: user.UserName,
		Role:     user.Role, // or user.Roles if multi-role

		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Audience:  []string{jwtAudience},
			Subject:   user.ID.String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now), // token valid immediately
			ID:        uuid.New().String(),     // jti (useful for revocation lists)
		},
	}
}
