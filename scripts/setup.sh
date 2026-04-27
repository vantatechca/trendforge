#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> TrendForge setup"

# Pre-flight
command -v node >/dev/null || { echo "ERR: node not found"; exit 1; }
command -v npm  >/dev/null || { echo "ERR: npm not found"; exit 1; }

# .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> Created .env from .env.example. Edit it with your API keys, then re-run setup."
fi

# Decide infra path
USE_DOCKER=0
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then USE_DOCKER=1; fi
fi

if [ "$USE_DOCKER" -eq 1 ] && [ "${TRENDFORGE_USE_BREW:-0}" != "1" ]; then
  echo "==> Using Docker for db + redis + workers"
  docker compose up -d db redis
  echo "==> Waiting for Postgres..."
  for i in 1 2 3 4 5 6 7 8 9 10; do
    docker compose exec -T db pg_isready -U trendforge && break || sleep 2
  done
else
  echo "==> Using Homebrew services for db + redis"
  brew services start postgresql@17 >/dev/null 2>&1 || true
  brew services start redis >/dev/null 2>&1 || true
  PGB="/opt/homebrew/opt/postgresql@17/bin"
  if [ ! -x "$PGB/psql" ]; then PGB="/usr/local/opt/postgresql@17/bin"; fi
  if "$PGB/psql" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='trendforge'" | grep -q 1; then
    echo "==> Database 'trendforge' exists"
  else
    "$PGB/psql" -d postgres -c "CREATE DATABASE trendforge;" >/dev/null
    echo "==> Created database 'trendforge'"
  fi
  "$PGB/psql" -d trendforge -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null
  echo "==> pgvector enabled"
fi

# Node deps
if [ ! -d node_modules ]; then
  echo "==> Installing npm packages"
  npm install --no-audit --no-fund
fi

echo "==> Generating Prisma client"
npx prisma generate

echo "==> Pushing Prisma schema"
npx prisma db push --accept-data-loss

echo "==> Seeding database"
npm run seed

# Python workers (optional)
if command -v python3 >/dev/null 2>&1; then
  if [ ! -d workers/.venv ]; then
    echo "==> Creating Python venv for workers"
    python3 -m venv workers/.venv
  fi
  echo "==> Installing Python deps"
  workers/.venv/bin/pip install -q --upgrade pip
  workers/.venv/bin/pip install -q -r workers/requirements.txt || echo "(Python deps install warning — workers can still be started manually)"
fi

cat <<EOF

==> Setup complete.

Next steps:
  npm run dev                  # Next.js on http://localhost:4477
  bash scripts/run-workers.sh  # Celery worker + beat + FastAPI on :8842

EOF
