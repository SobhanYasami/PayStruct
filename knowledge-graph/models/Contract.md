---
tags: [model, entity]
updated: 2026-06-20
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
| `type` | enum | see Contract Types below |
| `status` | varchar(32) | 10 values — see Status Machine below |
| `gross_budget` | NUMERIC(20,8) | total contract value |
| `currency` | char(3) | default `IRR` |
| `starts_on`, `ends_on` | date nullable | contract period |
| `employer_id` | uuid nullable | FK → contractors (project owner / کارفرما) |
| `consultant_id` | uuid nullable | FK → contractors (consulting engineer / مشاور مهندسی) |
| `boq_version` | varchar(64) | unit_rate only: فهرست‌بها version e.g. "1403" |
| `contract_coefficient` | NUMERIC(10,6) | unit_rate only: ضریب پیمان (multiplier) |
| `management_fee_pct_bps` | int | cost_plus only: management fee in BPS |
| `fee_calculation_method` | varchar(64) | cost_plus only: `percentage_of_costs` or `fixed_fee` |
| `scanned_file_url` | varchar(512) | legacy single-file reference |

## Financial Rate Fields (BPS)

All stored as integer **basis-points** (bps). 1000 bps = 10.00%.

| Field | Meaning |
|-------|---------|
| `retention_pct_bps` | ضمانت حسن انجام — performance retention |
| `advance_pct_bps` | پیش‌پرداخت — advance payment recovery rate |
| `vat_pct_bps` | مالیات بر ارزش افزوده — VAT rate |
| `social_security_pct_bps` | حق بیمه تامین اجتماعی — social security |
| `performance_bond_pct_bps` | legacy (duplicate of retention, not shown in UI) |
| `insurance_rate_pct_bps` | legacy (duplicate of social_security, not shown in UI) |

## Contract Types

| Value | Persian | Notes |
| ----- | ------- | ----- |
| `lump_sum` | مقطوع | fixed price; exposes retention + advance fields |
| `unit_rate` | فهرست‌بها | per-unit pricing; requires `boq_version` + `contract_coefficient` |
| `cost_plus` | امانی | reimbursable; requires `management_fee_pct_bps` + `fee_calculation_method` |
| `time_material` | زمان و مواد | — |
| `construction_management` | مدیریت پیمان | — |
| `design_bid_build` | طراحی-مناقصه-ساخت | — |
| `design_build` | طراحی-ساخت / EPC | — |
| `labor_only` | دستمزدی | — |
| `turnkey` | کلید در دست | — |
| `percentage` | درصدی | — |

## Status Machine

10 statuses. DB column: `varchar(32)` with CHECK constraint.

```text
draft
  → pending_engineering  (submit — any head role)
    → pending_finance    (approve — engineering_head)
      → pending_legal    (approve — finance_head)
        → pending_ceo    (approve — juridical_head)
          → ready_to_print (approve — manager)
            → signed     (sign — manager)
              → active   (external / manual)
                → closed (external / manual)

Any pending_* → draft   (reject — current-stage role)
Any status   → cancelled (cancel — manager)
```

→ [[flows/Contract Approval Workflow]] for full state machine spec.

## Editing Lock

WBS and document editing is locked as soon as the contract has **any approval history**:

```ts
canEdit = contract.status === "draft" && approvalEvents.length === 0
```

Once submitted for approval (even if later rejected back to `draft`), `approvalEvents` is non-empty → editing locked.

Statement creation: only allowed when `contract.status === "active"`.

## Bill of Quantities (BoQ / WBS)

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
- Optional: `employer_id` → contractors (کارفرما), `consultant_id` → contractors (مشاور)
- Has many `ContractLineItem` (BoQ/WBS)
- Has many [[models/InterimStatement]]
- Has many [[models/Attachment]] (polymorphic)
- Has many [[models/ApprovalEvent]] (polymorphic, `entity_type="contract"`)

## RBAC

Head roles only: `manager`, `engineering_head`, `finance_head`, `juridical_head`.  
→ [[RBAC]], [[flows/Contract Approval Workflow]]

## Frontend

Create: [[frontend/Components#CreateContractSheet]] (5-step wizard, active-project gate).  
List: `/contracts` page (global, head-role guarded).  
Detail: `/contracts/[id]` (approval workflow stepper, statements, BoQ, docs).  
Also via Project → `/projects/[id]` → contracts tab.
