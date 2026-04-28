package jwt

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

// ! ValidateClaims performs checks on exp, iat, nbf, issuer, audience, and user id formatting.
func ValidateClaims(claims *schemas.JWTClaims) error {
	//? Load Expected issuer & audience
	ExpectedIssuer := os.Getenv("JWT_ISSUER")
	if ExpectedIssuer == "" {
		return errors.New("token issuer not configured")
	}
	ExpectedAudience := os.Getenv("JWT_AUDIENCE")
	if ExpectedAudience == "" {
		return errors.New("token audience not configured")
	}

	//? time
	now := time.Now().UTC()

	//? Expiration (required)
	if claims.ExpiresAt == nil {
		return errors.New("ExpiresAt claim is required")
	}
	if claims.ExpiresAt.Time.Before(now) {
		return errors.New("token has expired")
	}

	//? Issued At (optional but validated if present)
	if claims.IssuedAt != nil {
		if claims.IssuedAt.Time.After(now) {
			return errors.New("token iat (issued at) is in the future")
		}
	}

	//? Not Before (optional)
	if claims.NotBefore != nil {
		if claims.NotBefore.Time.After(now) {
			return errors.New("token not valid yet (nbf)")
		}
	}

	//? Issuer
	if claims.Issuer == "" {
		return errors.New("iss (issuer) claim is required")
	}
	if claims.Issuer != ExpectedIssuer {
		return fmt.Errorf("invalid issuer: %s", claims.Issuer)
	}

	//? Audience: jwt.ClaimStrings implements Contains helper
	if len(claims.Audience) == 0 {
		return errors.New("aud (audience) claim is required")
	}

	//? Optional: verify JTI exists if you use it for revocation
	if claims.ID == "" {
		// not necessarily an error — depends on your policy
		// return errors.New("jti (id) claim is required")
	}

	// todo: properly handle this part to be compatible with jwtClaims
	//? Validate user id formatting inside your custom claim (example: UserID string)
	if claims.UserID == "" {
		return errors.New("user_id claim missing")
	}
	if _, err := uuid.Parse(claims.UserID); err != nil {
		return errors.New("user_id is not a valid UUID")
	}

	return nil
}

// ! ValidateToken performs parse + validation + optional revocation check and returns claims
func ValidateToken(tokenString string, jwtSecret string) (*schemas.JWTClaims, error) {
	//? 1. Parse token and retrieve claim information
	token, claims, err := ParseToken(tokenString, jwtSecret)
	if err != nil {
		return nil, err
	}

	//? 2. Ensure signature & basic validation succeeded
	if !token.Valid {
		return nil, errors.New("token signature is invalid or token is otherwise invalid")
	}

	//? 3. Claim-level validation (exp, iat, nbf, iss, aud, user id format)
	if err := ValidateClaims(claims); err != nil {
		return nil, err
	}

	//? 4. return claims
	return claims, nil
}
