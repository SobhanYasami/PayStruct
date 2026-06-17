---
tags: [model, entity]
updated: 2026-06-15
---

# ApprovalEvent

Table: `approval_events`  
File: `backend/internal/models/approval.go`

Immutable audit record of every status transition on any approvable entity.  
No `BaseModel` embed — approval events are never soft-deleted.

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID v7 | PK, generated in BeforeCreate hook |
| `entity_type` | varchar(64) | e.g. `"interim_statement"` |
| `entity_id` | UUID | FK to the entity (not enforced at DB level — polymorphic) |
| `actor_id` | UUID | FK to Employee who triggered the transition |
| `from_status` | varchar(32) | previous status value |
| `to_status` | varchar(32) | new status value |
| `comment` | text | required for `rejected` transitions |
| `created_at` | time | indexed; immutable after insert |

## Usage

Currently used for [[models/InterimStatement]] transitions only (`entity_type = "interim_statement"`).  
Design supports future use for Contract or Project status changes.

## Querying

```sql
SELECT * FROM approval_events
WHERE entity_type = 'interim_statement' AND entity_id = $1
ORDER BY created_at ASC;
```

Frontend exposes this as the "approval trail" on the statement detail page.  
→ [[flows/Statement Approval Workflow]]
