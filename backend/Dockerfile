FROM python:3.12-slim

# Python is pinned to 3.12 (not a newer host interpreter) because spaCy and the
# scientific stack publish reliable manylinux wheels for it.

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# curl is used by the compose healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first so dependency layers are cached across code edits.
COPY requirements.txt requirements-dev.txt ./
RUN pip install --upgrade pip && pip install -r requirements-dev.txt

# Bake the spaCy English pipeline into the image so runtime works fully offline.
# If this ever fails, app/ai/skill_extractor.py degrades to regex matching.
RUN python -m spacy download en_core_web_sm

# Application source (also bind-mounted in development compose).
COPY . .

EXPOSE 8000

# Use PORT from environment (Render/Railway/Fly) or default to 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
