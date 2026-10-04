# Render Deployment Guide

This guide will help you deploy SkillBridge AI to Render. You'll need two web services (backend API + frontend) and a Postgres database.

## Prerequisites
- A [Render](https://render.com/) account
- Your repo pushed to GitHub

## Step 1: Create a Postgres Database
1. Go to Render Dashboard → New + → PostgreSQL
2. Name: `skillbridge-db` (or keep default)
3. Plan: Free (sufficient)
4. Click Create Database
5. Once created, copy the **Internal Database URL** or **External Database URL** - Render will provide `DATABASE_URL`. Use the Internal one for Render services in same region.

## Step 2: Deploy the Backend API
1. Go to Render Dashboard → New + → Web Service
2. Connect your GitHub repo
3. Root Directory: `backend`
4. Environment: `Docker`
5. Dockerfile: `backend/Dockerfile` (auto-detected)
6. Name: `skillbridge-api`
7. Plan: Free

## Environment Variables (Backend)
Add these under Environment tab:

| Key | Value | Notes |
|---|---|---|
| `APP_ENV` | `production` | |
| `DEBUG` | `false` | |
| `JWT_SECRET` | (generate) | Generate with `openssl rand -hex 32` or leave Render to auto-generate via render.yaml |
| `COOKIE_SECURE` | `true` | Required for HTTPS |
| `CORS_ORIGINS` | `https://your-frontend-name.onrender.com` | Update after creating frontend |
| `SEED_DEMO_USER` | `false` | Don't create demo in production |
| `DATABASE_URL` | (paste from Step 1) | Use postgresql+psycopg:// format - Render gives postgres://; replace with postgresql+psycopg:// |
| `ENABLE_SEMANTIC_MATCHING` | `true` | |
| `DATA_DIR` | `/data` | |
| `UPLOAD_DIR` | `/data/uploads` | Persistent disk recommended if you want uploads to survive restarts |
| `AI_PROVIDER` | `none` | Optional: set to openai + key if needed |

**Important:** Render's Postgres URL uses `postgres://`. Change to `postgresql+psycopg://` for SQLAlchemy.

## Health Check
Set Health Check Path to: `/api/health/ready`

## Start Command
Not needed if using Docker - it's set in Dockerfile. Also supports Procfile.

## Step 3: Deploy the Frontend (Static Site)
1. Go to Render Dashboard → New + → Static Site
2. Connect same repo
3. Root Directory: `frontend`
4. Build Command: `npm ci && npm run build`
5. Publish Directory: `dist`
6. Name: `skillbridge-frontend`

## Environment Variables (Frontend)
| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://skillbridge-api.onrender.com` |

## Step 4: Update CORS
After frontend deploys, copy its URL and update backend's `CORS_ORIGINS` to include `https://your-frontend.onrender.com`

## Step 5: Run Migrations & Seed Data (First Deploy)
Render can run one-off commands. After backend is deployed:
1. Go to backend service → Shell → Run Command:
```bash
alembic upgrade head && python -m app.seed
```

Note: Set `SEED_DEMO_USER=false` in prod, so seeding won't create demo account. It will still load taxonomy/jobs/assessments.

## Using render.yaml (Blueprint)
You can also use the included `render.yaml` for one-click deploy:
1. Push to GitHub with render.yaml
2. Render Dashboard → New + → Blueprint
3. Select repo and deploy
4. Update `CORS_ORIGINS` and ensure `DATABASE_URL` sync is handled

## Tips
- Free tier sleeps after inactivity - first request may be slow
- For uploads, attach a Persistent Disk to backend (Render paid plans) or use object storage
- Cookie `SameSite=Lax` works if on same domain or subdomains. Different root domains may need `SameSite=None; Secure` - adjust in `backend/app/core/security.py` if needed
