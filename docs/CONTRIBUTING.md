# Contributing Guide

---

## Prerequisites

| Tool | Minimum version | Install |
|------|----------------|---------|
| Go | **1.24** | https://go.dev/dl/ |
| Node.js | **20 LTS** | https://nodejs.org |
| pnpm | **9** | `npm i -g pnpm` or `corepack enable` |
| PostgreSQL | **15** | via Docker (see below) or native |
| Docker or Podman | any recent | for the DB container |

Verify:

```bash
go version          # go version go1.24.x ...
node --version      # v20.x.x
pnpm --version      # 9.x.x
```

---

## Local Development Setup

```bash
# 1. Fork + clone
git clone <your-fork-url> && cd contractledger

# 2. Environment
cp .env.example .env
# Set at minimum:
#   JWT_SECRET=<openssl rand -hex 32>
#   DATABASE_PASSWORD=<something>

# 3. Start PostgreSQL
docker compose up -d

# 4. Backend — from the repo root
cd backend
go mod download
go run ./cmd/api
# First run migrates all tables and seeds the sudoer.

# 5. Frontend — separate terminal
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:3000. Login with `BOOTSTRAP_USERNAME` / `BOOTSTRAP_PASSWORD`.

### Reset the database

```bash
cd backend && RESET_DB=true go run ./cmd/api
# Drops the entire public schema, re-creates tables, re-seeds sudoer.
# Stop the running API before running this.
```

---

## Directory Structure

```
backend/
├── cmd/api/main.go           Wire-up: Fiber app, DI, graceful shutdown
└── internal/
    ├── config/               Config struct (currently thin — reads env directly)
    ├── database/
    │   ├── postgre.go        Connect, pool settings, RESET_DB guard, AutoMigrate call
    │   └── seeder.go         Bootstrap sudoer (idempotent)
    ├── handlers/
    │   ├── response.go       APIResponse envelope + constructor helpers
    │   ├── res_status.go     ResponseStatus enum + HTTP status mapping
    │   ├── *_handler.go      One file per resource
    │   └── *_handler_test.go Handler-level integration tests
    ├── middlewares/
    │   ├── authenticate.go   JWT validation + DB principal check
    │   ├── authorize.go      RequireRole / RequireAnyRole / SuperAdminOnly
    │   └── jwt/              Token parsing, claims, blacklist helpers
    ├── models/
    │   ├── base.go           BaseModel (UUID v7 BeforeCreate, AllModels list)
    │   ├── enums.go          All custom enum types with Scan/Value drivers
    │   ├── migrate.go        AutoMigrate orchestration, FK installer, index DDL
    │   └── *.go              One file per domain model
    ├── routes/               Route group wiring — one file per resource
    ├── schemas/              Shared DTO types (JWTClaims)
    └── services/             Business logic — one file per resource (+ _test.go)

frontend/
└── src/
    ├── app/
    │   ├── layout.tsx              Root layout (QueryProvider, font, globals)
    │   ├── page.tsx                Root redirect (/ → /dashboard or /login)
    │   ├── (auth)/login/           Login page
    │   └── (dashboard)/            Authenticated route group
    │       ├── layout.tsx          Sidebar + TopBar shell
    │       ├── dashboard/          Summary dashboard
    │       ├── companies/          Company management
    │       ├── employees/          Employee list
    │       ├── projects/[id]/      Project detail + nested contract
    │       ├── contracts/[id]/     Contract detail + statement list
    │       │   └── statements/[sid]/  Statement detail (4-tab editor)
    │       ├── contractors/        Contractor registry
    │       ├── consultants/        Consultant registry
    │       └── reports/            Report generation
    ├── components/
    │   ├── domain/     Feature-specific components (not reusable elsewhere)
    │   ├── layout/     Sidebar, TopBar
    │   └── ui/         Reusable primitives (DataTable, Sheet, PersianDatePicker)
    └── lib/
        ├── api/        Typed fetch wrappers — one file per resource
        ├── stores/     Zustand stores (auth only)
        └── utils/      cn(), date helpers, money formatters
```

---

## Running Tests

### Backend

```bash
cd backend
go test ./...                    # all tests
go test ./internal/services/...  # service layer only
go test -v -run TestCompanyService ./internal/services/
go test -race ./...              # race detector (run before PRs)
```

Tests in `*_handler_test.go` and `*_service_test.go` are integration tests that use a real PostgreSQL instance. They read the same `.env` (or environment variables) as the main binary. Ensure `DATABASE_*` vars point to a test-only database if you want isolation.

There are currently no frontend unit tests. TypeScript type-checking serves as the static analysis gate:

```bash
cd frontend
npx tsc --noEmit    # must pass with zero errors
```

---

## Coding Standards

### Go

- Format with `gofmt` (enforced by `go fmt ./...`). No custom linter configuration yet.
- All exported functions must have a doc comment.
- Error wrapping: use `fmt.Errorf("context: %w", err)` — never swallow errors.
- Context propagation: `context.Context` is always the first parameter; pass `c.Context()` from Fiber handlers.
- Financial values: **always** `github.com/shopspring/decimal` — never `float64`.
- No naked `log.Fatal` outside `main.go`. Services return errors; handlers translate them via `serviceErr(c, err)`.
- Service errors: wrap in `&ServiceError{Message: ..., Code: <HTTP status>}` so handlers can map them.

### TypeScript / React

- `npx tsc --noEmit` must pass before pushing.
- ESLint config is in `frontend/eslint.config.mjs` (Next.js defaults + TypeScript rules). Run: `pnpm lint`.
- No `any` without a comment explaining why.
- Client components must have `"use client"` at the top. Everything else is a Server Component by default.
- Data fetching: `useQuery` / `useMutation` (TanStack Query). No `useEffect` for data fetching.
- Forms: `react-hook-form` + `zod` schema. No `useState` per field.
- Money display: use `formatMoney()` from `lib/utils/money.ts` — it handles Persian locale and decimal precision.
- Dates: use the `PersianDatePicker` component for user input; format display dates with `lib/utils/date.ts`.

### Database / Models

- New models must be added to `AllModels()` in `models/base.go` and to the ordered slice in `AutoMigrate()` in `models/migrate.go` (FK-safe order: parent tables before children).
- FKs are installed explicitly in `MigrateForeignKeys` — GORM's `DisableForeignKeyConstraintWhenMigrating: true` is set, so GORM tag constraints are informational only.
- Add new PostgreSQL-specific indexes in `MigrateIndexes` using `CREATE INDEX IF NOT EXISTS` (idempotent).
- All money fields: `gorm:"type:numeric(20,8)"` backed by `decimal.Decimal`.

---

## PR Review Checklist

Before requesting review:

- [ ] `go build ./...` passes in `backend/`
- [ ] `go test -race ./...` passes in `backend/`
- [ ] `npx tsc --noEmit` passes in `frontend/`
- [ ] `pnpm lint` passes in `frontend/`
- [ ] New models added to `AllModels()` and `AutoMigrate()` in correct FK order
- [ ] New routes wired in the appropriate `routes/*_route.go` file
- [ ] Auth middleware applied to all new routes (no accidental public endpoints)
- [ ] Financial arithmetic uses `decimal.Decimal` not `float64`
- [ ] No `DEBUG=true` or `RESET_DB=true` committed to `.env.example`
- [ ] API response format uses `SuccessResponse` / `ErrorResponse` helpers
- [ ] `Recompute()` called (via service) after any mutation to statement child items
- [ ] Persian-language UI strings for any user-visible text (RTL layout)
