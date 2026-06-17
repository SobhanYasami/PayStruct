---
tags: [frontend, pages]
updated: 2026-06-15
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
- Phase field: `<select>` 0–4 (not freetext)
- `canWrite` = user has manager/engineering_head/sudoer/admin role

## `/projects/:id` — Project Detail

File: `app/(dashboard)/projects/[id]/page.tsx`

- Breadcrumb: ArrowRight → `/projects`
- Tabs: **قراردادها** | **اطلاعات**
- Contracts tab: DataTable of contracts, starts_on Jalali, "قرارداد جدید" → `<CreateContractSheet defaultProjectId={id}>`
- Info tab: project metadata with Jalali dates

## `/projects/:id/contracts/:cid` — Contract in Project Context

File: `app/(dashboard)/projects/[id]/contracts/[cid]/page.tsx`  
Tabs: **صورت وضعیت‌ها** | **آیتم‌های BoQ** | **اطلاعات قرارداد**  
Statement rows: period (Jalali range), status badge, net_amount, issued_on (Jalali)  
Row click → `/projects/:id/contracts/:cid/statements/:sid`

## `/projects/:id/contracts/:cid/statements/:sid` — Statement Detail (project path)

File: `app/(dashboard)/projects/[id]/contracts/[cid]/statements/[sid]/page.tsx`  
Full statement detail with work items, extra works, deductions, financials, approval trail.

## `/contracts` — Contracts Global List

File: `app/(dashboard)/contracts/page.tsx`

- Guarded: `canWrite` (head roles). Non-head sees "دسترسی ندارید".
- Table: contract_no, title, contractor_name, project_name, type, status, gross_budget, starts_on, ends_on
- "قرارداد جدید" → `<CreateContractSheet>` (no defaultProjectId — shows active-only project picker)
- Edit → inline `ContractForm` in Sheet (separate from CreateContractSheet — allows editing all fields)
- Delete → `ConfirmDialog`
- Search input → debounced `?search=...` param
- Pagination: 20/page

## `/contracts/:id` — Contract Detail (global path)

File: `app/(dashboard)/contracts/[id]/page.tsx`  
KPI bar: gross_budget, retention %, advance %, VAT %  
Tabs: **صورت وضعیت‌ها** | **آیتم‌های BoQ** | **اطلاعات قرارداد** | **مستندات**  
Documents tab: up to 3 attachments, PDFViewer/DocumentViewer modal

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
