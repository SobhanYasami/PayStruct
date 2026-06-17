---
tags: [api, routes]
updated: 2026-06-15
---

# API Routes

Base: `/api/v1`  
Auth: HS256 JWT via `Authorization: Bearer <token>` header.  
Response envelope: `{ status, data: T | { data: T[], total, page, limit }, message, timestamp }`.

## Auth / Users

| Method | Path | Auth | Roles | Handler |
|--------|------|------|-------|---------|
| POST | `/users/auth/signin` | ❌ | — | `UserHandler.SignIn` |
| GET | `/users/me/` | ✅ | any | `UserHandler.GetMe` |
| PUT | `/users/me/` | ✅ | any | `UserHandler.UpdateMe` |
| GET | `/users/employees/list` | ✅ | sudoer | `UserHandler.GetAllEmployee` |
| GET | `/users/employees/:id` | ✅ | sudoer | `UserHandler.GetEmployee` |
| POST | `/users/employees/create` | ✅ | sudoer | `UserHandler.CreateEmployee` |
| PUT | `/users/employees/:id` | ✅ | sudoer | `UserHandler.UpdateEmployee` |
| DELETE | `/users/employees/:id` | ✅ | sudoer | `UserHandler.DeleteEmployee` |

## Companies

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/company/management/` | ✅ | sudoer |
| GET | `/company/management/:id` | ✅ | sudoer |
| POST | `/company/management/` | ✅ | sudoer |
| PUT | `/company/management/:id` | ✅ | sudoer |
| DELETE | `/company/management/:id` | ✅ | sudoer |

## Projects

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/projects` | ✅ | any |
| GET | `/projects/:id` | ✅ | any |
| POST | `/projects` | ✅ | manager, engineering_head |
| PUT | `/projects/:id` | ✅ | manager, engineering_head |
| DELETE | `/projects/:id` | ✅ | manager, engineering_head |

Query params: `page`, `limit`, `status`, `search`.

## Contractors

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET/POST/GET:id/PUT:id/DELETE:id | `/contractors` | ✅ | any |

Query params: `page`, `limit`, `search`.

## Contracts

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/contracts` | ✅ | manager, engineering_head, finance_head, juridical_head |
| GET | `/contracts/:id` | ✅ | head roles |
| POST | `/contracts` | ✅ | head roles |
| PUT | `/contracts/:id` | ✅ | head roles |
| DELETE | `/contracts/:id` | ✅ | head roles |
| GET | `/contracts/:id/line-items` | ✅ | head roles |
| POST | `/contracts/:id/line-items` | ✅ | head roles |
| PUT | `/contracts/:id/line-items/:itemId` | ✅ | head roles |
| DELETE | `/contracts/:id/line-items/:itemId` | ✅ | head roles |
| GET | `/contracts/:id/attachments` | ✅ | head roles |
| POST | `/contracts/:id/attachments` | ✅ | head roles |

Query params: `page`, `limit`, `project_id`, `search`.

## Statements

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/contracts/:contractId/statements` | ✅ | create new statement |
| GET | `/contracts/:contractId/statements` | ✅ | list for contract |
| GET | `/statements/:id` | ✅ | full detail with work/extra/deduction items |
| PUT | `/statements/:id/works-done` | ✅ | replace work done items, triggers Recompute() |
| POST | `/statements/:id/extra-works` | ✅ | add extra work line |
| DELETE | `/statements/:id/extra-works/:ewId` | ✅ | remove extra work line |
| GET | `/statements/:id/deductions` | ✅ | list custom deductions |
| POST | `/statements/:id/deductions` | ✅ | add deduction line |
| PUT | `/statements/:id/deductions/:did` | ✅ | update deduction |
| DELETE | `/statements/:id/deductions/:did` | ✅ | remove deduction |
| PATCH | `/statements/:id/transition` | ✅ | advance/reject approval state |
| DELETE | `/statements/:id` | ✅ | delete (draft only) |
| GET | `/statements/:id/report` | ✅ | download Excel (streams `application/vnd.openxmlformats...`) |

## Attachments

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| DELETE | `/attachments/:id` | ✅ | head roles only |

## Static Files

`GET /files-storage/**` — served directly from `../storage/` on disk. No auth (public URL).

→ See [[RBAC]] for role definitions, [[backend/Attachment Service]] for upload constraints
