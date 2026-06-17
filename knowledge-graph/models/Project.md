---
tags: [model, entity]
updated: 2026-06-15
---

# Project

Table: `projects`  
File: `backend/internal/models/project.go`

Container for one or more [[models/Contract]]s. Inline status tracks lifecycle.

## Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `code` | varchar(64) | unique per company (`idx_projects_company_code`) |
| `name` | varchar(255) | indexed |
| `status` | enum | `planning` \| `active` \| `on_hold` \| `completed` \| `cancelled` |
| `priority` | enum | `low` \| `medium` \| `high` \| `critical` |
| `phase` | varchar(64) | UI uses select 0–4 |
| `budget_estimate`, `budget_actual` | NUMERIC(20,2) | in `currency` (default USD) |
| `start_date`, `end_date` | time nullable | Jalali-formatted in UI |
| `tags` | text[] | GIN-indexed for `@>` containment queries |

## Status Transitions

No formal state machine — updated directly via PUT. Frontend shows inline `<select>` in project list for quick status change.

```
planning → active → on_hold ↔ active → completed
                                      → cancelled
```

## Business Rule: Contract Creation Gate

**Contracts can only be created for projects with `status = "active"`.**  
Enforced in [[frontend/Components#CreateContractSheet]] (frontend) — active-only project picker + disabled submit if project not active.  
Backend does NOT currently enforce this (frontend guard only).

## Relations

- Belongs to [[models/Company]]
- Has many [[models/Contract]]

## RBAC

Read: any authenticated user.  
Write (POST/PUT/DELETE): `manager`, `engineering_head` (or sudoer/admin).  
→ [[RBAC]], [[API Routes]]
