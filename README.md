# ContractLedger

Persian-language construction contract management platform. Manages the full lifecycle of Iranian construction contracts — from project creation through interim payment certification (صورت وضعیت) — for project owners, contractors, and consulting engineers.

**Stack:** Go 1.24 · Fiber v2 · GORM · PostgreSQL · Next.js 16 (App Router) · React 19 · TanStack Query v5 · Zustand v5 · Tailwind v4

---

## Quick Start (5 steps)

**Prerequisites:** Go ≥ 1.24, Node ≥ 20, pnpm ≥ 9, PostgreSQL ≥ 15 (or Docker/Podman)

```bash
# 1. Clone and configure
git clone <repo-url> && cd contractledger
cp .env.example .env          # Edit DATABASE_*, JWT_SECRET, BOOTSTRAP_*

# 2. Start the database
docker compose up -d           # or: podman-compose up -d
#    Waits for the healthcheck defined in docker-compose.yml

# 3. Start the API  (auto-migrates on first run, seeds the sudoer account)
cd backend && go run ./cmd/api

# 4. Start the frontend  (separate terminal)
cd frontend && pnpm install && pnpm dev

# 5. Log in
# Open http://localhost:3000
# Email:    value of BOOTSTRAP_USERNAME  (default: admin@system.local)
# Password: value of BOOTSTRAP_PASSWORD  (default: changeme  — change immediately)
```

To reset the database (development only):

```bash
cd backend && RESET_DB=true go run ./cmd/api
```

The `app-up.sh` helper script wraps the above for convenience:

```bash
./app-up.sh              # start everything
./app-up.sh api restart  # restart only the API
./app-up.sh db reset     # drop + recreate DB schema
```

---

## Documentation Index

| Document | Audience |
|----------|----------|
| [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) | Ops / self-hosters — production deployment |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Contributors — local dev setup, standards, PR process |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Developers — system design, data flow, design decisions |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Developers — ER diagram, all tables, indexes, hooks |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Developers / integrators — complete REST endpoint reference |
| [docs/FRONTEND_STRUCTURE.md](docs/FRONTEND_STRUCTURE.md) | Frontend developers — routing, state, component structure |

---

## Repository Layout

```
.
├── backend/              Go/Fiber API
│   ├── cmd/api/main.go   Entry point
│   └── internal/
│       ├── config/       Env-based configuration
│       ├── database/     DB connect, AutoMigrate, seed
│       ├── handlers/     Fiber route handlers
│       ├── middlewares/  JWT auth, RBAC
│       ├── models/       GORM models + migration logic
│       ├── routes/       Route group wiring
│       ├── services/     Business logic
│       └── schemas/      JWT claims schema
├── frontend/             Next.js 16 App Router SPA
│   └── src/
│       ├── app/          File-system routes
│       ├── components/   UI + domain components
│       └── lib/          API clients, Zustand stores, utils
├── docker-compose.yml    PostgreSQL service (root — preferred)
├── .env.example          All environment variables with defaults
├── app-up.sh             Dev orchestration helper
└── storage/              Uploaded contract attachments (gitignored)
```
