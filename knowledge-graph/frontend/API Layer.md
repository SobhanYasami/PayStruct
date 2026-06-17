---
tags: [frontend, api]
updated: 2026-06-15
---

# Frontend API Layer

All API calls go through `src/lib/api/client.ts` → typed wrappers in `src/lib/api/*.ts`.

## `client.ts` — `apiFetch`

```ts
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T>
```

- Base URL: `NEXT_PUBLIC_API_URL` env (e.g. `http://localhost:5000/api/v1`)
- Injects `Authorization: Bearer <token>` from Zustand auth store
- Sets `Content-Type: application/json` unless body is `FormData` (lets browser set multipart boundary)
- Throws `ApiError` on non-2xx: `{ title, detail, status }` (parsed from response body)

## Per-Resource Modules

| File | Export | Key methods |
|------|--------|-------------|
| `auth.ts` | `authApi` | `signin(email, password)` |
| `projects.ts` | `projectsApi` | `list(page, limit, status?, search?)`, `get(id)`, `create(req)`, `update(id, req)`, `delete(id)` |
| `contractors.ts` | `contractorsApi` | `list(page, limit, search?)`, CRUD |
| `contracts.ts` | `contractsApi` | `list(page, limit, projectId?, search?)`, CRUD, `listLineItems`, `createLineItem`, `updateLineItem`, `deleteLineItem`, `listAttachments`, `uploadAttachment`, `deleteAttachment` |
| `interim-statements.ts` | `statementsApi` | `create(contractId, req)`, `list(contractId)`, `get(id)`, `setWorksDone(id, req)`, `addExtraWork(id, req)`, `deleteExtraWork(id, ewId)`, `listDeductions(id)`, `addDeduction(id, req)`, `updateDeduction(id, did, req)`, `deleteDeduction(id, did)`, `transition(id, req)`, `delete(id)` |
| `companies.ts` | `companiesApi` | CRUD |
| `employees.ts` | `employeesApi` | CRUD |

## Response Envelope Types

```ts
interface Envelope<T>          { status: string; data: T; message: string }
interface ListPayload<T>        { data: T[]; total: number; page: number; limit: number }
// List responses: Envelope<ListPayload<T>>
// Single responses: Envelope<T>
```

## Query Key Conventions

| Resource | Key shape |
|----------|-----------|
| Projects list | `["projects", page, search, status]` |
| Project detail | `["project", id]` |
| Contracts list (global) | `["contracts", page, search]` |
| Contracts list (per project) | `["contracts", projectId]` |
| Contract detail | `["contract", id]` |
| Statements list | `["statements", contractId]` |
| Statement detail | `["statement", id]` |
| Attachments | `["attachments", contractId]` |
| Contractors search | `["contractors-search", query]` |
| Projects active search | `["projects-active-search", query]` |

Invalidation: `qc.invalidateQueries({ queryKey: ["contracts"] })` — prefix match, hits all keys starting with `"contracts"`.

## `ApiError`

```ts
class ApiError extends Error {
  title: string
  detail: string
  status: number
}
```

Toast error pattern: `e instanceof ApiError ? e.detail || e.title : "خطا"`
