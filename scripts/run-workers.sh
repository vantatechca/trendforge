#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/workers"

if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip
  .venv/bin/pip install -q -r requirements.txt
fi

# Load env
set -a
[ -f "$ROOT/.env" ] && . "$ROOT/.env"
set +a

mkdir -p logs

echo "==> Starting Celery worker (logs/worker.log)"
.venv/bin/celery -A celery_app worker --loglevel=info --concurrency=2 > logs/worker.log 2>&1 &
echo $! > logs/worker.pid

echo "==> Starting Celery beat (logs/beat.log)"
.venv/bin/celery -A celery_app beat --loglevel=info > logs/beat.log 2>&1 &
echo $! > logs/beat.pid

echo "==> Starting FastAPI control plane on :8842 (logs/api.log)"
.venv/bin/uvicorn api:app --host 0.0.0.0 --port 8842 > logs/api.log 2>&1 &
echo $! > logs/api.pid

echo "==> Workers started. Stop with: bash scripts/stop-workers.sh"
