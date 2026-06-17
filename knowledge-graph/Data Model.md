---
tags: [data-model, erd]
updated: 2026-06-15
---

# Data Model

## Entity Relationship Overview

```
Company  ──< Employee
  │
  └──< Project ──────────────────────────< Contract ──────────< ContractLineItem
                                               │    \
                                          Contractor  └──< InterimStatement ──< WorkDoneItem
                                                                │               ──< ExtraWorkItem
                                                                │               ──< StatementDeductionItem
                                                                │
                                                          ApprovalEvent (polymorphic, entity_type="interim_statement")
                                          Attachment (polymorphic, entity_type="contract")
```

## Tables

| Table | Model | Key Relations |
|-------|-------|--------------|
| `companies` | [[models/Company]] | root of tenant tree |
| `employees` | [[models/Employee]] | belongs to Company, has Roles[] |
| `projects` | [[models/Project]] | belongs to Company, has many Contracts |
| `contractors` | [[models/Contractor]] | optionally scoped to Company |
| `contracts` | [[models/Contract]] | belongs to Project + Contractor + Company |
| `contract_line_items` | (ContractLineItem) | BoQ / WBS items under a Contract |
| `interim_statements` | [[models/InterimStatement]] | periodic payment cert under Contract |
| `work_done_items` | (WorkDoneItem) | completed scope per statement period |
| `extra_work_items` | (ExtraWorkItem) | out-of-scope additions |
| `statement_deduction_items` | (StatementDeductionItem) | custom penalty/withholding lines |
| `approval_events` | [[models/ApprovalEvent]] | immutable audit trail for status transitions |
| `attachments` | [[models/Attachment]] | polymorphic file metadata (entity_type + entity_id) |

## Cascade Rules

- Company → Project: `OnDelete:RESTRICT` (must archive children first)
- Project → Contract: `OnDelete:RESTRICT`
- Contract → InterimStatement: `OnDelete:RESTRICT`
- InterimStatement → WorkDoneItem / ExtraWorkItem / DeductionItem: `OnDelete:CASCADE`
- Contractor delete: `OnDelete:RESTRICT` (contracts reference it)

## Unique Constraints

- `(company_id, code)` on projects
- `(company_id, contract_no)` on contracts
- `(contract_id, sequence_no)` on interim_statements
- `(statement_id, line_no)` on work_done_items and extra_work_items
- `national_id` on employees (global)
- `tax_id` on contractors (unique per value, nullable)

## Money Conventions

All monetary amounts: `NUMERIC(20,8)` in Postgres / `decimal.Decimal` in Go.  
All rates: integer **basis-points** (bps). 1000 bps = 10.00%.  
Percentage fields: `retention_pct_bps`, `advance_pct_bps`, `vat_pct_bps`, `social_security_pct_bps`.

→ See [[flows/Financial Calculations]]
