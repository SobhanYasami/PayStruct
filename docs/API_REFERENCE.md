# API Reference

Base URL: `http://localhost:5000/api/v1`

All responses follow the standard envelope:

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

Error responses add `"errors"` for validation failures. `status` values: `success`, `created`, `bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `internal_error`.

Authentication: `Authorization: Bearer <jwt>` on all protected routes.

---

## Authentication

### POST /users/auth/signin

Public. No auth required.

**Request:**
```json
{ "email": "admin@system.local", "password": "changeme" }
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "019f...",
      "first_name": "System",
      "last_name": "Administrator",
      "email": "admin@system.local",
      "company_id": "019e...",
      "root_company_id": "019e...",
      "roles": ["sudoer"]
    }
  }
}
```

**Response 401:** Invalid credentials.

---

## Employees

### GET /users/me

Auth: any authenticated user. Returns the caller's employee profile.

**Response 200:** `data: Employee`

### PUT /users/me

Update caller's own profile (name, phone, password).

**Request:**
```json
{ "first_name": "Ali", "last_name": "Rezaei", "phone": "+98...", "password": "new_password" }
```

**Response 200:** `data: Employee`

### GET /users/employees/list

Auth: head roles (manager, finance_head, juridical_head, engineering_head, security_head).

Query params: `page` (default 1), `limit` (default 20), `department`, `role`, `active`.

**Response 200:**
```json
{
  "data": { "data": [Employee, ...], "total": 42, "page": 1, "limit": 20 }
}
```

### GET /users/employees/:id

Auth: head roles.

**Response 200:** `data: Employee`
**Response 404:** Not found.

### POST /users/employees/create

Auth: manager (+ sudoer/admin).

**Request:**
```json
{
  "national_id": "1234567890",
  "first_name": "Maryam",
  "last_name": "Hosseini",
  "email": "maryam@company.com",
  "phone": "+98911...",
  "department": "Engineering",
  "position": "Senior Engineer",
  "employment_type": "official",
  "roles": ["engineering"],
  "base_salary": "50000000",
  "salary_currency": "IRR",
  "hired_at": "2025-01-01",
  "password": "initial_password"
}
```

**Response 201:** `data: Employee`

### PUT /users/employees/:id

Auth: manager. Partial update — omit fields to leave unchanged.

**Response 200:** `data: Employee`

### DELETE /users/employees/:id

Auth: manager. Soft delete.

**Response 204**

---

## Companies

### GET /company/management

Auth: head roles. Lists companies scoped to caller's company (non-sudoer) or all (sudoer).

Query params: `page`, `limit`, `active`.

**Response 200:** paginated list of `Company`.

### GET /company/management/:id

Auth: head roles.

**Response 200:** `data: Company`

### POST /company/management

Auth: sudoer only.

**Request:**
```json
{
  "name": "Subsidiary Co.",
  "reg_num": "REG-002",
  "country_code": "IR",
  "tax_id": "1234",
  "parent_id": "019e...",
  "root_company_id": "019e..."
}
```

**Response 201:** `data: Company`

### PUT /company/management/:id

Auth: sudoer only.

**Response 200:** `data: Company`

### DELETE /company/management/:id

Auth: sudoer only. Soft delete.

**Response 204**

---

## Projects

### GET /projects

Auth: any authenticated. Scoped to caller's company.

Query params: `page`, `limit`, `status`, `priority`, `tag`.

**Response 200:** paginated list of `Project`.

### GET /projects/:id

Auth: any authenticated.

**Response 200:** `data: Project`

### POST /projects

Auth: manager, engineering_head (+ sudoer/admin).

**Request:**
```json
{
  "code": "PRJ-2025-001",
  "name": "Bridge Construction Phase 1",
  "description": "...",
  "category": "Infrastructure",
  "status": "planning",
  "priority": "high",
  "start_date": "2025-03-01",
  "end_date": "2026-06-01",
  "budget_estimate": "15000000000",
  "currency": "IRR",
  "tags": ["infrastructure", "bridge"]
}
```

**Response 201:** `data: Project`

### PUT /projects/:id

Auth: manager, engineering_head. Partial update.

**Response 200:** `data: Project`

### DELETE /projects/:id

Auth: manager, engineering_head. Soft delete.

**Response 204**

---

## Contractors

### GET /contractors

Auth: any authenticated. Scoped by company or all if sudoer.

Query params: `page`, `limit`, `type` (`individual`|`company`), `search`.

**Response 200:** paginated list of `Contractor`.

### GET /contractors/:id

Auth: any authenticated.

**Response 200:** `data: Contractor`

### POST /contractors

Auth: any authenticated.

**Request (individual):**
```json
{
  "type": "individual",
  "first_name": "Reza",
  "last_name": "Karimi",
  "national_id": "0012345678",
  "tax_id": "123456789",
  "default_currency": "IRR",
  "contact": { "phone": "+98...", "email": "reza@..." }
}
```

**Request (company):**
```json
{
  "type": "company",
  "company_name": "Sazeh Co.",
  "legal_name": "Sazeh Construction Co. Ltd.",
  "registration_no": "1234",
  "tax_id": "987654321",
  "default_currency": "IRR"
}
```

**Response 201:** `data: Contractor`

### PUT /contractors/:id

Auth: any authenticated.

**Response 200:** `data: Contractor`

### DELETE /contractors/:id

Auth: any authenticated.

**Response 204**

---

## Consultants

### GET /consultants

Auth: any authenticated.

Query params: `page`, `limit`, `active`, `search`.

**Response 200:** paginated list of `Consultant`.

### GET /consultants/:id

**Response 200:** `data: Consultant`

### POST /consultants

Auth: manager, engineering_head.

**Request:**
```json
{
  "name": "Mahan Consulting Engineers",
  "legal_name": "Mahan Consulting Engineers Co.",
  "registration_no": "ENG-1234",
  "tax_id": "11223344",
  "specialization": "Structural Engineering",
  "license_no": "STR-0042",
  "license_expiry": "2027-12-31",
  "default_currency": "IRR",
  "contact": { "phone": "+9821...", "email": "info@mahan.ir" }
}
```

**Response 201:** `data: Consultant`

### PUT /consultants/:id

Auth: manager, engineering_head.

**Response 200:** `data: Consultant`

### DELETE /consultants/:id

Auth: manager, engineering_head.

**Response 204**

---

## Contracts

All contract routes require auth + at least one head role (manager, engineering_head, finance_head, juridical_head).

### GET /contracts

Query params: `page`, `limit`, `status`, `type`, `project_id`, `contractor_id`.

**Response 200:** paginated list of `Contract`.

### GET /contracts/:id

**Response 200:** `data: Contract` (includes `line_items`, consultant, contractor names).

### POST /contracts

**Request:**
```json
{
  "project_id": "019f...",
  "contractor_id": "019f...",
  "employer_id": "019e...",
  "consultant_id": "019f...",
  "contract_no": "1404/3",
  "title": "Phase 2 Civil Works",
  "description": "...",
  "type": "unit_rate",
  "gross_budget": "8500000000",
  "currency": "IRR",
  "retention_pct_bps": 1000,
  "advance_pct_bps": 2000,
  "vat_pct_bps": 900,
  "social_security_pct_bps": 660,
  "contract_coefficient": "0.9500",
  "boq_version": "1404-MPO-Civil",
  "starts_on": "2025-04-01",
  "ends_on": "2026-03-20"
}
```

**Response 201:** `data: Contract`

### PUT /contracts/:id

Partial update. Cannot change `type`, `project_id`, or `contractor_id` after creation.

**Response 200:** `data: Contract`

### DELETE /contracts/:id

Soft delete. Only allowed when `status = draft`.

**Response 204**

### POST /contracts/:id/transition

Advance or reject the contract through its approval workflow.

**Request:**
```json
{ "status": "pending_engineering", "comment": "Submitted for engineering review" }
```

Valid transitions: `draft` → `pending_engineering` → `pending_finance` → `pending_legal` → `pending_ceo` → `ready_to_print` → `signed` → `active` → `closed` | `cancelled`.

**Response 200:** `data: Contract`
**Response 400:** Invalid transition or missing comment for reject.

### GET /contracts/:id/approvals

Returns all `ApprovalEvent` rows for this contract, ordered by `created_at DESC`.

**Response 200:** `data: [ApprovalEvent, ...]`

---

## Contract Line Items (WBS / BOQ)

### GET /contracts/:id/line-items

**Response 200:** `data: [ContractLineItem, ...]`

### POST /contracts/:id/line-items

**Request:**
```json
{
  "sort_order": 1,
  "description": "Earthwork excavation",
  "unit": "m³",
  "quantity": "1200.00",
  "unit_rate": "450000"
}
```

**Response 201:** `data: ContractLineItem`

### PUT /contracts/:id/line-items/:itemId

**Response 200:** `data: ContractLineItem`

### DELETE /contracts/:id/line-items/:itemId

**Response 204**

---

## Attachments

### GET /contracts/:id/attachments

Lists attachments for a contract. Returns `url` computed from `BASE_URL + /files-storage/ + storage_key`.

**Response 200:** `data: [Attachment, ...]`

### POST /contracts/:id/attachments

`multipart/form-data`. Field `file` = the file. Optional fields: `document_type`.

```
Content-Type: multipart/form-data
file: <binary>
document_type: "signed_contract"
```

**Response 201:** `data: Attachment`

### DELETE /attachments/:id

Auth: head roles. Deletes metadata and filesystem file.

**Response 204**

---

## Interim Statements (صورت وضعیت)

Auth: any authenticated. Role enforcement is applied in the transition endpoint only.

### GET /contracts/:contractId/statements

Query params: `page`, `limit`, `status`.

**Response 200:**
```json
{
  "data": {
    "data": [InterimStatement, ...],
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

### POST /contracts/:contractId/statements

Creates a draft statement. `sequence_no` is assigned automatically.

**Request:**
```json
{
  "period_start": "2025-04-01",
  "period_end": "2025-04-30",
  "issued_on": "2025-05-01",
  "notes": "First interim statement"
}
```

**Response 201:** `data: InterimStatement`

### GET /statements/:id

Returns full statement with child items preloaded.

**Response 200:** `data: InterimStatement` (includes `work_done_items`, `extra_work_items`, `deduction_items`).

### PATCH /statements/:id

Update header fields. Only allowed when `status = draft`.

**Request (all fields optional):**
```json
{
  "period_start": "2025-04-01",
  "period_end": "2025-04-30",
  "issued_on": "2025-05-02",
  "notes": "Revised dates"
}
```

**Response 200:** `data: InterimStatement`

### PUT /statements/:id/works-done

Replaces the entire `WorkDoneItem` set. For each item, description/unit/unit_price are copied from the referenced `ContractLineItem`. For `unit_rate` contracts, `unit_price` is multiplied by `contract_coefficient`. Triggers `Recompute()`.

**Request:**
```json
{
  "items": [
    { "line_item_id": "019f...", "quantity_done": "650.00" },
    { "line_item_id": "019f...", "quantity_done": "200.00" }
  ]
}
```

**Response 200:** `data: InterimStatement` (all aggregates recomputed).

### POST /statements/:id/extra-works

Add an extra work item (variation order or, for `cost_plus` contracts, an actual cost record). Triggers `Recompute()`.

**Request:**
```json
{
  "description": "Additional drainage work",
  "unit": "m",
  "quantity": "120",
  "unit_price": "800000",
  "reason": "Site condition change",
  "variation_ref": "VO-003",
  "approved_by_client": true,
  "approval_ref": "Letter-2025-042"
}
```

**Response 201:** `data: ExtraWorkItem`

### DELETE /statements/:id/extra-works/:ewId

Triggers `Recompute()`.

**Response 204**

### GET /statements/:id/deductions

**Response 200:** `data: [StatementDeductionItem, ...]`

### POST /statements/:id/deductions

Add a miscellaneous deduction (withholding tax, penalty, etc.). Triggers `Recompute()`.

**Request:**
```json
{
  "description": "Withholding tax",
  "unit": "LS",
  "quantity": "1",
  "unit_price": "2500000"
}
```

**Response 201:** `data: StatementDeductionItem`

### PUT /statements/:id/deductions/:did

**Request:** partial update — any of `description`, `unit`, `quantity`, `unit_price`.

**Response 200:** `data: StatementDeductionItem`

### DELETE /statements/:id/deductions/:did

**Response 204**

### PATCH /statements/:id/transition

Advance or reject the statement. Writes an `ApprovalEvent` row.

**Request:**
```json
{ "status": "submitted", "comment": "Ready for finance review" }
```

Valid transitions: `draft` → `submitted` → `finance_review` → `pm_review` → `director_review` → `approved` / `rejected`.

Role requirements per stage: `finance_review` — finance_head; `pm_review` — engineering_head; `director_review` — manager; `approved` — manager; `rejected` — the stage's required role.

**Response 200:** `data: InterimStatement`
**Response 400:** Illegal transition.
**Response 403:** Caller lacks required role.

### DELETE /statements/:id

Soft delete. Only allowed when `status = draft`.

**Response 204**

### GET /statements/:id/report

Generates and streams an Excel (`.xlsx`) statement report in the official Iranian صورت وضعیت format.

**Response 200:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="statement-1404-3-14040201.xlsx"
<binary XLSX bytes>
```

---

## Common Error Responses

**400 Bad Request:**
```json
{ "status": "bad_request", "message": "Invalid request body", "timestamp": "..." }
```

**401 Unauthorized:**
```json
{ "status": "unauthorized", "message": "Invalid or expired token", "timestamp": "..." }
```

**403 Forbidden:**
```json
{ "status": "forbidden", "message": "access denied", "timestamp": "..." }
```

**404 Not Found:**
```json
{ "status": "not_found", "message": "Resource not found", "timestamp": "..." }
```

**409 Conflict:**
```json
{ "status": "conflict", "message": "contract_no already exists for this company", "timestamp": "..." }
```

**500 Internal Server Error** (with `DEBUG=false`):
```json
{ "status": "internal_error", "message": "Internal server error", "timestamp": "..." }
```

---

## JWT Claims Schema

```typescript
interface JWTClaims {
  user_id: string;       // UUID of the Employee
  user_name: string;     // "FirstName LastName"
  company_id: string;    // UUID of the Employee's company
  roles: string[];       // e.g. ["manager", "engineering_head"]
  iss: string;           // JWT_ISSUER env
  aud: string[];         // JWT_AUDIENCE env
  exp: number;           // Unix timestamp
}
```
