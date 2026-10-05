#!/bin/sh

echo "Running migrations..."
alembic upgrade head

echo "Skipping seed for now - will add data later"
echo "Starting server..."

exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
