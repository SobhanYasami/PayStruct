---
tags: [model, entity]
updated: 2026-06-15
---

# Employee

Table: `employees`  
File: `backend/internal/models/employee.go`

System users. `Roles` (`text[]`) drives all RBAC decisions. `PasswordHash` (bcrypt) stored as `bytea`.

## Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `national_id` | varchar(32) | globally unique (uniqueIndex) |
| `email` | varchar(320) | uniqueIndex, nullable |
| `roles` | text[] | PostgreSQL array; maps to `[]string` via `pq.StringArray` |
| `is_head` | bool | denormalized: true if any role is a head role |
| `employment_type` | enum | `official` \| `contractual` |
| `base_salary` + `salary_currency` | decimal + char(3) | — |
| `hired_at`, `terminated_at` | time nullable | employment period |
| `active` | bool | soft-disable without deleting |
| `password_hash` | bytea | bcrypt; excluded from JSON (`json:"-"`) |

## Roles

See full role taxonomy in [[RBAC]].  
`IsHead()` method: returns true if `roles` contains any of `manager`, `finance_head`, `juridical_head`, `engineering_head`, `security_head`.

## Relations

- Belongs to [[models/Company]]
- Referenced by [[models/Contractor]] as `created_by_id`
- Referenced by [[models/Attachment]] as `uploaded_by_id`

## Access

Only `sudoer` can create/read/update/delete employees.  
Token auth identifies the caller as an Employee (JWT carries `UserID`).
