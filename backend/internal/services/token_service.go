package services

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sobhan-yasami/docs-db-panel/internal/config"
	jwtUtils "github.com/sobhan-yasami/docs-db-panel/internal/middlewares/jwt"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
)

type TokenService struct {
	secret   []byte
	issuer   string
	audience string
	expiry   time.Duration
}

func NewTokenService(cfg *config.AppConfig) *TokenService {
	return &TokenService{
		secret:   []byte(cfg.JWTSecret),
		issuer:   cfg.JWTIssuer,
		audience: cfg.JWTAudience,
		expiry:   cfg.JWTExpiry,
	}
}

func (t *TokenService) Generate(
	user *models.Employee,
	companyID string,
	role string,
	permissions []models.Permission,
	// isSuperAdmin bool,
) (string, error) {

	claims := jwtUtils.BuildJWTClaims(
		user,
		companyID,
		role,
		permissions,
		t.issuer,
		t.audience,
		t.expiry,
	)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(t.secret)
}
