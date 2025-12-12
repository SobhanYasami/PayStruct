package jwt

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sobhan-yasami/docs-db-panel/internal/schemas"
)

// ParseToken validates and decodes a JWT string into a strongly-typed claims object.
//
// This function performs core steps required in secure JWT handling:
//  1. Accepts a raw token string (tokenString) and the secret key (jwtSecret).
//  2. Parses the token using a custom claims structure defined in `schemas.JWTClaims`.
//  3. Enforces that the signature algorithm is HMAC-SHA256 (HS256), preventing algorithm-switch attacks.
//  4. Extracts the typed claims after parsing.
//  5. Returns the parsed *jwt.Token object, the claims, or a descriptive error.
//
// -----------------------------------------------------------------------------
// Background: What a JWT Is
// -----------------------------------------------------------------------------
// A JSON Web Token (JWT) is a signed container for user- or session-related data.
// A typical JWT has three sections:
//   - Header: algorithm and token type
//   - Payload: "claims" such as user ID, issuer, expiration, etc.
//   - Signature: verifies the token was generated with the correct key
//
// In HMAC-based tokens (HS256, HS384, HS512), the server signs the token using a
// shared secret. Validation requires the same secret key, so both issuer and
// validator must trust each other.
//
// -----------------------------------------------------------------------------
// Parsing With Claims
// -----------------------------------------------------------------------------
// `jwt.ParseWithClaims()` takes:
//   - the raw token string
//   - an instantiated claims struct (pointer) where parsed values will be filled
//   - a callback (keyFunc) that returns the signing key and optionally checks
//     allowed algorithms
//
// If parsing or signature validation fails, the error is returned immediately.
//
// -----------------------------------------------------------------------------
// Security: Enforcing the Signing Method
// -----------------------------------------------------------------------------
// It is critical not to accept any arbitrary signing method. Attackers sometimes
// attempt "algorithm confusion" attacks by switching HS256 to "none" or RS256.
// By explicitly checking that the method is HMAC and exactly HS256, you prevent
// these bypass attempts.
//
// `token.Method.(*jwt.SigningMethodHMAC)` ensures:
//   - The token header declares an HMAC-based method.
//
// `method.Alg() != jwt.SigningMethodHS256.Alg()` ensures:
//   - It is specifically HS256.
//
// -----------------------------------------------------------------------------
// Return Values
// -----------------------------------------------------------------------------
// This function returns three values:
//   - *jwt.Token : the parsed token including header and signature metadata
//   - *schemas.JWTClaims : strongly typed claims for your application
//   - error : an error describing problems with parsing or structure
//
// Note: This function validates the signature and basic structure, but **does not**
// perform claim validation (exp, iat, nbf, iss, aud). These are handled separately
// in higher-layer validation middleware.
//
// -----------------------------------------------------------------------------
func ParseToken(tokenString string, jwtSecret string) (*jwt.Token, *schemas.JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &schemas.JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Enforce HMAC-SHA256 for security integrity.
		if method, ok := token.Method.(*jwt.SigningMethodHMAC); !ok || method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, nil, fmt.Errorf("unable to parse token: %w", err)
	}

	// Extract typed claims
	claims, ok := token.Claims.(*schemas.JWTClaims)
	if !ok {
		return nil, nil, fmt.Errorf("invalid claims structure")
	}

	return token, claims, nil
}
