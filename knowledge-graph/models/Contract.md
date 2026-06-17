---
tags: [model, entity]
updated: 2026-06-15
---

# Contract

Table: `contracts`  
File: `backend/internal/models/contract.go`

Core financial agreement between a [[models/Project]] owner and a [[models/Contractor]].

## Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `contract_no` | varchar(64) | unique per company; format `<jalali-year>/<seq>` e.g. `1404/3` |
| `title` | varchar(255) | display name |
| `type` | enum | 9 active types + `time_material` (legacy) — see below |
| `status` | enum | `draft` \| `signed` \| `active` \| `closed` \| `cancelled` |
| `gross_budget` | NUMERIC(20,8) | total contract value |
| `currency` | char(3) | default `IRR` |
| `starts_on`, `ends_on` | time nullable | contract period |
| `signed_at` | time nullable | signature date |
| `scanned_file_url` | varchar(512) | legacy single-file reference |

## Financial Rate Fields (BPS)

All stored as integer **basis-points** (bps). 1000 bps = 10.00%.

| Field | Meaning |
|-------|---------|
| `retention_pct_bps` | ضمانت حسن انجام — performance retention |
| `advance_pct_bps` | پیش‌پرداخت — advance payment recovery rate |
| `vat_pct_bps` | مالیات بر ارزش افزوده — VAT rate |
| `social_security_pct_bps` | حق بیمه تامین اجتماعی — social security |
| `performance_bond_pct_bps` | legacy field, not shown in UI (duplicate of retention) |
| `insurance_rate_pct_bps` | legacy field, not shown in UI (duplicate of social_security) |

The UI only exposes the 4 active fields. Legacy columns remain for DB backward compat.

## Bill of Quantities (BoQ)

`ContractLineItem` records (`contract_line_items` table):
- `sort_order`, `description`, `unit`, `quantity`, `unit_rate`, `currency_code`
- Denormalized `contractor_id`, `project_id` from parent Contract for query convenience
- Referenced by `WorkDoneItem.line_item_id` in statements

## Attachments

Up to 3 files per contract via polymorphic `attachments` table (`entity_type="contract"`).  
Upload: `POST /contracts/:id/attachments` (multipart); served from `/files-storage/contracts/:contractId/…`  
→ [[backend/Attachment Service]]

## Relations

- Belongs to [[models/Project]], [[models/Contractor]], [[models/Company]]
- Has many `ContractLineItem` (BoQ)
- Has many [[models/InterimStatement]]
- Has many [[models/Attachment]] (via polymorphic)

## RBAC

Head roles only: `manager`, `engineering_head`, `finance_head`, `juridical_head`.  
→ [[RBAC]]

## Frontend

Create: [[frontend/Components#CreateContractSheet]] (enforces active-project gate).  
List: `/contracts` page (global, head-role guarded).  
Detail: `/contracts/[id]` (statements, BoQ, contract info tabs).  
Also accessible via Project → `/projects/[id]` → contracts tab.
