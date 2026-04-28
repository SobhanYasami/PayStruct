package config

import (
	"log"
	"os"
	"time"
)

// ----------
// Types
// ----------
type AppConfig struct {
	JWTSecret   string
	JWTIssuer   string
	JWTAudience string
	JWTExpiry   time.Duration
}

// --------------------
// Helper functions
// --------------------
func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("%s not set", key)
	}
	return v
}

// -----------------
// Load configuration from environment variables
// ----------------
func Load() *AppConfig {
	return &AppConfig{
		JWTSecret:   mustEnv("JWT_SECRET"),
		JWTIssuer:   mustEnv("JWT_ISSUER"),
		JWTAudience: mustEnv("JWT_AUDIENCE"),
		JWTExpiry:   24 * time.Hour,
	}
}
