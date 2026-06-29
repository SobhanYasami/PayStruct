---
tags: [flow, statement, financial, calculation, contract-type]
updated: 2026-06-29
---

# صورت وضعیت — Interim Statement

Periodic payment certificate issued by the contractor to the employer (per **ماده ۳۷ شرایط عمومی پیمان**, Publication 4311). Each `InterimStatement` is scoped to one `Contract` and numbered sequentially (`sequence_no`).

---

## Model Overview

File: `backend/internal/models/statement.go`

```
InterimStatement
  ├── CompanyID / ContractID / SequenceNo (composite unique)
  ├── PeriodStart, PeriodEnd, IssuedOn
  ├── Status (7-stage state machine)
  ├── Cached aggregates (recomputed on each item mutation)
  │     GrossAmount, ExtraAmount, DeductionAmount
  │     RetentionAmount, AdvanceRecovered, VatAmount
  │     SocialSecurityAmount, LdAmount, NetAmount
  ├── PrevProgressPct, ProgressPct
  ├── FxRate / FxRateDate (locked at approval time)
  └── Children (CASCADE DELETE)
        WorkDoneItem[]          — WBS line completions (lump_sum / unit_rate)
        ExtraWorkItem[]         — out-of-scope / actual costs (cost_plus)
        StatementDeductionItem[] — user-provided misc. deductions
```

Supporting financial models (separate tables):

| Model | Purpose |
|-------|---------|
| `RetentionRecord` | Performance bond & defect-liability deductions/releases |
| `AdvancePaymentRecord` | Advance issuance and recovery ledger |
| `LiquidatedDamage` | Delay / performance penalty records |

---

## Calculation by Contract Type

### 1. فهرست‌بها — Unit Rate (`unit_rate`)

Official MPO price lists (فهرست بهای سازمان برنامه) with a competitive coefficient.

```
GrossAmount = Σ (quantity_done_i × unit_price_i × contract_coefficient)
```

- **`contract_coefficient`** (ضریب پیمان) stored on `Contract.ContractCoefficient` (NUMERIC(8,4); default 1).
  Computed as `bid_price ÷ engineer_estimate`; typically 0.85–1.15.
- `SetWorksDone` applies the coefficient: `effectiveRate = wbs.UnitRate × ct.ContractCoefficient`.
- `WorkDoneItem.UnitPrice` stores the *effective* rate (post-coefficient).
- `ExtraAmount` = sum of out-of-scope `ExtraWorkItem` amounts.
- Additional coefficients (regional, overhead, price-escalation index) are not currently modelled;
  fold them into `ContractCoefficient` or into the unit price at import time.

### 2. مقطوع — Lump Sum (`lump_sum`)

Fixed total price broken down per WBS milestone (ریز مبالغ).

```
GrossAmount = Σ (quantity_done_i × unit_price_i)
```

- No coefficient applied (`ContractCoefficient` defaults to 1 for lump_sum contracts, so the arithmetic is identical).
- Progress % = `GrossAmount ÷ GrossBudget × 100`.
- `ExtraAmount` = additional out-of-scope work (variations / تغییرات).

### 3. امانی — Cost Plus (`cost_plus`)

Employer bears all cost risk; contractor charges actual costs plus a fixed management fee percentage.

```
ExtraAmount    = Σ actual cost items   (entered as ExtraWorkItem records)
ManagementFee  = ExtraAmount × management_fee_pct_bps / 10000
GrossAmount    = ManagementFee
GrossTotal     = ExtraAmount + GrossAmount
```

- **`Contract.ManagementFeePctBps`** — management fee in basis points (e.g. 1000 = 10%).
- `WorkDoneItem` rows are **not used** for cost_plus; the WBS tab is hidden in the UI.
- `ExtraWorkItem` serves as the actual-cost ledger (labor, materials, subcontractors, equipment).
- `Recompute` detects cost_plus mode via `managementFeeBps > 0` and sets `GrossAmount = managementFee`.

---

## Standard Deductions (applied to all types)

All deductions are computed on `GrossTotal = GrossAmount + ExtraAmount`.

| Field | Meaning | Rate source |
|-------|---------|------------|
| `RetentionAmount` | ضمانت حسن انجام | `Contract.RetentionPctBps` (per ماده 35; typically 1000 bps = 10%) |
| `AdvanceRecovered` | استرداد پیش‌پرداخت | `Contract.AdvancePctBps` × GrossTotal, capped at outstanding balance |
| `VatAmount` | مالیات بر ارزش افزوده | `Contract.VatPctBps` applied to (GrossTotal − Retention) |
| `SocialSecurityAmount` | حق بیمه تأمین اجتماعی | `Contract.SocialSecurityPctBps` (typically 660 bps = 6.6%) |
| `LdAmount` | خسارت تأخیر | Set directly; sourced from `LiquidatedDamage` records |
| `DeductionAmount` | کسورات متفرقه | Sum of `StatementDeductionItem` — user-entered (withholding, penalties, …) |

**Net payable formula:**

```
NetAmount = GrossTotal
          − RetentionAmount
          − AdvanceRecovered
          − SocialSecurityAmount
          − LdAmount
          − DeductionAmount
          + VatAmount          ← added, not deducted; employer pays on top
```

Implemented in `InterimStatement.Recompute(...)` (`models/statement.go`).

---

## Approval Workflow (ماده ۳۷ شرایط عمومی پیمان)

```
draft
  ──[submit]──────▶ submitted         (pm / admin)
  ──[approve]─────▶ finance_review    (finance / admin)
  ──[approve]─────▶ pm_review         (pm / admin)
  ──[approve]─────▶ director_review   (director / admin)
  ──[approve]─────▶ approved          (director / admin)

any pending ──[reject]──▶ rejected    (stage's required role; comment mandatory)
```

Statutory timelines (not enforced in code, informational):
- Consultant must review and forward within **10 days** of contractor submission.
- Employer must issue payment within **10 days** of receipt from consultant.
- If rejected: employer pays **70% of consultant-approved amount** immediately and returns with written reasons within 5 days.

Transitions write an `ApprovalEvent` row (`entity_type = "interim_statement"`).

### Status Enum

```go
StatementDraft          = "draft"
StatementSubmitted      = "submitted"
StatementFinanceReview  = "finance_review"
StatementPMReview       = "pm_review"
StatementDirectorReview = "director_review"
StatementApproved       = "approved"
StatementRejected       = "rejected"
```

---

## API Surface

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/contracts/:contractId/statements` | Create draft statement |
| `GET` | `/contracts/:contractId/statements` | List statements (paginated, ?status) |
| `GET` | `/statements/:id` | Get with all child items |
| `PATCH` | `/statements/:id` | Update draft header (period, issued_on, notes) |
| `PUT` | `/statements/:id/works-done` | Replace WorkDoneItem set (replace-all) |
| `POST` | `/statements/:id/extra-works` | Add ExtraWorkItem / actual cost |
| `DELETE` | `/statements/:id/extra-works/:ewId` | Remove ExtraWorkItem |
| `GET` | `/statements/:id/deductions` | List misc. deductions |
| `POST` | `/statements/:id/deductions` | Add deduction |
| `PUT` | `/statements/:id/deductions/:did` | Update deduction |
| `DELETE` | `/statements/:id/deductions/:did` | Remove deduction |
| `PATCH` | `/statements/:id/transition` | Status transition (body: `{status, comment}`) |
| `DELETE` | `/statements/:id` | Delete draft (only) |
| `GET` | `/statements/:id/report` | Download Excel statement report |

All routes require JWT auth (`Authenticate` middleware). No additional role gate — transition endpoint enforces roles internally.

---

## Frontend Pages

- **List + create**: `app/(dashboard)/contracts/[id]/page.tsx` — statements table section; "صورت وضعیت جدید" button gated on `contract.status === "active"`.
- **Detail**: `app/(dashboard)/contracts/[id]/statements/[sid]/page.tsx` — tabbed view:
  - **کارهای انجام شده** (hidden for `cost_plus`): WBS grid with editable `quantity_done` inputs.
  - **کارهای اضافه / هزینه‌های واقعی**: extra works (non-cost_plus) or actual cost items (cost_plus).
  - **کسورات**: calculated deductions (read-only grid) + misc. deduction CRUD.
  - **خلاصه مالی**: full net payable waterfall.
  - Edit header (⚙ icon, draft only): period dates + notes.
  - Transition buttons rendered per `TRANSITIONS` map filtered by `user.roles`.

---

## SOLID Notes

- **SRP**: `InterimStatement.Recompute` owns all aggregate math; services call it and persist the result.
- **OCP**: Adding a new contract type (e.g. `percentage`) only requires a new `managementFeeBps`-equivalent parameter path in `Recompute`; existing paths unchanged.
- **DIP**: `StatementService` depends on `*gorm.DB` injected via `NewStatementService`; handler depends on `*StatementService` (concrete, could be interfaced for tests).

→ [[models/Contract]], [[flows/Contract Approval Workflow]], [[flows/Financial Calculations]], [[backend/Auth & JWT]]
