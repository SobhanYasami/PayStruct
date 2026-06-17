---
tags: [frontend, components]
updated: 2026-06-15
---

# Frontend Components

## Domain Components (`src/components/domain/`)

### CreateContractSheet

File: `src/components/domain/CreateContractSheet.tsx`  
→ [[flows/Contract Creation]]

Reusable Sheet for new contract creation. Used in:
- `/contracts` page (no `defaultProjectId` — shows ActiveProjectCombobox)
- `/projects/[id]` page (`defaultProjectId={id}` — locked project display)

**Props:**
```ts
{
  open: boolean
  onClose(): void
  defaultProjectId?: string   // if set: fetches project, validates status=active
  onSuccess?(): void          // called after successful create
}
```

**Active-project enforcement:**
- Without `defaultProjectId`: `ActiveProjectCombobox` queries `?status=active` — only active projects appear
- With `defaultProjectId`: fetches project; if `status !== "active"` → amber warning + disabled submit

**Internal mutation flow:** POST contract → upload files (sequential) → invalidate `["contracts"]` → call `onSuccess` → close.

---

### StatusBadge

File: `src/components/domain/StatusBadge.tsx`

Maps status string → Persian label + Tailwind color class.

| Status | Label | Color |
|--------|-------|-------|
| `draft` | پیش‌نویس | muted |
| `submitted` | ارسال شده | blue |
| `finance_review` | بررسی مالی | amber |
| `pm_review` | بررسی مدیر پروژه | orange |
| `director_review` | بررسی مدیر ارشد | purple |
| `approved` | تأیید شده | green |
| `rejected` | رد شده | red |
| `planning` | برنامه‌ریزی | blue |
| `active` | فعال | green |
| `on_hold` | متوقف | amber |
| `completed` | تکمیل شده | green |
| `cancelled` | لغو شده | red |
| `lump_sum` | مقطوع | — |
| `unit_rate` | واحد بها | — |
| `cost_plus` | هزینه + سود | — |
| `time_material` | زمان و مصالح | — |

---

### FinancialSummary

File: `src/components/domain/FinancialSummary.tsx`

Grid of KPI cards for statement financial breakdown.  
Fields: gross, extra, retention, advance_recovered, vat, social_security, ld, net_amount.  
Uses `formatMoney()` from `utils/money.ts`.

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

pdf.js canvas renderer. Worker set via CDN:
```ts
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
```
Page-by-page pagination. Props: `{ url: string }`.

---

## UI Primitives (`src/components/ui/`)

### Sheet

File: `src/components/ui/Sheet.tsx`  
Slide-in side panel (from right for RTL). Wraps Radix Dialog.  
Props: `open`, `onClose`, `title`, `children`.

### DataTable

File: `src/components/ui/DataTable.tsx`  
Generic table. Props: `columns`, `data`, `isLoading`, `keyExtractor`, `onRowClick?`, `emptyMessage`.  
Column config: `{ key, header, render? }`.

### PersianDatePicker

File: `src/components/ui/PersianDatePicker.tsx`  
Jalali calendar picker. Outputs ISO `YYYY-MM-DD` string.  
Props: `value`, `onChange`, `inputClass`.

---

## Layout (`src/components/layout/`)

### Sidebar

File: `src/components/layout/Sidebar.tsx`  
Fixed right-side nav. Links: Dashboard, Projects, Contracts, Contractors, Companies, Employees, Reports.  
Active state via `usePathname()`.

### TopBar

File: `src/components/layout/TopBar.tsx`  
Breadcrumb from `usePathname()`. User name + logout (reads Zustand auth store).
