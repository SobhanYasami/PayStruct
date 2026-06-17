---
tags: [flow, finance, calculations]
updated: 2026-06-15
---

# Financial Calculations

All computation lives in `InterimStatement.Recompute()` — `backend/internal/models/statement.go`.  
Triggered by `StatementService.SetWorksDone()` after replacing work-done items.

## Formula (exact Go implementation)

```
gross_total   = Σ WorkDoneItem.Amount  +  Σ ExtraWorkItem.Amount

retention     = gross_total × (retention_pct_bps / 10000)
advance_rate  = gross_total × (advance_pct_bps   / 10000)
advance       = min(advance_rate, advance_outstanding)   ← capped at remaining advance balance
vat           = (gross_total - retention) × (vat_pct_bps / 10000)
social_sec    = gross_total × (social_security_pct_bps / 10000)

custom_deductions = Σ StatementDeductionItem.Amount

net_payable   = gross_total
              - retention
              - advance
              + vat
              - social_sec
              - ld_amount          ← liquidated damages (set manually or via LD flow)
              - custom_deductions
```

## Fields Stored

All results are cached on the `InterimStatement` row:

| DB field | Formula result |
|----------|---------------|
| `gross_amount` | Σ WorkDoneItem only (not including extra) |
| `extra_amount` | Σ ExtraWorkItem |
| `deduction_amount` | custom_deductions |
| `retention_amount` | retention |
| `advance_recovered` | advance (capped) |
| `vat_amount` | vat |
| `social_security_amount` | social_sec |
| `ld_amount` | set separately; not recomputed by Recompute() |
| `net_amount` | net_payable |

Progress percentage:
```
progress_pct = (gross_amount / contract.gross_budget) × 100
```
Only set if `gross_budget > 0`.

## BPS Convention

All rate parameters come from parent [[models/Contract]] BPS fields.  
`advance_outstanding` is the remaining un-recovered advance balance — queried by the service before calling `Recompute()`.

## Excel Report Output

Same calculated fields are presented in the Excel report with Persian numeral formatting.  
→ [[flows/Report Generation]]

## VAT Note

VAT is applied **after** deducting retention (`(gross - retention) × vat_rate`), which is the standard Iranian construction contract convention.  
Social security is applied **on gross_total** (before retention deduction).
