---
tags: [model, entity]
updated: 2026-06-29
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
| `reg_num` | varchar(64) | unique registration number |
| `country_code` | char(2) | default `IR` |
| `tax_id` | varchar(64) nullable | unique |
| `is_active` | bool | default true |
| `parent_id` | UUID nullable | self-referential; nil = root company |
| `root_company_id` | UUID nullable | anchor to top of tenant tree; nil = this is the root |
| `manager_id` | UUID nullable | → Employee (no DB FK, avoids cycle) |
| `engineering_head_id` | UUID nullable | → Employee |
| `financial_head_id` | UUID nullable | → Employee |
| `juridical_head_id` | UUID nullable | → Employee |
| `security_head_id` | UUID nullable | → Employee |

## Company Hierarchy

Companies are self-referential via `parent_id`. A root company has `parent_id = NULL`.  
Sub-companies carry the root's ID in `root_company_id` for quick tenant scoping.

```text
خانه سازی تهران  (root, parent_id=NULL)
├── خانه سازی گیلان   (parent_id=تهران.id)
├── خانه سازی اصفهان
└── خانه سازی زنجان
```

Creation order: parent first → get ID → create children with `parent_id`.

## Department Heads

After creating a company and its employees, update head assignments via:

```
PUT /company/management/:id
{ "manager_id": "<uuid>", "financial_head_id": "<uuid>", ... }
```

Name and reg_num are required but can be passed as empty strings if unchanged  
(service skips empty values).

The mock data seeder handles this automatically — see [[backend/Mock Data Seeder]].

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
