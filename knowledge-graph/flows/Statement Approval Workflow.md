---
tags: [flow, approval, state-machine]
updated: 2026-06-15
---

# Statement Approval Workflow

5-stage linear state machine on [[models/InterimStatement]].  
Transition endpoint: `PATCH /statements/:id/transition` → `StatementHandler.Transition` → `StatementService.Transition`.

## State Diagram

```
        ┌──────────────────────────────────────────────────┐
        │              rejected (from any stage)           │
        └──────────────────────────────────────────────────┘
             ↑              ↑              ↑             ↑
draft → submitted → finance_review → pm_review → director_review → approved
```

## Transition Rules

| From | To | Roles allowed |
|------|----|--------------|
| `draft` | `submitted` | any authenticated |
| `submitted` | `finance_review` | finance_head, finance, manager, admin |
| `finance_review` | `pm_review` | manager, engineering_head, admin |
| `pm_review` | `director_review` | manager, admin |
| `director_review` | `approved` | manager, admin |
| any (except approved) | `rejected` | any authenticated (comment required) |

_Note: exact role rules are in `StatementService.Transition` — verify against current code if adding new roles._

## Request Body

```json
{ "status": "finance_review", "comment": "optional, required for rejected" }
```

`comment` is **required** when `to_status = "rejected"` (service returns 400 if empty).

## Side Effects

1. Statement `status` field updated atomically with `ApprovalEvent` insert (single transaction).
2. `ApprovalEvent` created: `entity_type="interim_statement"`, `entity_id=stmt.id`, `actor_id=claims.UserID`.
3. On `approved`: FX rate snapshot locked (future implementation: snapshot `fx_rate` + `fx_rate_date`).

## Audit Trail

All transitions are appended to [[models/ApprovalEvent]]. Read via:
```
GET /statements/:id  → stmt.approval_events (preloaded)
```
or query `approval_events WHERE entity_type='interim_statement' AND entity_id=?` directly.

## Persian Status Labels (UI)

| Status | Label |
|--------|-------|
| `draft` | پیش‌نویس |
| `submitted` | ارسال شده |
| `finance_review` | بررسی مالی |
| `pm_review` | بررسی مدیر پروژه |
| `director_review` | بررسی مدیر ارشد |
| `approved` | تأیید شده |
| `rejected` | رد شده |

Rendered by `StatusBadge` component in frontend.
