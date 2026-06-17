---
tags: [frontend, state]
updated: 2026-06-15
---

# State Management

## Server State — TanStack Query v5

`QueryClientProvider` wraps the app in `src/components/providers/QueryProvider.tsx`.

All remote data via `useQuery` / `useMutation`. No local caching of API data in Zustand.

**`staleTime`**: Most queries use default (0) — refetch on mount and focus.  
Combobox search queries: `staleTime: 10_000` (10s) to avoid hammering on each keystroke.

## Client State — Zustand v5

File: `src/lib/stores/auth.ts`

```ts
interface AuthState {
  token: string | null
  user: {
    id: string
    companyId: string
    roles: string[]
    name: string
    email: string
  } | null
  setToken(token: string, user: ...): void
  logout(): void
}
```

Persisted to `localStorage` (persist middleware). Hydrated on app load.  
Read in `apiFetch` for Bearer token and in pages for role-based UI guards.

## Form State — react-hook-form

All forms use `useForm<T>({ resolver: zodResolver(schema), defaultValues })`.  
BPS fields use `{ valueAsNumber: true }` register option.  
Comboboxes use `<Controller>` (uncontrolled RHF → controlled component bridge).

## No Global UI State

No global modal/drawer state. Each page manages its own `useState(false)` for sheet open/close.

---

## Data Flow Summary

```
User action (click/type)
  → useState (local: open/close, search, page)
  → useMutation.mutate(req)
  → apiFetch (adds auth header)
  → API response
  → queryClient.invalidateQueries
  → useQuery re-fetches
  → UI re-renders
```
