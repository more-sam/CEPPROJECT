FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first for caching
COPY backend/requirements.txt backend/requirements-dev.txt ./
RUN pip install --upgrade pip && pip install -r requirements-dev.txt

# Install spaCy model
RUN python -m spacy download en_core_web_sm

# Copy everything to /app
COPY backend/ /app/backend/
COPY data/ /app/backend/data/

WORKDIR /app/backend

# Verify data files exist
RUN ls -la /app/backend/data/skills/

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
