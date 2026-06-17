---
tags: [frontend, overview]
updated: 2026-06-15
---

# Frontend Overview

Next.js 16 App Router. All interactive pages are `'use client'` components.  
RTL-first: `<html dir="rtl" lang="fa">` on root layout. Tailwind v4.

## Route Structure

```
app/
  page.tsx                              → redirect to /dashboard
  layout.tsx                            → QueryProvider, RTL html attrs
  (auth)/login/page.tsx                 /login
  (dashboard)/                          route group — NOT in URL
    layout.tsx                          Sidebar + TopBar shell
    dashboard/page.tsx                  /dashboard — stats
    projects/
      page.tsx                          /projects — list + CRUD
      [id]/page.tsx                     /projects/:id — detail + contracts tab
        contracts/[cid]/page.tsx        /projects/:id/contracts/:cid
          statements/[sid]/page.tsx     /projects/:id/contracts/:cid/statements/:sid
    contracts/
      page.tsx                          /contracts — global list (head-role guarded)
      [id]/page.tsx                     /contracts/:id — detail + statements tab
        statements/[sid]/page.tsx       /contracts/:id/statements/:sid
    contractors/page.tsx                /contractors — CRUD
    companies/page.tsx                  /companies — admin CRUD
    employees/page.tsx                  /employees — sudoer only
    reports/page.tsx                    /reports — Excel download triggers
```

**Critical**: `(dashboard)` is a route group — segment does NOT appear in URL.  
All internal `router.push()` and `Link href` must use `/projects/…` not `/dashboard/projects/…`.

## Key Libraries

| Library | Version | Use |
|---------|---------|-----|
| TanStack Query | v5 | all server state; `useQuery` + `useMutation` |
| Zustand | v5 | auth store only |
| react-hook-form | v7 | all forms |
| zod | v4 | schema validation (`zodResolver`) |
| react-hot-toast | — | toast notifications |
| pdfjs-dist | — | PDF rendering in DocumentViewer |
| lucide-react | — | icons |

## Data Fetching Pattern

```ts
// Every page:
const { data, isLoading } = useQuery({
  queryKey: ["resource", ...filters],
  queryFn: () => resourceApi.list(...),
});

// Every mutation:
const mutation = useMutation({
  mutationFn: (req) => resourceApi.create(req),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["resource"] });
    toast.success("...");
  },
  onError: (e) => toast.error(e instanceof ApiError ? e.detail || e.title : "خطا"),
});
```

## Persian Formatting Utilities

File: `frontend/src/lib/utils/date.ts`

```ts
toJalali(dateStr?)      // ISO/Date → "۱۴۰۵/۰۳/۲۵"
fmtNum(v, decimals=0)   // number → fa-IR locale string
fmtPct(v, decimals=1)   // number → "۱۰٫۵٪"
fmtMoney(v, currency?)  // number → formatted + optional currency
```

File: `frontend/src/lib/utils/money.ts`

```ts
formatMoney(amount, currency)   // decimal string → fa-IR with currency
bpsToPercent(bps)               // 1000 → "10"
```

→ [[frontend/Pages]], [[frontend/Components]], [[frontend/API Layer]], [[frontend/State Management]]
