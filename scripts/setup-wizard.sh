#!/usr/bin/env bash
# ==============================================================================
# RideEat SOA 2.0 - Interactive Setup Wizard (Bash for Linux / macOS / WSL)
# Generated following the /wizard skill specification.
# ==============================================================================

set -euo pipefail

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

TOTAL_STAGES=5
_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"

_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1 && tput clear 2>/dev/null; then return 0; fi
  printf '\033[2J\033[3J\033[H'
}

banner() {
  _clear
  printf '\n%s%s  🚗🍜 RIDEEAT SOA 2.0 - ENTERPRISE SETUP WIZARD%s\n' "$BOLD" "$GREEN" "$RESET"
  printf '%s  Guided execution across %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '  This wizard guides you through environment verification, Docker\n'
  printf '  multi-service startup, automated tests, and live web access.\n\n'
  pause "Press Enter to start setup..."
}

stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

say()  { printf '  %s\n' "$1"; }
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }
ok()   { printf '  %s✓ %s%s\n' "$GREEN" "$1" "$RESET"; }

open_url() {
  local url="$1"
  printf '  %s↗ Opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview      >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open     >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open         >/dev/null 2>&1; then open "$url"
    else false; fi
  } >/dev/null 2>&1 || warn "Could not open browser automatically, please visit: $url"
}

pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES
# ──────────────────────────────────────────────────────────────────────────

banner

# Stage 1: Check System Environment
stage "System Environment & Dependency Verification"
step "Checking required tools: Python, Docker, Node.js, Git..."

if command -v python3 >/dev/null 2>&1; then
  ok "Python 3: $(python3 --version)"
elif command -v python >/dev/null 2>&1; then
  ok "Python: $(python --version)"
else
  warn "Python is not installed. Recommended: Python 3.11+"
fi

if command -v docker >/dev/null 2>&1; then
  ok "Docker: $(docker --version)"
else
  warn "Docker is not installed or not in PATH."
fi

if command -v node >/dev/null 2>&1; then
  ok "Node.js: $(node --version)"
else
  warn "Node.js is not installed. Recommended: Node.js 18+"
fi

if command -v git >/dev/null 2>&1; then
  ok "Git: $(git --version)"
else
  warn "Git is not installed."
fi

pause "Environment check completed. Press Enter to proceed to Stage 2..."

# Stage 2: Environment File Preparation
stage "Environment Configuration (.env)"
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f ".env.example" ]]; then
    step "Creating .env from .env.example..."
    cp .env.example .env
    ok "Created .env configuration file."
  else
    warn ".env.example not found. Creating minimal .env file..."
    cat <<EOF > .env
POSTGRES_USER=rideeat
POSTGRES_PASSWORD=rideeat_secret_pwd
POSTGRES_DB=rideeat_db
JWT_SECRET_KEY=rideeat-super-secret-jwt-key-2026-soa-enterprise
EOF
    ok "Minimal .env file created."
  fi
else
  ok ".env configuration file already exists."
fi

pause "Press Enter to proceed to Stage 3..."

# Stage 3: Docker Multi-Service Startup
stage "Docker Multi-Service Orchestration"
say "RideEat comprises 9 microservices, PostgreSQL, Redis, Kafka KRaft and Web Admin."
if confirm "Do you want to start all services via Docker Compose now?"; then
  step "Running docker compose up -d --build..."
  docker compose up -d --build
  ok "All containers launched successfully!"
  say "Access points:"
  say "  • Web Admin Super-App : http://localhost:3000"
  say "  • API Gateway         : http://localhost:8080"
  say "  • Prometheus Metrics  : http://localhost:9090"
  say "  • Grafana Dashboard   : http://localhost:3001"
else
  note "Skipped Docker container startup. You can run 'docker compose up -d' later."
fi

pause "Press Enter to proceed to Stage 4..."

# Stage 4: Run OOP Core & Architectural Test Suite
stage "OOP Core & Architectural Verification (31 Tests)"
step "Executing full automated verification suite..."
if command -v python3 >/dev/null 2>&1; then
  PY_CMD="python3"
else
  PY_CMD="python"
fi

$PY_CMD tests/test_oop_core.py -v
ok "Architectural test suite passed 100%!"

pause "Press Enter to proceed to Stage 5..."

# Stage 5: Live Super-App Web Access
stage "Live Web Application & Postman Collection"
say "The RideEat Super-App is continuously deployed and live on GitHub Pages."
if confirm "Open the live Super-App in your browser now?"; then
  open_url "https://2006phu.github.io/rideeat-soa/"
fi

say ""
ok "RideEat SOA Setup Wizard completed successfully!"
say "For Postman API testing, import: postman/rideeat-collection.json"
say "Have a wonderful day!"
