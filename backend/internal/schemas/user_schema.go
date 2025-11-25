package schemas

import (
	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}
