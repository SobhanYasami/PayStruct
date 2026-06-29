---
tags: [index, map-of-content]
updated: 2026-06-20
---

# FinManager — Knowledge Graph

Contractor financial management system. Persian-first UI (RTL, Jalali dates, fa-IR numerals).

## System at a Glance

```
Browser (Next.js 16 App Router, RTL)
    ↕  REST JSON  /api/v1/…
Go Fiber v2 + GORM
    ↕  GORM queries
PostgreSQL
    ↕  disk
../storage/  (static files via /files-storage)
```

---

## Navigation

### Architecture
- [[Architecture]] — stack, layers, request lifecycle
- [[API Routes]] — full endpoint surface
- [[RBAC]] — roles, middleware gates, frontend guards

### Data Model
- [[Data Model]] — ER overview with relationship types
- [[models/Company]]
- [[models/Employee]]
- [[models/Project]]
- [[models/Contractor]]
- [[models/Contract]]
- [[models/InterimStatement]]
- [[models/ApprovalEvent]]
- [[models/Attachment]]

### Business Flows
- [[flows/Statement Approval Workflow]] — 5-stage state machine
- [[flows/Contract Approval Workflow]] — 5-stage contract sign-off state machine
- [[flows/Financial Calculations]] — how net_amount is derived
- [[flows/Report Generation]] — Excel statement export (Persian)
- [[flows/Contract Creation]] — multi-step wizard, WBS, file upload

### Backend
- [[backend/Backend Overview]]
- [[backend/Auth & JWT]]
- [[backend/Attachment Service]]
- [[backend/Mock Data Seeder]] — test fixture script, company hierarchy, position→role mapping

### Frontend
- [[frontend/Frontend Overview]]
- [[frontend/Pages]]
- [[frontend/Components]]
- [[frontend/API Layer]]
- [[frontend/State Management]]
