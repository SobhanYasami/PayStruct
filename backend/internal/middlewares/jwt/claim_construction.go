package jwt

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	model "github.com/sobhan-yasami/docs-db-panel/internal/models"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

func BuildJWTClaims(
	user *model.Employee,
	companyID string,
	roles []string,
	jwtIssuer string,
	jwtAudience string,
	ttl time.Duration,
) schemas.JWTClaims {
	now := time.Now().UTC()
	return schemas.JWTClaims{
		UserID:    user.ID.String(),
		UserName:  user.Email,
		CompanyID: companyID,
		Roles:     roles,
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
