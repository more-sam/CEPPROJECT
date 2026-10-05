FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements-dev.txt ./
RUN pip install --upgrade pip && pip install -r requirements-dev.txt

RUN python -m spacy download en_core_web_sm

COPY backend/ /app/backend/
COPY data/ /data/

WORKDIR /app/backend

EXPOSE 8000

CMD ["sh", "-c", "echo '=== STARTUP ===' && ls -la /data/skills/ && alembic upgrade head && python -m app.seed; uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
