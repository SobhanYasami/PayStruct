---
tags: [rbac, auth, roles]
updated: 2026-06-20
---

# RBAC — Role-Based Access Control

## Role Taxonomy

```text
sudoer / admin          — super-admin, bypass all role gates
─────────────────────────────────────────────────────
Head roles (IsHead=true, signing authority):
  manager               — project + contract write; cancel/sign contracts; CEO approval stage
  engineering_head      — project + contract write; engineering approval stage
  finance_head          — contract read/write; finance approval stage
  juridical_head        — contract read/write; legal approval stage
  security_head         — head read access
─────────────────────────────────────────────────────
Operational roles:
  finance
  engineering
  security
  admin                 — treated same as sudoer in RequireAnyRole
```

Stored as `text[]` on `employees.roles` (PostgreSQL array).

## Backend Middleware

File: `backend/internal/middlewares/authorize.go`

| Middleware | Passes if |
| ---------- | --------- |
| `Authenticate(secret)` | Valid HS256 JWT; injects `claims` into `c.Locals("claims")` |
| `SuperAdminOnly()` | `claims.Roles` contains `"sudoer"` |
| `RequireRole(name)` | `claims.Roles` contains exactly `name` |
| `RequireAnyRole(roles...)` | `claims.Roles` contains `sudoer`, `admin`, or any of `roles` |

All middleware reads `*schemas.JWTClaims` from `c.Locals("claims")` — set by `Authenticate`.

## Route Gates

| Resource | Read | Write |
| -------- | ---- | ----- |
| Projects | any authenticated | manager, engineering_head |
| Contractors | any authenticated | any authenticated |
| Contracts | head roles | head roles |
| Contract transitions | head roles | head roles (role varies per stage) |
| Employees | sudoer | sudoer |
| Companies | sudoer | sudoer |
| Attachments (delete) | head roles | head roles |
| Statements | any authenticated | any authenticated |

## Contract Approval Stage Roles

| Stage | Pending Status | Required Role |
| ----- | -------------- | ------------- |
| Submit | `draft` → `pending_engineering` | any head role |
| Engineering | `pending_engineering` | `engineering_head` |
| Finance | `pending_finance` | `finance_head` |
| Legal | `pending_legal` | `juridical_head` |
| CEO | `pending_ceo` | `manager` |
| Sign | `ready_to_print` | `manager` |
| Cancel | any | `manager` |

→ [[flows/Contract Approval Workflow]]

## Frontend Guards

File: `frontend/src/lib/stores/auth.ts` — Zustand store with `user.roles: string[]`.

```ts
const WRITE_ROLES = ["manager","engineering_head","finance_head","juridical_head","sudoer","admin"];
const canWrite = user?.roles?.some(r => WRITE_ROLES.includes(r));
```

- Contracts page: hides "New Contract" button + edit/delete actions if `!canWrite`
- Contract detail approval buttons: gated per stage role via `userRoles.includes(stage.role)`
- Employees page: `user.roles.includes("sudoer")` gate
- Project status change: any authed user

## JWT Claims

Schema: `backend/internal/schemas/user_schema.go` → `JWTClaims`

```go
type JWTClaims struct {
    UserID    string
    CompanyID string
    Roles     []string
    jwt.StandardClaims
}
```

Token signed with `JWT_SECRET` env var (HS256). Expiry configured in `TokenService`.

→ [[backend/Auth & JWT]], [[API Routes]]
