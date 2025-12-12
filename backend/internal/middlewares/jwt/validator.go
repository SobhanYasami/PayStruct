package jwt

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

// Expected issuer & audience — configure these for your environment.
var (
	ExpectedIssuer   = "Null-Co"
	ExpectedAudience = "Null-Co-clients"
)

// ValidateClaims performs checks on exp, iat, nbf, issuer, audience, and user id formatting.
func ValidateClaims(claims *schemas.JWTClaims) error {
	now := time.Now().UTC()

	// Expiration (required)
	if claims.ExpiresAt == nil {
		return errors.New("exp (ExpiresAt) claim is required")
	}
	if claims.ExpiresAt.Time.Before(now) {
		return errors.New("token has expired")
	}

	// Issued At (optional but validated if present)
	if claims.IssuedAt != nil {
		if claims.IssuedAt.Time.After(now) {
			return errors.New("token iat (issued at) is in the future")
		}
	}

	// Not Before (optional)
	if claims.NotBefore != nil {
		if claims.NotBefore.Time.After(now) {
			return errors.New("token not valid yet (nbf)")
		}
	}

	// Issuer
	if claims.Issuer == "" {
		return errors.New("iss (issuer) claim is required")
	}
	if claims.Issuer != ExpectedIssuer {
		return fmt.Errorf("invalid issuer: %s", claims.Issuer)
	}

	// Audience: jwt.ClaimStrings implements Contains helper
	if len(claims.Audience) == 0 {
		return errors.New("aud (audience) claim is required")
	}

	// Optional: verify JTI exists if you use it for revocation
	if claims.ID == "" {
		// not necessarily an error — depends on your policy
		// return errors.New("jti (id) claim is required")
	}

	// Validate user id formatting inside your custom claim (example: UserID string)
	if claims.UserID == "" {
		return errors.New("user_id claim missing")
	}
	if _, err := uuid.Parse(claims.UserID); err != nil {
		return errors.New("user_id is not a valid UUID")
	}

	return nil
}

// ValidateToken performs parse + validation + optional revocation check and returns user UUID.
func ValidateToken(tokenString string, jwtSecret string) (uuid.UUID, error) {
	token, claims, err := ParseToken(tokenString, jwtSecret)
	if err != nil {
		return uuid.Nil, err
	}

	// Ensure signature & basic validation succeeded
	if !token.Valid {
		return uuid.Nil, errors.New("token signature is invalid or token is otherwise invalid")
	}

	// Claim-level validation (exp, iat, nbf, iss, aud, user id format)
	if err := ValidateClaims(claims); err != nil {
		return uuid.Nil, err
	}

	// Return parsed user id
	uid, err := uuid.Parse(claims.UserID)
	if err != nil {
		return uuid.Nil, err // should not happen because ValidateClaims already checked it
	}

	return uid, nil
}
