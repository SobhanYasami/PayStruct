---
tags: [model, entity]
updated: 2026-06-15
---

# Company

Table: `companies`  
File: `backend/internal/models/company.go`

Root of the multi-tenant tree. Every other entity (Employee, Project, Contractor, Contract) carries a `company_id` FK that ties it to one Company.

## Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | PK, from BaseModel |
| `name` | varchar(255) | display name |
| `reg_num` | varchar | optional registration number |
| `parent_id` | UUID nullable | self-referential for sub-companies |
| `manager_id` | UUID nullable | FK → Employee |

## Relations

- Has many [[models/Employee]] (company_id)
- Has many [[models/Project]] (company_id)
- Referenced by [[models/Contractor]] (optional company_id)
- Referenced by [[models/Contract]] (company_id)
- Referenced by [[models/InterimStatement]] (company_id)
- Referenced by [[models/Attachment]] (company_id)

## Access

CRUD restricted to `sudoer` only via `SuperAdminOnly()` middleware.  
→ See [[RBAC]], [[API Routes]]
