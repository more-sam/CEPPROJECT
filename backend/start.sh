#!/bin/sh
set -e

echo "Running migrations..."
alembic upgrade head

echo "Attempting to seed database..."
python -m app.seed || echo "WARNING: Seeding failed, but continuing to start server"

echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
