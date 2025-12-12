package jwt

import "errors"

// Package-level sentinel errors.
// These allow callers to use errors.Is(err, <error>) for decision-making.
var (
	// Parsing and structural issues
	ErrTokenMalformed      = errors.New("jwt token malformed")
	ErrTokenUnverifiable   = errors.New("jwt token unverifiable")
	ErrUnexpectedAlgorithm = errors.New("unexpected signing algorithm")

	// Claims errors
	ErrInvalidClaims      = errors.New("jwt claims invalid")
	ErrExpiredToken       = errors.New("jwt token expired")
	ErrNotBeforeViolation = errors.New("jwt token not valid yet")
	ErrIssuedAtViolation  = errors.New("jwt token issued in the future")
	ErrIssuerMismatch     = errors.New("jwt issuer mismatch")
	ErrAudienceMismatch   = errors.New("jwt audience mismatch")

	// Security / revocation
	ErrTokenRevoked     = errors.New("jwt token has been revoked")
	ErrSignatureInvalid = errors.New("jwt signature invalid")

	// General-purpose umbrella error
	ErrUnauthorized = errors.New("unauthorized")
)
