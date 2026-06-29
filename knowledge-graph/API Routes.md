---
tags: [api, routes]
updated: 2026-06-20
---

# API Routes

Base: `/api/v1`  
Auth: HS256 JWT via `Authorization: Bearer <token>` header.  
Response envelope: `{ status, data: T | { data: T[], total, page, limit }, message, timestamp }`.

## Auth / Users

| Method | Path | Auth | Roles | Handler |
| ------ | ---- | ---- | ----- | ------- |
| POST | `/users/auth/signin` | ❌ | — | `UserHandler.SignIn` |
| GET | `/users/me/` | ✅ | any | `UserHandler.GetMe` |
| PUT | `/users/me/` | ✅ | any | `UserHandler.UpdateMe` |
| GET | `/users/employees/list` | ✅ | sudoer | `UserHandler.GetAllEmployee` |
| GET | `/users/employees/:id` | ✅ | sudoer | `UserHandler.GetEmployee` |
| POST | `/users/employees/create` | ✅ | manager (+ sudoer/admin bypass) | `UserHandler.CreateEmployee` |
| PUT | `/users/employees/:id` | ✅ | manager (+ sudoer/admin bypass) | `UserHandler.UpdateEmployee` |
| DELETE | `/users/employees/:id` | ✅ | manager (+ sudoer/admin bypass) | `UserHandler.DeleteEmployee` |

## Companies

| Method | Path | Auth | Roles |
| ------ | ---- | ---- | ----- |
| GET | `/company/management/` | ✅ | sudoer |
| GET | `/company/management/:id` | ✅ | sudoer |
| POST | `/company/management/` | ✅ | sudoer |
| PUT | `/company/management/:id` | ✅ | sudoer |
| DELETE | `/company/management/:id` | ✅ | sudoer |

## Projects

| Method | Path | Auth | Roles |
| ------ | ---- | ---- | ----- |
| GET | `/projects` | ✅ | any |
| GET | `/projects/:id` | ✅ | any |
| POST | `/projects` | ✅ | manager, engineering_head |
| PUT | `/projects/:id` | ✅ | manager, engineering_head |
| DELETE | `/projects/:id` | ✅ | manager, engineering_head |

Query params: `page`, `limit`, `status`, `search`.

## Contractors

| Method | Path | Auth | Roles |
| ------ | ---- | ---- | ----- |
| GET/POST | `/contractors` | ✅ | any |
| GET/PUT/DELETE | `/contractors/:id` | ✅ | any |

Query params: `page`, `limit`, `search`.

## Contracts

| Method | Path | Auth | Roles | Notes |
| ------ | ---- | ---- | ----- | ----- |
| GET | `/contracts` | ✅ | head roles | `page`, `limit`, `project_id`, `search` |
| GET | `/contracts/:id` | ✅ | head roles | |
| POST | `/contracts` | ✅ | head roles | |
| PUT | `/contracts/:id` | ✅ | head roles | |
| DELETE | `/contracts/:id` | ✅ | head roles | |
| GET | `/contracts/:id/line-items` | ✅ | head roles | |
| POST | `/contracts/:id/line-items` | ✅ | head roles | |
| PUT | `/contracts/:id/line-items/:itemId` | ✅ | head roles | |
| DELETE | `/contracts/:id/line-items/:itemId` | ✅ | head roles | |
| POST | `/contracts/:id/transition` | ✅ | head roles | body: `{ action, comment }` |
| GET | `/contracts/:id/approvals` | ✅ | head roles | returns `[]ApprovalEvent` |
| GET | `/contracts/:id/attachments` | ✅ | head roles | |
| POST | `/contracts/:id/attachments` | ✅ | head roles | multipart, field `document_type` |

Head roles: `manager`, `engineering_head`, `finance_head`, `juridical_head` (+ sudoer/admin bypass).

### Transition Actions

| Action | Valid From | Required Role |
| ------ | ---------- | ------------- |
| `submit` | `draft` | any head role |
| `approve` | `pending_*` | stage-specific role |
| `reject` | `pending_*` | stage-specific role |
| `sign` | `ready_to_print` | `manager` |
| `cancel` | any | `manager` |

→ [[flows/Contract Approval Workflow]]

## Statements

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/contracts/:contractId/statements` | ✅ | create |
| GET | `/contracts/:contractId/statements` | ✅ | list |
| GET | `/statements/:id` | ✅ | full detail |
| PUT | `/statements/:id/works-done` | ✅ | replace work items, triggers Recompute() |
| POST | `/statements/:id/extra-works` | ✅ | add extra work |
| DELETE | `/statements/:id/extra-works/:ewId` | ✅ | |
| GET | `/statements/:id/deductions` | ✅ | |
| POST | `/statements/:id/deductions` | ✅ | |
| PUT | `/statements/:id/deductions/:did` | ✅ | |
| DELETE | `/statements/:id/deductions/:did` | ✅ | |
| PATCH | `/statements/:id/transition` | ✅ | advance/reject approval state |
| DELETE | `/statements/:id` | ✅ | draft only |
| GET | `/statements/:id/report` | ✅ | streams Excel (`application/vnd.openxmlformats…`) |

## Attachments

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| DELETE | `/attachments/:id` | ✅ | head roles only |

## Static Files

`GET /files-storage/**` — served directly from `../storage/` on disk. No auth (public URL).

→ [[RBAC]], [[backend/Attachment Service]]
