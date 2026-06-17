---
tags: [backend, overview]
updated: 2026-06-15
---

# Backend Overview

Go module: `github.com/sobhan-yasami/docs-db-panel`  
Entry: `backend/cmd/api/main.go`

## Startup Sequence

```
godotenv.Load()           ← .env file (JWT_SECRET, SERVER_PORT, DEBUG, STORAGE_ROOT, BASE_URL)
database.Connect()        ← pgx driver, GORM, AutoMigrate (via models.AllModels())
database.Seed()           ← seeds default company, sudoer user if not present
fiber.New(config)         ← StrictRouting:false, BodyLimit:50MB, custom ErrorHandler
app.Use(cors.New(...))    ← CORS: AllowOrigins:"*"
app.Use(logger.New(...))  ← debug mode only
app.Static(...)           ← /files-storage → ../storage/
routes.Setup*(...)        ← handler DI + route registration
app.Listen(":5000")       ← goroutine; graceful shutdown on SIGINT/SIGTERM (10s timeout)
```

## Handler Pattern

All handlers are thin: parse params → call service → marshal response.

```go
func (h *ContractHandler) CreateContract(c *fiber.Ctx) error {
    claims := jwtClaims(c)
    var req services.CreateContractReq
    if err := c.BodyParser(&req); err != nil { return fiber.ErrBadRequest }
    contract, err := h.svc.Create(c.Context(), claims, req)
    if err != nil { return serviceErr(c, err) }
    return c.Status(201).JSON(successResponse(contract))
}
```

`jwtClaims(c)` helper reads `c.Locals("claims")`.  
`serviceErr(c, err)` unwraps `*ServiceError{Code, Message}` → HTTP status + JSON body.

## Service Layer

Business logic + GORM queries. Each service owns one domain:

| Service | File |
|---------|------|
| `UserService` | `user_service.go` |
| `CompanyService` | `company_service.go` |
| `ContractorService` (inline in contracts handler) | `contracts_service.go` |
| `ContractService` | `contracts_service.go` |
| `StatementService` | `statement_service.go` |
| `ReportService` | `report_service.go` |
| `AttachmentService` | `attachment_service.go` |
| `TokenService` | `token_service.go` |
| `SignatureService` | `signature_service.go` (legacy) |

## Error Convention

Services return `*ServiceError{Message string, Code int}`.  
Handler `serviceErr()` maps Code → HTTP status. Non-ServiceError → 500.

## Config

All config via env vars:

| Var | Default | Purpose |
|-----|---------|---------|
| `JWT_SECRET` | required | HS256 signing secret |
| `SERVER_PORT` | 5000 | listen port |
| `DEBUG` | false | enables logger + verbose error responses |
| `STORAGE_ROOT` | `../storage` | file upload root |
| `BASE_URL` | `http://localhost:5000` | prefix for attachment URLs |
| `DATABASE_URL` | — | PostgreSQL DSN |

→ [[backend/Auth & JWT]], [[backend/Attachment Service]], [[API Routes]]
