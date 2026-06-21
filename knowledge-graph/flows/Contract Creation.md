---
tags: [flow, contract, creation]
updated: 2026-06-20
---

# Contract Creation Flow

## Entry Points

| UI Entry Point | Component |
| -------------- | --------- |
| `/contracts` page → "قرارداد جدید" button | `<CreateContractSheet>` (no defaultProjectId) |
| `/projects/[id]` → "قرارداد جدید" button | `<CreateContractSheet defaultProjectId={id}>` |

Both use: `frontend/src/components/domain/CreateContractSheet.tsx`

## Active-Project Gate

**Rule**: Contracts can only be created for projects with `status = "active"`.

1. **Project Combobox** (no `defaultProjectId`): `ActiveProjectCombobox` queries `GET /projects?status=active` — only active projects appear.
2. **Pre-filled project** (`defaultProjectId` set): fetches project via `GET /projects/:id`; if `status !== "active"` → amber banner + disabled navigation.

_Backend does NOT enforce this — frontend-only gate currently._

## Wizard Steps

5 sequential steps with per-step zod validation via `trigger(STEP_FIELDS[step])`. Steps with no required fields skip `trigger` and advance directly.

| # | Label | Key Fields | Required Validation |
| - | ----- | ---------- | ------------------- |
| 0 | طرفین و پروژه | project_id, contractor_id, employer_id, consultant_id, contract_no, title, description | project_id, contractor_id, title |
| 1 | نوع و مالی | type, gross_budget, currency, type-specific fields | gross_budget; conditional on type |
| 2 | زمان‌بندی | starts_on, ends_on, vat_pct, social_security_pct | none |
| 3 | آیتم‌های WBS | in-memory `wbsRows[]` (not RHF) | none (optional step) |
| 4 | مستندات | slotFiles (≤3 files) | none |

### Type-Specific Fields (Step 1)

| Type | Extra Fields |
| ---- | ------------ |
| `unit_rate` | `boq_version` (required), `contract_coefficient` (required) |
| `cost_plus` | `management_fee_pct` (required), `fee_calculation_method` (required) |
| `lump_sum` | `retention_pct`, `advance_pct` (optional) |

Enforced via `superRefine` in the zod schema.

### WBS Step (Step 3)

Local `useState<WbsRow[]>` — not connected to RHF:

```ts
interface WbsRow {
  _id: string;          // crypto.randomUUID(), ephemeral
  description: string;
  unit: string;
  quantity: string;
  unit_rate: string;
  currency_code: string;
}
```

Add/remove rows via buttons. Step is fully optional — empty is valid.

## Submission Flow

Form submit is **not** driven by `<form onSubmit>`. The final "ثبت قرارداد" button is `type="button"` calling `handleSubmit(...)` directly. `<form>` has `onSubmit={(e) => e.preventDefault()}` + `onKeyDown` Enter-block to prevent accidental DOM submit (especially from PersianDatePicker calendar buttons).

```text
1. POST /contracts  { ...formData converted to req }
   → { data: { id, ... } }
2. for each wbsRow where description.trim() !== "":
     POST /contracts/:id/line-items { description, unit, quantity, unit_rate, currency_code, sort_order }
3. for each file in slotFiles:
     POST /contracts/:id/attachments  (multipart, document_type = key)
4. invalidateQueries(["contracts"])
5. toast.success + onSuccess() + onClose()
```

Steps 2–3 are sequential. If line item or file upload fails after contract creation, contract is still saved (no rollback).

## Zod Schema Highlights

```ts
// Step 0 required
project_id:    z.string().min(1)
contractor_id: z.string().min(1)
title:         z.string().min(1)

// Step 1 required
gross_budget:  z.string().min(1)

// Conditional via superRefine
// type === "unit_rate" → boq_version + contract_coefficient required
// type === "cost_plus" → management_fee_pct + fee_calculation_method required
```

## PctInput → BPS Conversion

```ts
function percentToBps(pct: string): number {
  const n = parseFloat(toAsciiDigits(pct));
  return isNaN(n) ? 0 : Math.round(n * 100);
}
```

Applied to: `retention_pct`, `advance_pct`, `vat_pct`, `social_security_pct`, `management_fee_pct`.

## Cache Invalidation

On success: `queryClient.invalidateQueries({ queryKey: ["contracts"] })` — prefix match.

→ [[models/Contract]], [[frontend/Components#CreateContractSheet]], [[backend/Attachment Service]]
