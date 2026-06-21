---
tags: [frontend, components]
updated: 2026-06-20
---

# Frontend Components

## Domain Components (`src/components/domain/`)

### CreateContractSheet

File: `src/components/domain/CreateContractSheet.tsx`  
→ [[flows/Contract Creation]]

Reusable dialog for new contract creation. Used in:

- `/contracts` page (no `defaultProjectId` — shows ActiveProjectCombobox)
- `/projects/[id]` page (`defaultProjectId={id}` — locked project display)

**Props:**

```ts
{
  open: boolean
  onClose(): void
  defaultProjectId?: string   // if set: fetches project, validates status=active
  onSuccess?(): void
}
```

**5-step wizard:**

| Step | Label | Content |
| ---- | ----- | ------- |
| 0 | طرفین و پروژه | project, contractor, employer, consultant, contract_no, title |
| 1 | نوع و مالی | type + type-specific fields + budget/currency |
| 2 | زمان‌بندی | starts_on, ends_on, deduction % inputs |
| 3 | آیتم‌های WBS | dynamic row table (local state, not RHF) |
| 4 | مستندات | up to 3 file slots |

Navigation: `goNext()` calls `trigger(STEP_FIELDS[step])` only when fields list is non-empty; empty steps advance directly. `<form>` has `onSubmit={(e) => e.preventDefault()}` — final button is `type="button"` + `onClick={handleSubmit(...)}`.

**Mutation flow:** POST contract → create WBS line items (sequential) → upload files (sequential) → invalidate cache.

---

### StatusBadge

File: `src/components/domain/StatusBadge.tsx`

Maps status/type string → Persian label + Tailwind ring color.

**Contract statuses:**

| Status | Label |
| ------ | ----- |
| `draft` | پیش‌نویس |
| `pending_engineering` | در انتظار مهندسی |
| `pending_finance` | در انتظار مالی |
| `pending_legal` | در انتظار حقوقی |
| `pending_ceo` | در انتظار مدیریت |
| `ready_to_print` | آماده چاپ |
| `signed` | امضاشده |
| `active` | فعال |
| `closed` | بسته شده |
| `cancelled` | لغو شده |

**Contract types** and statement statuses also mapped.

---

### ContractDetail (page component)

File: `app/(dashboard)/contracts/[id]/page.tsx`

Key sections:

**Approval workflow card** — visible when `status ∉ {active, closed, cancelled}`:

- 5-stage horizontal stepper (مهندسی → مالی → حقوقی → مدیریت → امضا)
- Each stage shows done/active/pending state + event timestamp
- Action area (comment textarea + approve/reject/sign/cancel buttons) renders only for the active stage AND only if current user has the required role
- "ارسال برای تأیید مهندسی" submit button visible for any head role when `status === "draft"`

**WBS table** — conditional action column:

```ts
const canEdit = contract.status === "draft" && approvalEvents.length === 0;
```

Add/edit/delete hidden when `canEdit = false`.

**Documents section** — same `canEdit` gate: upload input and delete button hidden when locked.

**Statements section** — create button:

```ts
const canCreateStatement = contract.status === "active";
// button disabled with title tooltip when false
```

---

### FinancialSummary

File: `src/components/domain/FinancialSummary.tsx`

Grid of KPI cards for statement financial breakdown.  
Fields: gross, extra, retention, advance_recovered, vat, social_security, ld, net_amount.

---

### ConfirmDialog

File: `src/components/domain/ConfirmDialog.tsx`

Generic delete/confirm modal. Props: `open`, `onClose`, `onConfirm`, `title`, `description`, `confirmLabel`, `confirmClassName`, `isPending`.

---

### DocumentViewer

File: `src/components/domain/DocumentViewer.tsx`

Modal viewer for [[models/Attachment]]. Dispatches to:

- `<PDFViewer>` for `application/pdf`
- `<img>` for `image/*`
- download link for other MIME types

### PDFViewer

File: `src/components/domain/PDFViewer.tsx`

pdf.js canvas renderer. Page-by-page pagination. Props: `{ url: string }`.

---

## UI Primitives (`src/components/ui/`)

### Sheet

File: `src/components/ui/Sheet.tsx`  
Slide-in side panel (from right for RTL). Wraps Radix Dialog.  
Props: `open`, `onClose`, `title`, `children`.

### DataTable

File: `src/components/ui/DataTable.tsx`  
Generic table. Props: `columns`, `data`, `isLoading`, `keyExtractor`, `onRowClick?`, `emptyMessage`.

### PersianDatePicker

File: `src/components/ui/PersianDatePicker.tsx`  
Jalali calendar picker. Outputs ISO `YYYY-MM-DD` string.  
**Note**: calendar nav/select buttons inside the picker default to `type="submit"`. Parent forms must use `onSubmit={(e) => e.preventDefault()}` or the final submit button must be `type="button"`.

---

## Layout (`src/components/layout/`)

### Sidebar

File: `src/components/layout/Sidebar.tsx`  
Fixed right-side nav. Links: Dashboard, Projects, Contracts, Contractors, Companies, Employees, Reports. Active state via `usePathname()`.

### TopBar

File: `src/components/layout/TopBar.tsx`  
Breadcrumb from `usePathname()`. User name + logout (reads Zustand auth store).
