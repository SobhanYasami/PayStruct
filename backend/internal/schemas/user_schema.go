package schemas

import (
	"github.com/golang-jwt/jwt/v5"
	"github.com/sobhan-yasami/docs-db-panel/internal/models"
)

type JWTClaims struct {
	UserID      string              `json:"user_id"`
	UserName    string              `json:"user_name"`
	CompanyID   string              `json:"company_id"`
	Role        string              `json:"role"`
	Permissions []models.Permission `json:"permissions"`
	jwt.RegisteredClaims
}
