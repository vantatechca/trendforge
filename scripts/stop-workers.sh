#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/workers"
for p in worker beat api; do
  if [ -f "logs/$p.pid" ]; then
    kill "$(cat logs/$p.pid)" 2>/dev/null && echo "stopped $p" || echo "(no $p running)"
    rm -f "logs/$p.pid"
  fi
done
