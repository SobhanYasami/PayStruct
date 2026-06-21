---
tags: [flow, contract, approval, state-machine]
updated: 2026-06-20
---

# Contract Approval Workflow

5-stage sign-off chain before a contract is legally binding. Mirrors the statement approval pattern but with different roles at each gate.

## State Machine

```text
draft
  ──[submit]──▶  pending_engineering   (any head role)
  ──[approve]──▶ pending_finance       (engineering_head)
  ──[approve]──▶ pending_legal         (juridical_head)
  ──[approve]──▶ pending_ceo           (finance_head)
  ──[approve]──▶ ready_to_print        (manager)
  ──[sign]────▶  signed                (manager)

Any pending_* ──[reject]──▶ draft      (current stage's required role)
Any status    ──[cancel]──▶ cancelled  (manager only)
```

## Transition Table

| From | Action | To | Required Role |
| ---- | ------ | -- | ------------- |
| `draft` | `submit` | `pending_engineering` | any head role |
| `pending_engineering` | `approve` | `pending_finance` | `engineering_head` |
| `pending_finance` | `approve` | `pending_legal` | `finance_head` |
| `pending_legal` | `approve` | `pending_ceo` | `juridical_head` |
| `pending_ceo` | `approve` | `ready_to_print` | `manager` |
| `ready_to_print` | `sign` | `signed` | `manager` |
| `pending_*` | `reject` | `draft` | stage's required role |
| any | `cancel` | `cancelled` | `manager` |

## Backend Implementation

File: `backend/internal/services/contracts_service.go`

```go
type contractTransitionRule struct {
    nextStatus   models.ContractStatus
    requiredRole string
}

var contractStateMachine = map[models.ContractStatus]map[string]contractTransitionRule{
    // (currentStatus, action) → (nextStatus, requiredRole)
}
```

`Transition(ctx, contractID, actorID, actorRoles, action, comment)`:
1. Fetch contract, look up `contractStateMachine[current][action]`
2. Check `actorRoles` contains `requiredRole` (or manager/sudoer)
3. DB transaction: `UPDATE contracts SET status = nextStatus` + INSERT `approval_events`
4. Return updated contract

`ListApprovals(ctx, contractID)`: queries `approval_events WHERE entity_type='contract' AND entity_id=contractID`.

### Routes

```
POST /contracts/:id/transition   body: { action, comment }
GET  /contracts/:id/approvals    → []ApprovalEvent
```

Both require head-role auth.

## Audit Trail: ApprovalEvent

Each transition inserts one `approval_events` row:

```
entity_type = "contract"
entity_id   = contract UUID
actor_id    = user UUID
from_status = previous status
to_status   = new status
comment     = optional free-text from approver
```

→ [[models/ApprovalEvent]]

## Frontend — Approval Stepper

File: `app/(dashboard)/contracts/[id]/page.tsx`

Horizontal 5-step chain rendered when `status ∉ {active, closed, cancelled}`.

```
[مهندسی] ── [مالی] ── [حقوقی] ── [مدیریت] ── [امضا]
  done       active     pending    pending      pending
```

Stage state computation:
```ts
function stageState(contractStatus, pendingStatus): "done" | "active" | "pending" {
  const ci = STATUS_ORDER.indexOf(contractStatus);
  const si = STATUS_ORDER.indexOf(pendingStatus);
  if (ci > si) return "done";
  if (ci === si) return "active";
  return "pending";
}
```

Action buttons render only for the **active** stage AND only if `userRoles.includes(stage.role)`. Buttons: تأیید / رد / (sign for last stage) / لغو قرارداد (manager only).

## Editing Lock

After any transition fires, `approvalEvents.length > 0`. Frontend gate:

```ts
const canEdit = contract.status === "draft" && approvalEvents.length === 0;
```

WBS add/edit/delete and document upload/delete are hidden when `canEdit = false`. Even if the contract is rejected back to `draft`, approval history remains non-empty → editing stays locked.

Statement creation gate (separate): `contract.status === "active"`.

→ [[models/Contract]], [[RBAC]], [[API Routes]]
