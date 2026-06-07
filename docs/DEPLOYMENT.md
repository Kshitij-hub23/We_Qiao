# Deployment Guide

How to deploy Qiáo to production and staging environments.

---

## Deployment Architecture

Qiáo consists of two independent services:

1. **Next.js app** — Deployed to Vercel (or any Node.js host)
2. **Python HDI API** — Deployed separately (Railway, Render, AWS, etc.)

They communicate via HTTP. The API URL is configured via environment variables.

```
┌──────────────┐                  ┌──────────────┐
│              │                  │              │
│ Vercel       │ HTTP             │ Railway      │
│ (Next.js)    │─────────────────→│ (Python API) │
│              │                  │              │
└──────────────┘                  └──────────────┘
```

---

## Next.js App Deployment

### Option 1: Vercel (Recommended)

Vercel is the official Next.js hosting platform. Free tier includes production deployments.

#### Prerequisites

- GitHub account
- GitHub repo with Qiáo code
- Vercel account (free at https://vercel.com)

#### Setup

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/We_Qiao.git
   git branch -M main
   git push -u origin main
   ```

2. **Import project to Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select the GitHub repo
   - Vercel auto-detects Next.js and sets defaults
   - Click "Deploy"

3. **Set environment variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add `ENGINE_URL` with the value of your Python API URL
   - Example: `https://my-hdi-api.railway.app`

4. **Deploy**
   - Vercel auto-deploys on git push to `main`
   - Check https://yourapp.vercel.app

#### Configuration

Vercel reads `vercel.json` for advanced config. You can optionally create this:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "ENGINE_URL": "@engine_url"
  }
}
```

(The `@engine_url` syntax means "use the env var with that name".)

---

### Option 2: Railway

Railway is another option for Node.js hosting.

#### Setup

1. **Create a Railway account** at https://railway.app

2. **Connect GitHub**
   - Click "New Project" → "Deploy from GitHub"
   - Authorize Railway to access your GitHub

3. **Select the repo and branch**
   - Choose your Qiáo repo
   - Leave branch as `main`

4. **Set environment variables**
   - In the Railway dashboard, go to Variables
   - Add `ENGINE_URL` with your Python API URL

5. **Deploy**
   - Railway auto-deploys on git push
   - Check the generated URL (e.g., `https://qiao-app.railway.app`)

---

### Option 3: Self-hosted (VPS/EC2)

For full control, host on your own server.

#### Build

```bash
npm run build
```

This generates a `.next/` directory (production build).

#### Install dependencies

```bash
npm install --production
```

(Omits dev dependencies; smaller image.)

#### Start

```bash
NODE_ENV=production npm start
```

Server listens on port 3000 by default (configurable via `PORT` env var).

#### Reverse proxy (Nginx)

```nginx
server {
    listen 80;
    server_name qiao.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### SSL (Let's Encrypt)

```bash
certbot certonly --standalone -d qiao.example.com
# Then update Nginx to use the cert
```

---

## Python HDI API Deployment

### Option 1: Railway

Railway has a Python runtime.

#### Setup

1. **Create `Procfile`** in `hdi-api/`:
   ```
   web: python -m uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

2. **Connect to Railway** (same as Next.js above)
   - Click "New Project" → "Deploy from GitHub"
   - Select your repo
   - Railway auto-detects Python and Procfile

3. **Populate the database**
   - Railway provides a shell:
     ```bash
     railway run python
     ```
   - Then run the ingestion script (see "Populating the database" below)

4. **Get the API URL**
   - Railway generates a URL (e.g., `https://my-hdi-api.railway.app`)
   - Set `ENGINE_URL` in your Next.js deployment to this URL

---

### Option 2: Render

Render is another popular Python host.

#### Setup

1. **Create `requirements.txt`** (already exists in `hdi-api/`)

2. **Go to https://render.com**
   - Click "New" → "Web Service"
   - Connect your GitHub repo

3. **Configure**
   - **Name:** qiao-hdi-api
   - **Runtime:** Python 3.10
   - **Build command:** `pip install -r hdi-api/requirements.txt`
   - **Start command:** `cd hdi-api && uvicorn main:app --host 0.0.0.0 --port 8000`

4. **Deploy**
   - Render auto-deploys on git push

5. **Get the API URL**
   - Render generates a URL
   - Set `ENGINE_URL` in Next.js to this URL

---

### Option 3: Heroku (if credits available)

Heroku's free tier is no longer available, but if you have credits:

```bash
# Install Heroku CLI, then:
heroku create qiao-hdi-api
git push heroku main
```

---

### Option 4: AWS (EC2/Lambda)

For production-grade hosting.

#### EC2 (traditional VPS)

1. Launch an Ubuntu EC2 instance
2. Install Python, pip, uvicorn
3. Clone the repo
4. Install dependencies: `pip install -r requirements.txt`
5. Start the API: `python -m uvicorn main:app --host 0.0.0.0 --port 8000`
6. Use a process manager (systemd, supervisor) to keep it running
7. Use Nginx as a reverse proxy

#### Lambda (serverless)

Lambda is trickier for FastAPI (requires AWS RIC or Zappa). Not recommended for now.

---

## Populating the Production Database

The database starts empty. You need to add interaction data before going live.

### Option 1: Via Python script

Create `hdi-api/ingest.py`:

```python
from database import SessionLocal, Interaction, init_db
import json

init_db()
db = SessionLocal()

# Load interactions from JSON (future: entities.json / interactions.json)
with open("interactions.json") as f:
    data = json.load(f)

for item in data:
    db.add(Interaction(
        western_drug=item["western_drug"],
        tcm_herb=item["tcm_herb"],
        interaction_type=item.get("interaction_type"),
        severity=item["severity"],
        mechanism=item.get("mechanism", ""),
    ))

db.commit()
db.close()
print("Ingestion complete!")
```

Then run:

```bash
cd hdi-api
python ingest.py
```

### Option 2: Via remote shell (Railway/Render)

```bash
# Railway
railway run python -c "from database import SessionLocal, Interaction, init_db; init_db(); ..."

# Or just SSH into the dyno and run Python interactively
railway run python
```

Then execute the ingestion code directly.

### Option 3: Via API endpoint (future)

When the ingestion pipeline is complete, create a `POST /api/v1/ingest` endpoint that accepts interaction data and writes to the database. This avoids manual steps.

---

## Environment Variables

### Next.js

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `ENGINE_URL` | No | `http://127.0.0.1:8000` | URL of the conflict engine (`hdi-api/`). Must be reachable from the server. |
| `INTAKE_URL` | No | `http://127.0.0.1:8001` | URL of the intake service (`standardizer/`, OCR + standardize). |

**Set in Vercel dashboard:**
- Settings → Environment Variables
- Add variable, select which environments (production, preview, development)

### Python services

There are **two** Python services to deploy separately: the engine (`hdi-api/`) and the intake service
(`standardizer/`).

| Service | Variable | Required | Notes |
|---------|----------|----------|-------|
| both | `PORT` | No | Port to listen on (set by the host) |
| engine | — | — | No keys. Run `python seed.py` once to load `Medicine_data/`. |
| intake | `GEMINI_API_KEY` | **Yes** | Google Gemini key for OCR + standardize. Falls back to `GOOGLE_API_KEY`. Get one at https://aistudio.google.com/apikey. |

> Note: point the frontend's `INTAKE_URL` at the deployed intake service.

---

## DNS & HTTPS

### Vercel

Vercel handles HTTPS automatically via Let's Encrypt. Custom domain setup:

1. In Vercel dashboard, go to Settings → Domains
2. Add your domain (e.g., qiao.example.com)
3. Update your DNS registrar to point to Vercel's nameservers (or CNAME record)
4. Vercel provisions a certificate automatically

### Railway/Render

Both provide free SSL. Custom domain setup:

1. In the dashboard, add your custom domain
2. Update DNS registrar to point to the provided CNAME
3. Certificate is provisioned automatically

---

## Pre-deployment Checklist

### Next.js

- [ ] Environment variables set (`ENGINE_URL` points to live API)
- [ ] Build succeeds locally: `npm run build`
- [ ] No TypeScript errors: `npm run lint`
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] API routes tested against live engine

### Python API

- [ ] All dependencies in `requirements.txt`
- [ ] Database is populated with interaction data
- [ ] Health endpoint responds: `curl https://api.example.com/health`
- [ ] Conflict check works: `curl -X POST https://api.example.com/api/v1/check-conflicts ...`
- [ ] Connection test passes in the UI (green "Engine online" dot)

### Both

- [ ] Hero flow works end-to-end (Warfarin + Danshen → conflict found)
- [ ] Error handling tested (engine down, network error, etc.)
- [ ] CORS headers correct (Next.js can reach API)
- [ ] Rate limiting / DDoS protection enabled (if needed)
- [ ] Monitoring / alerting set up (health checks, error tracking)

---

## Monitoring & Logs

### Vercel

- Logs available in the dashboard → Function logs
- Errors from Next.js routes appear there
- Connect to Sentry for error tracking (optional)

### Railway/Render

- Both provide live logs in their dashboards
- View Python API logs in real-time
- Set up alerts for failures

### Sentry (optional, both platforms)

1. Create a Sentry account at https://sentry.io
2. Create a project for each service (Next.js, Python)
3. Get the DSN (Data Source Name)
4. Configure in your apps:
   - **Next.js:** `npm install @sentry/nextjs` + setup in `next.config.js`
   - **Python:** `pip install sentry-sdk` + setup in `main.py`

---

## Rollback & Troubleshooting

### Vercel

1. Go to Deployments
2. Click the previous successful deployment
3. Click "Redeploy"

### Railway/Render

1. Go to the service settings
2. Select a previous deployment from history
3. Click "Redeploy" or "Activate"

### Check logs

- **Next.js:** Vercel Function logs tab
- **Python API:** Railway/Render logs page
- Look for error messages, exceptions, timeouts

### Test the API manually

```bash
# Test the live API
curl https://api.example.com/health
curl -X POST https://api.example.com/api/v1/check-conflicts ...

# Test the proxy
curl https://qiao.example.com/api/engine/health
curl -X POST https://qiao.example.com/api/conflicts/check ...
```

---

## Performance & Scaling

### Caching

The API responses are not cached (conflict data is deterministic, but rarely repeats). If you find repeated requests from the same browser, add:

```typescript
// lib/engine.ts
cache: "no-store"  // Already set
```

### Database optimization

As the `interactions` table grows:
- Composite index on `(western_drug, tcm_herb)` keeps lookups fast
- Query is O(1) with proper indexes
- No pagination needed (expected < 10K rows)

### Load testing

Before going live with real patients:

```bash
# Simple load test (ApacheBench)
ab -n 1000 -c 10 http://localhost:3000/api/conflicts/check
```

---

## Security Checklist

- [ ] API key never exposed to browser (env var server-side only)
- [ ] HTTPS everywhere (Vercel/Railway enforce this)
- [ ] CORS headers correct (API only accepts requests from known domains)
- [ ] No SQL injection (Zod validation + SQLAlchemy parameterized queries)
- [ ] No XSS (React escapes by default, Tailwind prevents CSS injection)
- [ ] Rate limiting (optional, add if public API)
- [ ] Input validation (both Next.js and Python API validate)

---

## Going Live

1. **Deploy to staging first**
   - Set up a staging environment with same config as production
   - Test the full hero flow
   - Verify error handling

2. **Populate production database**
   - Run the ingestion script
   - Spot-check a few interactions

3. **Deploy to production**
   - Deploy Next.js first (can handle engine being offline)
   - Deploy Python API
   - Test the live app

4. **Monitor for 24 hours**
   - Watch logs for errors
   - Check error tracking (Sentry)
   - Monitor response times

5. **Announce**
   - Send the link to stakeholders
   - Document any known limitations

---

## Post-deployment

- Monitor uptime and error rates
- Set up automated backups of the database
- Plan for Phase 2 features (extraction, patient profiles)
- Gather user feedback
- Iterate on the conflict dataset as it matures

---

## Support

- **Vercel issues?** https://vercel.com/support
- **Railway issues?** https://docs.railway.app
- **Render issues?** https://render.com/docs
- **Our code issues?** Check the GitHub Issues or CLAUDE.md
