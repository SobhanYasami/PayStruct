---
tags: [architecture, overview]
updated: 2026-06-15
---

# Architecture

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 App Router | `'use client'` for all interactive pages |
| Styling | Tailwind v4 | RTL, `dir="rtl"` lang="fa" on html |
| State | TanStack Query v5 + Zustand v5 | Server state vs auth store |
| Forms | react-hook-form v7 + zod | `zodResolver`, `{ valueAsNumber: true }` for bps inputs |
| Backend | Go Fiber v2 | `StrictRouting: false`, `BodyLimit: 50MB` |
| ORM | GORM + PostgreSQL | `shopspring/decimal` for all money |
| Auth | HS256 JWT | Secret from `JWT_SECRET` env var |
| Storage | Local disk `../storage/` | Served static at `/files-storage/` |
| Reports | `github.com/xuri/excelize/v2` v2.10.1 | Persian digits + Jalali dates |

## Request Lifecycle

```
Browser
  → Next.js page (useQuery)
  → apiFetch("/api/v1/...")   [src/lib/api/client.ts]
  → Fiber CORS middleware
  → Authenticate(jwtSecret)  [validates HS256, injects claims into c.Locals]
  → RequireAnyRole(...)       [RBAC gate, optional per route]
  → Handler                  [extracts params, calls Service]
  → Service                  [business logic, GORM queries]
  → PostgreSQL
```

## Directory Layout

```
backend/
  cmd/api/main.go             entry point, DI wiring, graceful shutdown
  internal/
    config/                   env config loader
    database/                 Connect() + Seed()
    handlers/                 Fiber handlers (thin — delegate to services)
    middlewares/              Authenticate, SuperAdminOnly, RequireAnyRole, RequireRole
      jwt/                    parser, validator, claim_construction, blacklist
    models/                   GORM structs + enums + migration list
    routes/                   route registration per domain
    schemas/                  JWTClaims, request/response DTOs
    services/                 business logic layer

frontend/src/
  app/
    (auth)/login/             login page
    (dashboard)/              route group — NOT in URL
      dashboard/              stats page
      projects/               list + [id] detail + [id]/contracts/[cid]/ + .../statements/[sid]/
      contracts/              global list + [id] detail + [id]/statements/[sid]/
      contractors/            CRUD
      companies/              admin CRUD
      employees/              head-role / sudoer only
      reports/                Excel download trigger
  components/
    domain/                   business-aware components
    ui/                       primitives (Sheet, DataTable, PersianDatePicker)
    layout/                   Sidebar, TopBar
    providers/                QueryProvider
  lib/
    api/                      typed fetch wrappers per resource
    stores/auth.ts            Zustand auth store
    utils/date.ts             toJalali, fmtNum, fmtPct, fmtMoney
    utils/money.ts            formatMoney, bpsToPercent
```

## Key Design Decisions

- **`(dashboard)` is a route group** — parenthesised segments are not in the URL. `/app/(dashboard)/projects` maps to `/projects`.
- **BPS for percentages** — all rate fields stored as integer basis-points (1000 bps = 10.00%) to avoid float rounding. Converted to/from `%` string in the UI.
- **`shopspring/decimal`** — all money as `NUMERIC(20,8)` in Postgres, `decimal.Decimal` in Go. Never `float64`.
- **Persian output** — frontend uses `Intl.DateTimeFormat("fa-IR", { calendar: "persian" })` + `.toLocaleString("fa-IR")`. Backend uses custom `gregorianToJalali()` + `toPersianDigits()` for Excel.
- **Polymorphic Attachment** — `entity_type + entity_id` on `attachments` table; currently only `"contract"` entity_type is used.

→ See [[Data Model]], [[RBAC]], [[backend/Auth & JWT]]
