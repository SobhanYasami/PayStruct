---
tags: [backend, testing, seeder]
updated: 2026-06-29
---

# Mock Data Seeder

File: `mock-data/mock-data-gen.py`

Pure-stdlib Python 3.10+ script. Hits the live REST API — no direct DB access.  
Depends on the backend being up and a sudoer account existing (created by `database.Seed()`).

## Usage

```bash
# defaults (admin@system.local / admin123 / localhost:5000)
python3 mock-data/mock-data-gen.py

# override
API_URL=http://prod:5000/api/v1 \
BOOTSTRAP_USERNAME=admin@system.local \
BOOTSTRAP_PASSWORD=s3cr3t \
python3 mock-data/mock-data-gen.py
```

## Seeding Order

```text
1. Login  →  JWT token
2. Companies (parent → employees → head assignment → sub-companies → their employees)
3. Projects
4. Contractors
5. Consultants
```

## Test Fixtures

### Companies

| Company | Parent | Employees |
|---------|--------|-----------|
| خانه سازی تهران | — (root) | 6 (manager, finance_head, juridical_head, engineering_head, 2 staff) |
| خانه سازی گیلان | تهران | 6 (same role set) |
| خانه سازی اصفهان | تهران | — |
| خانه سازی زنجان | تهران | — |

### Projects

| Code | Name | Status | Priority |
|------|------|--------|----------|
| PRJ-RASHT-01 | رشت | active | high |
| PRJ-ANZALI-01 | انزلی | planning | high |
| PRJ-MODARES-01 | مدرس | planning | medium |
| PRJ-GOLSAR-01 | گلسار | active | medium |
| PRJ-MANZARIE-01 | منظریه | active | low |

### Contractors

| Display Name | Type | Currency |
|-------------|------|----------|
| بتن ایران | company | IRR |
| بارساز شمال | company | IRR |
| یعقوب پورقربان | individual | IRR |

### Consultants

| Name | Specialization |
|------|---------------|
| مهندسین مشاور آباد | مهندسی عمران و ساختمان |

## Position → Role Mapping

| Persian Position | API `roles[]` | Head field wired on Company |
|-----------------|--------------|----------------------------|
| مدیر عامل | `["manager"]` | `manager_id` |
| مدیر مالی | `["finance_head"]` | `financial_head_id` |
| مدیر حقوقی | `["juridical_head"]` | `juridical_head_id` |
| مدیر فنی | `["engineering_head"]` | `engineering_head_id` |
| مدیر امنیت | `["security_head"]` | `security_head_id` |
| کارمند فنی | `["engineering"]` | — |
| کارمند مالی | `["finance"]` | — |

## Idempotency

Not idempotent — running twice creates duplicate records (unique constraints on
`reg_num` / `email` / `national_id` will cause 4xx errors for the duplicates, which
are logged but do not abort the run). Safe to re-run against a freshly reseeded DB.

## Key Design Notes

- Uses only `urllib.request` — no third-party deps.
- `national_num` field in COMPANIES fixtures maps to `national_id` API field.
- Employment type hardcoded to `official` for all seeded employees.
- Company head assignment is a two-step operation: create employees first, collect
  returned IDs, then `PUT /company/management/:id` with the head fields.

→ [[models/Company]], [[models/Employee]], [[RBAC]], [[API Routes]]
