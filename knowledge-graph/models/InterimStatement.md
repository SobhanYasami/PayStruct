---
tags: [model, entity]
updated: 2026-06-15
---

# InterimStatement

Table: `interim_statements`  
File: `backend/internal/models/statement.go`

Periodic payment certificate (صورت وضعیت) for a [[models/Contract]]. The unit of the approval workflow.

## Key Fields

| Field | Type | Notes |
|-------|------|-------|
| `sequence_no` | int | unique per contract; auto-incremented by service |
| `period_start`, `period_end` | time | billing period; shown as Jalali range in UI |
| `issued_on` | time | certificate issue date |
| `status` | enum | 7-stage (see below) |
| `currency` | char(3) | inherited from Contract.Currency |
| `fx_rate`, `fx_rate_date` | decimal, time | FX snapshot locked at approval |
| `notes` | text | free text |
| `prev_progress_pct`, `progress_pct` | decimal(7,4) | cumulative progress % vs contract budget |

## Cached Aggregate Fields (Recomputed)

Set by `InterimStatement.Recompute()` — called after `SetWorksDone` mutates child slices.

| Field | Formula |
|-------|---------|
| `gross_amount` | Σ WorkDoneItem.Amount |
| `extra_amount` | Σ ExtraWorkItem.Amount |
| `deduction_amount` | Σ StatementDeductionItem.Amount |
| `retention_amount` | `(gross+extra) × retention_pct_bps/10000` |
| `advance_recovered` | `min((gross+extra) × advance_pct_bps/10000, advance_outstanding)` |
| `vat_amount` | `(gross+extra - retention) × vat_pct_bps/10000` |
| `social_security_amount` | `(gross+extra) × social_security_pct_bps/10000` |
| `ld_amount` | set separately (manual or future LD record) |
| `net_amount` | `gross+extra - retention - advance + vat - social_sec - ld - custom_deductions` |

→ Full formula detail: [[flows/Financial Calculations]]

## Status (7 stages)

```
draft → submitted → finance_review → pm_review → director_review → approved
                                                                   → rejected (from any stage)
```

Transitions recorded in [[models/ApprovalEvent]].  
→ [[flows/Statement Approval Workflow]]

## Child Tables

| Table | Purpose |
|-------|---------|
| `work_done_items` | completed BoQ scope this period |
| `extra_work_items` | out-of-scope additions with variation tracking |
| `statement_deduction_items` | custom penalty / withholding lines |

## Relations

- Belongs to [[models/Contract]], [[models/Company]]
- Has many WorkDoneItem, ExtraWorkItem, StatementDeductionItem (CASCADE delete)
- Has many [[models/ApprovalEvent]] (polymorphic, `entity_type="interim_statement"`)

## Excel Report

`GET /statements/:id/report` → streams `.xlsx` file with Persian numerals and Jalali dates.  
→ [[flows/Report Generation]]
