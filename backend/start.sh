#!/bin/sh

echo "=== STARTUP DEBUG ==="
echo "DATA_DIR=$DATA_DIR"
echo "PWD=$(pwd)"
echo "--- Listing /data ---"
ls -la /data/ 2>&1
echo "--- Listing /data/skills ---"
ls -la /data/skills/ 2>&1
echo "--- Running migrations ---"
alembic upgrade head 2>&1
echo "--- Running seed ---"
python -m app.seed 2>&1
echo "--- Seed done, starting server ---"
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
