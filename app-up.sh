#!/bin/bash

set -euo pipefail

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
API_PORT=5000
FRONTEND_PORT=3000
COMPOSE_PROJECT_NAME="baygane-man"

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"; }

port_in_use() {
    local port="$1"
    if command -v ss &>/dev/null; then
        ss -tln | grep -q ":$port "
    elif command -v netstat &>/dev/null; then
        netstat -tln | grep -q ":$port "
    else
        log "ERROR: neither ss nor netstat found – cannot check ports"
        return 2
    fi
}

kill_port() {
    local port="$1"
    local pid

    if command -v lsof &>/dev/null; then
        pid=$(lsof -ti ":$port" 2>/dev/null || true)
    elif command -v fuser &>/dev/null; then
        pid=$(fuser "$port/tcp" 2>/dev/null || true)
    else
        log "ERROR: neither lsof nor fuser found – cannot kill by port"
        return 1
    fi

    if [[ -n "$pid" ]]; then
        log "Killing PID $pid on port $port"
        kill -9 "$pid" 2>/dev/null || true
    else
        log "No process found on port $port"
    fi
}

# Spawn a background process that survives script exit
spawn() {
    (eval "$*") &
    disown
}

# ------------------------------------------------------------
# db
# ------------------------------------------------------------
db_up() {
    log "Checking container stack..."
    if podman-compose ps -q 2>/dev/null | grep -q .; then
        log "Containers already up."
    else
        log "Starting containers: podman-compose up -d"
        podman-compose up -d
        log "Containers started."
    fi
}

db_reset() {
    if port_in_use "$API_PORT"; then
        log "WARNING: API is running on port $API_PORT – consider stopping it first (api kill)"
    fi
    log "Resetting database: RESET_DB=true go run ./cmd/api"
    (cd ./backend && RESET_DB=true go run ./cmd/api)
    log "DB reset complete."
}

# ------------------------------------------------------------
# api
# ------------------------------------------------------------
api_up() {
    if port_in_use "$API_PORT"; then
        log "API already running on port $API_PORT"
        return
    fi
    log "Starting API on port $API_PORT"
    spawn "cd ./backend && go run ./cmd/api"
    sleep 2
    if port_in_use "$API_PORT"; then
        log "API is up."
    else
        log "WARNING: API may have failed to bind port $API_PORT – check logs."
    fi
}

api_kill() {
    log "Stopping API on port $API_PORT"
    kill_port "$API_PORT"
}

api_restart() {
    api_kill
    sleep 1
    api_up
}

# ------------------------------------------------------------
# ui
# ------------------------------------------------------------
ui_up() {
    if port_in_use "$FRONTEND_PORT"; then
        log "Frontend already running on port $FRONTEND_PORT"
        return
    fi
    log "Starting frontend on port $FRONTEND_PORT"
    spawn "cd ./frontend && pnpm dev"
    sleep 2
    if port_in_use "$FRONTEND_PORT"; then
        log "Frontend is up."
    else
        log "WARNING: Frontend may have failed to bind port $FRONTEND_PORT – check logs."
    fi
}

ui_kill() {
    log "Stopping frontend on port $FRONTEND_PORT"
    kill_port "$FRONTEND_PORT"
}

ui_restart() {
    ui_kill
    sleep 1
    ui_up
}

# ------------------------------------------------------------
# Default: ensure everything is up
# ------------------------------------------------------------
ensure_all() {
    db_up
    api_up
    ui_up
}

# ------------------------------------------------------------
# Usage
# ------------------------------------------------------------
usage() {
    cat <<EOF
Usage: $0 [COMPONENT ACTION]

Components and actions:

  db   up       Ensure containers are up (podman-compose up -d)
  db   reset    Reset DB in-process (RESET_DB=true go run ./cmd/)
                WARNING: stop the API first with: $0 api kill

  api  up       Start API if not running                (port $API_PORT)
  api  restart  Kill and restart API
  api  kill     Kill API process

  ui   up       Start frontend if not running           (port $FRONTEND_PORT)
  ui   restart  Kill and restart frontend
  ui   kill     Kill frontend process

  (no args)     Ensure all services are running

EOF
}

# ------------------------------------------------------------
# Dispatch
# ------------------------------------------------------------
COMPONENT="${1:-}"
ACTION="${2:-}"

case "$COMPONENT" in
    db)
        case "$ACTION" in
            up)    db_up    ;;
            reset) db_reset ;;
            *)     log "Unknown db action: '$ACTION'"; usage; exit 1 ;;
        esac
        ;;
    api)
        case "$ACTION" in
            up)      api_up      ;;
            restart) api_restart ;;
            kill)    api_kill    ;;
            *)       log "Unknown api action: '$ACTION'"; usage; exit 1 ;;
        esac
        ;;
    ui)
        case "$ACTION" in
            up)      ui_up      ;;
            restart) ui_restart ;;
            kill)    ui_kill    ;;
            *)       log "Unknown ui action: '$ACTION'"; usage; exit 1 ;;
        esac
        ;;
    ""|--all)
        log "=== Ensuring all services ==="
        ensure_all
        log "=== Done ==="
        ;;
    --help|-h)
        usage
        ;;
    *)
        log "Unknown component: '$COMPONENT'"
        usage
        exit 1
        ;;
esac