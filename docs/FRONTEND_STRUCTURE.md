# Frontend Structure

Next.js 16 App Router · React 19 · TypeScript 5 · Tailwind v4 · pnpm

---

## Routing

App Router file-system routing under `src/app/`. Two route groups (parenthesized — no URL segment):

```
src/app/
├── layout.tsx                   Root layout: QueryProvider, Vazirmatn font, globals
├── page.tsx                     / → redirect to /dashboard (or /login if unauthenticated)
├── (auth)/
│   └── login/
│       └── page.tsx             Login form
└── (dashboard)/
    ├── layout.tsx               Authenticated shell: Sidebar + TopBar + main content
    ├── dashboard/page.tsx       Summary cards
    ├── companies/page.tsx       Company list + CRUD
    ├── employees/page.tsx       Employee list + CRUD
    ├── projects/
    │   ├── page.tsx             Project list
    │   └── [id]/
    │       ├── page.tsx         Project detail + contract list
    │       └── contracts/
    │           └── [cid]/
    │               └── page.tsx Contract accessed via project context
    ├── contracts/
    │   ├── page.tsx             All contracts (cross-project)
    │   └── [id]/
    │       ├── page.tsx         Contract detail + statement list
    │       └── statements/
    │           └── [sid]/
    │               └── page.tsx Statement editor (4 tabs)
    ├── contractors/page.tsx     Contractor registry
    ├── consultants/page.tsx     Consultant registry
    └── reports/page.tsx         Report download
```

All pages under `(dashboard)/` are Client Components (`"use client"`) — they use TanStack Query hooks and Zustand. `(dashboard)/layout.tsx` checks `useAuthStore` on mount and redirects to `/login` if `token === null`.

---

## Authentication Flow

```
User submits login form
  → authApi.login(email, password)
  → POST /api/v1/users/auth/signin
  → { token, user }
  → useAuthStore.setToken(token, user)
      ├── Zustand persist → localStorage key "auth"
      └── document.cookie = "auth_token=...; SameSite=Lax; max-age=86400"
  → router.push("/dashboard")

On any 401 response from apiFetch:
  → useAuthStore.logout()
      ├── Clears localStorage "auth"
      └── Clears cookie "auth_token"
  → window.location.href = "/login"
```

The JWT is stored in **localStorage** (via Zustand `persist` middleware) — not in an HttpOnly cookie. The cookie mirror (`auth_token`) exists for future Next.js middleware-level auth checks but is not used by the current middleware.

---

## API Layer (`src/lib/api/`)

One file per resource. All files export a typed object:

```typescript
// Pattern used across all resource files
export const contractsApi = {
  list: (params) => apiFetch<Envelope<ListPayload<Contract>>>(`/contracts?...`),
  get:  (id)     => apiFetch<Envelope<Contract>>(`/contracts/${id}`),
  create: (payload) => apiFetch<Envelope<Contract>>(`/contracts`, { method: "POST", body: JSON.stringify(payload) }),
  // ...
};
```

`apiFetch` (`src/lib/api/client.ts`):
- Reads `NEXT_PUBLIC_API_URL` at runtime (falls back to `http://localhost:5000/api/v1`).
- Attaches `Authorization: Bearer <token>` from `useAuthStore.getState().token`.
- Omits `Content-Type: application/json` for `FormData` bodies (multipart uploads).
- Throws `ApiError(status, title, detail)` on non-2xx.
- Auto-logout + redirect on 401.
- Returns `undefined` for 204 / empty body responses.

Resource API files:

| File | Exports | Covers |
|------|---------|--------|
| `auth.ts` | `authApi` | signin |
| `companies.ts` | `companiesApi` | CRUD + sub-company |
| `employees.ts` | `employeesApi` | CRUD + profile |
| `projects.ts` | `projectsApi` | CRUD |
| `contractors.ts` | `contractorsApi` | CRUD |
| `consultants.ts` | `consultantsApi` | CRUD |
| `contracts.ts` | `contractsApi` | CRUD, line items, transition, approvals, attachments |
| `interim-statements.ts` | `statementsApi` | Full statement CRUD, works-done, extra works, deductions, transition, report download |

---

## State Management

### Server State — TanStack Query v5

All remote data lives in TanStack Query. The `QueryProvider` wraps the entire app in `app/layout.tsx`:

```tsx
// src/components/providers/QueryProvider.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
export function QueryProvider({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

Query key conventions (implicit — not factored into a key factory yet):

```typescript
useQuery({ queryKey: ["contracts", contractId], queryFn: () => contractsApi.get(contractId) })
useQuery({ queryKey: ["statements", contractId], queryFn: () => statementsApi.list(contractId) })
useQuery({ queryKey: ["statement", sid], queryFn: () => statementsApi.get(sid) })
```

After mutations, `queryClient.invalidateQueries({ queryKey: [...] })` is called in `onSuccess` callbacks.

### Client State — Zustand v5

Only one store: `useAuthStore` (`src/lib/stores/auth.ts`).

```typescript
interface AuthState {
  token: string | null;
  user: AuthUser | null;  // { id, companyId, rootCompanyId, roles, name }
  setToken: (token, user) => void;
  logout: () => void;
}
```

Persisted via `zustand/middleware`'s `persist` to `localStorage` key `"auth"`. No `immer` middleware — state is flat.

---

## Components

### Layout (`src/components/layout/`)

| Component | Description |
|-----------|-------------|
| `Sidebar.tsx` | Left navigation. Links: Dashboard, Projects, Contracts, Contractors, Consultants, Companies, Employees, Reports. Active state via `usePathname()`. RTL layout. |
| `TopBar.tsx` | Top header with current user name (`useAuthStore`) and logout button. |

### Domain (`src/components/domain/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `StatusBadge` | `status: string` | Color-coded pill for contract/statement status. |
| `FinancialSummary` | `statement: InterimStatement, contract: Contract` | Net payable waterfall: gross → deductions → net. Contract-type aware (cost_plus vs others). |
| `CreateContractSheet` | `projectId, onSuccess` | Slide-over form for new contract creation. `react-hook-form` + `zod`. |
| `CompanyCombobox` | `value, onChange` | Searchable async dropdown for company selection. |
| `ConfirmDialog` | `open, onConfirm, message` | Generic delete confirmation dialog. |
| `DocumentViewer` | `url, mimeType` | Inline document preview (dispatches to `PDFViewer` or `<img>`). |
| `PDFViewer` | `url` | Renders PDF via `<iframe>` (Chrome's native PDF viewer). |

### UI Primitives (`src/components/ui/`)

| Component | Description |
|-----------|-------------|
| `DataTable` | Generic sortable/filterable table. Accepts `columns` + `data`. |
| `PersianDatePicker` | Wraps `react-multi-date-picker` with Jalali calendar + Persian locale. |
| `Sheet` | Slide-over panel (wraps `@radix-ui/react-dialog` as a side sheet). |

Additional Radix-based primitives (Button, Input, Label, Select, Separator, Tabs, Toast) come from shadcn/ui and live directly in `components/ui/` as generated source files.

---

## Key Pages

### Statement Detail (`contracts/[id]/statements/[sid]/page.tsx`)

The most complex page. Loads the statement and its parent contract, then renders 4 tabs:

| Tab | Shown for | Description |
|-----|-----------|-------------|
| **کارهای انجام شده** (Works Done) | `lump_sum`, `unit_rate` | WBS grid. Editable `quantity_done` inputs per BOQ line. Submits via `statementsApi.setWorksDone()`. Hidden for `cost_plus`. |
| **کارهای اضافه / هزینه‌های واقعی** (Extra / Actual Costs) | all | Extra work items for `lump_sum`/`unit_rate`; actual cost records for `cost_plus`. Add/delete. |
| **کسورات** (Deductions) | all | Read-only computed deductions (retention, advance, VAT, social security, LD) + user-managed misc deductions. |
| **خلاصه مالی** (Financial Summary) | all | `FinancialSummary` component showing the full net payable waterfall. |

Edit header (gear icon ⚙) — only visible when `status = draft`. Opens a Sheet to edit `period_start`, `period_end`, `issued_on`, `notes` via `statementsApi.update()`.

Transition buttons rendered per a `TRANSITIONS` map keyed by `status`. Each button checks the caller's `user.roles` before rendering.

### Contract Detail (`contracts/[id]/page.tsx`)

Shows contract metadata, WBS line items (read-only grid), statement list (paginated), and attachments. "New Statement" button is gated on `contract.status === "active"`. Contract approval transition buttons are rendered per role.

---

## Forms

All forms use `react-hook-form` + `zod`:

```typescript
const schema = z.object({
  period_start: z.string().min(1, "Required"),
  period_end: z.string().min(1, "Required"),
  issued_on: z.string().min(1, "Required"),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;
const form = useForm<FormData>({ resolver: zodResolver(schema) });
```

Date fields use native `<input type="date">` for ISO YYYY-MM-DD output. Persian date display uses `PersianDatePicker` where user-facing date entry is required.

---

## Utilities (`src/lib/utils/`)

| File | Exports | Description |
|------|---------|-------------|
| `cn.ts` | `cn(...inputs)` | `clsx` + `tailwind-merge` for conditional class names |
| `date.ts` | `formatDate(date)`, `toJalali(date)` | ISO date formatting; Jalali (Shamsi) conversion via `react-date-object` |
| `money.ts` | `formatMoney(amount, currency?)` | Formats `decimal.Decimal`-serialized strings in Persian locale with Rial/Toman suffix |

---

## Non-Obvious Behavior

### Stale session redirect

`apiFetch` calls `useAuthStore.getState().logout()` and redirects to `/login` on any 401. This is triggered when the API's DB-principal check fails (e.g. after `RESET_DB=true` on the backend), not just when the JWT expires.

### Token dual-storage

`useAuthStore.setToken()` writes to both `localStorage` (Zustand persist) and a `SameSite=Lax` cookie. The cookie is not HttpOnly and exists so the Next.js middleware (if added later) can read auth state without JavaScript access. Current implementation does not use middleware-level auth.

### Financial display vs. storage

All financial amounts come from the API as strings (JSON serialization of `shopspring/decimal`). Use `new Decimal(str)` from `decimal.js` for client-side arithmetic, and `formatMoney(str)` for display. Never parse with `parseFloat` — it loses precision on large Iranian Rial amounts.

### RTL layout

The app is right-to-left. `globals.css` sets `dir="rtl"` and `font-family: Vazirmatn`. All layout components use `flex-row-reverse` / `text-right` conventions. Tailwind's `rtl:` variant is used for directional overrides.

### `output: "standalone"` build

`next.config.ts` sets `output: "standalone"`. The production build generates a self-contained `server.js` in `.next/standalone/` with only runtime dependencies — no `node_modules` needed in the deployed image. See `SELF_HOSTING.md` for the Dockerfile pattern.
