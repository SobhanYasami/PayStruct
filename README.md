

## Run the application with reseting db:
RESET_DB=true go run ./cmd/api



## Runnig application using docker-compose

Done. File layout:

```bash
.
├── .env.example
├── docker-compose.yml          # base (shared)
├── docker-compose.dev.yml      # dev overlay
├── docker-compose.prod.yml     # prod overlay
├── backend/
│   ├── Dockerfile              # multi-stage prod build
│   ├── Dockerfile.dev          # go image + deps only (source mounted)
│   └── .dockerignore
└── frontend/
    ├── Dockerfile              # multi-stage standalone build
    ├── Dockerfile.dev          # node image + deps only (source mounted)
    └── .dockerignore
```

## Usage:
```bash
cp .env.example .env
# fill in JWT_SECRET at minimum

# dev — RESET_DB=true, DEBUG=true, source volumes mounted, go run / pnpm dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# prod — compiled binaries, no reset, resource limits
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Key decisions:

### Dev:
source dirs bind-mounted into containers that have only the toolchain + deps; go run ./cmd/api picks up edits on manual restart, pnpm dev has Turbopack HMR

### Prod:
Go binary in alpine:3.21 (~15MB image), Next.js standalone output (no node_modules in runner, ~100MB image)

### JWT_SECRET uses :? — compose will refuse to start without it set

RESET_DB never defaults to true in base; only the dev overlay forces it
DB port only exposed externally in dev overlay — in prod it stays internal to the compose network