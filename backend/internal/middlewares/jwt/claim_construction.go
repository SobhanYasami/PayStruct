package jwt

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

func BuildJWTClaims(
	user *models.Employee,
	companyID string,
	role string,
	permissions []models.Permission,
	jwtIssuer string,
	jwtAudience string,
	ttl time.Duration,
) schemas.JWTClaims {

	now := time.Now().UTC()

	return schemas.JWTClaims{
		UserID:      user.ID.String(),
		UserName:    user.UserName,
		CompanyID:   companyID,
		Role:        role,
		Permissions: permissions,

		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			Audience:  []string{jwtAudience},
			Subject:   user.ID.String(),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        uuid.New().String(),
		},
	}
}
