#!/bin/sh

echo "=== Debug: Checking data directory ==="
ls -la /data/ 2>&1 || echo "No /data directory"
ls -la /data/skills/ 2>&1 || echo "No /data/skills directory"
echo "DATA_DIR=$DATA_DIR"

echo "=== Running migrations ==="
alembic upgrade head

echo "=== Running seed ==="
python -m app.seed

echo "=== Starting server ==="
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
