---
tags: [frontend, pages]
updated: 2026-06-20
---

# Frontend Pages

All pages under `(dashboard)` require auth (token in Zustand store). No server-side middleware redirect yet.

## `/dashboard` — Dashboard

File: `app/(dashboard)/dashboard/page.tsx`  
Stats overview: active projects, pending statements, total contract value, etc.

## `/projects` — Projects List

File: `app/(dashboard)/projects/page.tsx`

- Table: code, name, status badge, priority, start_date (Jalali), contracts_count
- Inline status `<select>` per row → `PUT /projects/:id { status }` mutation
- "پروژه جدید" button → Sheet form (create)
- Edit (pencil icon) → Sheet form (edit)
- Delete → `ConfirmDialog`
- `canWrite` = user has manager/engineering_head/sudoer/admin role

## `/projects/:id` — Project Detail

File: `app/(dashboard)/projects/[id]/page.tsx`

- Breadcrumb: ArrowRight → `/projects`
- Tabs: **قراردادها** | **اطلاعات**
- Contracts tab: table of contracts, starts_on Jalali, "قرارداد جدید" → `<CreateContractSheet defaultProjectId={id}>`
- Info tab: project metadata with Jalali dates

## `/projects/:id/contracts/:cid` — Contract in Project Context

File: `app/(dashboard)/projects/[id]/contracts/[cid]/page.tsx`  
Tabs: **صورت وضعیت‌ها** | **آیتم‌های BoQ** | **اطلاعات قرارداد**  
Statement rows: period (Jalali range), status badge, net_amount, issued_on.  
Row click → `/projects/:id/contracts/:cid/statements/:sid`

## `/projects/:id/contracts/:cid/statements/:sid` — Statement Detail (project path)

File: `app/(dashboard)/projects/[id]/contracts/[cid]/statements/[sid]/page.tsx`  
Full statement detail with work items, extra works, deductions, financials, approval trail.

## `/contracts` — Contracts Global List

File: `app/(dashboard)/contracts/page.tsx`

- Guarded: `canWrite` (head roles). Non-head sees "دسترسی ندارید".
- Table: contract_no, title, contractor_name, project_name, type, status, gross_budget, starts_on, ends_on
- "قرارداد جدید" → `<CreateContractSheet>` (no defaultProjectId — shows active-only project picker)
- Edit → inline `ContractForm` in Sheet
- Delete → `ConfirmDialog`
- Search input → debounced `?search=...` param
- Pagination: 20/page

## `/contracts/:id` — Contract Detail (global path)

File: `app/(dashboard)/contracts/[id]/page.tsx`

Sections (vertical scroll, no tabs):

1. **Header card** — title, contract_no, status + type badges, KPI bar (gross_budget, starts_on, ends_on, currency), BPS deduction badges
2. **Approval workflow card** — 5-stage stepper; hidden when `status ∈ {active, closed, cancelled}`. Role-gated action buttons per active stage. → [[flows/Contract Approval Workflow]]
3. **Project / Contractor info cards** — side-by-side
4. **WBS / BoQ table** — line items with totals footer. Add/edit/delete gated by `canEdit`
5. **صورت وضعیت‌ها table** — list of interim statements. Create button disabled when `status !== "active"`
6. **اسناد قرارداد** — 5 named document slots. Upload/delete gated by `canEdit`

**Edit/create locks:**

```ts
const canEdit = contract.status === "draft" && approvalEvents.length === 0;
const canCreateStatement = contract.status === "active";
```

## `/contracts/:id/statements/:sid` — Statement Detail (global path)

File: `app/(dashboard)/contracts/[id]/statements/[sid]/page.tsx`  
Full statement detail view.

## `/contractors` — Contractors

File: `app/(dashboard)/contractors/page.tsx`  
CRUD table. Sheet form: type, display_name, legal_name, tax_id, national_id, currency, rating.

## `/companies` — Companies

File: `app/(dashboard)/companies/page.tsx`  
Admin-only CRUD.

## `/employees` — Employees

File: `app/(dashboard)/employees/page.tsx`  
Sudoer-only. Shows "دسترسی ندارید" for others.  
Sheet form: name, email, national_id, roles (text[] multi), employment_type, company_id.

## `/reports` — Reports

File: `app/(dashboard)/reports/page.tsx`  
Download buttons that trigger `GET /statements/:id/report`.

→ [[frontend/Components]], [[frontend/API Layer]]
