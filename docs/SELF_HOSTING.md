# Self-Hosting Guide

This guide produces a running ContractLedger instance from a clean Linux host. Every command block is idempotent — re-running after a partial failure is safe.

---

## Environment Variables

All configuration is injected via environment variables. Copy `.env.example` to `.env` and edit before starting any service.

### Server

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SERVER_PORT` | `5000` | No | TCP port the Fiber API listens on |
| `BASE_URL` | `http://localhost:5000` | No | Public base URL for the API (used in attachment download URLs) |
| `DEBUG` | `false` | No | Enables Fiber request logger and verbose error bodies. **Never `true` in production.** |

### Database

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_HOST` | `localhost` | Yes | PostgreSQL host |
| `DATABASE_PORT` | `5432` | Yes | PostgreSQL port |
| `DATABASE_USER` | `ctuser` | Yes | Database user |
| `DATABASE_PASSWORD` | `changeme` | Yes | Database password |
| `DATABASE_NAME` | `ctdatabase` | Yes | Database name |

The API connects via `pgx/v5` through GORM. SSL mode is hardcoded to `disable`; set up a TLS-terminating proxy (Nginx/Caddy) in front if you need encrypted transport.

### Authentication

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `JWT_SECRET` | — | **Yes** | HMAC-SHA256 signing key. Generate with `openssl rand -hex 32`. Rotating this key invalidates all active sessions. |
| `JWT_ISSUER` | `ContractLedger` | No | JWT `iss` claim |
| `JWT_AUDIENCE` | `contractledger_users` | No | JWT `aud` claim |
| `JWT_EXPIRATION_HOURS` | `24` | No | Token TTL in hours |

### Application

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `STORAGE_ROOT` | `../storage` | No | Filesystem path where uploaded attachments are written. Must be writable by the API process. |
| `RESET_DB` | `false` | No | When `true`, drops and recreates the `public` schema on startup. **Never set in production.** |

### Bootstrap (first-run only)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `BOOTSTRAP_USERNAME` | `admin@system.local` | No | Email of the initial sudoer account |
| `BOOTSTRAP_PASSWORD` | `changeme` | No | Password of the initial sudoer account. **Change on first login.** |

The seeder runs on every startup but is a no-op if any `sudoer`-role employee already exists.

### Frontend

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` | Yes | Full URL of the API v1 base. Must be reachable from the browser (not just the container). |

---

## Option A — Docker Compose (PostgreSQL only, processes native)

The repository ships a `docker-compose.yml` at the root that starts only PostgreSQL. The API and frontend run as native processes.

```bash
# 1. Clone
git clone <repo-url> && cd contractledger
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and DATABASE_PASSWORD

# 2. Start PostgreSQL
docker compose up -d
# Verify
docker compose ps   # Status should be "healthy"

# 3. Build and run the API
cd backend
go build -o bin/api ./cmd/api
./bin/api
# First run: AutoMigrates all tables, installs FK constraints, seeds sudoer.

# 4. Build the frontend
cd ../frontend
pnpm install --frozen-lockfile
pnpm build
# next.config.ts sets output: "standalone" — run with:
node .next/standalone/server.js
```

---

## Option B — Manual Dockerfiles (no pre-built images yet)

No Dockerfiles are committed to the repository. If you want to containerize:

### Backend Dockerfile (reference)

```dockerfile
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /api ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=builder /api /api
EXPOSE 5000
ENTRYPOINT ["/api"]
```

Place in `backend/Dockerfile`. Build:

```bash
docker build -t contractledger-api:latest ./backend
```

### Frontend Dockerfile (reference)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Place in `frontend/Dockerfile`.

### Full Compose (with containers)

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
      POSTGRES_DB: ${DATABASE_NAME}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER}"]
      interval: 5s
      retries: 10

  api:
    build: ./backend
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_HOST: db
    depends_on:
      db: { condition: service_healthy }
    ports:
      - "${SERVER_PORT:-5000}:5000"
    volumes:
      - storage_data:/storage
    environment:
      STORAGE_ROOT: /storage

  frontend:
    build: ./frontend
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: http://api:5000/api/v1
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  db_data:
  storage_data:
```

---

## PostgreSQL Initial Setup (manual, no Docker)

```sql
-- Run as postgres superuser
CREATE USER ctuser WITH PASSWORD 'changeme';
CREATE DATABASE ctdatabase OWNER ctuser;
GRANT ALL PRIVILEGES ON DATABASE ctdatabase TO ctuser;
```

The API creates all tables on startup via `model.AutoMigrate` — no separate migration runner needed.

---

## Reverse Proxy

### Nginx

Route `/api/` → Fiber, everything else → Next.js:

```nginx
server {
    listen 80;
    server_name your.domain.com;

    # Redirect HTTP → HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your.domain.com;

    ssl_certificate     /etc/ssl/certs/your.domain.com.crt;
    ssl_certificate_key /etc/ssl/private/your.domain.com.key;

    client_max_body_size 55M;   # Match API body limit (50 MB + headroom)

    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /files-storage/ {
        proxy_pass http://127.0.0.1:5000;
    }

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }
}
```

### Caddy

```caddy
your.domain.com {
    handle /api/* {
        reverse_proxy localhost:5000
    }
    handle /files-storage/* {
        reverse_proxy localhost:5000
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

Set `BASE_URL=https://your.domain.com` in `.env` so attachment download URLs are correct.

---

## Troubleshooting FAQ

### API fails with "JWT_SECRET is not set"

`JWT_SECRET` must be non-empty. The binary reads `.env` via `godotenv` from the working directory's parent (`../`). Run the binary from `backend/`, or set the variable in the environment directly.

### "failed to connect to database after 3 attempts"

- Check `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`.
- When running inside Docker and the DB is a separate container: `DATABASE_HOST` must be the service name (`db`), not `localhost`.
- The API retries 3 times with a 5-second delay. If PostgreSQL is slow to start (e.g. volume initialization), start the API after `docker compose ps` shows the DB as healthy.

### "migration failed: ..."

A schema mismatch from a previous version. In development: set `RESET_DB=true` for one run, then unset it. In production: investigate the specific constraint/index failure — most `MigrateIndexes` statements are guarded with `IF NOT EXISTS`.

### Port already in use

```bash
./app-up.sh api kill   # kills the PID bound to SERVER_PORT
./app-up.sh api up
```

### Frontend shows "Network Error" / API calls fail

`NEXT_PUBLIC_API_URL` is embedded at **build time** by Next.js. If you change it after `pnpm build`, you must rebuild. In development (`pnpm dev`) it is read at request time from `.env.local`.

### Uploaded files return 404

The API serves the `storage/` directory as static files at `/files-storage/`. The path is relative: when `STORAGE_ROOT=../storage` and the binary runs from `backend/`, files are stored at the repo root's `storage/`. Ensure the same path is accessible if running behind a proxy.

### Stale sessions after DB reset

`RESET_DB=true` drops all tables including `employees`. Any JWT minted against the old employees table will get a `401 — Session is no longer valid` on the next request (the auth middleware checks employee existence in DB). This is expected — log in again with the new bootstrap credentials.
