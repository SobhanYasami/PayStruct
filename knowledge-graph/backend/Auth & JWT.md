---
tags: [backend, auth, jwt]
updated: 2026-06-15
---

# Auth & JWT

## Token Issuance

Endpoint: `POST /api/v1/users/auth/signin`  
Service: `TokenService` (`backend/internal/services/token_service.go`)  
Algorithm: **HS256** with secret from `JWT_SECRET` env var.

Claims struct (`backend/internal/schemas/user_schema.go`):
```go
type JWTClaims struct {
    UserID    string   `json:"user_id"`
    CompanyID string   `json:"company_id"`
    Roles     []string `json:"roles"`
    jwt.StandardClaims
}
```

Token expiry configured in `TokenService`. No refresh token mechanism currently.

## Verification Middleware

File: `backend/internal/middlewares/authenticate.go`  
`Authenticate(jwtSecret string) fiber.Handler`

Flow:
1. Read `Authorization: Bearer <token>` header
2. Parse + verify HS256 signature via `backend/internal/middlewares/jwt/parser.go`
3. Validate claims (expiry, etc.) via `jwt/validator.go`
4. Inject `*schemas.JWTClaims` into `c.Locals("claims")`
5. Proceed or return 401

Blacklist: `jwt/blacklist.go` — in-memory token blacklist (invalidates tokens on sign-out).

## RBAC Integration

After `Authenticate`, optional `RequireAnyRole(...)` / `SuperAdminOnly()` middleware reads `claims.Roles` from `c.Locals`.  
→ [[RBAC]]

## Frontend

Token stored in Zustand auth store (`frontend/src/lib/stores/auth.ts`).  
`apiFetch` in `frontend/src/lib/api/client.ts` reads store, injects `Authorization: Bearer <token>` header on every request.

Login page: `POST /users/auth/signin` → `{ data: { token, user } }` → `useAuthStore.setToken(token)`.

## Sign-Out

Frontend: clears Zustand store (token becomes null, `apiFetch` sends no auth header).  
Backend: token blacklist in memory (does not survive server restart — acceptable for current scale).
